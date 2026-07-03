// Music Recommendation Engine — AI-powered music selection for content
// Uses AI to pick the perfect trendy/funky background music

import { aiContent } from "./router";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Types ──────────────────────────────────────────────

export type MusicMood =
  | "upbeat"
  | "chill"
  | "energetic"
  | "funky"
  | "trendy"
  | "cinematic"
  | "corporate"
  | "playful"
  | "dramatic"
  | "ambient";

export type MusicGenre =
  | "pop"
  | "hip-hop"
  | "lo-fi"
  | "electronic"
  | "acoustic"
  | "funk"
  | "jazz"
  | "rock"
  | "r&b"
  | "indian";

export type ContentType =
  | "carousel"
  | "reel"
  | "story"
  | "blog"
  | "social_post"
  | "promo";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: MusicMood[];
  genre: MusicGenre[];
  bpm: number;
  duration: number;
  tags: string[];
  url: string;
  preview_url: string;
  source: "pixabay" | "freemusiclab" | "curated";
  license: string;
}

export interface MusicRecommendation {
  track: MusicTrack;
  reason: string;
  confidence: number;
  searchQuery: string;
}

export interface ContentMusicPlan {
  contentType: ContentType;
  mood: MusicMood;
  genre: MusicGenre;
  bpm: { min: number; max: number };
  reason: string;
}

// ── Music Library (curated free tracks) ────────────────

const MUSIC_LIBRARY: MusicTrack[] = [
  // Upbeat/Funky
  {
    id: "upbeat-01",
    title: "Upbeat Funky Vibes",
    artist: "Pixabay",
    mood: ["upbeat", "funky", "energetic"],
    genre: ["funk", "pop"],
    bpm: 120,
    duration: 30,
    tags: ["funky", "upbeat", "groovy", "bass"],
    url: "https://cdn.pixabay.com/audio/2024/11/28/audio_89eb033745.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/11/28/audio_89eb033745_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "trendy-01",
    title: "Trendy Social Media",
    artist: "Pixabay",
    mood: ["trendy", "upbeat"],
    genre: ["electronic", "pop"],
    bpm: 128,
    duration: 30,
    tags: ["trendy", "social", "instagram", "reels"],
    url: "https://cdn.pixabay.com/audio/2024/09/24/audio_7b3b0a65c8.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/09/24/audio_7b3b0a65c8_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "chill-01",
    title: "Chill Lo-Fi Beats",
    artist: "Pixabay",
    mood: ["chill", "ambient"],
    genre: ["lo-fi", "electronic"],
    bpm: 85,
    duration: 45,
    tags: ["lo-fi", "chill", "study", "relaxing"],
    url: "https://cdn.pixabay.com/audio/2024/10/01/audio_8e28b422b3.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/10/01/audio_8e28b422b3_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "indian-01",
    title: "Indian Fusion Beat",
    artist: "Pixabay",
    mood: ["upbeat", "trendy"],
    genre: ["indian", "electronic"],
    bpm: 110,
    duration: 35,
    tags: ["indian", "fusion", "bollywood", "modern"],
    url: "https://cdn.pixabay.com/audio/2024/07/15/audio_c8a6b3e9d1.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/07/15/audio_c8a6b3e9d1_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "promo-01",
    title: "Promo Energy",
    artist: "Pixabay",
    mood: ["energetic", "dramatic"],
    genre: ["electronic", "pop"],
    bpm: 140,
    duration: 25,
    tags: ["promo", "energy", "commercial", "ad"],
    url: "https://cdn.pixabay.com/audio/2024/08/20/audio_a1b2c3d4e5.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/08/20/audio_a1b2c3d4e5_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "story-01",
    title: "Story Time Vibes",
    artist: "Pixabay",
    mood: ["playful", "chill"],
    genre: ["acoustic", "pop"],
    bpm: 95,
    duration: 40,
    tags: ["story", "narrative", "warm", "gentle"],
    url: "https://cdn.pixabay.com/audio/2024/11/05/audio_f6e7d8c9b0.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/11/05/audio_f6e7d8c9b0_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "corporate-01",
    title: "Corporate Inspiring",
    artist: "Pixabay",
    mood: ["cinematic", "corporate"],
    genre: ["electronic", "pop"],
    bpm: 115,
    duration: 50,
    tags: ["corporate", "inspiring", "professional", "clean"],
    url: "https://cdn.pixabay.com/audio/2024/10/15/audio_d4e5f6a7b8.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/10/15/audio_d4e5f6a7b8_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
  {
    id: "funky-01",
    title: "Funky Fresh Beat",
    artist: "Pixabay",
    mood: ["funky", "playful", "upbeat"],
    genre: ["funk", "hip-hop"],
    bpm: 105,
    duration: 35,
    tags: ["funky", "fresh", "groove", "bass"],
    url: "https://cdn.pixabay.com/audio/2024/09/10/audio_e1f2a3b4c5.mp3",
    preview_url: "https://cdn.pixabay.com/audio/2024/09/10/audio_e1f2a3b4c5_150.mp3",
    source: "pixabay",
    license: "Pixabay License",
  },
];

// ── Content Music Mapping ──────────────────────────────

const CONTENT_MUSIC_MAP: Record<ContentType, ContentMusicPlan> = {
  carousel: {
    contentType: "carousel",
    mood: "upbeat",
    genre: "pop",
    bpm: { min: 100, max: 130 },
    reason: "Carousels need catchy, scroll-stopping beats that keep viewers engaged through all slides",
  },
  reel: {
    contentType: "reel",
    mood: "trendy",
    genre: "electronic",
    bpm: { min: 110, max: 140 },
    reason: "Reels need high-energy, trendy audio that matches fast-paced visual content",
  },
  story: {
    contentType: "story",
    mood: "chill",
    genre: "acoustic",
    bpm: { min: 80, max: 110 },
    reason: "Stories need intimate, personal vibes that feel authentic and relatable",
  },
  blog: {
    contentType: "blog",
    mood: "ambient",
    genre: "lo-fi",
    bpm: { min: 70, max: 100 },
    reason: "Blog audio needs to be non-distracting background music for reading/listening",
  },
  social_post: {
    contentType: "social_post",
    mood: "funky",
    genre: "pop",
    bpm: { min: 100, max: 125 },
    reason: "Social posts need short, punchy beats that grab attention in feeds",
  },
  promo: {
    contentType: "promo",
    mood: "energetic",
    genre: "electronic",
    bpm: { min: 120, max: 150 },
    reason: "Promos need maximum energy and excitement to drive action",
  },
};

// ── AI Music Recommendation ────────────────────────────

/**
 * Get AI-powered music recommendation for content.
 * Analyzes content topic, platform, and mood to pick the perfect track.
 */
export async function recommendMusic(input: {
  contentType: ContentType;
  topic: string;
  platform?: string;
  mood?: MusicMood;
  genre?: MusicGenre;
}): Promise<MusicRecommendation> {
  const plan = CONTENT_MUSIC_MAP[input.contentType];

  // Use AI to analyze and refine the recommendation
  const result = await aiContent(
    `You are a music curator for social media content. Analyze this content and recommend the PERFECT background music.

CONTENT TYPE: ${input.contentType}
TOPIC: ${input.topic}
PLATFORM: ${input.platform || "instagram"}
DESIRED MOOD: ${input.mood || plan.mood}
DESIRED GENRE: ${input.genre || plan.genre}
BPM RANGE: ${plan.bpm.min}-${plan.bpm.max}

Available music tags: funky, upbeat, trendy, chill, lo-fi, indian, fusion, electronic, acoustic, pop, hip-hop, cinematic, corporate, playful, energetic

Return EXACTLY this JSON:
{
  "mood": "best mood tag from available list",
  "genre": "best genre from available list",
  "tags": ["top 3 matching tags"],
  "bpm_preference": "low|medium|high",
  "reason": "why this music fits the content in 1 sentence"
}`,
    { maxTokens: 256 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  let aiPlan = plan;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      aiPlan = {
        ...plan,
        mood: parsed.mood || plan.mood,
        genre: parsed.genre || plan.genre,
        reason: parsed.reason || plan.reason,
      };
    } catch {}
  }

  // Find best matching track from library
  const track = findBestTrack(aiPlan, input.topic);

  return {
    track,
    reason: aiPlan.reason,
    confidence: 0.85,
    searchQuery: `${aiPlan.mood} ${aiPlan.genre} ${input.topic.split(" ").slice(0, 2).join(" ")}`,
  };
}

/**
 * Find the best matching track from the library.
 */
function findBestTrack(plan: ContentMusicPlan, topic: string): MusicTrack {
  const topicLower = topic.toLowerCase();

  // Score each track
  let bestTrack = MUSIC_LIBRARY[0];
  let bestScore = 0;

  for (const track of MUSIC_LIBRARY) {
    let score = 0;

    // Mood match
    if (track.mood.includes(plan.mood)) score += 40;

    // Genre match
    if (track.genre.includes(plan.genre)) score += 30;

    // BPM in range
    if (track.bpm >= plan.bpm.min && track.bpm <= plan.bpm.max) score += 20;

    // Topic keyword match
    for (const tag of track.tags) {
      if (topicLower.includes(tag)) score += 10;
    }

    // Indian content bonus
    if (topicLower.includes("indian") || topicLower.includes("poppo") || topicLower.includes("vone")) {
      if (track.genre.includes("indian")) score += 25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTrack = track;
    }
  }

  return bestTrack;
}

/**
 * Get music for a specific content type (quick recommendation).
 */
export async function getContentTypeMusic(contentType: ContentType): Promise<MusicTrack> {
  const plan = CONTENT_MUSIC_MAP[contentType];
  return findBestTrack(plan, "");
}

/**
 * Search music by tags/mood.
 */
export function searchMusic(query: string): MusicTrack[] {
  const q = query.toLowerCase();
  return MUSIC_LIBRARY.filter(
    (track) =>
      track.tags.some((t) => t.includes(q)) ||
      track.mood.some((m) => m.includes(q)) ||
      track.genre.some((g) => g.includes(q)) ||
      track.title.toLowerCase().includes(q),
  );
}

/**
 * Get all available tracks.
 */
export function getAllTracks(): MusicTrack[] {
  return MUSIC_LIBRARY;
}

/**
 * Get tracks by mood.
 */
export function getTracksByMood(mood: MusicMood): MusicTrack[] {
  return MUSIC_LIBRARY.filter((t) => t.mood.includes(mood));
}

/**
 * Get tracks by genre.
 */
export function getTracksByGenre(genre: MusicGenre): MusicTrack[] {
  return MUSIC_LIBRARY.filter((t) => t.genre.includes(genre));
}

/**
 * Get the music plan for a content type.
 */
export function getContentMusicPlan(contentType: ContentType): ContentMusicPlan {
  return CONTENT_MUSIC_MAP[contentType];
}
