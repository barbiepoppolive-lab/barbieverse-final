// Audio Generation Service — TTS for carousels, posts, stories
// Uses Microsoft Edge TTS (free, no API key, neural voices)

import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ── Config ─────────────────────────────────────────────

const PYTHON_PATH = process.env.PYTHON_PATH || "C:\\Program Files\\Python311\\python.exe";
const TTS_SCRIPT = join(process.cwd(), "src", "lib", "ai", "tts.py");
const AUDIO_DIR = join(process.cwd(), "public", "audio");

// Ensure audio directory exists
if (!existsSync(AUDIO_DIR)) {
  mkdirSync(AUDIO_DIR, { recursive: true });
}

// ── Types ──────────────────────────────────────────────

export type VoicePreset =
  | "jenny"
  | "guy"
  | "aria"
  | "davis"
  | "tony"
  | "nancy"
  | "sara"
  | "andrew"
  | "emma"
  | "brian"
  | "neerja"
  | "neerja-expressive"
  | "prabhat"
  | "sonia"
  | "ryan"
  | "carousel-narrator"
  | "reel-voiceover"
  | "blog-reader"
  | "story-narrator"
  | "promo-voice"
  | "indian-host";

export interface AudioGenInput {
  text: string;
  voice?: VoicePreset | string;
  rate?: string;
  volume?: string;
  withSubtitles?: boolean;
}

export interface AudioGenResult {
  audioPath: string;
  audioUrl: string;
  voice: string;
  sizeKb: number;
  subtitlePath?: string;
  subtitleUrl?: string;
}

export interface CarouselAudio {
  slides: { text: string; audioUrl: string }[];
  fullNarration: { audioUrl: string; duration: string };
}

// ── Core TTS ───────────────────────────────────────────

async function runTTS(args: string[]): Promise<any> {
  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_PATH,
      [TTS_SCRIPT, ...args],
      { timeout: 60_000 },
    );

    // Parse JSON output
    const lines = stdout.trim().split("\n");
    const jsonLine = lines.find((l) => l.startsWith("{"));
    if (jsonLine) {
      return JSON.parse(jsonLine);
    }

    throw new Error(`Unexpected output: ${stdout}`);
  } catch (err: any) {
    console.error("[TTS] Error:", err.message);
    throw new Error(`TTS generation failed: ${err.message}`);
  }
}

// ── Public API ─────────────────────────────────────────

/**
 * Generate audio from text.
 */
export async function generateAudio(
  input: AudioGenInput,
): Promise<AudioGenResult> {
  const voice = input.voice || "jenny";
  const filename = `audio_${Date.now()}.mp3`;
  const outputPath = join(AUDIO_DIR, filename);

  const args = [
    "--text", input.text,
    "--voice", voice,
    "--output", outputPath,
  ];

  if (input.rate) args.push("--rate", input.rate);
  if (input.volume) args.push("--volume", input.volume);

  const result = await runTTS(args);

  const audioUrl = `/audio/${filename}`;
  const res: AudioGenResult = {
    audioPath: outputPath,
    audioUrl,
    voice: result.voice,
    sizeKb: result.size_kb,
  };

  // Generate subtitles if requested
  if (input.withSubtitles) {
    const vttFilename = filename.replace(".mp3", ".vtt");
    const vttPath = join(AUDIO_DIR, vttFilename);

    await runTTS([
      "--text", input.text,
      "--voice", voice,
      "--output", outputPath,
      "--subtitles",
    ]);

    res.subtitlePath = vttPath;
    res.subtitleUrl = `/audio/${vttFilename}`;
  }

  return res;
}

/**
 * Generate carousel narration audio.
 * Creates individual slide audio + full narration.
 */
export async function generateCarouselAudio(slides: {
  headline: string;
  body: string;
}[]): Promise<CarouselAudio> {
  const voice = "carousel-narrator";
  const results: { text: string; audioUrl: string }[] = [];

  // Generate audio for each slide
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const text = `${slide.headline}. ${slide.body}`;
    const filename = `carousel_${Date.now()}_${i}.mp3`;
    const outputPath = join(AUDIO_DIR, filename);

    await runTTS([
      "--text", text,
      "--voice", voice,
      "--output", outputPath,
      "--rate", "+5%",
    ]);

    results.push({
      text,
      audioUrl: `/audio/${filename}`,
    });
  }

  // Generate full narration (all slides combined)
  const fullText = slides
    .map((s, i) => `Slide ${i + 1}: ${s.headline}. ${s.body}`)
    .join(". ");
  const fullFilename = `carousel_full_${Date.now()}.mp3`;
  const fullPath = join(AUDIO_DIR, fullFilename);

  await runTTS([
    "--text", fullText,
    "--voice", voice,
    "--output", fullPath,
    "--rate", "+5%",
  ]);

  // Estimate duration (rough: 150 words per minute)
  const wordCount = fullText.split(/\s+/).length;
  const durationSec = Math.ceil((wordCount / 150) * 60);

  return {
    slides: results,
    fullNarration: {
      audioUrl: `/audio/${fullFilename}`,
      duration: `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, "0")}`,
    },
  };
}

/**
 * Generate blog post audio (read-aloud).
 */
export async function generateBlogAudio(
  content: string,
): Promise<AudioGenResult> {
  // Clean HTML from content
  const cleanText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return generateAudio({
    text: cleanText,
    voice: "blog-reader",
    rate: "-5%",
  });
}

/**
 * Generate social post audio (short, punchy).
 */
export async function generateSocialAudio(
  caption: string,
): Promise<AudioGenResult> {
  return generateAudio({
    text: caption,
    voice: "reel-voiceover",
    rate: "+10%",
  });
}

/**
 * Generate story narration audio.
 */
export async function generateStoryAudio(slides: {
  text: string;
  cta?: string;
}[]): Promise<{ slides: AudioGenResult[]; full: AudioGenResult }> {
  const slideResults: AudioGenResult[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const text = slide.cta ? `${slide.text} ${slide.cta}` : slide.text;
    const result = await generateAudio({
      text,
      voice: "story-narrator",
      rate: "+5%",
    });
    slideResults.push(result);
  }

  // Full narration
  const fullText = slides.map((s) => s.text).join(". ");
  const full = await generateAudio({
    text: fullText,
    voice: "story-narrator",
    rate: "+5%",
  });

  return { slides: slideResults, full };
}

/**
 * List available voices.
 */
export async function listVoices(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      PYTHON_PATH,
      [TTS_SCRIPT, "--list-voices"],
      { timeout: 30_000 },
    );
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Clean up old audio files (older than 24 hours).
 */
export function cleanupAudioFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const { readdirSync, statSync } = require("fs");
  const files = readdirSync(AUDIO_DIR);
  let cleaned = 0;
  const now = Date.now();

  for (const file of files) {
    const filePath = join(AUDIO_DIR, file);
    const stat = statSync(filePath);
    if (now - stat.mtimeMs > maxAgeMs) {
      unlinkSync(filePath);
      cleaned++;
    }
  }

  return cleaned;
}
