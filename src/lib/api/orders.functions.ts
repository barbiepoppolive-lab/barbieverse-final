// src/lib/api/orders.functions.ts
// UPDATED: adds admin notes, refund flow, UTR manual submit, order tracking

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const POPPO_ID_REGEX = /^\d{8,10}$/;

// ─── helpers ────────────────────────────────────────────────────────────────

async function generateUniqueAmountPaise(basePrice: number, q: any): Promise<number> {
  for (let i = 0; i < 8; i++) {
    const paise = basePrice * 100 + Math.floor(Math.random() * 99) + 1;
    const rows = await q(
      `SELECT 1 FROM orders
       WHERE expected_amount_paise = $1
         AND status IN ('awaiting_payment','pending','paid_pending_delivery')
         AND created_at > now() - INTERVAL '24 hours'
       LIMIT 1`,
      [paise],
    );
    if (rows.length === 0) return paise;
  }
  return basePrice * 100 + Math.floor(Math.random() * 99) + 1;
}

// ─── submit order (unchanged from original) ─────────────────────────────────

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        whatsapp: z.string().trim().min(6).max(20),
        poppo_id: z
          .string()
          .trim()
          .regex(POPPO_ID_REGEX, "Invalid Poppo ID. It must be 8 to 10 digits (numbers only)."),
        package: z.string().trim().min(1).max(60),
        coins: z.number().int().positive(),
        amount: z.number().int().positive(),
        quantity: z.number().int().min(1).max(10).default(1),
        payment_method: z.enum(["upi", "usdt", "netbanking"]).default("upi"),
        utr: z.string().trim().max(80).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q, q1 } = await import("../db.server");
    const expected = await generateUniqueAmountPaise(data.amount, q);
    const actionToken = crypto.randomUUID().replace(/-/g, "");
    const status = data.payment_method === "upi" ? "awaiting_payment" : "pending";

    const row = await q1<{ id: string }>(
      `INSERT INTO orders
         (name, whatsapp, poppo_id, package, coins, amount, quantity, utr, payment_method,
          expected_amount_paise, action_token, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now() + INTERVAL '24 hours')
       RETURNING id`,
      [
        data.name,
        data.whatsapp,
        data.poppo_id,
        data.package,
        data.coins,
        data.amount,
        data.quantity,
        data.utr || null,
        data.payment_method,
        expected,
        actionToken,
        status,
      ],
    );

    if (data.payment_method !== "upi") {
      try {
        const { sendTelegramWithWhatsAppButtons } = await import("../notifications.server");
        await sendTelegramWithWhatsAppButtons({
          customerName: data.name,
          customerWhatsapp: data.whatsapp,
          poppoId: data.poppo_id,
          packageName: data.package,
          quantity: data.quantity,
          amountRupees: String(data.amount),
          orderId: row?.id || "",
          coins: data.coins,
          alertType: "new_order",
        });
      } catch (e) {
        console.error("[order notify]", e);
      }
    }

    return {
      ok: true,
      id: row?.id,
      expected_amount_paise: expected,
      expected_amount_rupees: (expected / 100).toFixed(2),
    };
  });

// ─── NEW: customer submits UTR for USDT / NetBanking ────────────────────────
// After paying via USDT or NetBanking, user enters their
// transaction reference so admin can verify faster.

export const submitUtr = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        utr: z.string().trim().min(4).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");

    const order = await q1<any>(
      `SELECT id, status, name, whatsapp, poppo_id, package, coins, amount, payment_method
       FROM orders WHERE id = $1`,
      [data.order_id],
    );

    if (!order) return { ok: false, error: "Order not found" };

    // Only allow UTR submission for pending USDT / NetBanking orders
    if (!["pending", "awaiting_payment"].includes(order.status)) {
      return { ok: false, error: "This order is no longer awaiting payment" };
    }
    if (order.payment_method === "upi") {
      return { ok: false, error: "UPI payments are auto-verified" };
    }

    await q1(
      `UPDATE orders SET utr = $1, utr_submitted_at = now(), status = 'paid_pending_delivery'
       WHERE id = $2`,
      [data.utr, data.order_id],
    );

    // Notify admin via Telegram with WhatsApp buttons
    try {
      const { sendTelegramWithWhatsAppButtons } = await import("../notifications.server");
      await sendTelegramWithWhatsAppButtons({
        customerName: order.name,
        customerWhatsapp: order.whatsapp,
        poppoId: order.poppo_id,
        packageName: order.package,
        quantity: order.quantity || 1,
        amountRupees: String(order.amount),
        orderId: order.id,
        coins: order.coins,
        alertType: "payment_confirmed",
      });
    } catch (e) {
      console.error("[submitUtr] telegram notify", e);
    }

    return { ok: true };
  });

// ─── NEW: public order tracking ──────────────────────────────────────────────
// Customer can check their order status using order ID + WhatsApp.

export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        whatsapp: z.string().trim().min(6).max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1, q } = await import("../db.server");

    // Normalize whatsapp
    const wa = data.whatsapp.replace(/[^\d]/g, "");

    const order = await q1<any>(
      `SELECT id, name, poppo_id, package, coins, amount, status, payment_method,
              created_at, paid_at, delivered_at, refund_status
       FROM orders
       WHERE id = $1 AND REPLACE(REPLACE(whatsapp, ' ', ''), '+', '') = $2`,
      [data.order_id, wa],
    );

    if (!order) return { ok: false, error: "Order not found. Check your Order ID and WhatsApp number." };

    // Fetch status history
    const logs = await q(
      `SELECT new_status, changed_by, note, created_at
       FROM order_status_logs
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [data.order_id],
    );

    return {
      ok: true,
      order: {
        id: order.id,
        name: order.name,
        poppo_id: order.poppo_id,
        package: order.package,
        coins: order.coins,
        amount: order.amount,
        status: order.status,
        payment_method: order.payment_method,
        created_at: order.created_at,
        paid_at: order.paid_at,
        delivered_at: order.delivered_at,
        refund_status: order.refund_status,
      },
      logs: logs.map((l: any) => ({
        status: l.new_status,
        by: l.changed_by,
        note: l.note,
        at: l.created_at,
      })),
    };
  });

// ─── listOrders (keep original, add refund filter) ──────────────────────────

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      status: z.string().default("all"),
      refund_status: z.string().default("all"),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const where: string[] = [];
    const params: any[] = [];

    if (data.status !== "all") {
      params.push(data.status);
      where.push(`status = $${params.length}`);
    }
    if (data.refund_status !== "all") {
      params.push(data.refund_status);
      where.push(`refund_status = $${params.length}`);
    }

    const offset = (data.page - 1) * data.pageSize;
    const sql = `SELECT * FROM orders ${
      where.length ? "WHERE " + where.join(" AND ") : ""
    } ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    return q(sql, [...params, data.pageSize, offset]);
  });

// ─── updateOrderStatus (unchanged core, new logging) ────────────────────────

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "awaiting_payment",
          "pending",
          "paid_pending_delivery",
          "verified",
          "completed",
          "rejected",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q, q1 } = await import("../db.server");

    const order = await q1<any>(`SELECT * FROM orders WHERE id = $1`, [data.id]);
    if (!order) return { ok: false };

    const sets: string[] = ["status = $1"];
    const params: any[] = [data.status];
    if (data.status === "completed" && !order.delivered_at) {
      sets.push(`delivered_at = now()`);
    }
    await q(`UPDATE orders SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [
      ...params,
      data.id,
    ]);

    // Insert status log
    await q(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by)
       VALUES ($1, $2, $3, 'admin')`,
      [data.id, order.status, data.status],
    );

    if (data.status === "completed" && order.status !== "completed") {
      // Send Telegram alert with WhatsApp button
      try {
        const { sendTelegramWithWhatsAppButtons } = await import("../notifications.server");
        await sendTelegramWithWhatsAppButtons({
          customerName: order.name,
          customerWhatsapp: order.whatsapp,
          poppoId: order.poppo_id,
          packageName: order.package,
          quantity: order.quantity || 1,
          amountRupees: String(order.amount),
          orderId: order.id,
          coins: order.coins,
          alertType: "order_completed",
        });
      } catch (e) {
        console.error("[order complete] telegram notify", e);
      }
    }
    return { ok: true };
  });

// ─── NEW: update admin notes on an order ────────────────────────────────────

export const updateOrderNotes = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        admin_notes: z.string().max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`UPDATE orders SET admin_notes = $1 WHERE id = $2`, [data.admin_notes, data.id]);
    return { ok: true };
  });

// ─── NEW: request / approve / complete refund ────────────────────────────────

export const updateRefundStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        refund_status: z.enum(["requested", "approved", "completed"]),
        refund_notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q, q1 } = await import("../db.server");

    const order = await q1<any>(`SELECT * FROM orders WHERE id = $1`, [data.id]);
    if (!order) return { ok: false, error: "Order not found" };

    const sets = [
      `refund_status = $1`,
      `refund_notes = COALESCE($2, refund_notes)`,
    ];
    const params: any[] = [data.refund_status, data.refund_notes ?? null];

    if (data.refund_status === "completed") {
      sets.push(`refunded_at = now()`);
      sets.push(`status = 'rejected'`);      // reject the order when refund completes
    }

    await q(
      `UPDATE orders SET ${sets.join(", ")} WHERE id = $${params.length + 1}`,
      [...params, data.id],
    );

    // Log status change when order is rejected on refund completion
    if (data.refund_status === "completed") {
      await q(
        `INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
         VALUES ($1, $2, 'rejected', 'admin', 'Refund completed')`,
        [data.id, order.status],
      );
    }

    // Notify admin via Telegram when refund is processed
    if (["approved", "completed"].includes(data.refund_status)) {
      try {
        const { sendTelegramWithWhatsAppButtons } = await import("../notifications.server");
        await sendTelegramWithWhatsAppButtons({
          customerName: order.name,
          customerWhatsapp: order.whatsapp,
          poppoId: order.poppo_id,
          packageName: order.package,
          quantity: order.quantity || 1,
          amountRupees: String(order.amount),
          orderId: order.id,
          coins: order.coins,
          alertType: "refund",
        });
      } catch (e) {
        console.error("[refund notify]", e);
      }
    }

    return { ok: true };
  });

// ─── orderStats (unchanged) ──────────────────────────────────────────────────

export const orderStats = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q1 } = await import("../db.server");
  return (
    (await q1<any>(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS week,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('pending','awaiting_payment','paid_pending_delivery')) AS pending,
      COUNT(*) FILTER (WHERE refund_status IN ('requested','approved')) AS pending_refunds,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('verified','completed')), 0) AS revenue
    FROM orders
  `)) ?? {}
  );
});
