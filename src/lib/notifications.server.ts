// Server-only notification helpers. Failures are logged, never thrown.
import { q } from "./db.server";

async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await q<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key = ANY($1::text[])`,
    [keys],
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));
  return map;
}

// ─── Telegram with Inline WhatsApp Buttons ─────────────────────────────────
// Sends a Telegram alert with inline buttons. Tapping a button sends a
// pre-filled WhatsApp message to the customer — no admin page needed.

function encodeCb(data: string): string {
  return Buffer.from(data).toString("base64url");
}

export async function sendTelegramWithWhatsAppButtons(opts: {
  customerName: string;
  customerWhatsapp: string;
  poppoId: string;
  packageName: string;
  quantity: number;
  amountRupees: string;
  orderId: string;
  coins: number;
  alertType: "payment_confirmed" | "order_completed" | "new_order" | "refund";
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return { ok: false, skipped: true };

  const trackUrl = `${process.env.PUBLIC_APP_URL || "https://barbieverse.org"}/track?id=${opts.orderId}`;
  const shortId = opts.orderId.slice(0, 8);

  const titles: Record<string, string> = {
    payment_confirmed: "🎀 PAYMENT CONFIRMED",
    order_completed: "✅ ORDER COMPLETED",
    new_order: "💰 NEW ORDER",
    refund: "💸 REFUND PROCESSED",
  };

  let msg = `${titles[opts.alertType] || "📦 ORDER UPDATE"}\n\n` +
    `👤 Customer: ${opts.customerName}\n` +
    `📱 WhatsApp: ${opts.customerWhatsapp}\n` +
    `🎮 Poppo ID: ${opts.poppoId}\n` +
    `📦 ${opts.coins} coins (${opts.packageName})\n` +
    `💰 Amount: ₹${opts.amountRupees}\n` +
    `📋 Order: #${shortId}`;

  // Build inline keyboard buttons
  const buttons: any[][] = [];

  if (opts.alertType === "payment_confirmed" || opts.alertType === "new_order") {
    // Payment received + Coins credited buttons
    buttons.push([
      {
        text: "💬 Send Payment Received",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Your payment of ₹${opts.amountRupees} for ${opts.coins} coins (Order #${shortId}) has been received. We're processing your order now.`
        )}`,
      },
    ]);
    buttons.push([
      {
        text: "🎉 Send Coins Credited",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Your ${opts.coins} coins have been credited to Poppo ID ${opts.poppoId}! 🎉 Enjoy streaming! Thank you for choosing Barbieverse 💖`
        )}`,
      },
    ]);
    buttons.push([
      {
        text: "🔗 Send Track Link",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Track your order here: ${trackUrl}`
        )}`,
      },
    ]);
  }

  if (opts.alertType === "order_completed") {
    buttons.push([
      {
        text: "🎉 Send Coins Credited",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Your ${opts.coins} coins have been credited to Poppo ID ${opts.poppoId}! 🎉 Enjoy streaming! Thank you for choosing Barbieverse 💖`
        )}`,
      },
    ]);
    buttons.push([
      {
        text: "🔗 Send Track Link",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Your order #${shortId} is complete. Track here: ${trackUrl}`
        )}`,
      },
    ]);
  }

  if (opts.alertType === "refund") {
    buttons.push([
      {
        text: "💸 Send Refund Info",
        url: `https://wa.me/${opts.customerWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${opts.customerName}! Your refund of ₹${opts.amountRupees} for Order #${shortId} has been processed. It will reflect in your account within 3-5 business days.`
        )}`,
      },
    ]);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: "HTML",
        reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
      }),
    });
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

// ─── WhatsApp Notifications (One-Click Manual) ─────────────────────────────
// WhatsApp messages are sent manually by admin via one-click buttons in admin panel
// This function generates pre-filled WhatsApp URLs for manual sending

export function getWhatsAppUrl(opts: {
  to: string; // phone with country code
  message: string;
}): string {
  const phone = opts.to.replace(/[^0-9]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(opts.message)}`;
}

// Convenience wrappers for generating WhatsApp messages
export function getWhatsAppPaymentReceivedMessage(opts: {
  name: string;
  orderId: string;
  coins: number;
  poppoId: string;
  amount: string;
}): string {
  return `Hi ${opts.name}, we received your payment for Order #${opts.orderId.slice(0,8)}. Your ${opts.coins} coins for Poppo ID ${opts.poppoId} will be credited within 30 minutes. Track: ${process.env.PUBLIC_APP_URL || "https://barbieverse.org"}/track?id=${opts.orderId}`;
}

export function getWhatsAppCoinsCreditedMessage(opts: {
  name: string;
  orderId: string;
  coins: number;
  poppoId: string;
}): string {
  return `Hi ${opts.name}, your ${opts.coins} coins have been credited to Poppo ID ${opts.poppoId}! 🎉 Enjoy streaming! Thank you for choosing Barbieverse 💖`;
}


// ─── Email (Brevo) ──────────────────────────────────────────────────────────
export async function sendBrevoEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[brevo] BREVO_API_KEY not set, skipping email to", opts.to);
    return { ok: false, skipped: true };
  }
  const s = await getSettings(["brevo_sender_email", "brevo_sender_name"]);
  const senderEmail = s.brevo_sender_email || "noreply@barbieverse.org";
  const senderName = s.brevo_sender_name || "Barbieverse";
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: opts.to, name: opts.toName || opts.to }],
        subject: opts.subject,
        htmlContent: opts.htmlContent,
      }),
    });
    if (!res.ok) {
      console.error("[brevo] send failed", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[brevo] error", e);
    return { ok: false };
  }
}

// ─── Email HTML Templates ───────────────────────────────────────────────────
export function welcomeEmailHtml(name: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#0a0a0a;color:#fff;padding:32px;">
      <div style="max-width:560px;margin:0 auto;background:#141414;border-radius:16px;padding:32px;border:1px solid #2a2a2a;">
        <h1 style="color:#ff3b8b;margin:0 0 8px 0;font-size:28px;">Welcome to Barbieverse, ${name}! 💖</h1>
        <p style="color:#d0d0d0;line-height:1.6;">
          Thank you for joining our influencer family. You're now part of the
          <b style="color:#ff3b8b;">Barbieverse creator ecosystem</b> on Poppo Live.
        </p>
        <p style="color:#d0d0d0;line-height:1.6;">
          Our team will reach out on WhatsApp shortly with your next steps and exclusive perks.
        </p>
        <p style="margin-top:24px;color:#888;font-size:13px;">— Team Barbieverse · barbieverse.org</p>
      </div>
    </div>
  `;
}

// ─── Convenience wrappers for common notifications ──────────────────────────

/** Send welcome message to new creator lead */
export async function notifyNewLead(opts: {
  mobile: string;
  name?: string;
  platform: string;
}) {
  const s = await getSettings(["admin_whatsapp"]);

  // Notify admin via Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    const msg = `🎀 <b>NEW CREATOR LEAD</b>\n\n👤 Name: ${opts.name || "Unknown"}\n📱 Mobile: ${opts.mobile}\n🌐 Platform: ${opts.platform}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
    });
  }
  // Customer notification: admin sends manually via WhatsApp button
}

/** Send order confirmation */
export async function notifyOrderPlaced(opts: {
  whatsapp: string;
  orderId: string;
  coins: number;
  amount: string;
}) {
  // Admin gets Telegram alert, customer gets manual WhatsApp
}

/** Send payment received */
export async function notifyPaymentReceived(opts: {
  whatsapp: string;
  orderId: string;
}) {
  // Admin gets Telegram alert, customer gets manual WhatsApp
}

/** Send coins credited */
export async function notifyCoinsCredited(opts: {
  whatsapp: string;
  orderId: string;
  coins: number;
}) {
  // Admin gets Telegram alert, customer gets manual WhatsApp
}

/** Send refund status */
export async function notifyRefundStatus(opts: {
  whatsapp: string;
  orderId: string;
  status: string;
  amount: string;
}) {
  // Admin gets Telegram alert, customer gets manual WhatsApp
}
