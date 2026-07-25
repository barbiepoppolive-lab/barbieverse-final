// Instagram → Moj-creator recruitment pipeline
//
// Same shape as moj-pipeline.ts, different (and much better) source. The key
// difference in outcome: on Instagram nobody lands in a "can't reach them"
// bucket, because the DM is always available. Bio contact info is a bonus
// that lets you skip the DM entirely, not a precondition for the lead being
// usable at all — which is what made the Moj-native funnel so thin.

import {
  findMojCreatorsOnInstagram,
  DEFAULT_CREATOR_HASHTAGS,
  type InstagramMojCandidate,
} from "@/lib/social-monitor/instagram-moj";
import { generateOutreachDM, type OutreachAngle } from "@/lib/ai/modules/outreach-writer";

export interface InstagramMojPipelineResult {
  postsScanned: number;
  candidates: number;
  stored: number;
  skippedDuplicate: number;
  withDirectContact: number;
  rejectedAsNoise: number;
  competitorAgencies: number;
  warnings: string[];
}

/**
 * Which conversational angle this person needs. Openers are written per
 * person by the AI writer (see @/lib/ai/modules/outreach-writer) rather than
 * filled from a template — templated DMs read as mail-merge because they
 * are one, and creators in this market get a dozen of them a week.
 */
function angleFor(c: InstagramMojCandidate): OutreachAngle {
  if (c.source === "poppo_vone" || c.source === "both") return "switch_agency";
  if (c.segment === "earning_content") return "money_motivated";
  if (c.segment === "live_host") return "already_creator";
  return "already_creator";
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true,
      }),
    });
  } catch (e: any) {
    console.error("[ig-moj-pipeline] telegram failed:", e?.message);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function store(c: InstagramMojCandidate, opener: string): Promise<"stored" | "duplicate"> {
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
      "instagram",
      c.postUrl,
      c.postText,
      c.authorName,
      c.username,
      `https://instagram.com/${c.username}`,
      c.mojEvidence.join("; "),
      c.likes + c.comments,
      opener,
      c.fitScore / 100,
      c.fitScore >= 65 ? "hot" : c.fitScore >= 45 ? "warm" : "cold",
      "discovered",
      c.segment,
      c.fitScore,
      c.fitReason,
      // Prefer a bio-published channel; otherwise the IG DM itself.
      c.contact?.channel || "instagram",
      c.contact?.value || c.username,
      c.contact?.actionUrl || `https://instagram.com/${c.username}`,
      c.contact?.confidence ?? 0.7,
    ]
  );
  return rows.length > 0 ? "stored" : "duplicate";
}

export async function runInstagramMojPipeline(opts?: {
  hashtags?: string[];
  maxPerHashtag?: number;
  minFitScore?: number;
  silent?: boolean;
}): Promise<InstagramMojPipelineResult> {
  let keywords: string[] = [];
  let hashtags = opts?.hashtags;

  try {
    const { q } = await import("@/lib/db.server");
    // Deliberately NOT scraper_instagram_hashtags — that key belongs to the
    // general Instagram monitor. Sharing it would mean tuning one channel
    // silently retargets the other, which is the kind of coupling that makes
    // a pipeline mysteriously stop finding the right people.
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings
        WHERE key IN ('scraper_keywords', 'creator_instagram_hashtags', 'moj_instagram_hashtags')`
    );
    let legacy: string[] = [];
    for (const r of rows) {
      const list = (r.value || "").split("\n").map((s) => s.trim()).filter(Boolean);
      if (r.key === "scraper_keywords") keywords = list;
      if (r.key === "creator_instagram_hashtags" && !hashtags?.length && list.length) {
        hashtags = list;
      }
      // moj_instagram_hashtags was this setting's name before Poppo/Vone tags
      // were added. Still honoured so an existing install doesn't silently
      // lose its tuning, but the new key wins.
      if (r.key === "moj_instagram_hashtags") legacy = list;
    }
    if (!hashtags?.length && legacy.length) hashtags = legacy;
  } catch (e: any) {
    console.warn("[ig-moj-pipeline] settings load failed:", e?.message);
  }

  const result = await findMojCreatorsOnInstagram({
    hashtags: hashtags?.length ? hashtags : DEFAULT_CREATOR_HASHTAGS,
    maxPerHashtag: opts?.maxPerHashtag,
    minFitScore: opts?.minFitScore,
    keywords,
  });

  let stored = 0;
  let skippedDuplicate = 0;
  let withDirectContact = 0;
  const storedCandidates: Array<{ c: InstagramMojCandidate; opener: string }> = [];

  // Feed the writer the last few messages it produced so it doesn't settle
  // into one recognisable opening pattern across a batch.
  const recentMessages: string[] = [];

  for (const c of result.candidates) {
    const dm = await generateOutreachDM({
      name: c.authorName || c.username,
      angle: angleFor(c),
      platform: "instagram",
      bio: c.bio,
      postCaption: c.postText,
      followers: c.followers,
      recentMessages,
    });
    const opener = dm.message;
    recentMessages.unshift(opener);
    if (recentMessages.length > 6) recentMessages.pop();

    try {
      const outcome = await store(c, opener);
      if (outcome === "duplicate") { skippedDuplicate++; continue; }
      stored++;
      if (c.contact) withDirectContact++;
      storedCandidates.push({ c, opener });
    } catch (e: any) {
      console.error("[ig-moj-pipeline] store error:", e?.message);
    }
  }

  if (!opts?.silent) {
    const existingHosts = storedCandidates.filter(
      ({ c }) => c.source === "poppo_vone" || c.source === "both"
    ).length;

    let header =
      `📸 <b>INSTAGRAM CREATOR SEARCH</b>\n\n` +
      `Posts scanned: ${result.postsScanned}\n` +
      `Profiles checked: ${result.profilesEnriched}\n` +
      `Rejected as noise: ${result.rejectedAsNoise}\n` +
      `New leads: ${stored}\n` +
      `  └ 🎯 already on Poppo/Vone: ${existingHosts}\n` +
      `Already seen: ${skippedDuplicate}\n` +
      `With phone/extra contact: ${withDirectContact}\n` +
      `🏢 Rival agencies found: ${result.competitorAgencies.length}\n`;
    for (const w of result.warnings) header += `\n⚠️ ${escapeHtml(w)}\n`;
    await sendTelegram(header);

    for (const { c, opener } of storedCandidates.slice(0, 10)) {
      const extra = c.contact
        ? `\n📱 Also published: ${c.contact.channel} ${escapeHtml(c.contact.value)}\n${c.contact.actionUrl}`
        : "";
      const badge = c.source === "poppo_vone" || c.source === "both" ? "🎯" : "📸";
      const sourceLabel =
        c.source === "both" ? "Moj + Poppo/Vone"
        : c.source === "poppo_vone" ? "already a Poppo/Vone host"
        : "Moj creator";
      await sendTelegram(
        `${badge} <b>${escapeHtml(c.authorName)}</b> (@${escapeHtml(c.username)})\n` +
        `${c.followers.toLocaleString()} followers · ${c.segment} · fit ${c.fitScore}/100\n` +
        `<b>${sourceLabel}</b>\n` +
        `<i>${escapeHtml(c.fitReason)}</i>\n` +
        `✔️ ${escapeHtml(c.mojEvidence.join("; "))}\n\n` +
        `https://instagram.com/${c.username}${extra}\n\n` +
        `<b>DM draft:</b>\n<code>${escapeHtml(opener)}</code>`
      );
    }

    // Rival agencies: not leads, but their followers are hosts who are
    // demonstrably interested in agencies. Worth knowing who they are.
    if (result.competitorAgencies.length > 0) {
      let msg =
        `🏢 <b>RIVAL AGENCIES SPOTTED (${result.competitorAgencies.length})</b>\n\n` +
        `Not leads — don't pitch these. But their followers are hosts already shopping for an agency:\n\n`;
      for (const a of result.competitorAgencies.slice(0, 10)) {
        msg +=
          `• <b>@${escapeHtml(a.username)}</b> — ${a.followers.toLocaleString()} followers\n` +
          `  <i>${escapeHtml(a.signals.slice(0, 3).join(", "))}</i>\n` +
          `  https://instagram.com/${a.username}\n\n`;
      }
      await sendTelegram(msg);
    }
  }

  return {
    postsScanned: result.postsScanned,
    candidates: result.candidates.length,
    stored,
    skippedDuplicate,
    withDirectContact,
    rejectedAsNoise: result.rejectedAsNoise,
    competitorAgencies: result.competitorAgencies.length,
    warnings: result.warnings,
  };
}
