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

// ─── WhatsApp Cloud API (Meta Official) ──────────────────────────────────────
// Uses graph.facebook.com directly — no BSP needed.
// Required env vars:
//   WHATSAPP_PHONE_NUMBER_ID  — from Meta Developer Dashboard
//   WHATSAPP_ACCESS_TOKEN     — from Meta Developer Dashboard (permanent token recommended)

export async function sendWhatsAppNotification(opts: {
  to: string; // phone with country code, e.g. 9198xxxxxxx (no + or spaces)
  template: string; // template name approved in Meta Business Manager
  lang?: string; // template language code, default "en"
  params?: string[]; // template parameters (optional)
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set, skipping");
    return { ok: false, skipped: true };
  }

  const to = opts.to.replace(/[^0-9]/g, ""); // sanitize: digits only
  const lang = opts.lang || "en";

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: opts.template,
            language: { code: lang },
            ...(opts.params?.length
              ? {
                  components: [
                    {
                      type: "body",
                      parameters: opts.params.map((p) => ({ type: "text", text: p })),
                    },
                  ],
                }
              : {}),
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[whatsapp] send failed", res.status, JSON.stringify(data));
      return { ok: false, error: data };
    }

    console.log("[whatsapp] sent to", to, "template:", opts.template);
    return { ok: true, data };
  } catch (e) {
    console.error("[whatsapp] error", e);
    return { ok: false };
  }
}

// ─── Legacy Interakt support (for users still on Interakt webhook) ──────────
export async function sendInteraktNotification(opts: {
  message: string;
  to?: string;
}) {
  const s = await getSettings(["interakt_webhook", "admin_whatsapp"]);
  const url = s.interakt_webhook;
  if (!url) {
    console.warn("[interakt] webhook URL not configured");
    return { ok: false, skipped: true };
  }
  const to = opts.to || s.admin_whatsapp;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: to, message: opts.message }),
    });
    if (!res.ok) {
      console.error("[interakt] send failed", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[interakt] error", e);
    return { ok: false };
  }
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
          Thank you for joining our influencer family. You're eligible for our
          <b style="color:#ff3b8b;">₹500 joining bonus</b> on the Poppo Live app.
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

  // Notify admin
  if (s.admin_whatsapp) {
    await sendWhatsAppNotification({
      to: s.admin_whatsapp,
      template: "new_lead_alert",
      lang: "en",
      params: [opts.name || "Unknown", opts.mobile, opts.platform],
    });
  }

  // Notify lead (if they have WhatsApp)
  await sendWhatsAppNotification({
    to: opts.mobile,
    template: "welcome_creator",
    lang: "en",
    params: [opts.name || "Creator", opts.platform],
  });
}

/** Send order confirmation */
export async function notifyOrderPlaced(opts: {
  whatsapp: string;
  orderId: string;
  coins: number;
  amount: string;
}) {
  await sendWhatsAppNotification({
    to: opts.whatsapp,
    template: "order_placed",
    lang: "en",
    params: [opts.orderId, String(opts.coins), `₹${opts.amount}`],
  });
}

/** Send payment received */
export async function notifyPaymentReceived(opts: {
  whatsapp: string;
  orderId: string;
}) {
  await sendWhatsAppNotification({
    to: opts.whatsapp,
    template: "payment_received",
    lang: "en",
    params: [opts.orderId],
  });
}

/** Send coins credited */
export async function notifyCoinsCredited(opts: {
  whatsapp: string;
  orderId: string;
  coins: number;
}) {
  await sendWhatsAppNotification({
    to: opts.whatsapp,
    template: "coins_credited",
    lang: "en",
    params: [opts.orderId, String(opts.coins)],
  });
}

/** Send refund status */
export async function notifyRefundStatus(opts: {
  whatsapp: string;
  orderId: string;
  status: string;
  amount: string;
}) {
  await sendWhatsAppNotification({
    to: opts.whatsapp,
    template: "refund_status",
    lang: "en",
    params: [opts.orderId, `₹${opts.amount}`, opts.status],
  });
}
