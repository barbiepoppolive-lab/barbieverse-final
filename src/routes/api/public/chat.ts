import { createFileRoute } from "@tanstack/react-router";
import { aiRoute } from "@/lib/ai/router";

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const message = body.message?.trim();
          if (!message) {
            return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const systemPrompt = `You are Barbie, the friendly AI assistant for Barbieverse — a platform for Poppo/Vone Live creators in India.

YOUR KNOWLEDGE:
- Coin packages: Starter (100 coins ₹99), Popular (500 coins ₹449), Value (1000 coins ₹849), Mega (5000 coins ₹3999)
- Payment: UPI only. UPI ID: thestrongwingsofficial@okaxis. Zero extra charges.
- How to find Poppo/Vone ID: Open app → tap My → numeric ID below profile photo
- Delivery: Within 30 minutes of payment verification
- Order tracking: barbieverse.org/track?id=ORDER_ID
- Admin WhatsApp: 91900096630
- Poppo signup: agency ID 2517496
- Academy: free training for new creators
- Earning potential: ₹1,150 in first week, ₹20K-50K monthly

RULES:
- Be warm, friendly, and helpful — like a supportive friend
- Use emojis naturally (💖, 🪙, ✨, 🎉, etc.)
- Keep answers short (2-3 sentences max)
- If unsure, direct them to WhatsApp support
- Never share passwords or sensitive info
- Focus on helping them recharge coins or become creators

Respond in a fun, upbeat tone. Use Hinglish if the user writes in Hindi.`;

          const result = await aiRoute({
            prompt: message,
            taskType: "chat",
            systemPrompt,
            maxTokens: 256,
          });

          return new Response(JSON.stringify({ reply: result.text }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Chat API error:", err);
          return new Response(JSON.stringify({ reply: "Oops! Something went wrong. Try again or WhatsApp us directly! 💬" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
