// Video Generation — fal.ai (Kling 2.1) + ElevenLabs voice
// Free tier: fal.ai has trial credits, ElevenLabs has 10k chars/month

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export interface VideoGenInput {
  prompt: string;
  image_url?: string;
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  model?: "kling" | "hailuo";
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

// ── Video Generation (fal.ai) ──────────────────────────

const FAL_API_URL = "https://fal.run";

const VIDEO_MODELS: Record<string, { model: string; cost: number }> = {
  kling: { model: "fal-ai/kling-video/v1", cost: 0.05 },
  hailuo: { model: "fal-ai/minimax-video/video-01-live", cost: 0.03 },
};

export async function generateVideo(input: VideoGenInput): Promise<VideoGenResult> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY not configured");

  const modelConfig = VIDEO_MODELS[input.model || "kling"];
  const duration = input.duration || "5";
  const aspect_ratio = input.aspect_ratio || "9:16";

  // Build prompt with AI enhancement
  const enhancedPrompt = await enhanceVideoPrompt(input.prompt, input.platform);

  const body: any = {
    prompt: enhancedPrompt,
    duration,
    aspect_ratio,
  };

  if (input.image_url) {
    body.image_url = input.image_url;
  }

  const response = await fetch(`${FAL_API_URL}/${modelConfig.model}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai error: ${err}`);
  }

  const result = await response.json();

  return {
    video_url: result.video?.url || result.output?.video_url || "",
    duration,
    aspect_ratio,
    model: input.model || "kling",
    cost: modelConfig.cost,
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
  if (!jsonMatch) throw new Error("Failed to parse video script");

  return JSON.parse(jsonMatch[0]);
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

  // Step 2: Generate video (if fal.ai configured)
  if (process.env.FAL_KEY) {
    try {
      result.video = await generateVideo({
        prompt: script.scenes.map(s => s.visual).join(". "),
        image_url: input.image_url,
        duration: input.duration === "60" ? "10" : "5",
        aspect_ratio: input.platform === "youtube" ? "16:9" : "9:16",
        model: "kling",
      });
    } catch (err) {
      console.error("[VideoGen] Video generation failed:", err);
    }
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

// ── Helper: Enhance video prompt with AI ───────────────

async function enhanceVideoPrompt(prompt: string, platform?: string): Promise<string> {
  try {
    const result = await aiContent(
      `Enhance this video prompt for ${platform || "social media"}.
Make it more cinematic, detailed, and visually compelling.

Original: ${prompt}

Return ONLY the enhanced prompt, no JSON.`,
      { maxTokens: 200 }
    );
    return result.text.trim() || prompt;
  } catch {
    return prompt;
  }
}

// ── Provider Status ────────────────────────────────────

export async function getVideoGenStatus(): Promise<{
  fal: boolean;
  elevenlabs: boolean;
  models: string[];
}> {
  const fal = !!process.env.FAL_KEY;
  const elevenlabs = !!process.env.ELEVENLABS_API_KEY;

  return {
    fal,
    elevenlabs,
    models: fal ? ["kling", "hailuo"] : [],
  };
}
