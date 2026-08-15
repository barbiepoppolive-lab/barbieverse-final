// Stage machine helpers for the WhatsApp agent.
// ---------------------------------------------------------------------------
// Stages (from migration 20260815_001):
//   NEW · ASKED · LINK_SENT · INSTALLING · INSTALLED
//   AGENCY_LINKED ★ · FACE_VERIFIED ★ · FIRST_LIVE ★ · ACTIVE
//   side exits: STALLED · ESCALATED · NOT_INTERESTED
//
// ★ = the three conversions. Each verified by screenshot, checked by Barbie
// via the Telegram buttons wired in here.

/** The three screenshot-verified conversion steps, in funnel order. */
export type VerifyTarget = "AGENCY_LINKED" | "FACE_VERIFIED" | "FIRST_LIVE";

export const VERIFY_AFTER: Record<string, VerifyTarget[]> = {
  INSTALLED: ["AGENCY_LINKED"],
  AGENCY_LINKED: ["FACE_VERIFIED"],
  FACE_VERIFIED: ["FIRST_LIVE"],
};

export const VERIFY_TIMESTAMP_COL: Record<VerifyTarget, string> = {
  AGENCY_LINKED: "agency_verified_at",
  FACE_VERIFIED: "face_verified_at",
  FIRST_LIVE: "first_live_at",
};

export const VERIFY_LABEL: Record<VerifyTarget, string> = {
  AGENCY_LINKED: "Agency linked",
  FACE_VERIFIED: "Face verified",
  FIRST_LIVE: "First live done",
};

/** Which verification button(s) make sense for a lead at this stage. */
export function verifyTargetsFor(stage: string): VerifyTarget[] {
  return VERIFY_AFTER[stage] ?? [];
}

/** How the agent should proceed after a verified conversion. */
export const NEXT_STAGE_AFTER: Record<VerifyTarget, string> = {
  AGENCY_LINKED: "FACE_VERIFIED",
  FACE_VERIFIED: "FIRST_LIVE",
  FIRST_LIVE: "ACTIVE",
};

// Guard ID for a verification button tap. Encodes the target + lead id so the
// callback doesn't need to look up which one was just confirmed.
export function verifyCardId(leadId: string, target: VerifyTarget): string {
  return `wa:verify:${target}:${leadId}`;
}

export function parseVerifyId(
  data: string,
): { target: VerifyTarget; leadId: string } | null {
  const m = /^wa:verify:(AGENCY_LINKED|FACE_VERIFIED|FIRST_LIVE):([0-9a-f-]{36})$/i.exec(
    data || "",
  );
  if (!m) return null;
  return { target: m[1] as VerifyTarget, leadId: m[2] };
}

/**
 * Record a stage transition on a lead: bumps `stage`, sets the conversion
 * timestamp if this is a ★ event, and appends a row to wa_events.
 */
export async function transitionStage(
  q: any,
  leadId: string,
  toStage: string,
  fromStage?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const from = fromStage ?? undefined;
  if (from === toStage) return;

  const tsCol = (Object.keys(VERIFY_TIMESTAMP_COL) as VerifyTarget[]).find(
    (t) => t === toStage,
  );
  if (tsCol) {
    await q(
      `update wa_leads set stage = $2, ${VERIFY_TIMESTAMP_COL[tsCol]} = now(), updated_at = now() where id = $1`,
      [leadId, toStage],
    );
  } else {
    await q(`update wa_leads set stage = $2, updated_at = now() where id = $1`, [
      leadId,
      toStage,
    ]);
  }

  await q(
    `insert into wa_events (lead_id, event, from_stage, to_stage, meta)
     values ($1, 'stage_change', $2, $3, $4)`,
    [leadId, from ?? null, toStage, meta ? JSON.stringify(meta) : null],
  );
}

/** Send the screenshot to Barbie with the right verification button(s). */
export async function sendScreenshotCard(
  leadId: string,
  phone: string,
  mediaUrl: string | undefined,
  stage: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat || !mediaUrl) return;

  const targets = verifyTargetsFor(stage);
  const buttons = targets.map((t) => [
    { text: `✅ ${VERIFY_LABEL[t]}`, callback_data: verifyCardId(leadId, t) },
  ]);

  const text = `📸 <b>Screenshot from +${phone}</b>\nStage: ${stage}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        photo: mediaUrl,
        caption: text,
        parse_mode: "HTML",
        reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined,
      }),
    });
  } catch (e) {
    console.error("[wa/stages] screenshot card failed", e);
  }
}

/** Handle a verification-button tap from Barbie. */
export async function dispatchVerify(args: {
  callbackQueryId: string;
  data: string;
}): Promise<string> {
  const parsed = parseVerifyId(args.data);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!parsed || !token) {
    if (parsed) await answerQuery(args.callbackQueryId, "ignored");
    return "invalid";
  }

  const { q, q1 } = await import("@/lib/db.server");
  const lead = await q1<any>(`select * from wa_leads where id = $1`, [parsed.leadId]);
  if (!lead) {
    await answerQuery(args.callbackQueryId, "lead not found");
    return "missing";
  }

  const from = lead.stage;
  await transitionStage(q, lead.id, parsed.target, from, { source: "screenshot_verify" });

  // after a conversion, reset the chase timer for the next step
  await q(
    `update wa_leads set follow_up_due = now() + interval '1 hour' where id = $1`,
    [lead.id],
  );

  await answerQuery(
    args.callbackQueryId,
    `✅ ${VERIFY_LABEL[parsed.target]} — stage now ${parsed.target}`,
  );
  return `verified:${parsed.target}`;
}

async function answerQuery(queryId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: queryId, text, show_alert: false }),
    });
  } catch (e) {
    console.error("[wa/stages] answerCallbackQuery error:", e);
  }
}