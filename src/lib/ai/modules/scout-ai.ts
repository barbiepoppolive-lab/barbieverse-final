// Scout AI Module — Lead Discovery, Scoring & Outreach
// Automated lead intelligence for BarbieVerse

import { aiRoute, aiAnalyze, aiChat } from "../router";
import { PROMPTS } from "../utils/prompts";

// ── Types ──────────────────────────────────────────────

export interface LeadProfile {
  id: string;
  name?: string;
  instagram?: string;
  mobile?: string;
  city?: string;
  follower_count?: string;
  platform?: string;
  intent?: string;
  notes?: string;
  ugc_verified?: boolean;
  status?: string;
}

export interface LeadScore {
  score: number;
  category: "hot" | "warm" | "cold";
  reasoning: string;
  factors: {
    follower_quality: number;
    engagement_potential: number;
    niche_match: number;
    activity_level: number;
    platform_fit: number;
  };
  recommended_action: string;
  best_contact_time?: string;
}

export interface LeadDiscovery {
  source: string;
  profile_url?: string;
  username: string;
  followers: number;
  engagement_rate?: number;
  niche: string;
  recent_posts: number;
  avg_likes: number;
  verified: boolean;
}

export interface OutreachPlan {
  lead_id: string;
  channel: "whatsapp" | "instagram" | "email";
  message_template: string;
  talking_points: string[];
  best_time: string;
  follow_up_days: number;
  priority: "immediate" | "this_week" | "this_month";
}

// ── Lead Scoring Engine ────────────────────────────────

export async function scoreLead(lead: LeadProfile): Promise<LeadScore> {
  const leadData = formatLeadForScoring(lead);

  const result = await aiAnalyze(PROMPTS.leadScore(leadData), {
    maxTokens: 1024,
  });

  // Parse AI response
  let parsed: any;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback scoring based on basic rules
    return fallbackScore(lead);
  }

  return {
    score: Math.min(100, Math.max(0, parsed.score || 50)),
    category: parsed.category || "warm",
    reasoning: parsed.reason || "AI scoring completed",
    factors: {
      follower_quality: parsed.factors?.follower_quality || 50,
      engagement_potential: parsed.factors?.engagement_potential || 50,
      niche_match: parsed.factors?.niche_match || 50,
      activity_level: parsed.factors?.activity_level || 50,
      platform_fit: parsed.factors?.platform_fit || 50,
    },
    recommended_action: parsed.recommended_action || "Contact via WhatsApp",
    best_contact_time: parsed.best_contact_time,
  };
}

export async function scoreLeadsBatch(
  leads: LeadProfile[],
): Promise<Map<string, LeadScore>> {
  const scores = new Map<string, LeadScore>();

  // Process in batches of 5 to respect rate limits
  for (let i = 0; i < leads.length; i += 5) {
    const batch = leads.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map((lead) => scoreLead(lead)));

    results.forEach((result, idx) => {
      const lead = batch[idx];
      if (result.status === "fulfilled") {
        scores.set(lead.id, result.value);
      } else {
        scores.set(lead.id, fallbackScore(lead));
      }
    });
  }

  return scores;
}

// ── Lead Discovery ─────────────────────────────────────

export async function discoverLeadFromProfile(
  profileData: string,
  source: string = "manual",
): Promise<LeadDiscovery> {
  const result = await aiChat(
    `Analyze this social media profile data and extract structured lead information:

${profileData}

Return JSON:
{
  "username": "@username",
  "followers": number,
  "engagement_rate": estimated percentage,
  "niche": "primary content niche",
  "recent_posts": number of posts in last 30 days,
  "avg_likes": average likes per post,
  "verified": true/false,
  "profile_url": "full profile URL if found"
}`,
    { maxTokens: 512 },
  );

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        source,
        username: parsed.username || "unknown",
        followers: parsed.followers || 0,
        engagement_rate: parsed.engagement_rate,
        niche: parsed.niche || "general",
        recent_posts: parsed.recent_posts || 0,
        avg_likes: parsed.avg_likes || 0,
        verified: parsed.verified || false,
        profile_url: parsed.profile_url,
      };
    }
  } catch {}

  return {
    source,
    username: "unknown",
    followers: 0,
    niche: "unknown",
    recent_posts: 0,
    avg_likes: 0,
    verified: false,
  };
}

// ── Outreach Recommender ───────────────────────────────

export async function recommendOutreach(
  lead: LeadProfile,
  score: LeadScore,
): Promise<OutreachPlan> {
  const result = await aiChat(
    `Based on this lead profile and score, create an outreach plan:

Lead: ${lead.name || "Unknown"} | Platform: ${lead.platform || "Unknown"} | Intent: ${lead.intent || "Unknown"}
Score: ${score.score}/100 (${score.category})
City: ${lead.city || "Unknown"} | Followers: ${lead.follower_count || "Unknown"}

Create a personalized outreach plan. Return JSON:
{
  "channel": "whatsapp" or "instagram" or "email",
  "message_template": "personalized first message (2-3 sentences)",
  "talking_points": ["point 1", "point 2", "point 3"],
  "best_time": "best time to contact",
  "follow_up_days": number of days before follow-up,
  "priority": "immediate" or "this_week" or "this_month"
}`,
    { maxTokens: 768 },
  );

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        lead_id: lead.id,
        channel: parsed.channel || "whatsapp",
        message_template: parsed.message_template || getDefaultMessage(lead),
        talking_points: parsed.talking_points || [],
        best_time: parsed.best_time || "10:00 AM IST",
        follow_up_days: parsed.follow_up_days || 3,
        priority: score.score >= 70 ? "immediate" : score.score >= 40 ? "this_week" : "this_month",
      };
    }
  } catch {}

  return {
    lead_id: lead.id,
    channel: "whatsapp",
    message_template: getDefaultMessage(lead),
    talking_points: ["Join BarbieVerse creator program", "Earn rewards for live streaming"],
    best_time: "10:00 AM IST",
    follow_up_days: 3,
    priority: score.score >= 70 ? "immediate" : "this_week",
  };
}

// ── Daily Scout Briefing ───────────────────────────────

export async function generateDailyBriefing(
  leads: LeadProfile[],
  scores: Map<string, LeadScore>,
): Promise<string> {
  const hotLeads = leads.filter((l) => scores.get(l.id)?.category === "hot");
  const warmLeads = leads.filter((l) => scores.get(l.id)?.category === "warm");
  const coldLeads = leads.filter((l) => scores.get(l.id)?.category === "cold");

  const result = await aiChat(
    `Generate a concise daily scouting briefing for a solo founder running a creator economy platform.

Today's lead summary:
- Hot leads (score 70+): ${hotLeads.length}
- Warm leads (score 40-69): ${warmLeads.length}
- Cold leads (score <40): ${coldLeads.length}
- Total leads: ${leads.length}

Top hot leads:
${hotLeads
  .slice(0, 5)
  .map((l) => `- ${l.name || l.instagram || "Unknown"} (${l.platform || "?"}) - Score: ${scores.get(l.id)?.score}`)
  .join("\n")}

Generate a brief daily briefing with:
1. Priority actions for today
2. Top 3 leads to contact immediately
3. Any trends or patterns noticed
4. Motivation/energy boost for the solo founder

Keep it under 200 words, casual tone, use emojis sparingly.`,
    { maxTokens: 512 },
  );

  return result.text;
}

// ── Helpers ────────────────────────────────────────────

function formatLeadForScoring(lead: LeadProfile): string {
  return [
    `Name: ${lead.name || "Unknown"}`,
    `Instagram: ${lead.instagram || "Not provided"}`,
    `City: ${lead.city || "Unknown"}`,
    `Followers: ${lead.follower_count || "Unknown"}`,
    `Platform: ${lead.platform || "Unknown"}`,
    `Intent: ${lead.intent || "Unknown"}`,
    `Status: ${lead.status || "New"}`,
    `UGC Verified: ${lead.ugc_verified ? "Yes" : "No"}`,
    `Notes: ${lead.notes || "None"}`,
  ].join("\n");
}

function fallbackScore(lead: LeadProfile): LeadScore {
  let score = 50; // Base score

  // Follower count bonus
  if (lead.follower_count === "100k_plus") score += 20;
  else if (lead.follower_count === "10k_100k") score += 15;
  else if (lead.follower_count === "1k_10k") score += 10;

  // Platform bonus
  if (lead.platform) score += 5;

  // Intent bonus
  if (lead.intent === "serious") score += 15;
  else if (lead.intent === "existing") score += 10;

  // UGC verified bonus
  if (lead.ugc_verified) score += 10;

  // Has Instagram
  if (lead.instagram) score += 5;

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    category: score >= 70 ? "hot" : score >= 40 ? "warm" : "cold",
    reasoning: "Rule-based scoring (AI unavailable)",
    factors: {
      follower_quality: lead.follower_count === "100k_plus" ? 80 : 50,
      engagement_potential: 50,
      niche_match: 50,
      activity_level: 50,
      platform_fit: lead.platform ? 70 : 30,
    },
    recommended_action:
      score >= 70
        ? "Contact immediately via WhatsApp"
        : score >= 40
          ? "Add to weekly outreach list"
          : "Monitor for changes",
  };
}

function getDefaultMessage(lead: LeadProfile): string {
  const name = lead.name || "there";
  const platform = lead.platform === "poppo" ? "Poppo Live" : lead.platform === "vone" ? "Vone Live" : "live streaming";

  return `Hey ${name}! 👋

I noticed you're interested in ${platform}. We're building something special at BarbieVerse — a community of creators who earn together.

Would love to have you on board. Can we chat for 2 minutes?`;
}
