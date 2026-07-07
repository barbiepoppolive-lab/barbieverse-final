import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── 30-Day Content Generation — All via OpenRouter free models ──

const monthPlanSchema = z.object({
  month: z.number().min(1).max(12).default(new Date().getMonth() + 1),
  year: z.number().min(2025).max(2030).default(new Date().getFullYear()),
  theme: z.string().default("creator economy and live streaming tips"),
  posts_per_day: z.number().min(1).max(5).default(2),
  platforms: z.array(z.string()).default(["instagram", "twitter", "youtube"]),
  generate_content: z.boolean().default(true),
});

type DayPlan = {
  day: number;
  date: string;
  posts: {
    platform: string;
    content_type: string;
    topic: string;
    content?: any;
    status: "generated" | "pending" | "failed";
  }[];
};

type MonthPlan = {
  month: number;
  year: number;
  theme: string;
  total_posts: number;
  days: DayPlan[];
  stats: {
    by_platform: Record<string, number>;
    by_type: Record<string, number>;
    generated: number;
    pending: number;
    failed: number;
  };
  generated_at: string;
  model_used: string;
};

// ── Content Mix Strategy ───────────────────────────────

const CONTENT_PILLARS = {
  education: { weight: 0.40, types: ["carousel", "thread"], platforms: ["instagram", "twitter", "linkedin"] },
  entertainment: { weight: 0.25, types: ["reel", "story"], platforms: ["instagram", "tiktok", "moj"] },
  inspiration: { weight: 0.20, types: ["story", "post"], platforms: ["instagram", "facebook"] },
  promotion: { weight: 0.15, types: ["carousel", "reel"], platforms: ["instagram", "youtube"] },
};

const TOPIC_SEEDS = {
  education: [
    "How to start live streaming with zero investment",
    "5 mistakes new creators make on Poppo Live",
    "Complete guide to Vone Live for beginners",
    "How to grow from 0 to 1000 followers in 30 days",
    "Content creation tools every Indian creator needs",
    "How the algorithm actually works in 2026",
    "SEO for creators: get found by brands",
    "How to write hooks that stop the scroll",
    "Building a personal brand as a college student",
    "Analytics deep dive: what your numbers really mean",
    "How to edit reels like a pro on your phone",
    "Collaboration strategies: grow together",
    "Hashtag research: the complete guide",
    "Best posting times for Indian audiences",
    "How to repurpose one piece of content 5 ways",
  ],
  entertainment: [
    "Day in the life of a live streamer",
    "POV: Your first viral reel",
    "Behind the scenes of my streaming setup",
    "Reacting to my old content",
    "Streaming setup tour under ₹5000",
    "Trying trending audio for the first time",
    "When brands slide into your DMs",
    "My content creation morning routine",
    "Unboxing streaming equipment",
    "Chat plays my video game",
  ],
  inspiration: [
    "How I went from ₹0 to ₹50K/month streaming",
    "Creator success story: from village to viral",
    "Why I quit my job for live streaming",
    "Mental health tips for content creators",
    "How to stay consistent when nobody's watching",
    "The real cost of being a creator",
    "From 0 to monetized in 90 days: my journey",
    "Why Indian creators are the future",
    "How streaming changed my confidence",
    "Message to every creator struggling right now",
  ],
  promotion: [
    "Join BarbieVerse creator program",
    "New feature alert: what's coming next",
    "How BarbieVerse helps you earn more",
    "Success stories from our creator community",
    "Why choose Poppo Live over other platforms",
    "Live streaming vs YouTube: which pays more?",
    "Refer a friend, earn together",
    "BarbieVerse creator tools walkthrough",
    "Monetization guide: all income streams explained",
    "Q&A: answer your biggest questions",
  ],
};

// ── Main Generator ─────────────────────────────────────

export const generateMonthPlan = createServerFn({ method: "POST" })
  .validator((d) => monthPlanSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const {
      selectBestModel,
      logCost,
    } = await import("../ai/openrouter-optimizer");

    const { aiRoute } = await import("../ai/router");

    // Pick the best free model for content generation
    const model = await selectBestModel("content");
    console.log(`[30DayPlan] Using model: ${model}`);

    const daysInMonth = new Date(data.year, data.month, 0).getDate();
    const monthName = new Date(data.year, data.month - 1).toLocaleString("default", { month: "long" });

    // Step 1: Generate the full month structure (topics + platforms + types)
    const structurePrompt = `Create a detailed 30-day content calendar for ${monthName} ${data.year}.

BRAND: BarbieVerse — helping Indian creators earn through live streaming on Poppo Live and Vone Live.
THEME: ${data.theme}
PLATFORMS: ${data.platforms.join(", ")}
POSTS PER DAY: ${data.posts_per_day}
DAYS IN MONTH: ${daysInMonth}

CONTENT MIX (strict):
- 40% Education (carousels, threads) — tips, guides, how-tos
- 25% Entertainment (reels, stories) — behind-the-scenes, trending, fun
- 20% Inspiration (stories, posts) — success stories, motivation, journey
- 15% Promotion (carousels, reels) — product features, CTAs, community

RULES:
1. Alternate content types — never 2 carousels in a row
2. Best posting times: 10am, 1pm, 7pm IST
3. Monday: Educational content, Tuesday: Entertainment, Wednesday: Inspiration, Thursday: Education, Friday: Entertainment, Saturday: Mixed, Sunday: Inspiration
4. Each topic must be specific and actionable (not generic)
5. Include trending topics and seasonal events where relevant
6. Promotional content only 1 per day max
7. Mix platforms — not all posts on same platform

Return EXACTLY this JSON:
{
  "days": [
    {
      "day": 1,
      "date": "2026-07-01",
      "pillar": "education",
      "posts": [
        {
          "platform": "instagram",
          "content_type": "carousel",
          "topic": "specific actionable topic for this post",
          "hook": "opening hook line"
        }
      ]
    }
  ]
}`;

    const structureResult = await aiRoute({
      prompt: structurePrompt,
      taskType: "content",
      maxTokens: 8192,
    });

    // Parse the structure
    let structure: { days: any[] };
    try {
      const jsonMatch = structureResult.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      structure = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: generate a basic structure
      structure = generateFallbackStructure(data.month, data.year, daysInMonth, data.posts_per_day, data.platforms);
    }

    console.log(`[30DayPlan] Structure generated: ${structure.days.length} days`);

    // Step 2: Generate actual content for each post (if requested)
    const days: DayPlan[] = [];
    let generated = 0;
    let failed = 0;

    for (const day of structure.days) {
      const dayPlan: DayPlan = {
        day: day.day,
        date: day.date,
        posts: [],
      };

      for (const post of day.posts || []) {
        const postEntry = {
          platform: post.platform || "instagram",
          content_type: post.content_type || "carousel",
          topic: post.topic || "",
          content: undefined as any,
          status: "pending" as "generated" | "pending" | "failed",
        };

        if (data.generate_content) {
          try {
            const content = await generatePostContent(
              post.content_type,
              post.topic,
              post.platform,
              post.hook,
              aiRoute
            );
            postEntry.content = content;
            postEntry.status = "generated";
            generated++;

            // Log cost (free model = $0)
            logCost({
              model,
              task_type: `30day_${post.content_type}`,
              input_tokens: Math.ceil(post.topic.length / 4),
              output_tokens: Math.ceil(JSON.stringify(content).length / 4),
              cost_usd: 0,
              latency_ms: 0,
              success: true,
              provider: "openrouter",
            });
          } catch (err: any) {
            console.error(`[30DayPlan] Failed to generate content for day ${day.day}:`, err.message);
            postEntry.status = "failed";
            failed++;
          }
        }

        dayPlan.posts.push(postEntry);
      }

      days.push(dayPlan);
    }

    // Calculate stats
    const byPlatform: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const d of days) {
      for (const p of d.posts) {
        byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1;
        byType[p.content_type] = (byType[p.content_type] || 0) + 1;
      }
    }

    const totalPosts = days.reduce((sum, d) => sum + d.posts.length, 0);

    const plan: MonthPlan = {
      month: data.month,
      year: data.year,
      theme: data.theme,
      total_posts: totalPosts,
      days,
      stats: {
        by_platform: byPlatform,
        by_type: byType,
        generated,
        pending: totalPosts - generated - failed,
        failed,
      },
      generated_at: new Date().toISOString(),
      model_used: model,
    };

    // Save to DB
    const { q1 } = await import("../db.server");
    await q1(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('month_plan', $1, $2, $3, 'draft', 0, NOW())
       RETURNING *`,
      [
        `${monthName} ${data.year} Content Plan`,
        JSON.stringify(data),
        JSON.stringify(plan),
      ]
    );

    console.log(`[30DayPlan] Complete: ${generated} generated, ${failed} failed, ${totalPosts} total`);

    return plan;
  });

// ── Post Content Generator ─────────────────────────────

async function generatePostContent(
  contentType: string,
  topic: string,
  platform: string,
  hook: string | undefined,
  aiRoute: Function
): Promise<any> {
  const prompts: Record<string, string> = {
    carousel: `Create an Instagram carousel about: ${topic}

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "slides": [
    { "headline": "short headline", "body": "1-2 sentences", "image_prompt": "detailed image description for AI" }
  ],
  "caption": "post caption",
  "hashtags": ["tag1", "tag2", "tag3"]
}`,

    reel: `Create a reel/video script about: ${topic}
${hook ? `Hook: ${hook}` : ""}

Return EXACTLY this JSON:
{
  "hook": "first 3 second hook",
  "scenes": [
    { "duration": "0-3s", "visual": "what to show", "audio": "voiceover text", "text_overlay": "on-screen text" }
  ],
  "caption": "post caption",
  "hashtags": ["tag1", "tag2"]
}`,

    story: `Create an Instagram story sequence about: ${topic}

Return EXACTLY this JSON:
{
  "slides": [
    { "text": "short text on slide", "image_prompt": "background description", "cta": "optional call to action" }
  ],
  "hashtags": ["tag1"]
}`,

    thread: `Create a Twitter thread about: ${topic}

Return EXACTLY this JSON:
{
  "tweets": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"],
  "hashtags": ["tag1", "tag2"]
}`,

    post: `Create a ${platform} post about: ${topic}

Return EXACTLY this JSON:
{
  "text": "post text (150-300 words)",
  "hook": "first line",
  "cta": "call to action",
  "hashtags": ["tag1", "tag2"]
}`,

    poll: `Create a ${platform} poll about: ${topic}

Return EXACTLY this JSON:
{
  "question": "poll question",
  "options": ["Option 1", "Option 2", "Option 3"],
  "caption": "caption for the poll"
}`,
  };

  const prompt = prompts[contentType] || prompts.post;

  const result = await aiRoute({
    prompt: `You are BarbieVerse AI content creator. Brand voice: empowering, fun, authentic, helpful, direct. Target: young Indian creators (18-30).

${prompt}`,
    taskType: "content",
    maxTokens: 2048,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse content");
  return JSON.parse(jsonMatch[0]);
}

// ── Fallback Structure Generator ───────────────────────

function generateFallbackStructure(
  month: number,
  year: number,
  daysInMonth: number,
  postsPerDay: number,
  platforms: string[]
): { days: any[] } {
  const days: any[] = [];
  const pillars = Object.keys(CONTENT_PILLARS);
  const allTopics = [
    ...TOPIC_SEEDS.education,
    ...TOPIC_SEEDS.entertainment,
    ...TOPIC_SEEDS.inspiration,
    ...TOPIC_SEEDS.promotion,
  ];

  const contentTypes = ["carousel", "reel", "story", "thread", "post", "poll"];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    const pillar = pillars[dayOfWeek % pillars.length];

    const posts = [];
    for (let p = 0; p < postsPerDay; p++) {
      const topicIndex = ((d - 1) * postsPerDay + p) % allTopics.length;
      const platform = platforms[(d + p) % platforms.length];
      const contentType = contentTypes[(d + p) % contentTypes.length];

      posts.push({
        platform,
        content_type: contentType,
        topic: allTopics[topicIndex],
        hook: undefined,
      });
    }

    days.push({
      day: d,
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      pillar,
      posts,
    });
  }

  return { days };
}
