// Moj Lead Scoring Model — Hot/Warm/Cold classification
// Combines profile quality, engagement signals, and content relevance
// specific to India's short-video ecosystem

import type { SocialPost } from "./types";
import type { MojProfile } from "./moj";

// ── Scoring Weights ───────────────────────────────────

const WEIGHTS = {
  profile: 35,     // Profile quality (likes, posts, badges)
  engagement: 30,  // Video engagement (likes, comments, shares)
  content: 25,     // Content relevance (keywords, niche)
  tier: 10,        // Creator tier bonus
};

// ── Profile Quality Score (0-100) ─────────────────────

function scoreProfile(profile: MojProfile | null | undefined): number {
  if (!profile) return 30; // Unknown profile gets baseline

  let score = 0;

  // Total likes (logarithmic scale)
  // 0 likes = 0, 1K = 20, 10K = 40, 100K = 60, 1M = 80, 10M+ = 100
  const likes = profile.totalLikes || 0;
  if (likes >= 10_000_000) score += 100;
  else if (likes >= 1_000_000) score += 80;
  else if (likes >= 100_000) score += 60;
  else if (likes >= 10_000) score += 40;
  else if (likes >= 1_000) score += 20;
  else score += 5;

  // Post count (consistency signal)
  const posts = profile.postCount || 0;
  if (posts >= 500) score += 20;
  else if (posts >= 100) score += 15;
  else if (posts >= 50) score += 10;
  else if (posts >= 10) score += 5;

  // Verification badge
  if (profile.verified) score += 25;

  // Badge quality
  if (profile.badge) {
    if (profile.badge.includes("Royal") || profile.badge.includes("Star")) score += 15;
    else score += 10;
  }

  return Math.min(100, score);
}

// ── Engagement Score (0-100) ──────────────────────────

function scoreEngagement(post: SocialPost): number {
  let score = 0;
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const shares = post.shares || 0;

  // Absolute engagement (logarithmic)
  const total = likes + comments + shares;
  if (total >= 100_000) score += 40;
  else if (total >= 10_000) score += 30;
  else if (total >= 1_000) score += 20;
  else if (total >= 100) score += 10;
  else score += 3;

  // Comment-to-like ratio (higher = more engaging)
  // Good ratio: 1-5% of likes leave comments
  const clRatio = likes > 0 ? (comments / likes) * 100 : 0;
  if (clRatio >= 5) score += 30;       // Very engaging
  else if (clRatio >= 2) score += 25;  // Engaging
  else if (clRatio >= 1) score += 20;  // Normal
  else if (clRatio >= 0.5) score += 10; // Low engagement
  else score += 5;

  // Share-to-like ratio (viral potential)
  const slRatio = likes > 0 ? (shares / likes) * 100 : 0;
  if (slRatio >= 10) score += 30;      // Highly shareable
  else if (slRatio >= 5) score += 25;  // Shareable
  else if (slRatio >= 2) score += 20;  // Normal
  else if (slRatio >= 1) score += 10;  // Low
  else score += 3;

  return Math.min(100, score);
}

// ── Content Relevance Score (0-100) ───────────────────

// High-value keywords for our niche (Poppo/Vone/live streaming)
const HOT_KEYWORDS = [
  // Platform names
  "poppo", "vone", "bigo", "live.me", "streamkar", "mango", "tingo",
  // Money/earning
  "earn", "money", "income", "payout", "salary", "paisa", "kamai",
  "कमाई", "पैसा", "earning", "revenue", "dollars", "rupees",
  // Streaming
  "live stream", "streaming", "go live", "host", "broadcaster",
  "लाइव", "स्ट्रीमिंग", "ब्रॉडकास्टर",
  // Intent
  "how to", "kaise", "कैसे", "start", "शुरू", "begin",
  "looking for", "ढूंढ", "search", "find",
  // Pain points
  "boring", "job", "unemployed", "need money", "पैसे चाहिए",
  "struggling", "difficult", "मुश्किल",
];

const WARM_KEYWORDS = [
  // General streaming
  "video", "content", "creator", " followers", "fans",
  "viral", "trending", "popular",
  // Indian social
  "instagram", "youtube", "tiktok", "reels", "shorts",
  // Lifestyle
  "dance", "singing", "comedy", "cooking", "gaming",
  "beauty", "fashion", "travel",
];

const NICHE_KEYWORDS: Record<string, string[]> = {
  gaming: ["gaming", "game", "esports", "bgmi", "freefire", "cod", "valorant"],
  beauty: ["beauty", "makeup", "skincare", "fashion", "glow", "look"],
  music: ["music", "singing", "song", "voice", "audio", "gana", "गाना"],
  dance: ["dance", "dancing", "choreography", "step", "nritya"],
  comedy: ["comedy", "funny", "humor", "joke", "meme", "has"],
  lifestyle: ["lifestyle", "daily", "routine", "vlog", "day in life"],
  education: ["education", "study", "learn", "tips", "tutorial", "knowledge"],
};

function scoreContent(post: SocialPost, profile: MojProfile | null | undefined): number {
  let score = 0;
  const text = (post.postText || "").toLowerCase();
  const bio = (profile?.bio || "").toLowerCase();
  const combined = `${text} ${bio}`;

  // Hot keywords (strong intent signals)
  let hotCount = 0;
  for (const kw of HOT_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) hotCount++;
  }
  score += Math.min(50, hotCount * 10);

  // Warm keywords
  let warmCount = 0;
  for (const kw of WARM_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) warmCount++;
  }
  score += Math.min(25, warmCount * 5);

  // Niche detection bonus
  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        score += 15;
        break;
      }
    }
  }

  // Hindi/Hinglish content bonus (our target market)
  const hindiPattern = /[\u0900-\u097F]/;
  if (hindiPattern.test(text)) score += 10;

  return Math.min(100, score);
}

// ── Creator Tier Score (0-100) ────────────────────────

function scoreTier(profile: MojProfile | null | undefined): number {
  if (!profile) return 25;

  const likes = profile.totalLikes || 0;
  const posts = profile.postCount || 0;

  // Established creator (10M+ likes, 200+ posts)
  if (likes >= 10_000_000 && posts >= 200) return 100;

  // Popular creator (1M+ likes)
  if (likes >= 1_000_000) return 80;

  // Growing creator (100K+ likes)
  if (likes >= 100_000) return 60;

  // Active creator (10K+ likes, 50+ posts)
  if (likes >= 10_000 && posts >= 50) return 50;

  // New but active (1K+ likes)
  if (likes >= 1_000) return 35;

  // Very new
  return 15;
}

// ── Main Scoring Function ─────────────────────────────

export interface MojLeadScore {
  total: number;         // 0-100 composite score
  profile: number;       // 0-100
  engagement: number;    // 0-100
  content: number;       // 0-100
  tier: number;          // 0-100
  category: "hot" | "warm" | "cold";
  reasoning: string;
}

export function scoreMojLead(
  post: SocialPost,
  profile: MojProfile | null | undefined
): MojLeadScore {
  const profileScore = scoreProfile(profile);
  const engagementScore = scoreEngagement(post);
  const contentScore = scoreContent(post, profile);
  const tierScore = scoreTier(profile);

  // Weighted composite
  const total = Math.round(
    (profileScore * WEIGHTS.profile +
      engagementScore * WEIGHTS.engagement +
      contentScore * WEIGHTS.content +
      tierScore * WEIGHTS.tier) /
    100
  );

  // Category thresholds
  let category: "hot" | "warm" | "cold";
  if (total >= 65) category = "hot";
  else if (total >= 40) category = "warm";
  else category = "cold";

  // Build reasoning
  const reasons: string[] = [];
  if (profileScore >= 70) reasons.push(`Strong profile (${(profile?.totalLikes || 0).toLocaleString()} likes)`);
  if (profile?.verified) reasons.push("Verified creator");
  if (engagementScore >= 70) reasons.push("High engagement");
  if (contentScore >= 50) reasons.push("Relevant content keywords");
  if (tierScore >= 60) reasons.push("Established creator");
  if (total < 40) reasons.push("Low signals — needs more data");

  return {
    total,
    profile: profileScore,
    engagement: engagementScore,
    content: contentScore,
    tier: tierScore,
    category,
    reasoning: reasons.join("; ") || "Score computed from profile + engagement + content",
  };
}

// ── Batch Score ───────────────────────────────────────

export function scoreMojLeads(
  posts: SocialPost[],
  profiles: Map<string, MojProfile>
): MojLeadScore[] {
  return posts.map((post) => {
    const profile = profiles.get(post.authorUsername) || null;
    return scoreMojLead(post, profile);
  });
}
