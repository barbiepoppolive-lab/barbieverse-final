// Video Generation — fal.ai (Kling 2.1) + ElevenLabs voice
// Free tier: fal.ai has trial credits, ElevenLabs has 10k chars/month

import { aiContent } from "./router";
import { generateVideoOpenRouter } from "./video-gen-openrouter";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Types ──────────────────────────────────────────────

export interface VideoGenInput {
  prompt: string;
  image_url?: string;
  duration?: "4" | "5" | "6" | "7" | "8" | "9" | "10";
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

  // Download video from OpenRouter (requires auth header) and save to public/
  let publicUrl = result.video_url || "";
  if (publicUrl) {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const videoRes = await fetch(publicUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (videoRes.ok) {
          const buffer = Buffer.from(await videoRes.arrayBuffer());
          const dir = path.join(process.cwd(), "public", "generated-videos");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `reel-${Date.now()}.mp4`;
          fs.writeFileSync(path.join(dir, filename), buffer);
          publicUrl = `/generated-videos/${filename}`;
        }
      }
    } catch (e) {
      console.warn("[VideoGen] Could not download video locally, using original URL:", e);
    }
  }

  return {
    video_url: publicUrl,
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

  // Extract JSON from response - Gemini wraps in ```json ... ```
  // First try safeParseJson directly on full response (it strips markdown)
  let parsed = safeParseJson(result.text);
  
  // If that failed, try more aggressive extraction
  if (!parsed) {
    // Try to find JSON between first { and last }
    const firstBrace = result.text.indexOf("{");
    const lastBrace = result.text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonCandidate = result.text.slice(firstBrace, lastBrace + 1);
      parsed = safeParseJson(jsonCandidate);
    }
  }
  
  if (!parsed) {
    // Fallback: construct script from plain text response
    const lines = result.text.split("\n").filter(l => l.trim() && !l.startsWith("```") && !l.startsWith("\""));
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
  clips?: { url: string; scene: number; cost: number }[];
  final_video?: string;
  video_error?: string;
}> {
  // Step 1: Generate script
  const script = await generateVideoScript({
    topic: input.topic,
    duration: input.duration,
    platform: input.platform,
    style: input.style,
  });

  console.log("[VideoGen] Script generated:", script.scenes.length, "scenes");
  const result: any = { script };

  // Step 2: Generate video clips for each scene (parallel)
  const clips: { url: string; scene: number; cost: number }[] = [];
  const aspectRatio = input.platform === "youtube" ? "16:9" : "9:16";

  // Generate clips in parallel for speed
  const clipPromises = script.scenes.map(async (scene, i) => {
    const sceneDuration = parseInt(scene.duration) || 5;
    const cappedDuration = Math.max(4, Math.min(sceneDuration, 10)) as "4" | "5" | "6" | "7" | "8" | "9" | "10";

    try {
      console.log(`[VideoGen] Generating clip ${i + 1}/${script.scenes.length} (${cappedDuration}s)...`);
      const clip = await generateVideo({
        prompt: scene.visual || scene.text,
        image_url: input.image_url,
        duration: cappedDuration,
        aspect_ratio: aspectRatio,
        model: "seedance",
      });
      return { url: clip.video_url, scene: i, cost: clip.cost };
    } catch (err) {
      console.error(`[VideoGen] Clip ${i + 1} failed:`, err);
      return null;
    }
  });

  const clipResults = await Promise.allSettled(clipPromises);
  for (const result of clipResults) {
    if (result.status === "fulfilled" && result.value) {
      clips.push(result.value);
    }
  }

  result.clips = clips;

  // Step 3: Generate voiceover with Edge TTS fallback
  if (input.withVoiceover) {
    // Try ElevenLabs first
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        result.voiceover = await generateVoice({
          text: script.voiceover,
          voice: input.voice || "jenny",
        });
      } catch (err) {
        console.log("[VideoGen] ElevenLabs failed, trying Edge TTS...");
        // Edge TTS fallback
        const fs = await import("fs");
        const path = await import("path");
        const videoDir = path.join(process.cwd(), "public", "generated-videos");
        fs.mkdirSync(videoDir, { recursive: true });
        const ttsPath = path.join(videoDir, `voiceover-${Date.now()}.mp3`);

        if (await generateEdgeTTS(script.voiceover, ttsPath)) {
          result.voiceover = {
            audio_url: `/generated-videos/${path.basename(ttsPath)}`,
            duration: `${Math.round(script.voiceover.split(/\s+/).length / 150 * 60)}s`,
            size_kb: Math.round(fs.statSync(ttsPath).size / 1024),
            voice: "edge-jenny",
          };
        }
      }
    } else {
      // No ElevenLabs, use Edge TTS directly
      const fs = await import("fs");
      const path = await import("path");
      const videoDir = path.join(process.cwd(), "public", "generated-videos");
      fs.mkdirSync(videoDir, { recursive: true });
      const ttsPath = path.join(videoDir, `voiceover-${Date.now()}.mp3`);

      if (await generateEdgeTTS(script.voiceover, ttsPath)) {
        result.voiceover = {
          audio_url: `/generated-videos/${path.basename(ttsPath)}`,
          duration: `${Math.round(script.voiceover.split(/\s+/).length / 150 * 60)}s`,
          size_kb: Math.round(fs.statSync(ttsPath).size / 1024),
          voice: "edge-jenny",
        };
      }
    }
  }

  // Step 4: Stitch clips together with FFmpeg
  if (clips.length > 0) {
    try {
      const { execSync } = await import("child_process");
      const fs = await import("fs");
      const path = await import("path");

      const videoDir = path.join(process.cwd(), "public", "generated-videos");
      fs.mkdirSync(videoDir, { recursive: true });

      // Download all clips to disk
      const downloadedFiles: string[] = [];
      const apiKey = process.env.OPENROUTER_API_KEY;

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const filename = `scene-${i}.mp4`;
        const localPath = path.join(videoDir, filename);

        // If URL starts with / it's already local
        if (clip.url.startsWith("/")) {
          const localSrc = path.join(process.cwd(), "public", clip.url);
          if (fs.existsSync(localSrc)) {
            fs.copyFileSync(localSrc, localPath);
            downloadedFiles.push(localPath);
            continue;
          } else {
            console.error(`[VideoGen] Local file not found: ${localSrc}`);
          }
        }

        // Download from OpenRouter
        try {
          console.log(`[VideoGen] Downloading clip ${i + 1}...`);
          const res = await fetch(clip.url, {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          });
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(localPath, buffer);
            downloadedFiles.push(localPath);
          } else {
            console.error(`[VideoGen] Download ${i + 1} failed: HTTP ${res.status}`);
          }
        } catch (e) {
          console.error(`[VideoGen] Download failed for clip ${i}:`, e);
        }
      }

      if (downloadedFiles.length === 0) {
        console.error("[VideoGen] No clips downloaded, skipping stitch");
        return result;
      }

      // Create concat file with absolute paths
      const concatFile = path.join(videoDir, "concat.txt");
      const concatContent = downloadedFiles.map(f => `file '${f.replace(/\\/g, "/")}'`).join("\n");
      fs.writeFileSync(concatFile, concatContent, "utf8");

      console.log(`[VideoGen] Stitching ${downloadedFiles.length} clips...`);

      // Concatenate clips
      const outputFile = `reel-${Date.now()}.mp4`;
      const outputPath = path.join(videoDir, outputFile);
      execSync(`ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`, { stdio: "ignore" });

      if (fs.existsSync(outputPath)) {
        result.final_video = `/generated-videos/${outputFile}`;
        console.log(`[VideoGen] Final video: ${result.final_video}`);
      }
    } catch (err) {
      console.error("[VideoGen] FFmpeg stitching failed:", err);
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

// ── Edge TTS Fallback ──────────────────────────────────

export async function generateEdgeTTS(text: string, outputPath: string): Promise<boolean> {
  try {
    const { execSync } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");

    // Find edge-tts executable
    const userScripts = path.join(
      process.env.USERPROFILE || "",
      "AppData",
      "Roaming",
      "Python",
      "Python311",
      "Scripts"
    );
    const edgeTtsPath = path.join(userScripts, "edge-tts.exe");

    if (!fs.existsSync(edgeTtsPath)) {
      console.error("[EdgeTTS] edge-tts.exe not found at:", edgeTtsPath);
      return false;
    }

    // Clean text - remove JSON artifacts, markdown, etc.
    let cleanText = text
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/["\[\]{}]/g, "") // Remove JSON chars
      .replace(/\\n/g, " ") // Remove newlines
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (!cleanText || cleanText.length < 10) {
      console.error("[EdgeTTS] Text too short after cleaning:", cleanText);
      return false;
    }

    // Truncate to reasonable length
    if (cleanText.length > 2000) {
      cleanText = cleanText.slice(0, 2000);
    }

    // Escape for command line
    const escapedText = cleanText.replace(/"/g, '\\"').replace(/%/g, "%%");

    // Generate TTS
    execSync(`"${edgeTtsPath}" --voice "en-US-JennyNeural" --text "${escapedText}" --write-media "${outputPath}" --rate "+10%"`, {
      stdio: "ignore",
    });

    return fs.existsSync(outputPath);
  } catch (err) {
    console.error("[EdgeTTS] Failed:", err);
    return false;
  }
}
