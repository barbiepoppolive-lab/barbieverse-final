// Content Publish Orchestrator — generates a post, quality-gates it, and
// routes it to the right destination: real auto-publish for
// Facebook/Instagram/YouTube/LinkedIn (official APIs, posting your own
// content to your own accounts — legitimate), or hand-off to Telegram for
// Moj (no public API exists, see moj.ts) and for LinkedIn when org-page
// posting access hasn't been approved yet (see linkedin.ts).
//
// Deliberately excludes Reddit — see the conversation this was built from:
// Reddit's culture and automated spam detection specifically target
// "business account posts promotional content across subreddits," and
// that's exactly what this would be. Posting there should stay a human,
// participating for real, not an automation target.
//
// Quality gate: this app runs fully auto (no human approval step before
// publish), so the one safeguard standing in for that is automated — score
// the draft, and if it's weak, spend one AI rewrite pass on it. Still weak
// after that goes to Telegram as "needs_review" instead of either
// publishing something bad or silently skipping it.

import { generateSocialPost } from "@/lib/ai/modules/content-ai";
import { scoreContent, improveContent } from "@/lib/ai/content-quality";
import { publishToFacebook, isFacebookConfigured } from "./facebook";
import { publishInstagramImage, isInstagramConfigured } from "./instagram";
import { deliverMojContentForManualUpload } from "./moj";
import { publishYouTubeVideo, isYouTubeConfigured } from "./youtube";
import { publishToLinkedIn, isLinkedInConfigured, deliverLinkedInContentForManualUpload } from "./linkedin";

export type PublishPlatform = "facebook" | "instagram" | "moj" | "youtube" | "linkedin";

// Below this score (0-100, see content-quality.ts scoreContent), a draft
// gets one automated rewrite pass; still below after that, it routes to
// Telegram instead of publishing. Override via CONTENT_QUALITY_THRESHOLD.
const QUALITY_THRESHOLD = Number(process.env.CONTENT_QUALITY_THRESHOLD) || 60;

export interface PublishAttemptResult {
  platform: PublishPlatform;
  status: "published" | "sent_for_manual" | "failed" | "skipped" | "needs_review";
  postId?: string;
  error?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendReviewAlert(opts: {
  platform: PublishPlatform;
  topic?: string;
  caption: string;
  score: number;
  suggestions: string[];
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const text =
    `⚠️ <b>NEEDS REVIEW — ${opts.platform}</b>\n\n` +
    `Score: ${opts.score}/100 — still below the auto-publish threshold after one AI rewrite pass.\n\n` +
    (opts.topic ? `<b>Topic:</b> ${escapeHtml(opts.topic)}\n\n` : "") +
    `<b>Draft:</b>\n<code>${escapeHtml(opts.caption)}</code>\n\n` +
    `<b>Why it scored low:</b>\n${opts.suggestions.map((s) => `• ${escapeHtml(s)}`).join("\n")}\n\n` +
    `Not auto-published. Fix and post manually, or feed it a better topic prompt next run.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e: any) {
    console.error("[social-publish] review alert failed:", e?.message);
  }
}

async function logAttempt(opts: {
  platform: PublishPlatform;
  topic?: string;
  caption: string;
  hashtags?: string[];
  imageUrl?: string;
  videoUrl?: string;
  status: "published" | "sent_for_manual" | "failed" | "needs_review";
  externalPostId?: string;
  error?: string;
}) {
  try {
    const { q } = await import("@/lib/db.server");
    await q(
      `INSERT INTO published_content_log
        (platform, topic, caption, hashtags, image_url, video_url, status, external_post_id, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        opts.platform, opts.topic || null, opts.caption, opts.hashtags || [],
        opts.imageUrl || null, opts.videoUrl || null, opts.status,
        opts.externalPostId || null, opts.error || null,
      ]
    );
  } catch (e: any) {
    console.error("[social-publish] Failed to log attempt:", e?.message);
  }
}

/**
 * Generate a post for one platform, quality-gate it, and publish/deliver it.
 * `imageUrl` is required for Instagram (the platform has no text-only post
 * type) — if omitted, Instagram is skipped rather than silently failing.
 */
export async function generateAndPublish(opts: {
  platform: PublishPlatform;
  topic: string;
  imageUrl?: string;
  videoUrl?: string;
  visualBrief?: string;
}): Promise<PublishAttemptResult> {
  let content = await generateSocialPost({
    platform: opts.platform,
    topic: opts.topic,
    goal: "awareness",
  });

  // ── Quality gate ─────────────────────────────────────
  // No human reviews this before it goes out, so the draft has to earn
  // "published" instead. One rewrite pass, then a second score — still
  // weak after that goes to Telegram, not live.
  let quality = await scoreContent({
    content: content.caption,
    content_type: "social_post",
    platform: opts.platform,
    topic: opts.topic,
  }).catch(() => null);

  if (quality && quality.overall < QUALITY_THRESHOLD) {
    try {
      const improved = await improveContent({
        content: content.caption,
        content_type: "social_post",
        instruction: `Rewrite this for ${opts.platform}, fixing these specific issues: ${quality.suggestions.join("; ")}`,
      });
      content = { ...content, caption: improved.improved };
      quality = await scoreContent({
        content: content.caption,
        content_type: "social_post",
        platform: opts.platform,
        topic: opts.topic,
      }).catch(() => quality);
    } catch (e: any) {
      console.error("[social-publish] improveContent failed, using original draft:", e?.message);
    }
  }

  if (quality && quality.overall < QUALITY_THRESHOLD) {
    await sendReviewAlert({
      platform: opts.platform, topic: opts.topic, caption: content.caption,
      score: quality.overall, suggestions: quality.suggestions,
    });
    await logAttempt({
      platform: opts.platform, topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, videoUrl: opts.videoUrl, status: "needs_review",
      error: `Quality score ${quality.overall}/100 below threshold ${QUALITY_THRESHOLD}`,
    });
    return { platform: opts.platform, status: "needs_review", error: `Quality score ${quality.overall}/100` };
  }

  if (opts.platform === "facebook") {
    if (!isFacebookConfigured()) {
      return { platform: "facebook", status: "skipped", error: "FACEBOOK_PAGE_ID/TOKEN not configured" };
    }
    const fullMessage = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishToFacebook({ message: fullMessage, imageUrl: opts.imageUrl });
    await logAttempt({
      platform: "facebook", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.postId, error: result.error,
    });
    return { platform: "facebook", status: result.ok ? "published" : "failed", postId: result.postId, error: result.error };
  }

  if (opts.platform === "instagram") {
    if (!isInstagramConfigured()) {
      return { platform: "instagram", status: "skipped", error: "INSTAGRAM_BUSINESS_ACCOUNT_ID/token not configured" };
    }
    if (!opts.imageUrl) {
      return { platform: "instagram", status: "skipped", error: "No image URL provided — Instagram has no text-only post type" };
    }
    const fullCaption = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishInstagramImage({ imageUrl: opts.imageUrl, caption: fullCaption });
    await logAttempt({
      platform: "instagram", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.mediaId, error: result.error,
    });
    return { platform: "instagram", status: result.ok ? "published" : "failed", postId: result.mediaId, error: result.error };
  }

  if (opts.platform === "youtube") {
    if (!isYouTubeConfigured()) {
      return { platform: "youtube", status: "skipped", error: "YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN not configured" };
    }
    if (!opts.videoUrl) {
      return { platform: "youtube", status: "skipped", error: "No video URL provided — YouTube has no text/image-only post type (Community posts have no public API)" };
    }
    const result = await publishYouTubeVideo({
      videoUrl: opts.videoUrl, caption: content.caption, hashtags: content.hashtags,
    });
    await logAttempt({
      platform: "youtube", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      videoUrl: opts.videoUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.videoId, error: result.error,
    });
    return { platform: "youtube", status: result.ok ? "published" : "failed", postId: result.videoId, error: result.error };
  }

  if (opts.platform === "linkedin") {
    if (!isLinkedInConfigured()) {
      const result = await deliverLinkedInContentForManualUpload({
        caption: content.caption, hashtags: content.hashtags, visualBrief: opts.visualBrief,
      });
      await logAttempt({
        platform: "linkedin", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
        status: result.ok ? "sent_for_manual" : "failed", error: result.error,
      });
      return { platform: "linkedin", status: result.ok ? "sent_for_manual" : "failed", error: result.error };
    }
    const fullText = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishToLinkedIn({ text: fullText, imageUrl: opts.imageUrl });
    await logAttempt({
      platform: "linkedin", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.postId, error: result.error,
    });
    return { platform: "linkedin", status: result.ok ? "published" : "failed", postId: result.postId, error: result.error };
  }

  // Moj — no public API, deliver for manual upload instead
  const result = await deliverMojContentForManualUpload({
    caption: content.caption,
    hashtags: content.hashtags,
    visualBrief: opts.visualBrief,
  });
  await logAttempt({
    platform: "moj", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
    videoUrl: opts.videoUrl, status: result.ok ? "sent_for_manual" : "failed", error: result.error,
  });
  return { platform: "moj", status: result.ok ? "sent_for_manual" : "failed", error: result.error };
}

/**
 * Run a full content cycle across all platforms for one topic.
 * Used by both the /content Telegram command and the scheduled cron.
 */
export async function runContentCycle(opts: {
  topic: string;
  imageUrl?: string;
  videoUrl?: string;
  visualBrief?: string;
  platforms?: PublishPlatform[];
}): Promise<PublishAttemptResult[]> {
  const platforms = opts.platforms || (["facebook", "instagram", "moj", "youtube", "linkedin"] as PublishPlatform[]);
  const results: PublishAttemptResult[] = [];

  for (const platform of platforms) {
    try {
      const result = await generateAndPublish({
        platform,
        topic: opts.topic,
        imageUrl: opts.imageUrl,
        videoUrl: opts.videoUrl,
        visualBrief: opts.visualBrief,
      });
      results.push(result);
    } catch (e: any) {
      results.push({ platform, status: "failed", error: e?.message || "unknown error" });
    }
  }

  return results;
}
