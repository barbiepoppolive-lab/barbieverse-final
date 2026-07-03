import { aiPremium } from "../../ai/router";

export type Scene = {
  id: number;
  duration: number;
  visual_prompt: string;
  narration: string;
  text_overlay?: string;
  transition?: string;
};

export type ReelScript = {
  title: string;
  hook: string;
  scenes: Scene[];
  cta: string;
  total_duration: number;
  tags: string[];
};

export const REEL_TEMPLATES: Record<string, { name: string; description: string; style: string }> = {
  marketing: {
    name: "Marketing Promo",
    description: "Highlight features and benefits with high energy",
    style: "Dynamic cuts, bold text overlays, energetic narration. Focus on pain points then solution.",
  },
  testimonial: {
    name: "Creator Testimonial",
    description: "Real creator stories and earnings proof",
    style: "Authentic, personal, story-driven. Show real results with specific numbers.",
  },
  tutorial: {
    name: "How-To Tutorial",
    description: "Step-by-step platform guide",
    style: "Clear, instructional, screen-recording style. Break down complex steps simply.",
  },
  announcement: {
    name: "News / Announcement",
    description: "Platform updates and events",
    style: "Urgent, exciting, news-anchor style. Lead with the announcement, then details.",
  },
  motivational: {
    name: "Motivational",
    description: "Inspire creators to take action",
    style: "Emotional, aspirational, cinematic. Use real success stories and bold statements.",
  },
};

export async function generateReelScript(input: {
  topic: string;
  template?: string;
  duration_seconds?: number;
  language?: string;
}): Promise<ReelScript> {
  const template = REEL_TEMPLATES[input.template || "marketing"];
  const duration = input.duration_seconds || 30;
  const sceneCount = Math.max(3, Math.round(duration / 6));

  const result = await aiPremium(
    `You are a viral social media video scriptwriter for BarbieVerse — a creator economy platform for Poppo Live.

TASK: Create a ${duration}-second video reel script about: ${input.topic}

TEMPLATE: ${template?.name || "Marketing Promo"}
STYLE: ${template?.style || "Dynamic and engaging"}

REQUIREMENTS:
- Start with a HOOK that grabs attention in the first 2 seconds
- ${sceneCount} scenes, each with a detailed visual prompt + narration
- Visual prompts must be CINEMATIC and DETAILED (for AI video generation — describe lighting, camera angles, motion, mood)
- Narration should be conversational, energetic, and under 60 characters per scene for subtitles
- Include text overlays for key points
- End with a strong CTA
- Language: ${input.language || "English"}
- Every visual prompt should describe a SCENE, not just text on screen

EXAMPLE VISUAL PROMPT:
"Close-up of a young woman smiling at her phone, neon pink lighting reflecting on her face, bokeh city lights in background, handheld camera with slight movement, warm and inviting mood"

Return EXACTLY this JSON structure:
{
  "title": "catchy reel title",
  "hook": "opening hook text shown on screen",
  "scenes": [
    {
      "id": 1,
      "duration": 5,
      "visual_prompt": "detailed cinematic visual description for AI video generation",
      "narration": "what the voiceover says here",
      "text_overlay": "optional bold text shown on screen",
      "transition": "cut|fade|zoom|slide"
    }
  ],
  "cta": "call to action text",
  "total_duration": ${duration},
  "tags": ["relevant", "hashtags"]
}`,
    {
      systemPrompt: `You are an expert social media video scriptwriter. You write scripts that go viral.
Your scripts have:
- A hook that stops the scroll
- Visual prompts detailed enough for AI video generation
- Narration that sounds like a real person talking
- A CTA that makes people take action

IMPORTANT: Each visual_prompt must describe a SCENE with people, places, lighting, camera angles — NOT text on screen.`,
      maxTokens: 2048,
    },
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and normalize
  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("AI response missing scenes array");
  }

  return {
    title: parsed.title || input.topic,
    hook: parsed.hook || "",
    scenes: parsed.scenes.map((s: any, i: number) => ({
      id: s.id || i + 1,
      duration: Math.min(s.duration || 5, 10),
      visual_prompt: s.visual_prompt || "",
      narration: s.narration || "",
      text_overlay: s.text_overlay,
      transition: s.transition || "cut",
    })),
    cta: parsed.cta || "",
    total_duration: parsed.total_duration || duration,
    tags: parsed.tags || [],
  };
}
