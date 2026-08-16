// WhatsApp Bot Status API
// Shows bot connection status and QR code for pairing
// Access at: /api/public/whatsapp-bot-status

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whatsapp-bot-status")({
  server: {
    handlers: {
      GET: async () => {
        const status = {
          bot: "whatsapp-web.js",
          mode: process.env.WA_APPROVE_MODE || "canned-auto",
          note: "Bot runs as separate process via 'npm run wa:run'",
          instructions: [
            "1. Run: npm run wa:run",
            "2. Scan the QR code shown in terminal",
            "3. Bot will auto-reply to incoming messages",
          ],
          envVars: {
            WA_APPROVE_MODE: process.env.WA_APPROVE_MODE || "canned-auto (default)",
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "set" : "not set (canned only)",
          },
        };

        return Response.json(status, { status: 200 });
      },
    },
  },
});
