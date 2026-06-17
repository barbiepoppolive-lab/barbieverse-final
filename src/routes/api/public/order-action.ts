import { createFileRoute } from "@tanstack/react-router";

// One-tap link tapped by admin from WhatsApp: marks order completed and
// sends the customer their confirmation message.
// GET /api/public/order-action?token=<action_token>&op=complete

function page(title: string, body: string, color = "#22c55e") {
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<body style="font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">
<div style="max-width:420px"><div style="font-size:48px;margin-bottom:12px">${color === "#22c55e" ? "✅" : "⚠️"}</div>
<h1 style="color:${color};margin:0 0 12px">${title}</h1>
<p style="color:#bbb;line-height:1.5">${body}</p></div></body>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/order-action")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const op = url.searchParams.get("op") || "complete";
        if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
          return page("Invalid link", "This action link is malformed.", "#ef4444");
        }

        const { q1 } = await import("@/lib/db.server");
        const order = await q1<any>(
          `SELECT * FROM orders WHERE action_token = $1`,
          [token],
        );
        if (!order) return page("Not found", "No matching order.", "#ef4444");

        if (op !== "complete") return page("Unknown action", `Unsupported op: ${op}`, "#ef4444");

        if (order.status === "completed") {
          return page("Already marked done", `Order for ${order.name} (Poppo ${order.poppo_id}) was already completed.`);
        }

        await q1(
          `UPDATE orders SET status = 'completed', delivered_at = now() WHERE id = $1`,
          [order.id],
        );

        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (botToken && chatId) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text:
                  `✅ <b>ORDER COMPLETED (via link)</b>\n\n` +
                  `👤 Customer: ${order.name}\n` +
                  `📱 WhatsApp: ${order.whatsapp}\n` +
                  `🎮 Poppo ID: ${order.poppo_id}\n` +
                  `📦 ${order.coins} coins (${order.package})\n` +
                  `📋 Order: #${order.id.slice(0, 8)}`,
                parse_mode: "HTML",
              }),
            });
          }
        } catch (e) {
          console.error("[order-action] telegram notify failed", e);
        }

        return page(
          "Marked as delivered",
          `Customer ${order.name} has been notified on WhatsApp that ${order.coins} coins are credited.`,
        );
      },
    },
  },
});
