// AI Comment Generator — Uses existing AI router for social media comments
// Generates human-like, contextual comments for social media posts

import { aiContent } from "@/lib/ai/router";

// ── Comment Generation ─────────────────────────────────

export interface GeneratedComment {
  comment: string;
  confidence: number;
  category: "hot" | "warm" | "cold";
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a social media engagement expert for Barbieverse, a live streaming agency platform.

Your job is to generate human-like, helpful comments on social media posts about live streaming, earning money online, and related topics.

RULES:
1. Be genuine and helpful — never spammy or salesy
2. Reference the specific post content to show you read it
3. Mention Poppo Live or Vone Live naturally IF relevant (don't force it)
4. Keep comments between 2-4 sentences
5. Use a friendly, conversational tone
6. Never use emojis excessively (0-2 max)
7. Never start with "Hey!" or "Hi!" — vary your openings
8. If the post is asking for recommendations, be specific about benefits
9. If the post is sharing experience, acknowledge and add value
10. Always include a subtle call-to-action (e.g., "happy to share more if you're interested")

CATEGORY DETECTION:
- "hot": Post shows active intent to start live streaming or earn money (asking for platforms, how to start, looking for opportunities)
- "warm": Post discusses live streaming, online earning, or side hustles but no explicit intent
- "cold": Post mentions streaming casually or is off-topic

Return JSON only:
{
  "comment": "the generated comment",
  "confidence": 0.0-1.0,
  "category": "hot|warm|cold",
  "reasoning": "brief reason for category"
}`;

export async function generateComment(
  postText: string,
  platform: string,
  authorName: string,
  subreddit?: string,
  groupName?: string
): Promise<GeneratedComment> {
  const context = [
    `Platform: ${platform}`,
    subreddit ? `Subreddit: r/${subreddit}` : "",
    groupName ? `Facebook Group: ${groupName}` : "",
    `Author: ${authorName}`,
    `Post Content:\n${postText}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Analyze this social media post and generate a helpful, human-like comment:

${context}

Generate the comment and classify the post intent.`;

  try {
    const result = await aiContent(prompt, SYSTEM_PROMPT);

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        comment: parsed.comment || "",
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        category: ["hot", "warm", "cold"].includes(parsed.category)
          ? parsed.category
          : "warm",
        reasoning: parsed.reasoning || "",
      };
    }

    // Fallback if JSON parsing fails
    return {
      comment: result.text.slice(0, 500),
      confidence: 0.3,
      category: "warm",
      reasoning: "AI response could not be parsed for category",
    };
  } catch (e: any) {
    console.error("[ai-comment] Generation failed:", e?.message);
    return {
      comment: "",
      confidence: 0,
      category: "cold",
      reasoning: `Error: ${e?.message}`,
    };
  }
}

// ── Batch Generate Comments ────────────────────────────

export async function batchGenerateComments(
  posts: Array<{
    postText: string;
    platform: string;
    authorName: string;
    subreddit?: string;
    groupName?: string;
  }>,
  limit: number = 10
): Promise<GeneratedComment[]> {
  const results: GeneratedComment[] = [];

  for (const post of posts.slice(0, limit)) {
    const comment = await generateComment(
      post.postText,
      post.platform,
      post.authorName,
      post.subreddit,
      post.groupName
    );
    results.push(comment);

    // Small delay between AI calls
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}
