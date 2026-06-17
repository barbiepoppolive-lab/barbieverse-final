// Creator notifications — sends Telegram alerts to admin.
// Customer-facing WhatsApp messages require an API (not configured).

import { platformLabel, platformReferralUrl } from "./creator-config";

async function sendTelegramAlert(text: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("[telegram alert]", e);
  }
}

export async function sendVerificationMessage(args: {
  to: string | null;
  application_id: string;
}) {
  await sendTelegramAlert(
    `✅ <b>STORY VERIFIED</b>\n\n` +
    `Application: ${args.application_id}\n` +
    `Mobile: ${args.to || "—"}\n` +
    `Reward pending admin approval.`
  );
}

export async function sendApprovalMessage(args: {
  to: string | null;
  application_id: string;
  upi_id: string;
}) {
  await sendTelegramAlert(
    `🎉 <b>REWARD APPROVED</b>\n\n` +
    `Application: ${args.application_id}\n` +
    `UPI: ${args.upi_id}\n` +
    `Action: Mark as completed in admin panel.`
  );
}

export async function sendCreatorWelcome(args: {
  to: string | null;
  application_id: string;
  platform: string;
  intent?: string;
}) {
  const label = platformLabel(args.platform);

  await sendTelegramAlert(
    `🆕 <b>NEW CREATOR LEAD</b>\n\n` +
    `ID: ${args.application_id}\n` +
    `Platform: ${label}\n` +
    `Intent: ${args.intent || "—"}\n` +
    `Mobile: ${args.to || "—"}\n\n` +
    `→ Admin → Creator Leads`
  );

  try {
    const { q } = await import("./db.server");
    await q(
      `UPDATE creator_leads SET notified_at = now() WHERE application_id = $1`,
      [args.application_id],
    );
  } catch (e) {
    console.error("[creator welcome notified_at]", e);
  }

  return { queued: true };
}
