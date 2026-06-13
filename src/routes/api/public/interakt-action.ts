import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// ── Replay protection ──────────────────────────────────────────────────────
const recentActions = new Set<string>();
const REPLAY_WINDOW_MS = 60_000;

function isDuplicate(key: string): boolean {
  if (recentActions.has(key)) return true;
  recentActions.add(key);
  setTimeout(() => recentActions.delete(key), REPLAY_WINDOW_MS);
  return false;
}

// Receives Interakt button-click webhooks. Configure Interakt to POST here
// with header `x-webhook-secret: <INTERAKT_WEBHOOK_SECRET>` and JSON body
// containing the order action token + action.
//
// Expected body (Interakt button payload, normalized):
//   { action_token: string, action: "complete" | "reject" }
// Optional alt: { order_id: uuid, action: ... }
const Schema = z
  .object({
    action_token: z.string().trim().min(8).max(80).optional(),
    order_id: z.string().uuid().optional(),
    action: z.enum(["complete", "reject"]).default("complete"),
  })
  .refine((d) => d.action_token || d.order_id, {
    message: "action_token or order_id required",
  });

export const Route = createFileRoute("/api/public/interakt-action")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INTERAKT_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const provided =
          request.headers.get("x-webhook-secret") ||
          request.headers.get("x-interakt-signature");
        if (!provided || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Replay prevention via idempotency key
        const idempotencyKey = request.headers.get("x-idempotency-key");
        if (idempotencyKey && isDuplicate(`interakt:${idempotencyKey}`)) {
          return Response.json({ ok: false, reason: "duplicate" });
        }

        let parsed: z.infer<typeof Schema>;
        try {
          parsed = Schema.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        const { q1 } = await import("@/lib/db.server");
        const order = parsed.action_token
          ? await q1<any>(`SELECT * FROM orders WHERE action_token = $1`, [parsed.action_token])
          : await q1<any>(`SELECT * FROM orders WHERE id = $1`, [parsed.order_id]);

        if (!order) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });

        if (parsed.action === "reject") {
          await q1(`UPDATE orders SET status = 'rejected' WHERE id = $1`, [order.id]);
          return Response.json({ ok: true, status: "rejected" });
        }

        if (order.status === "completed") {
          return Response.json({ ok: true, status: "already_completed" });
        }

        await q1(
          `UPDATE orders SET status = 'completed', delivered_at = now() WHERE id = $1`,
          [order.id],
        );

        try {
          const { sendInteraktNotification } = await import("@/lib/notifications.server");
          await sendInteraktNotification({
            to: order.whatsapp.replace(/[^\d]/g, ""),
            message:
              `🎉 Your coins are credited!\n` +
              `Hi ${order.name}, ${order.coins} coins have been added to Poppo ID ${order.poppo_id}.\n` +
              `Open Poppo Live to check. Thank you for choosing Barbieverse 💖`,
          });
        } catch (e) {
          console.error("[interakt-action] customer notify failed", e);
        }

        return Response.json({ ok: true, status: "completed" });
      },
    },
  },
});
