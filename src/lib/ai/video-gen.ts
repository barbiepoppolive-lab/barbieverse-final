// Video Generation — fal.ai (Kling 2.1) + ElevenLabs voice
// Free tier: fal.ai has trial credits, ElevenLabs has 10k chars/month

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export interface VideoGenInput {
  prompt: string;
  image_url?: string;
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  model?: "kling" | "hailuo" | "seedance";
  platform?: string;
}

export interface VideoGenResult {
  video_url: string;
  duration: string;
  aspect_ratio: string;
  model: string;
  cost: number;
}

export interface VoiceGenInput {
  text: string;
  voice?: string;
  model?: "eleven_multilingual_v2" | "eleven_turbo_v2_5";
  stability?: number;
  similarity_boost?: number;
}

export interface VoiceGenResult {
  audio_url: string;
  duration: string;
  size_kb: number;
  voice: string;
}

export interface VideoScriptInput {
  topic: string;
  duration?: "15" | "30" | "60";
  platform?: "youtube" | "instagram" | "tiktok";
  style?: "educational" | "entertaining" | "promotional";
}

export interface VideoScriptResult {
  title: string;
  hook: string;
  scenes: { text: string; duration: string; visual: string }[];
  voiceover: string;
  hashtags: string[];
}

// ── Video Generation (OpenRouter) ──────────────────────────

export async function generateVideo(input: VideoGenInput): Promise<VideoGenResult> {
  const { generateVideoOpenRouter } = await import("./video-gen-openrouter");

  const modelMap: Record<string, string> = {
    seedance: "seedance-2.0",
    kling: "kling-3.0-standard",
    hailuo: "wan-2.7",
  };

  const result = await generateVideoOpenRouter({
    prompt: input.prompt,
    image_url: input.image_url,
    duration: parseInt(input.duration || "5"),
    aspect_ratio: input.aspect_ratio || "9:16",
    model: (modelMap[input.model || "kling"]) as any,
  });

  return {
    video_url: result.video_url || "",
    duration: input.duration || "5",
    aspect_ratio: input.aspect_ratio || "9:16",
    model: input.model || "kling",
    cost: result.cost_estimate || 0,
  };
}

// ── Voice Generation (ElevenLabs) ──────────────────────

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const VOICE_PRESETS: Record<string, string> = {
  jenny: "21m00Tcm4TlvDq8ikWAM",
  guy: "CwhRBWXzGAHq8TQ4Fs17",
  aria: "9BWtsMINqrJLrRacOk9x",
  sara: "EXAVITQu4vr4xnSDxMaL",
  andrew: "CknqXGnPjBfHtJwYBF0c",
  neerja: "5SsFXwPLhVhJMPPvSklJ",
  prabhat: "VrWAkN1nfJIPNqKEMIuG",
};

export async function generateVoice(input: VoiceGenInput): Promise<VoiceGenResult> {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const voiceId = VOICE_PRESETS[input.voice || "jenny"] || input.voice || VOICE_PRESETS.jenny;
  const model = input.model || "eleven_multilingual_v2";

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: model,
        voice_settings: {
          stability: input.stability || 0.5,
          similarity_boost: input.similarity_boost || 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${err}`);
  }

  const audioBlob = await response.blob();
  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

  // Save to temp file and return URL
  const fs = await import("fs");
  const path = await import("path");
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filename = `voice_${Date.now()}.mp3`;
  const filepath = path.join(tmpDir, filename);
  fs.writeFileSync(filepath, audioBuffer);

  // Duration estimate (rough: 150 words/min for English)
  const wordCount = input.text.split(/\s+/).length;
  const durationSec = Math.round((wordCount / 150) * 60);

  return {
    audio_url: `/tmp/${filename}`,
    duration: `${durationSec}s`,
    size_kb: Math.round(audioBuffer.length / 1024),
    voice: input.voice || "jenny",
  };
}

// ── Helpers ────────────────────────────────────────────

function safeParseJson(text: string): any {
  let clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  clean = clean.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  clean = clean.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(clean); } catch {}
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(clean.slice(first, last + 1)); } catch {}
  }
  return null;
}

// ── Video Script Generation ────────────────────────────

export async function generateVideoScript(input: VideoScriptInput): Promise<VideoScriptResult> {
  const duration = input.duration || "30";
  const platform = input.platform || "youtube";
  const style = input.style || "educational";

  const result = await aiContent(
    `Create a ${duration}-second ${style} video script about: ${input.topic}

PLATFORM: ${platform}
DURATION: ${duration} seconds
STYLE: ${style}

CONTENT RULES:
1. Hook in first 3 seconds (curiosity, shock, or question)
2. Each scene should be 3-5 seconds
3. Voiceover should sound natural and conversational
4. End with clear CTA
5. Use visual cues for each scene
6. Include hashtags for the platform

Return EXACTLY this JSON:
{
  "title": "catchy video title",
  "hook": "opening line that stops the scroll",
  "scenes": [
    { "text": "voiceover text", "duration": "3s", "visual": "what to show on screen" }
  ],
  "voiceover": "full voiceover script",
  "hashtags": ["tag1", "tag2", "tag3"]
}`,
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: construct script from plain text response
    const lines = result.text.split("\n").filter(l => l.trim());
    return {
      title: input.topic,
      hook: lines[0] || "Watch this till the end!",
      scenes: lines.slice(0, 5).map((line, i) => ({
        text: line.replace(/^\d+[\.\)]\s*/, "").trim(),
        duration: `${3 + i}s`,
        visual: `Scene showing ${input.topic}`,
      })),
      voiceover: lines.join(". ").slice(0, 500),
      hashtags: [input.topic.toLowerCase().replace(/\s+/g, ""), "viral", "trending"],
    };
  }

  const parsed = safeParseJson(jsonMatch[0]);
  if (!parsed) {
    return {
      title: input.topic,
      hook: (result.text.match(/[""]([^""]+)[""]/)?.[1]) || "Watch this!",
      scenes: result.text.split("\n").filter(l => l.trim() && !l.startsWith("{") && !l.startsWith("}")).slice(0, 5).map((line, i) => ({
        text: line.replace(/^[-*]\s*/, "").trim(),
        duration: `${3 + i}s`,
        visual: `Scene about ${input.topic}`,
      })),
      voiceover: result.text.slice(0, 500),
      hashtags: ["barbieverse", "creator"],
    };
  }

  const script: VideoScriptResult = {
    title: parsed.title || input.topic,
    hook: parsed.hook || "",
    scenes: parsed.scenes || [],
    voiceover: parsed.voiceover || "",
    hashtags: parsed.hashtags || [],
  };

  return script;
}

// ── Full Video Pipeline ────────────────────────────────

export async function generateFullVideo(input: {
  topic: string;
  duration?: "15" | "30" | "60";
  platform?: "youtube" | "instagram" | "tiktok";
  style?: "educational" | "entertaining" | "promotional";
  image_url?: string;
  voice?: string;
  withVoiceover?: boolean;
}): Promise<{
  script: VideoScriptResult;
  video?: VideoGenResult;
  voiceover?: VoiceGenResult;
}> {
  // Step 1: Generate script
  const script = await generateVideoScript({
    topic: input.topic,
    duration: input.duration,
    platform: input.platform,
    style: input.style,
  });

  const result: any = { script };

  // Step 2: Generate video (try OpenRouter)
  try {
    result.video = await generateVideo({
      prompt: script.scenes.map(s => s.visual).join(". "),
      image_url: input.image_url,
      duration: input.duration === "60" ? "10" : "5",
      aspect_ratio: input.platform === "youtube" ? "16:9" : "9:16",
      model: "seedance",
    });
  } catch (err) {
    console.error("[VideoGen] Video generation failed:", err);
  }

  // Step 3: Generate voiceover (if ElevenLabs configured)
  if (input.withVoiceover && process.env.ELEVENLABS_API_KEY) {
    try {
      result.voiceover = await generateVoice({
        text: script.voiceover,
        voice: input.voice || "jenny",
      });
    } catch (err) {
      console.error("[VideoGen] Voice generation failed:", err);
    }
  }

  return result;
}

// ── Provider Status ────────────────────────────────────

export async function getVideoGenStatus(): Promise<{
  openrouter: boolean;
  elevenlabs: boolean;
  models: string[];
}> {
  const openrouter = !!process.env.OPENROUTER_API_KEY;
  const elevenlabs = !!process.env.ELEVENLABS_API_KEY;

  return {
    openrouter,
    elevenlabs,
    models: openrouter ? ["seedance-2.0", "kling-3.0-standard", "wan-2.7"] : [],
  };
}
