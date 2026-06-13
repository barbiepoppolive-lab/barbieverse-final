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

export async function sendInteraktNotification(opts: {
  message: string;
  to?: string; // phone with country code, e.g. 9198xxxxxxx
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
