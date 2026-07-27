// Content Publish Orchestrator — generates a post, quality-gates it, and
// routes it to the right destination: real auto-publish for
// Facebook/Instagram/YouTube/LinkedIn (official APIs via Postiz, posting
// your own content to your own accounts — legitimate), or hand-off to
// Telegram for Moj (no public API exists, see moj.ts), Reddit (deliberate,
// see below), and YouTube while there's no video file to upload yet.
//
// Reddit is generated here (so it's part of the same campaign/calendar)
// but is UNCONDITIONALLY routed to Telegram, never auto-posted — see the
// conversation this was built from: Reddit's spam detection specifically
// targets "business account posts promotional content across subreddits,"
// and that's exactly what automated posting there would be. A human reads
// it, decides whether it's worth posting today under the 10%-self-promo
// norm, and posts it themselves.
//
// Quality gate: this app runs fully auto (no human approval step before
// publish), so the one safeguard standing in for that is automated — score
// the draft, and if it's weak, spend one AI rewrite pass on it. Still weak
// after that goes to Telegram as "needs_review" instead of either
// publishing something bad or silently skipping it. A second, cheaper guard
// blocks anything that reads like coin-selling/recharge promotion — that
// pillar is deliberately excluded from this campaign for now.

import { generateSocialPost } from "@/lib/ai/modules/content-ai";
import { scoreContent, improveContent } from "@/lib/ai/content-quality";
import { checkCompliance, formatIssuesForRevision } from "@/lib/ai/compliance-gate";
import { generateContentSEO, type Platform as SEOPlatform } from "@/lib/ai/content-seo";
import { generateCarousel } from "@/lib/ai/modules/brand-manager";
import { generateImage } from "@/lib/ai/image-gen";
import { seedFromString } from "@/lib/ai/image-persona";
import { publishToFacebook, isFacebookConfigured } from "./facebook";
import { publishInstagramImage, isInstagramConfigured } from "./instagram";
import { deliverMojContentForManualUpload } from "./moj";
import { publishYouTubeVideo, isYouTubeConfigured, deliverYouTubeContentForManualUpload } from "./youtube";
import { publishToLinkedIn, isLinkedInConfigured, deliverLinkedInContentForManualUpload } from "./linkedin";
import { deliverRedditContentForManualUpload } from "./reddit";

export type PublishPlatform = "facebook" | "instagram" | "moj" | "youtube" | "linkedin" | "reddit";

// Cheap keyword guard, on top of the topic rotation itself never including
// coin-selling topics — catches the AI drifting into recharge/pricing talk
// on an otherwise-unrelated topic. Not a substitute for controlling what
// topics get fed in, just a backstop.
const COIN_SELLING_MARKERS = [
  "buy coins", "recharge coins", "coin recharge", "cheap coins", "discount on coins",
  "coins at", "% off coins", "instant coin delivery", "coin seller", "recharge now",
];

function looksLikeCoinSelling(text: string): boolean {
  const lower = text.toLowerCase();
  return COIN_SELLING_MARKERS.some((m) => lower.includes(m));
}

// Below this score (0-100, see content-quality.ts scoreContent), a draft
// gets one automated rewrite pass; still below after that, it routes to
// Telegram instead of publishing. Override via CONTENT_QUALITY_THRESHOLD.
const QUALITY_THRESHOLD = Number(process.env.CONTENT_QUALITY_THRESHOLD) || 60;

// How many recent published captions per platform to compare against when
// checking for near-duplicates.
const DEDUP_LOOKBACK = Number(process.env.CONTENT_DEDUP_LOOKBACK) || 25;

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

/**
 * Recent captions already published to a platform, newest first.
 *
 * Feeds near-duplicate detection in the compliance gate. Only 'published'
 * rows count — a draft that was blocked never reached the platform, so it
 * can't contribute to a repetition pattern.
 */
async function getRecentCaptions(
  platform: PublishPlatform,
  limit: number,
): Promise<string[]> {
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ caption: string }>(
      `SELECT caption FROM published_content_log
       WHERE platform = $1 AND status = 'published' AND caption IS NOT NULL
       ORDER BY created_at DESC
       LIMIT $2`,
      [platform, limit],
    );
    return rows.map((r) => r.caption).filter(Boolean);
  } catch (e: any) {
    // Dedup is a safety net, not a hard dependency. If the lookup fails we
    // continue without it rather than blocking an otherwise-valid post.
    console.error("[social-publish] getRecentCaptions failed:", e?.message);
    return [];
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
 * `imageUrl` is required for Instagram/Facebook feed visuals — if omitted,
 * Instagram is skipped (it has no text-only post type). `contentType`
 * drives format: "carousel" generates multiple slides via brand-manager.ts
 * and posts them as a swipeable carousel (Instagram/LinkedIn); "story"
 * posts a single image as a 24h Instagram Story; anything else is a normal
 * single-image/text post.
 */
export async function generateAndPublish(opts: {
  platform: PublishPlatform;
  topic: string;
  contentType?: string;
  imageUrl?: string;
  videoUrl?: string;
  visualBrief?: string;
  /**
   * ISO timestamp to schedule the post for. Omit to publish immediately.
   * Used by scripts/local-batch.ts, which generates on a local GPU ahead of
   * time and hands Postiz a future publish time — so the machine doesn't
   * need to be awake when the post actually goes out.
   */
  scheduledAt?: string;
}): Promise<PublishAttemptResult> {
  let content = await generateSocialPost({
    platform: opts.platform === "reddit" ? "facebook" : opts.platform, // reddit isn't in generateSocialPost's platform rules; facebook's plainer tone is the closest fit for a Telegram-reviewed draft
    topic: opts.topic,
    goal: "awareness",
  });

  // Carousel: generate real multi-slide content (headline + body + image
  // prompt per slide) instead of reusing the single-post caption verbatim.
  let carouselImageUrls: string[] | undefined;
  if (opts.contentType === "carousel" && (opts.platform === "instagram" || opts.platform === "linkedin")) {
    try {
      const carousel = await generateCarousel({ topic: opts.topic, slides: 6, style: "educational" });
      content = { ...content, caption: `${carousel.caption}`, hashtags: carousel.hashtags?.length ? carousel.hashtags : content.hashtags };
      const images: string[] = [];
      let slideIndex = 0;
      for (const slide of carousel.slides) {
        try {
          // Was a hardcoded seed (123456789) for every slide of every
          // carousel — meant every slide of every post came out looking
          // like near-duplicates of each other instead of 6 distinct
          // images. Derive a per-slide seed from the topic + slide position
          // instead, so each slide is actually distinct.
          const seed = seedFromString(`${opts.topic}-slide-${slideIndex}`);
          const img = await generateImage({ prompt: slide.image_prompt, size: "portrait", seed });
          images.push(img.url);
        } catch (e: any) {
          console.error("[social-publish] carousel slide image failed, skipping slide:", e?.message);
        }
        slideIndex++;
      }
      if (images.length >= 2) carouselImageUrls = images;
    } catch (e: any) {
      console.error("[social-publish] carousel generation failed, falling back to single image:", e?.message);
    }
  }

  // SEO/hashtag enrichment — dedicated module, platform-aware limits,
  // rather than whatever count the caption-generation prompt happened to
  // produce. Best-effort: falls back to the inline hashtags on failure.
  if (opts.platform !== "reddit") {
    try {
      const seoPlatform = (opts.platform === "youtube" ? "youtube" : opts.platform === "moj" ? "moj" : opts.platform) as SEOPlatform;
      const seoResult = await generateContentSEO({
        title: opts.topic.slice(0, 80),
        content: content.caption,
        topic: opts.topic,
        platform: seoPlatform,
        content_type: opts.contentType || "social_post",
      });
      const merged = [
        ...seoResult.hashtags.branded, ...seoResult.hashtags.niche,
        ...seoResult.hashtags.trending, ...seoResult.hashtags.popular,
      ];
      if (merged.length > 0) {
        content = { ...content, hashtags: Array.from(new Set(merged)).slice(0, seoResult.hashtags.platform_limit) };
      }
    } catch (e: any) {
      console.error("[social-publish] SEO/hashtag enrichment failed, using inline hashtags:", e?.message);
    }
  }

  // ── Coin-selling guard ────────────────────────────────
  // This campaign deliberately excludes the coin-selling pillar. If the AI
  // drifts into it anyway (wrong topic fed in, or an unprompted tangent),
  // don't publish it — flag for review instead.
  if (looksLikeCoinSelling(content.caption)) {
    await sendReviewAlert({
      platform: opts.platform, topic: opts.topic, caption: content.caption,
      score: 0, suggestions: ["Drifted into coin-selling/recharge content, which this campaign excludes for now — rewrite or drop this topic."],
    });
    await logAttempt({
      platform: opts.platform, topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, videoUrl: opts.videoUrl, status: "needs_review",
      error: "Coin-selling content blocked by guard",
    });
    return { platform: opts.platform, status: "needs_review", error: "Coin-selling content blocked by guard" };
  }

  // ── Quality gate ─────────────────────────────────────
  // No human reviews this before it goes out, so the draft has to earn
  // "published" instead. One rewrite pass, then a second score — still
  // weak after that goes to Telegram, not live.
  let quality = await scoreContent({
    content: content.caption,
    content_type: opts.contentType || "social_post",
    platform: opts.platform,
    topic: opts.topic,
  }).catch(() => null);

  if (quality && quality.overall < QUALITY_THRESHOLD) {
    try {
      const improved = await improveContent({
        content: content.caption,
        content_type: opts.contentType || "social_post",
        instruction: `Rewrite this for ${opts.platform}, fixing these specific issues: ${quality.suggestions.join("; ")}`,
      });
      content = { ...content, caption: improved.improved };
      quality = await scoreContent({
        content: content.caption,
        content_type: opts.contentType || "social_post",
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

  // ── Compliance gate ──────────────────────────────────
  // Distinct from the quality gate above: quality asks "is this good?",
  // compliance asks "will this get the account restricted?". A well-written
  // post that guarantees earnings scores highly and is still unpublishable.
  //
  // Runs last so it sees the final caption, including anything improveContent
  // rewrote. One targeted revision pass, then a hard stop — we never publish
  // content that fails compliance.
  {
    const recentPosts = await getRecentCaptions(opts.platform, DEDUP_LOOKBACK);
    let compliance = checkCompliance({
      content: content.caption,
      hashtags: content.hashtags,
      recentPosts,
      platform: opts.platform,
    });

    if (!compliance.passed) {
      console.warn(
        `[social-publish] Compliance failed (risk ${compliance.riskScore}):`,
        compliance.issues.map((i) => i.rule).join(", "),
      );
      try {
        const fixed = await improveContent({
          content: content.caption,
          content_type: opts.contentType || "social_post",
          instruction: formatIssuesForRevision(compliance),
        });
        content = { ...content, caption: fixed.improved };
        compliance = checkCompliance({
          content: content.caption,
          hashtags: content.hashtags,
          recentPosts,
          platform: opts.platform,
        });
      } catch (e: any) {
        console.error("[social-publish] compliance revision failed:", e?.message);
      }
    }

    if (!compliance.passed) {
      const summary = compliance.issues
        .filter((i) => i.severity === "block")
        .map((i) => i.rule)
        .join(", ");
      await sendReviewAlert({
        platform: opts.platform, topic: opts.topic, caption: content.caption,
        score: 100 - compliance.riskScore,
        suggestions: compliance.issues.map((i) => `${i.rule}: ${i.detail}`),
      });
      await logAttempt({
        platform: opts.platform, topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
        imageUrl: opts.imageUrl, videoUrl: opts.videoUrl, status: "needs_review",
        error: `Compliance blocked: ${summary}`,
      });
      return {
        platform: opts.platform,
        status: "needs_review",
        error: `Compliance blocked: ${summary}`,
      };
    }
  }

  if (opts.platform === "facebook") {
    if (!isFacebookConfigured()) {
      return { platform: "facebook", status: "skipped", error: "FACEBOOK_INTEGRATION_ID not configured" };
    }
    const fullMessage = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishToFacebook({ message: fullMessage, imageUrl: carouselImageUrls?.[0] || opts.imageUrl, scheduledAt: opts.scheduledAt });
    await logAttempt({
      platform: "facebook", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.postId, error: result.error,
    });
    return { platform: "facebook", status: result.ok ? "published" : "failed", postId: result.postId, error: result.error };
  }

  if (opts.platform === "instagram") {
    if (!isInstagramConfigured()) {
      return { platform: "instagram", status: "skipped", error: "INSTAGRAM_INTEGRATION_ID not configured" };
    }
    if (!carouselImageUrls && !opts.imageUrl) {
      return { platform: "instagram", status: "skipped", error: "No image URL provided — Instagram has no text-only post type" };
    }
    const fullCaption = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishInstagramImage({
      scheduledAt: opts.scheduledAt,
      imageUrl: opts.imageUrl,
      imageUrls: carouselImageUrls,
      caption: fullCaption,
      postType: opts.contentType === "story" ? "story" : "post",
    });
    await logAttempt({
      platform: "instagram", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.mediaId, error: result.error,
    });
    return { platform: "instagram", status: result.ok ? "published" : "failed", postId: result.mediaId, error: result.error };
  }

  if (opts.platform === "youtube") {
    if (!isYouTubeConfigured() || !opts.videoUrl) {
      // No video pipeline wired in yet — hand off a ready script instead of
      // silently reporting "skipped" every single day of the campaign.
      const result = await deliverYouTubeContentForManualUpload({
        caption: content.caption, hashtags: content.hashtags, visualBrief: opts.visualBrief,
        imageUrl: carouselImageUrls?.[0] || opts.imageUrl,
      });
      await logAttempt({
        platform: "youtube", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
        status: result.ok ? "sent_for_manual" : "failed", error: result.error,
      });
      return { platform: "youtube", status: result.ok ? "sent_for_manual" : "failed", error: result.error };
    }
    const result = await publishYouTubeVideo({
      scheduledAt: opts.scheduledAt,
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
        imageUrl: opts.imageUrl, imageUrls: carouselImageUrls,
      });
      await logAttempt({
        platform: "linkedin", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
        status: result.ok ? "sent_for_manual" : "failed", error: result.error,
      });
      return { platform: "linkedin", status: result.ok ? "sent_for_manual" : "failed", error: result.error };
    }
    const fullText = [content.caption, content.hashtags?.length ? content.hashtags.join(" ") : ""]
      .filter(Boolean).join("\n\n");
    const result = await publishToLinkedIn({
      scheduledAt: opts.scheduledAt,
      text: fullText,
      imageUrl: opts.imageUrl,
      imageUrls: carouselImageUrls,
      carouselName: carouselImageUrls ? opts.topic.slice(0, 60) : undefined,
    });
    await logAttempt({
      platform: "linkedin", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      imageUrl: opts.imageUrl, status: result.ok ? "published" : "failed",
      externalPostId: result.postId, error: result.error,
    });
    return { platform: "linkedin", status: result.ok ? "published" : "failed", postId: result.postId, error: result.error };
  }

  if (opts.platform === "reddit") {
    // Always manual, no exceptions — see file header and reddit.ts.
    const result = await deliverRedditContentForManualUpload({
      caption: content.caption, hashtags: content.hashtags, visualBrief: opts.visualBrief,
      imageUrl: opts.imageUrl,
    });
    await logAttempt({
      platform: "reddit", topic: opts.topic, caption: content.caption, hashtags: content.hashtags,
      status: result.ok ? "sent_for_manual" : "failed", error: result.error,
    });
    return { platform: "reddit", status: result.ok ? "sent_for_manual" : "failed", error: result.error };
  }

  // Moj — no public API, deliver for manual upload instead
  const result = await deliverMojContentForManualUpload({
    caption: content.caption,
    hashtags: content.hashtags,
    visualBrief: opts.visualBrief,
    imageUrl: carouselImageUrls?.[0] || opts.imageUrl,
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
  contentType?: string;
  imageUrl?: string;
  videoUrl?: string;
  visualBrief?: string;
  platforms?: PublishPlatform[];
}): Promise<PublishAttemptResult[]> {
  const platforms = opts.platforms || (["facebook", "instagram", "moj", "youtube", "linkedin", "reddit"] as PublishPlatform[]);
  const results: PublishAttemptResult[] = [];

  for (const platform of platforms) {
    try {
      const result = await generateAndPublish({
        platform,
        topic: opts.topic,
        contentType: opts.contentType,
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
