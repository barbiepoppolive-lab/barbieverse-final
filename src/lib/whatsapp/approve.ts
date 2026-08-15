// Telegram approve loop — the only place a human eyes a draft before send.
// ---------------------------------------------------------------------------
// Draft → card with [✅ Send] [✍️ Edit] [⏭️ Skip] [🙋 Take over].
// Callbacks land in telegram-bot.ts → dispatchCallback() here.
//
// Every decision is logged to wa_drafts. The metric that decides auto-send is
// the unedited-send rate: >85% across 100+ drafts in a stage → auto-send with
// spot-checks. Below ~60% → the prompt/answers need work.
//
// Barbie's own edits are re-checked through the compliance gate before send —
// a remembered number typed by hand is exactly how a banned figure gets back in.

import { sendSession, sendImage, windowOpen } from "./aisensy";
import { complianceCheck } from "./answer-bank";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT = process.env.TELEGRAM_CHAT_ID || "";

const MEDIA_BASE = `${process.env.PUBLIC_APP_URL || "https://barbieverse.org"}/cards`;

export type ApproveAction = "send" | "edit" | "skip" | "takeover";

export function cardId(draftId: string, action: ApproveAction): string {
  return `wa:${action}:${draftId}`;
}

export function parseCardId(data: string): { action: ApproveAction; draftId: string } | null {
  const m = /^wa:(send|edit|skip|takeover):([0-9a-f-]{36})$/i.exec(data || "");
  if (!m) return null;
  return { action: m[1] as ApproveAction, draftId: m[2] };
}

interface CardInput {
  draftId: string;
  phone: string;
  displayName?: string;
  triggerText: string;
  draftText: string;
  source: string;
  mediaTag?: string;
  replyToMsg?: number; // to edit the same message instead of a new one
}

/** Send the approval card to Barbie's Telegram. */
export async function sendApproveCard(input: CardInput): Promise<number | null> {
  if (!TOKEN || !CHAT) return null;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const text =
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💬 <b>${esc(input.displayName || "Lead")}</b> · +${input.phone}\n` +
    `src: ${esc(input.source)}${input.mediaTag ? ` · 🖼 ${esc(input.mediaTag)}` : ""}\n\n` +
    `SHE SAID\n<code>${esc(input.triggerText.slice(0, 300))}</code>\n\n` +
    `DRAFT\n<code>${esc(input.draftText.slice(0, 600))}</code>`;

  const buttons = [
    [
      { text: "✅ Send", callback_data: cardId(input.draftId, "send") },
      { text: "✍️ Edit", callback_data: cardId(input.draftId, "edit") },
    ],
    [
      { text: "⏭️ Skip", callback_data: cardId(input.draftId, "skip") },
      { text: "🙋 Take over", callback_data: cardId(input.draftId, "takeover") },
    ],
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[wa/approve] sendMessage failed:", res.status, JSON.stringify(data));
      return null;
    }
    return data.result?.message_id ?? null;
  } catch (e) {
    console.error("[wa/approve] sendMessage error:", e);
    return null;
  }
}

/** Migrate a plain card message to one with buttons (for drafts created before buttons existed). */
export async function addButtons(messageId: number) {
  if (!TOKEN || !CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, message_id: messageId }),
    });
  } catch (e) {
    console.error("[wa/approve] addButtons error:", e);
  }
}

async function answer(queryId: string, text?: string) {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: queryId, text: text || "ok", show_alert: false }),
    });
  } catch (e) {
    console.error("[wa/approve] answerCallbackQuery error:", e);
  }
}

interface DispatcherArgs {
  callbackQueryId: string;
  data: string;
}

/** Handle a callback button tap. Returns a short status string for the log. */
export async function dispatchCallback(args: DispatcherArgs): Promise<string> {
  const parsed = parseCardId(args.data);
  if (!parsed) {
    await answer(args.callbackQueryId, "ignored");
    return "unknown-callback";
  }
  const { action, draftId } = parsed;

  if (action === "takeover") {
    const { q } = await import("@/lib/db.server");
    await q(
      `update wa_drafts d set decision = 'takeover', decided_at = now()
         from wa_leads l where d.id = $1 and l.id = d.lead_id`,
      [draftId],
    );
    await q(
      `update wa_leads l set human_takeover = true, updated_at = now()
         from wa_drafts d where d.id = $1 and l.id = d.lead_id`,
      [draftId],
    );
    await answer(args.callbackQueryId, "you have the conversation");
    return "takeover";
  }

  if (action === "skip") {
    const { q } = await import("@/lib/db.server");
    await q(`update wa_drafts set decision = 'skipped', decided_at = now() where id = $1`, [draftId]);
    await answer(args.callbackQueryId, "skipped");
    return "skipped";
  }

  if (action === "edit") {
    const { q } = await import("@/lib/db.server");
    // Exactly ONE draft may await an edit at a time. Barbie's next typed
    // message is matched to whatever is pending, so if two were open her
    // correction for lead A could be sent to lead B. Opening a new edit
    // therefore cancels any other — the cancelled one just stays a draft and
    // its card is still tappable.
    await q(`update wa_drafts set edit_pending = false where edit_pending and id <> $1`, [draftId]);
    await q(`update wa_drafts set edit_pending = true where id = $1`, [draftId]);
    await answer(args.callbackQueryId, "reply with corrected text");
    return "awaiting-edit";
  }

  // action === "send"
  const { q, q1 } = await import("@/lib/db.server");
  const draft = await q1<any>(
    `select d.id, d.lead_id, d.draft_text, d.media_tag, d.source, l.phone, l.last_inbound_at, l.stage
       from wa_drafts d join wa_leads l on l.id = d.lead_id
      where d.id = $1`,
    [draftId],
  );
  if (!draft) {
    await answer(args.callbackQueryId, "draft not found");
    return "missing";
  }

  const text = (draft.draft_text || "").trim();
  const gate = complianceCheck(text);
  if (!gate.ok) {
    await answer(args.callbackQueryId, "blocked by compliance — edit it");
    console.warn("[wa/approve] send blocked by gate:", gate.issues);
    return "blocked";
  }

  if (!windowOpen(draft.last_inbound_at)) {
    await answer(args.callbackQueryId, "24h window closed — use template later");
    return "window-closed";
  }

  try {
    if (draft.media_tag) {
      await sendImage(draft.phone, `${MEDIA_BASE}/${draft.media_tag}.png`);
    }
    await sendSession(draft.phone, text);
  } catch (e: any) {
    await answer(args.callbackQueryId, "send failed, check logs");
    console.error("[wa/approve] send failed:", e?.message);
    return "send-error";
  }

  await q(
    `insert into wa_messages (lead_id, direction, body, media_url, status)
     values ($1, 'out', $2, $3, 'sent')`,
    [draft.lead_id, text, draft.media_tag ? `${MEDIA_BASE}/${draft.media_tag}.png` : null],
  );
  await q(
    `update wa_drafts set decision = 'sent', final_text = $2, decided_at = now() where id = $1`,
    [draftId, text],
  );
  await q(
    `update wa_leads set last_outbound_at = now(), follow_up_due = now() + interval '20 hours', updated_at = now() where id = $1`,
    [draft.lead_id],
  );

  // Stage transition (same logic as the auto-send path): sending the join link
  // moves her to LINK_SENT; the first reply on a fresh lead moves NEW → ASKED.
  const { transitionStage } = await import("@/lib/whatsapp/stages");
  const isLink =
    draft.source === "canned:Q11" || (draft.source || "").startsWith("canned:Q11");
  if (isLink) {
    await transitionStage(q, draft.lead_id, "LINK_SENT", draft.stage, { trigger: "link_sent_approved" });
  } else if (draft.stage === "NEW") {
    await transitionStage(q, draft.lead_id, "ASKED", draft.stage, { trigger: "first_reply_approved" });
  }

  await answer(args.callbackQueryId, "sent ✅");
  return "sent";
}