import { createFileRoute } from "@tanstack/react-router";
import { aiContent, aiRoute } from "@/lib/ai/router";
import { OPENROUTER_MODELS } from "@/lib/ai/providers";

const json = (data: any, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

export const Route = createFileRoute("/api/brand-manager/compare")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { topic, provider } = await request.json();

        if (!topic || !provider) {
          return json({ error: "Missing topic or provider" }, { status: 400 });
        }

        const prompt = `Create an Instagram carousel post about: ${topic}

STYLE: educational
NUMBER OF SLIDES: 7

REQUIREMENTS:
- Slide 1: Bold hook headline + short subtitle (this is the cover)
- Slides 2-6: One key point per slide with headline + 1-2 sentences
- Last slide: Strong CTA slide
- Each slide needs a visual description for image generation
- Keep text minimal — Instagram carousels work best with 30-50 words per slide
- Write in a conversational, empowering tone
- Target audience: Young Indian creators (18-30) who want to earn money through live streaming

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "slides": [
    {
      "headline": "short punchy headline",
      "body": "1-2 sentences max",
      "image_prompt": "detailed image description for AI image generation"
    }
  ],
  "caption": "Instagram caption for this carousel",
  "hashtags": ["relevant", "hashtags"]
}`;

        try {
          if (provider === "premium") {
            const result = await aiRoute({
              prompt,
              taskType: "premium",
              maxTokens: 4096,
            });

            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              return json({ error: "Failed to parse AI response", raw: result.text });
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return json({
              ...parsed,
              _meta: {
                provider: result.provider,
                model: result.model,
                tokens: result.tokens,
                latencyMs: result.latencyMs,
                cost: "~$0.003",
              },
            });
          } else {
            const result = await aiRoute({
              prompt,
              taskType: "content",
              maxTokens: 4096,
              systemPrompt: `You are a content strategist for BarbieVerse — a creator economy platform for young Indian creators.

CONTENT RULES:
- Hook first — first line must stop the scroll
- 80% value, 20% promotion
- Short paragraphs (2-3 sentences)
- Conversational, empowering tone
- Never use corporate speak (leverage, synergy, unlock)
- Specific numbers and examples over vague claims`,
            });

            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              return json({ error: "Failed to parse AI response", raw: result.text });
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return json({
              ...parsed,
              _meta: {
                provider: result.provider,
                model: result.model,
                tokens: result.tokens,
                latencyMs: result.latencyMs,
                cost: "$0.00",
              },
            });
          }
        } catch (e: any) {
          return json({ error: e.message || "Generation failed" }, { status: 500 });
        }
      },
    },
  },
});
