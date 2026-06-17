import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server function: confirms a payment by updating the order's UTR,
 * setting status to 'paid_pending_delivery', and sending Telegram alert.
 */

async function sendTelegramAlert(opts: {
  customerName: string;
  customerWhatsapp: string;
  poppoId: string;
  packageName: string;
  quantity: number;
  amountRupees: string;
  utrNumber: string;
  orderId: string;
  layerUsed: string;
  totalCoins: number;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping");
    return { ok: false, skipped: true };
  }

  const msg =
    `🎀 <b>NEW COIN ORDER CONFIRMED</b>\n\n` +
    `👤 Customer: ${opts.customerName}\n` +
    `📱 WhatsApp: ${opts.customerWhatsapp}\n` +
    `🎮 Poppo ID: ${opts.poppoId}\n` +
    `📦 Package: ${opts.packageName}\n` +
    `🔢 Quantity: ${opts.quantity}\n` +
    `💰 Amount: ₹${opts.amountRupees}\n` +
    `🔑 UTR: ${opts.utrNumber}\n` +
    `📋 Order ID: ${opts.orderId}\n` +
    `🔍 Verified via: ${opts.layerUsed}\n\n` +
    `⚡ Send ${opts.totalCoins} coins now!`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "HTML",
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("[telegram] send failed", res.status, JSON.stringify(data));
      return { ok: false, error: data };
    }
    return { ok: true };
  } catch (e) {
    console.error("[telegram] error", e);
    return { ok: false };
  }
}

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

    // If webhook already matched (paid_pending_delivery), just save UTR and send alert
    if (order.status === "paid_pending_delivery") {
      await q1(
        `UPDATE orders SET utr = $1, utr_submitted_at = now(), verified_via = $2, updated_at = now() WHERE id = $3`,
        [data.utr, data.verified_via, data.order_id]
      );

      // Send Telegram alert with UTR info
      const customerName = data.customer_name || order.name;
      const customerWhatsapp = data.customer_whatsapp || order.whatsapp;
      const poppoId = data.poppo_id || order.poppo_id;
      const packageName = data.package_name || order.package;
      const quantity = data.quantity || order.quantity || 1;
      const amountRupees = data.amount_rupees || String(order.amount);
      const totalCoins = data.total_coins || order.coins;

      try {
        await sendTelegramAlert({
          customerName, customerWhatsapp, poppoId, packageName,
          quantity, amountRupees, utrNumber: data.utr,
          orderId: order.id, layerUsed: data.verified_via, totalCoins,
        });
      } catch (e) {
        console.error("[confirmPayment notifications]", e);
      }

      return { ok: true, order_id: order.id };
    }

    // Normal flow: pending or awaiting_payment — update status and send alert
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

    const customerName = data.customer_name || order.name;
    const customerWhatsapp = data.customer_whatsapp || order.whatsapp;
    const poppoId = data.poppo_id || order.poppo_id;
    const packageName = data.package_name || order.package;
    const quantity = data.quantity || order.quantity || 1;
    const amountRupees = data.amount_rupees || String(order.amount);
    const totalCoins = data.total_coins || order.coins;

    try {
      await sendTelegramAlert({
        customerName, customerWhatsapp, poppoId, packageName,
        quantity, amountRupees, utrNumber: data.utr,
        orderId: order.id, layerUsed: data.verified_via, totalCoins,
      });
    } catch (e) {
      console.error("[confirmPayment notifications]", e);
    }

    return { ok: true, order_id: order.id };
  });
