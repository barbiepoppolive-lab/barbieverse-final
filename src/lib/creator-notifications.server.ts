// Real WhatsApp + Email confirmation for new creator leads.
// Uses existing Interakt webhook + Brevo helpers via settings table.

import { platformLabel, platformReferralUrl } from "./creator-config";

export async function sendVerificationMessage(args: {
  to: string | null;
  application_id: string;
}) {
  try {
    const { sendInteraktNotification } = await import("./notifications.server");
    if (args.to) {
      await sendInteraktNotification({
        to: args.to,
        message:
          `✅ Story verified! Application ${args.application_id}\n\n` +
          `Your ₹500 reward is pending admin approval. We will confirm payment within 24 hours.\n\n` +
          `Track: barbieverse.org/track-application?id=${args.application_id}`,
      });
    }
  } catch (e) {
    console.error("[verification message]", e);
  }
}

export async function sendApprovalMessage(args: {
  to: string | null;
  application_id: string;
  upi_id: string;
}) {
  try {
    const { sendInteraktNotification } = await import("./notifications.server");
    if (args.to) {
      await sendInteraktNotification({
        to: args.to,
        message:
          `🎉 Reward approved! Application ${args.application_id}\n\n` +
          `₹500 will be sent to your UPI: ${args.upi_id}\n\n` +
          `Check your UPI in 5-10 minutes. Thank you for joining BarbieVerse 💖`,
      });
    }
  } catch (e) {
    console.error("[approval message]", e);
  }
}

export async function sendCreatorWelcome(args: {
  to: string | null;
  application_id: string;
  platform: string;
  intent?: string;
}) {
  const label = platformLabel(args.platform);
  const referral = platformReferralUrl(args.platform);

  const intentUrl =
    args.intent === "reward_only" || args.intent === "curious"
      ? "https://barbieverse.org/verify"
      : "https://barbieverse.org";

  const waMessage =
    `🌸 Welcome to BarbieVerse!\n\n` +
    `Your Application ID: ${args.application_id}\n` +
    `Platform: ${label}\n\n` +
    `Your ₹500 creator bonus is reserved 💖\n\n` +
    `Next step: Complete your ${label} signup here →\n${referral}\n\n` +
    `Track your application: barbieverse.org/track-application`;

  try {
    const { sendInteraktNotification } = await import("./notifications.server");

    // 1. Send confirmation to the creator
    if (args.to) {
      await sendInteraktNotification({ to: args.to, message: waMessage });
    }

    // 2. Notify admin about the new lead
    await sendInteraktNotification({
      message:
        `🆕 New Creator Lead\n` +
        `ID: ${args.application_id}\n` +
        `Platform: ${label}\n` +
        `Intent: ${args.intent || "—"}\n` +
        `Mobile: ${args.to || "—"}\n` +
        `→ /admin/creator-leads`,
    });
  } catch (e) {
    console.error("[creator welcome notify]", e);
  }

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
