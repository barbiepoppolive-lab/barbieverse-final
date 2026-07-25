// Moj Recruitment Pipeline
//
// End-to-end: crawl Moj → classify the creator → find a way to actually
// reach them → route.
//
// The routing split is the whole point. Previously every Moj "lead" was a
// handle with no contact channel, so nothing could happen to it and the
// pipeline reported success while producing zero conversations. Now each
// candidate goes down exactly one of two paths:
//
//   CONTACTABLE  — they published an Instagram/WhatsApp/Telegram/email in
//                  their own Moj bio. Stored with that channel and a
//                  ready-to-send opener, so outreach is one tap.
//   QUEUED       — nothing reachable published. Goes to a Telegram batch
//                  with a suggested comment for you to leave inside the Moj
//                  app by hand. Slower, but it's the only honest option and
//                  it stops these leads being silently discarded.
//
// Segment drives the pitch. A Moj Live host already streams for gifts, so
// the opener is a comparison. Someone posting earning content has never
// streamed, so the opener leads with the first-week guarantee. Sending both
// the same message is why generic outreach doesn't convert.

import { crawlMoj, type MojCandidate, type MojSegment } from "@/lib/social-monitor/moj";
import { bestContact, type ExtractedContact } from "@/lib/social-monitor/moj-contact";
import { generateOutreachDM, type OutreachAngle } from "@/lib/ai/modules/outreach-writer";
import { generateComment } from "@/lib/social-monitor/ai-comment";

export interface MojPipelineResult {
  crawled: number;
  candidates: number;
  contactable: number;
  queued: number;
  skippedDuplicate: number;
  parserUsed: string;
  warnings: string[];
}

// ── Openers and comments ─────────────────────────────────
// Both are written per person by AI rather than filled from a template.
// The earlier fixed templates failed for a specific reason worth keeping in
// mind: an opener that works for everyone is, by definition, addressed to
// no one. Creators in this market receive several agency DMs a week and can
// spot a mail-merge instantly — the giveaway is a first message that
// compliments nothing specific and states the whole offer up front.
//
// The commercial terms are NOT AI-generated. Those live in offerFollowUp()
// and go out only after someone replies, so the numbers are always stated
// identically and correctly.

function angleForSegment(segment: MojSegment): OutreachAngle {
  if (segment === "live_host") return "already_creator";
  if (segment === "earning_content") return "money_motivated";
  return "new_to_streaming";
}

// ── Telegram ─────────────────────────────────────────────

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e: any) {
    console.error("[moj-pipeline] Telegram send failed:", e?.message);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Persistence ──────────────────────────────────────────

async function storeCandidate(
  c: MojCandidate,
  contact: ExtractedContact | null,
  opener: string
): Promise<"stored" | "duplicate" | "error"> {
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ id: string }>(
      `INSERT INTO social_leads (
         platform, post_url, post_text, author_name, author_username,
         author_profile_url, keyword_matched, engagement_score,
         ai_generated_comment, ai_confidence, ai_category, status,
         moj_segment, moj_fit_score, moj_fit_reason,
         contact_channel, contact_value, contact_action_url, contact_confidence
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (post_url) DO NOTHING
       RETURNING id`,
      [
        "moj",
        c.postUrl,
        c.postText,
        c.authorName,
        c.authorUsername,
        c.authorProfileUrl,
        c.keywordMatched,
        c.likes + c.comments + c.shares,
        opener,
        c.fitScore / 100,
        c.fitScore >= 65 ? "hot" : c.fitScore >= 45 ? "warm" : "cold",
        contact ? "discovered" : "queued_manual",
        c.segment,
        c.fitScore,
        c.fitReason,
        contact?.channel || null,
        contact?.value || null,
        contact?.actionUrl || null,
        contact?.confidence || null,
      ]
    );
    return rows.length > 0 ? "stored" : "duplicate";
  } catch (e: any) {
    console.error("[moj-pipeline] store failed:", e?.message);
    return "error";
  }
}

// ── Main ─────────────────────────────────────────────────

export async function runMojPipeline(opts?: {
  maxPages?: number;
  maxCandidates?: number;
  minFitScore?: number;
  /** Skip Telegram output — used by tests / dry runs */
  silent?: boolean;
}): Promise<MojPipelineResult> {
  // Load seeds + keywords from settings
  let seeds: string[] = [];
  let keywords: string[] = [];
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN ('scraper_moj_seeds', 'scraper_keywords')`
    );
    for (const r of rows) {
      const list = (r.value || "").split("\n").map((s) => s.trim()).filter(Boolean);
      if (r.key === "scraper_moj_seeds") seeds = list;
      if (r.key === "scraper_keywords") keywords = list;
    }
  } catch (e: any) {
    console.warn("[moj-pipeline] could not load settings:", e?.message);
  }

  const crawl = await crawlMoj({
    seeds,
    keywords,
    maxPages: opts?.maxPages,
    maxCandidates: opts?.maxCandidates,
    minFitScore: opts?.minFitScore,
  });

  const contactable: Array<{ c: MojCandidate; contact: ExtractedContact; opener: string }> = [];
  const queued: Array<{ c: MojCandidate; comment: string }> = [];
  let skippedDuplicate = 0;
  const recentMessages: string[] = [];
  const recentComments: string[] = [];

  for (const c of crawl.candidates) {
    const bio: string = c.raw?.profile?.bio || "";
    const contact = bestContact(bio);

    // Contactable → a DM. Not contactable → a comment on their video, which
    // is a different job: a comment has to look like a normal viewer, not a
    // pitch, or it gets deleted and the account gets flagged.
    let opener: string;
    let comment = "";

    if (contact) {
      const dm = await generateOutreachDM({
        name: c.authorName || c.handle,
        angle: angleForSegment(c.segment),
        platform: "moj",
        bio,
        postCaption: c.postText,
        followers: c.raw?.profile?.followers,
        recentMessages,
      });
      opener = dm.message;
      recentMessages.unshift(opener);
      if (recentMessages.length > 6) recentMessages.pop();
    } else {
      const generated = await generateComment(
        c.postText || "",
        "moj",
        c.authorName || c.handle,
        undefined,
        undefined,
        recentComments
      );
      comment = generated.comment;
      opener = comment;
      recentComments.unshift(comment);
      if (recentComments.length > 8) recentComments.pop();
    }

    const result = await storeCandidate(c, contact, opener);
    if (result === "duplicate") {
      skippedDuplicate++;
      continue;
    }

    if (contact) contactable.push({ c, contact, opener });
    else queued.push({ c, comment });
  }

  if (!opts?.silent) {
    await reportToTelegram(crawl, contactable, queued, skippedDuplicate);
  }

  return {
    crawled: crawl.pagesFetched,
    candidates: crawl.candidates.length,
    contactable: contactable.length,
    queued: queued.length,
    skippedDuplicate,
    parserUsed: crawl.parserUsed,
    warnings: crawl.warnings,
  };
}

async function reportToTelegram(
  crawl: Awaited<ReturnType<typeof crawlMoj>>,
  contactable: Array<{ c: MojCandidate; contact: ExtractedContact; opener: string }>,
  queued: Array<{ c: MojCandidate; comment: string }>,
  skippedDuplicate: number
) {
  // Header + health
  let header =
    `🎯 <b>MOJ RECRUITMENT RUN</b>\n\n` +
    `Pages crawled: ${crawl.pagesFetched}\n` +
    `Videos parsed: ${crawl.videosSeen} (parser: ${crawl.parserUsed})\n` +
    `Candidates: ${crawl.candidates.length}\n` +
    `✅ Contactable: ${contactable.length}\n` +
    `📋 Manual queue: ${queued.length}\n` +
    `↩️ Already seen: ${skippedDuplicate}\n`;

  for (const w of crawl.warnings) {
    header += `\n⚠️ ${escapeHtml(w)}\n`;
  }

  await sendTelegram(header);

  // Contactable leads — one message each so the action link is tappable
  for (const { c, contact, opener } of contactable.slice(0, 10)) {
    const msg =
      `✅ <b>${escapeHtml(c.authorName)}</b> (@${escapeHtml(c.handle)})\n` +
      `Segment: ${c.segment} · Fit ${c.fitScore}/100\n` +
      `<i>${escapeHtml(c.fitReason)}</i>\n\n` +
      `📱 <b>${contact.channel}</b>: ${escapeHtml(contact.value)}\n` +
      `${contact.actionUrl}\n\n` +
      `🎬 ${c.postUrl}\n\n` +
      `<b>Suggested opener:</b>\n<code>${escapeHtml(opener)}</code>`;
    await sendTelegram(msg);
  }

  // Manual queue — batched, since there's no link to tap anyway
  if (queued.length > 0) {
    let msg = `📋 <b>MANUAL COMMENT QUEUE</b>\n\nNo contact published in bio — comment inside the Moj app:\n\n`;
    for (const { c, comment } of queued.slice(0, 15)) {
      msg +=
        `• <b>@${escapeHtml(c.handle)}</b> (${c.segment}, fit ${c.fitScore})\n` +
        `  ${c.postUrl}\n` +
        `  💬 <code>${escapeHtml(comment)}</code>\n\n`;
    }
    if (queued.length > 15) msg += `…and ${queued.length - 15} more in /admin/social-leads\n`;
    await sendTelegram(msg);
  }
}
