import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendTelegramWithWhatsAppButtons } from "@/lib/notifications.server";

/**
 * Server function: confirms a payment by updating the order's UTR,
 * setting status to 'paid_pending_delivery', and sending Telegram alert
 * with inline WhatsApp buttons for one-click customer notifications.
 */

export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        utr: z.string().trim().min(4).max(80),
        verified_via: z.enum(["upi_deep_link", "screenshot_ocr", "whatsapp_share", "manual_entry"]),
        customer_name: z.string().optional(),
        customer_whatsapp: z.string().optional(),
        poppo_id: z.string().optional(),
        package_name: z.string().optional(),
        quantity: z.number().int().optional(),
        amount_rupees: z.string().optional(),
        total_coins: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");

    const order = await q1<any>(
      `SELECT id, status, name, whatsapp, poppo_id, package, coins, amount, quantity, payment_method
       FROM orders WHERE id = $1`,
      [data.order_id]
    );

    if (!order) return { ok: false, error: "Order not found" };

    // If already completed or rejected, reject
    if (["completed", "rejected"].includes(order.status)) {
      return { ok: false, error: "This order is already finalized" };
    }

    const customerName = data.customer_name || order.name;
    const customerWhatsapp = data.customer_whatsapp || order.whatsapp;
    const poppoId = data.poppo_id || order.poppo_id;
    const packageName = data.package_name || order.package;
    const quantity = data.quantity || order.quantity || 1;
    const amountRupees = data.amount_rupees || String(order.amount);
    const totalCoins = data.total_coins || order.coins;

    // If webhook already matched (paid_pending_delivery), just save UTR and send alert
    if (order.status === "paid_pending_delivery") {
      await q1(
        `UPDATE orders SET utr = $1, utr_submitted_at = now(), verified_via = $2, updated_at = now() WHERE id = $3`,
        [data.utr, data.verified_via, data.order_id]
      );
    } else {
      // Normal flow: pending or awaiting_payment — update status
      await q1(
        `UPDATE orders
         SET utr = $1,
             utr_submitted_at = now(),
             status = 'paid_pending_delivery',
             verified_via = $2,
             updated_at = now()
         WHERE id = $3`,
        [data.utr, data.verified_via, data.order_id]
      );
    }

    // Send Telegram alert with inline WhatsApp buttons
    try {
      await sendTelegramWithWhatsAppButtons({
        customerName,
        customerWhatsapp,
        poppoId,
        packageName,
        quantity,
        amountRupees,
        orderId: order.id,
        coins: totalCoins,
        alertType: "payment_confirmed",
      });
    } catch (e) {
      console.error("[confirmPayment] telegram notify", e);
    }

    return { ok: true, order_id: order.id };
  });
