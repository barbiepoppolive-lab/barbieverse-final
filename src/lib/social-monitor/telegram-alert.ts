// Telegram Alert for Social Leads

import type { SocialPost, PostCategory } from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotConfig() {
  const token = process.env.CONTENT_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.CONTENT_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Telegram bot not configured");
  }
  return { token, chatId };
}

function getCategoryEmoji(category: PostCategory | null): string {
  if (category === "hot") return "🔥";
  if (category === "warm") return "🌤";
  if (category === "cold") return "❄";
  return "📌";
}

function getPlatformBadge(platform: string): string {
  if (platform === "reddit") return "[Reddit]";
  if (platform === "facebook") return "[Facebook]";
  if (platform === "twitter") return "[Twitter]";
  if (platform === "youtube") return "[YouTube]";
  if (platform === "instagram") return "[Instagram]";
  if (platform === "tiktok") return "[TikTok]";
  if (platform === "moj") return "[Moj]";
  return `[${platform}]`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendSocialLeadAlert(post: {
  platform: string;
  postUrl: string;
  postText: string;
  authorName: string;
  authorUsername: string;
  keywordMatched: string;
  subreddit?: string;
  groupName?: string;
  aiComment: string;
  category: PostCategory;
  engagementScore: number;
}): Promise<boolean> {
  const { token, chatId } = getBotConfig();

  const emoji = getCategoryEmoji(post.category);
  const badge = getPlatformBadge(post.platform);
  const contextLine = post.subreddit
    ? `Subreddit: r/${post.subreddit}`
    : post.groupName
    ? `Group: ${post.groupName}`
    : "";

  const text = [
    `${emoji} <b>New ${post.category} lead on ${badge}</b>`,
    "",
    `<b>Post:</b> ${escapeHtml(truncate(post.postText, 200))}`,
    `<b>Author:</b> ${escapeHtml(post.authorName)}`,
    contextLine ? `<b>${contextLine}</b>` : null,
    `<b>Keyword:</b> ${escapeHtml(post.keywordMatched)}`,
    `<b>Engagement:</b> ${post.engagementScore}`,
    "",
    `<b>AI Comment:</b>`,
    `<code>${escapeHtml(post.aiComment)}</code>`,
    "",
    `<a href="${post.postUrl}">Open Post</a>`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[social-telegram] Send failed:", err);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error("[social-telegram] Error:", e?.message);
    return false;
  }
}

export async function sendSocialDigest(
  hotCount: number,
  warmCount: number,
  totalCount: number,
  topPosts: Array<{ platform: string; postUrl: string; category: string }>
): Promise<boolean> {
  const { token, chatId } = getBotConfig();

  const lines = [
    `<b>Social Monitor Digest</b>`,
    "",
    `Total new leads: <b>${totalCount}</b>`,
    `Hot: <b>${hotCount}</b> | Warm: <b>${warmCount}</b>`,
    "",
  ];

  if (topPosts.length > 0) {
    lines.push("<b>Top leads:</b>");
    for (const p of topPosts.slice(0, 5)) {
      lines.push(`- [${p.platform}] ${p.category}: ${p.postUrl}`);
    }
  }

  lines.push("");
  lines.push(`<a href="${process.env.PUBLIC_APP_URL}/admin/social-leads">View All in Dashboard</a>`);

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    return response.ok;
  } catch (e: any) {
    console.error("[social-telegram] Digest error:", e?.message);
    return false;
  }
}
