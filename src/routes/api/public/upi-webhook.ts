import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// ── Replay protection: deduplicate by amount_paise + utr within 60s ────────
const recentPayments = new Set<string>();
const REPLAY_WINDOW_MS = 60_000;

function isDuplicate(key: string): boolean {
  if (recentPayments.has(key)) return true;
  recentPayments.add(key);
  setTimeout(() => recentPayments.delete(key), REPLAY_WINDOW_MS);
  return false;
}

// Receives parsed UPI payment notifications from MacroDroid (or similar).
// MacroDroid sends:
//   POST /api/public/upi-webhook
//   Headers: x-webhook-secret: <UPI_WEBHOOK_SECRET>
//   Headers: x-idempotency-key: <unique-id> (optional, for dedup)
//   Body: { amount_paise, utr?, payer_upi?, raw_payload? }
const Schema = z.object({
  amount_paise: z.number().int().positive().max(100_000_00),
  utr: z.string().trim().min(3).max(80).optional(),
  payer_upi: z.string().trim().max(120).optional(),
  raw_payload: z.string().trim().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/upi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.UPI_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const provided = request.headers.get("x-webhook-secret");
        if (!provided || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Check idempotency key first (replay prevention)
        const idempotencyKey = request.headers.get("x-idempotency-key");
        if (idempotencyKey && isDuplicate(`upihook:${idempotencyKey}`)) {
          return Response.json({ ok: false, matched: false, reason: "duplicate" });
        }

        let parsed: z.infer<typeof Schema>;
        try {
          parsed = Schema.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        // Dedup by amount_paise + utr as fallback
        if (parsed.utr) {
          const dedupKey = `upaise:${parsed.amount_paise}:${parsed.utr}`;
          if (isDuplicate(dedupKey)) {
            return Response.json({ ok: false, matched: false, reason: "duplicate" });
          }
        }

        const { q, q1 } = await import("@/lib/db.server");

        // Atomic claim: match the most-recent awaiting_payment order by exact paise within 24h
        const order = await q1<any>(
          `UPDATE orders SET
             status = 'paid_pending_delivery',
             paid_at = now(),
             utr = COALESCE($2, utr),
             payer_upi = COALESCE($3, payer_upi)
           WHERE id = (
             SELECT id FROM orders
             WHERE expected_amount_paise = $1
               AND status = 'awaiting_payment'
               AND created_at > now() - INTERVAL '24 hours'
             ORDER BY created_at DESC
             LIMIT 1
           )
           RETURNING *`,
          [parsed.amount_paise, parsed.utr ?? null, parsed.payer_upi ?? null],
        );

        if (!order) {
          await q(
            `INSERT INTO unmatched_payments (amount_paise, utr, payer_upi, raw_payload, reason)
             VALUES ($1,$2,$3,$4,$5)`,
            [
              parsed.amount_paise,
              parsed.utr ?? null,
              parsed.payer_upi ?? null,
              parsed.raw_payload ?? null,
              "no_matching_order",
            ],
          );
          return Response.json({ ok: false, matched: false });
        }

        // Notify admin via Telegram
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (botToken && chatId) {
            const msg =
              `🎀 <b>AUTO-MATCHED PAYMENT</b>\n\n` +
              `👤 Customer: ${order.name}\n` +
              `📱 WhatsApp: ${order.whatsapp}\n` +
              `🎮 Poppo ID: ${order.poppo_id}\n` +
              `📦 ${order.coins} coins (${order.package})\n` +
              `💰 Amount: ₹${(order.expected_amount_paise / 100).toFixed(2)}\n` +
              `🔑 UTR: ${order.utr || "N/A"}\n` +
              `📋 Order: #${order.id.slice(0, 8)}\n\n` +
              `⚡ Send ${order.coins} coins now!`;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
            });
          }
        } catch (e) {
          console.error("[upi-webhook] telegram notify failed", e);
        }

        return Response.json({ ok: true, matched: true, order_id: order.id });
      },
    },
  },
});
