import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import crypto from "crypto";

// Replay protection
const recentPayments = new Set<string>();
const REPLAY_WINDOW_MS = 60_000;

function isDuplicate(key: string): boolean {
  if (recentPayments.has(key)) return true;
  recentPayments.add(key);
  setTimeout(() => recentPayments.delete(key), REPLAY_WINDOW_MS);
  return false;
}

const WebhookSchema = z.object({
  txnId: z.string().optional(),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
  status: z.string(),
  paymentMethod: z.string().optional(),
  upiTxnId: z.string().optional(),
  payerVpa: z.string().optional(),
  txnTime: z.string().optional(),
  signature: z.string().optional(),
});

export const Route = createFileRoute("/api/public/zaakpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify webhook secret
        const webhookSecret = process.env.ZAAKPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        // Parse body once (Request body stream can only be consumed once)
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const authHeader = request.headers.get("x-webhook-secret");
        if (authHeader !== webhookSecret) {
          // Try signature verification as fallback
          const providedSig = body.signature;

          if (providedSig) {
            const canonical = Object.keys(body)
              .sort()
              .filter((k) => k !== "signature")
              .map((k) => `${k}=${body[k]}`)
              .join("&");

            const expected = crypto
              .createHmac("sha256", webhookSecret)
              .update(canonical)
              .digest("hex");

            const sigValid = crypto.timingSafeEqual(
              Buffer.from(providedSig, "hex"),
              Buffer.from(expected, "hex")
            );

            if (!sigValid) {
              return new Response("Unauthorized", { status: 401 });
            }
          } else {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const parsed = WebhookSchema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }

        const { orderId, amount, status, upiTxnId, payerVpa, txnId } = parsed.data;

        // Dedup by txnId
        const dedupKey = txnId || `zaakpay:${orderId}:${amount}`;
        if (isDuplicate(dedupKey)) {
          return Response.json({ ok: false, matched: false, reason: "duplicate" });
        }

        // Only process successful payments
        if (status.toUpperCase() !== "SUCCESS") {
          return Response.json({ ok: true, matched: false, reason: "not_success" });
        }

        const { q, q1 } = await import("@/lib/db.server");

        // Atomic claim: match order by order_id
        const order = await q1<any>(
          `UPDATE orders SET
             status = 'paid_pending_delivery',
             paid_at = now(),
             utr = COALESCE($2, utr),
             payer_upi = COALESCE($3, payer_upi)
           WHERE id = (
             SELECT id FROM orders
             WHERE id::text = $1
               AND status = 'awaiting_payment'
               AND created_at > now() - INTERVAL '24 hours'
             LIMIT 1
           )
           RETURNING *`,
          [orderId, upiTxnId || null, payerVpa || null]
        );

        if (!order) {
          // Try matching by amount as fallback
          const amountOrder = await q1<any>(
            `UPDATE orders SET
               status = 'paid_pending_delivery',
               paid_at = now(),
               utr = COALESCE($2, utr),
               payer_upi = COALESCE($3, payer_upi)
             WHERE id = (
               SELECT id FROM orders
               WHERE expected_amount_paise = $4
                 AND status = 'awaiting_payment'
                 AND created_at > now() - INTERVAL '24 hours'
               ORDER BY created_at DESC
               LIMIT 1
             )
             RETURNING *`,
            [orderId, upiTxnId || null, payerVpa || null, amount]
          );

          if (!amountOrder) {
            // Store as unmatched
            await q(
              `INSERT INTO unmatched_payments (amount_paise, utr, payer_upi, raw_payload, reason)
               VALUES ($1, $2, $3, $4, $5)`,
              [amount, upiTxnId || null, payerVpa || null, JSON.stringify(body), "no_matching_order"]
            );
            return Response.json({ ok: false, matched: false });
          }

          // Notify admin
          try {
            const { sendTelegramWithWhatsAppButtons } = await import("@/lib/notifications.server");
            await sendTelegramWithWhatsAppButtons({
              customerName: amountOrder.name,
              customerWhatsapp: amountOrder.whatsapp,
              poppoId: amountOrder.poppo_id,
              packageName: amountOrder.package,
              quantity: amountOrder.quantity || 1,
              amountRupees: (amountOrder.expected_amount_paise / 100).toFixed(2),
              orderId: amountOrder.id,
              coins: amountOrder.coins,
              alertType: "payment_confirmed",
            });
          } catch (e) {
            console.error("[zaakpay-webhook] telegram notify failed", e);
          }

          return Response.json({ ok: true, matched: true, order_id: amountOrder.id });
        }

        // Notify admin
        try {
          const { sendTelegramWithWhatsAppButtons } = await import("@/lib/notifications.server");
          await sendTelegramWithWhatsAppButtons({
            customerName: order.name,
            customerWhatsapp: order.whatsapp,
            poppoId: order.poppo_id,
            packageName: order.package,
            quantity: order.quantity || 1,
            amountRupees: (order.expected_amount_paise / 100).toFixed(2),
            orderId: order.id,
            coins: order.coins,
            alertType: "payment_confirmed",
          });
        } catch (e) {
          console.error("[zaakpay-webhook] telegram notify failed", e);
        }

        return Response.json({ ok: true, matched: true, order_id: order.id });
      },
    },
  },
});
