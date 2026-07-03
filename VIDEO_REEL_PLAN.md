# AI Video Reel Generator — Implementation Plan

## Overview

Build an AI-powered video reel generator that creates 30-60 second marketing reels for BarbieVerse. The pipeline:

1. **Script Generation** → Claude/OpenRouter (AI router)
2. **Voice Narration** → ElevenLabs Flash via fal.ai
3. **Visual Clips** → Kling 2.5-turbo via fal.ai
4. **Assembly** → FFmpeg (local Node.js)

**Target Cost**: ~$0.30-0.55 per 30-second reel

---

## Architecture

```
src/lib/video/
├── providers/
│   ├── fal-client.ts          # fal.ai SDK setup (shared)
│   ├── elevenlabs-tts.ts      # Text-to-speech generation
│   └── kling-video.ts         # Video clip generation
├── pipeline/
│   ├── script-generator.ts    # AI script → scenes breakdown
│   ├── voice-generator.ts     # Script → audio file
│   ├── visual-generator.ts    # Scenes → video clips
│   └── reel-assembler.ts      # Clips + audio → final MP4
├── templates/
│   └── reel-templates.ts      # Pre-built reel templates
├── video.functions.ts         # Server functions (admin API)
└── index.ts                   # Public API exports

src/routes/admin.reels.tsx     # Admin UI for reel generation
```

---

## Database Schema

```sql
CREATE TABLE video_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating_voice','generating_visuals','assembling','completed','failed')),
  audio_url TEXT,
  video_clips JSONB DEFAULT '[]',
  final_video_url TEXT,
  duration_seconds INTEGER DEFAULT 30,
  resolution TEXT DEFAULT '1080x1920',
  aspect_ratio TEXT DEFAULT '9:16',
  template TEXT DEFAULT 'marketing',
  voice_id TEXT DEFAULT 'elevenlabs_rachel',
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  provider_costs JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'admin'
);
```

---

## File-by-File Implementation

### 1. `src/lib/video/providers/fal-client.ts`

fal.ai SDK configuration — shared client for all providers.

```typescript
import { fal } from "@fal-ai/client";

export function initFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set");
  fal.config({ credentials: key });
  return fal;
}

export type FalVideoResult = {
  video: { url: string; file_name: string; file_size: number; content_type: string };
};
```

### 2. `src/lib/video/providers/elevenlabs-tts.ts`

Text-to-speech via ElevenLabs Flash (cheapest: $0.05/1K chars).

```typescript
import { initFal } from "./fal-client";

const ELEVENLABS_FLASH = "fal-ai/elevenlabs/tts/flash";

export async function generateVoice(input: {
  text: string;
  voice_id?: string;
  stability?: number;
  similarity_boost?: number;
}): Promise<{ audioUrl: string; duration: number; charsUsed: number }> {
  const fal = initFal();
  const result = await fal.subscribe(ELEVENLABS_FLASH, {
    input: {
      text: input.text,
      voice_id: input.voice_id || "rachel",  // ElevenLabs preset voice
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: input.stability ?? 0.5,
        similarity_boost: input.similarity_boost ?? 0.75,
      },
    },
  });
  return {
    audioUrl: result.data.audio.url,
    duration: result.data.audio.duration ?? 0,
    charsUsed: input.text.length,
  };
}
```

### 3. `src/lib/video/providers/kling-video.ts`

Video clip generation via Kling 2.5-turbo Standard (cheapest: $0.21/5s).

```typescript
import { initFal } from "./fal-client";

const KLING_IMAGE_TO_VIDEO = "fal-ai/kling-video/v2.5-turbo/standard/image-to-video";

export async function generateClip(input: {
  prompt: string;
  image_url?: string;  // Optional start frame
  duration?: number;   // 5 or 10 seconds
  aspect_ratio?: string; // 16:9, 9:16, 1:1
}): Promise<{ videoUrl: string; duration: number; cost: number }> {
  const fal = initFal();
  const duration = input.duration ?? 5;
  const cost = duration === 5 ? 0.21 : 0.21 + (duration - 5) * 0.042;

  const result = await fal.subscribe(KLING_IMAGE_TO_VIDEO, {
    input: {
      prompt: input.prompt,
      image_url: input.image_url,
      duration: duration.toString(),
      aspect_ratio: input.aspect_ratio ?? "9:16",
    },
  });

  return {
    videoUrl: result.data.video.url,
    duration,
    cost,
  };
}
```

### 4. `src/lib/video/pipeline/script-generator.ts`

AI-powered script generation with scene breakdowns.

```typescript
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

export async function generateReelScript(input: {
  topic: string;
  template?: string;
  duration_seconds?: number;
  language?: string;
}): Promise<ReelScript> {
  const result = await aiPremium({
    prompt: `You are a viral social media video scriptwriter for BarbieVerse, a creator economy platform for Poppo Live.

Create a ${input.duration_seconds || 30}-second video reel script about: ${input.topic}

Template style: ${input.template || 'marketing'}

Requirements:
- Start with a HOOK (first 3 seconds must grab attention)
- 4-6 scenes, each with visual prompt + narration
- Visual prompts should be cinematic, detailed (for AI video generation)
- Narration should be conversational, engaging
- End with a clear CTA
- Language: ${input.language || 'English'}

Return JSON with this exact structure:
{
  "title": "reel title",
  "hook": "opening hook text",
  "scenes": [
    {
      "id": 1,
      "duration": 5,
      "visual_prompt": "detailed visual description for AI video generation",
      "narration": "what the voiceover says",
      "text_overlay": "optional text shown on screen",
      "transition": "optional transition type"
    }
  ],
  "cta": "call to action",
  "total_duration": 30,
  "tags": ["tag1", "tag2"]
}`,
    taskType: "premium",
  });

  return JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
}
```

### 5. `src/lib/video/pipeline/reel-assembler.ts`

FFmpeg assembly of clips + audio → final MP4.

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

export type AssembleInput = {
  clips: Array<{ url: string; duration: number }>;
  audioUrl: string;
  outputName: string;
  resolution?: string; // "1080x1920"
  outputDir?: string;
};

export async function assembleReel(input: AssembleInput): Promise<{ outputPath: string; duration: number }> {
  const tmpDir = input.outputDir || "/tmp/reels";
  await mkdir(tmpDir, { recursive: true });

  const [width, height] = (input.resolution || "1080x1920").split("x").map(Number);
  const outputFile = join(tmpDir, `${input.outputName}.mp4`);
  const concatFile = join(tmpDir, `${input.outputName}_concat.txt`);

  // Download all clips
  const clipPaths: string[] = [];
  for (let i = 0; i < input.clips.length; i++) {
    const clipPath = join(tmpDir, `${input.outputName}_clip_${i}.mp4`);
    const response = await fetch(input.clips[i].url);
    const buffer = await response.arrayBuffer();
    await writeFile(clipPath, Buffer.from(buffer));
    clipPaths.push(clipPath);
  }

  // Download audio
  const audioPath = join(tmpDir, `${input.outputName}_audio.mp3`);
  const audioResponse = await fetch(input.audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  await writeFile(audioPath, Buffer.from(audioBuffer));

  // Create concat list
  const concatContent = clipPaths.map(p => `file '${p}'`).join("\n");
  await writeFile(concatFile, concatContent);

  // Concatenate clips
  const concatenatedPath = join(tmpDir, `${input.outputName}_concat.mp4`);
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${concatenatedPath}"`
  );

  // Get total duration
  const totalDuration = input.clips.reduce((sum, c) => sum + c.duration, 0);

  // Merge with audio, trim to match, add text overlays
  await execAsync(
    `ffmpeg -y -i "${concatenatedPath}" -i "${audioPath}" ` +
    `-map 0:v -map 1:a ` +
    `-c:v libx264 -preset medium -crf 23 ` +
    `-c:a aac -b:a 128k ` +
    `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" ` +
    `-t ${totalDuration} ` +
    `-movflags +faststart ` +
    `"${outputFile}"`
  );

  // Cleanup temp files
  for (const p of [...clipPaths, audioPath, concatFile, concatenatedPath]) {
    try { await unlink(p); } catch {}
  }

  return { outputPath: outputFile, duration: totalDuration };
}
```

### 6. `src/lib/video/video.functions.ts`

Server functions for admin API.

```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Generate a complete reel
export const generateReel = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    topic: z.string().min(1),
    template: z.enum(["marketing", "testimonial", "tutorial", "announcement"]).default("marketing"),
    duration_seconds: z.number().min(5).max(60).default(30),
    voice_id: z.string().optional(),
    resolution: z.string().default("1080x1920"),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    // Step 1: Generate script
    const { generateReelScript } = await import("./pipeline/script-generator");
    const script = await generateReelScript({
      topic: data.topic,
      template: data.template,
      duration_seconds: data.duration_seconds,
    });

    // Step 2: Generate voice
    const { generateVoice } = await import("./providers/elevenlabs-tts");
    const fullNarration = script.scenes.map(s => s.narration).join(". ");
    const voice = await generateVoice({
      text: fullNarration,
      voice_id: data.voice_id,
    });

    // Step 3: Generate visual clips
    const { generateClip } = await import("./providers/kling-video");
    const clips = [];
    let totalCost = voice.charsUsed * 0.00005; // $0.05/1K chars

    for (const scene of script.scenes) {
      const clip = await generateClip({
        prompt: scene.visual_prompt,
        duration: Math.min(scene.duration, 10), // Kling max 10s
        aspect_ratio: "9:16",
      });
      clips.push(clip);
      totalCost += clip.cost;
    }

    // Step 4: Assemble final reel
    const { assembleReel } = await import("./pipeline/reel-assembler");
    const assembled = await assembleReel({
      clips: clips.map(c => ({ url: c.videoUrl, duration: c.duration })),
      audioUrl: voice.audioUrl,
      outputName: `reel_${Date.now()}`,
      resolution: data.resolution,
    });

    // Step 5: Save to database
    const { q } = await import("../db.server");
    const [row] = await q(
      `INSERT INTO video_reels (title, script, scenes, status, audio_url, video_clips, final_video_url, 
       duration_seconds, resolution, aspect_ratio, template, voice_id, total_cost_usd, provider_costs)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, '9:16', $9, $10, $11, $12)
       RETURNING *`,
      [
        script.title, JSON.stringify(script), JSON.stringify(script.scenes),
        voice.audioUrl, JSON.stringify(clips.map(c => c.videoUrl)),
        assembled.outputPath, assembled.duration, data.resolution,
        data.template, data.voice_id || 'rachel', totalCost,
        JSON.stringify({ elevenlabs: voice.charsUsed * 0.00005, kling: clips.reduce((s, c) => s + c.cost, 0) }),
      ]
    );

    return { reel: row, script, clips, totalCost };
  });

// List all reels
export const listReels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    return q(`SELECT * FROM video_reels ORDER BY created_at DESC LIMIT 50`);
  });

// Delete a reel
export const deleteReel = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`DELETE FROM video_reels WHERE id = $1`, [data.id]);
    return { ok: true };
  });
```

### 7. `src/routes/admin.reels.tsx`

Admin UI page for video reel management.

```tsx
// Full page with:
// - Form to generate new reels (topic, template, duration, voice)
// - List of generated reels with status, preview, download
// - Cost breakdown per reel
// - Template gallery (marketing, testimonial, tutorial, announcement)
```

### 8. `src/lib/video/templates/reel-templates.ts`

Pre-built reel templates.

```typescript
export const REEL_TEMPLATES = {
  marketing: {
    name: "Marketing Promo",
    description: "Highlight features and benefits",
    sceneCount: 4,
    prompts: {
      hook: "Dynamic text animation with platform branding",
      feature: "Screen recording style showing app features",
      testimonial: "Split screen with creator and stats",
      cta: "Animated call-to-action with download link",
    },
  },
  testimonial: {
    name: "Creator Testimonial",
    description: "Real creator stories and earnings",
    sceneCount: 5,
    prompts: {
      hook: "Creator's face with earnings overlay",
      story: "Creator's journey montage",
      earnings: "Animated earnings counter",
      tips: "Tips and tricks overlay",
      cta: "Join now with referral link",
    },
  },
  tutorial: {
    name: "How-To Tutorial",
    description: "Step-by-step platform guide",
    sceneCount: 6,
    prompts: {
      intro: "Platform logo animation",
      step1: "Screen recording of signup",
      step2: "Profile setup walkthrough",
      step3: "Going live tutorial",
      tips: "Pro tips overlay",
      cta: "Start earning now",
    },
  },
  announcement: {
    name: "News Announcement",
    description: "Platform updates and events",
    sceneCount: 3,
    prompts: {
      headline: "Breaking news style animation",
      details: "Feature showcase",
      cta: "Learn more",
    },
  },
};
```

### 9. `src/lib/video/index.ts`

Public API barrel export.

```typescript
export { generateReelScript } from "./pipeline/script-generator";
export { generateVoice } from "./providers/elevenlabs-tts";
export { generateClip } from "./providers/kling-video";
export { assembleReel } from "./pipeline/reel-assembler";
export { REEL_TEMPLATES } from "./templates/reel-templates";
```

---

## Environment Variables

Add to `.env.example`:

```bash
# Video Generation
FAL_KEY=your_fal_ai_api_key
ELEVENLABS_VOICE_ID=rachel  # Default ElevenLabs voice
```

---

## Admin Sidebar Update

Add to `src/routes/admin.tsx` sidebar:

```tsx
<NavLink
  to="/admin/reels"
  activeOptions={{ exact: true }}
  activeProps={{ className: "bg-primary/10 text-primary" }}
  classProps="hover:bg-muted"
>
  <Video className="h-4 w-4" />
  <span>Video Reels</span>
</NavLink>
```

---

## Cost Summary

| Component | Provider | Cost per Reel |
|-----------|----------|---------------|
| Script | Claude (OpenRouter) | ~$0.01 |
| Voice (30s) | ElevenLabs Flash | ~$0.03 |
| 5 Clips (5s each) | Kling 2.5-turbo | ~$1.05 |
| Assembly | FFmpeg (local) | $0.00 |
| **Total** | | **~$1.09** |

**Budget option**: 3 clips × 5s = ~$0.63 + voice + script = **~$0.67**

---

## Migration SQL

```sql
-- Run in Supabase SQL Editor
CREATE TABLE video_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  script JSONB NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating_voice','generating_visuals','assembling','completed','failed')),
  audio_url TEXT,
  video_clips JSONB DEFAULT '[]',
  final_video_url TEXT,
  duration_seconds INTEGER DEFAULT 30,
  resolution TEXT DEFAULT '1080x1920',
  aspect_ratio TEXT DEFAULT '9:16',
  template TEXT DEFAULT 'marketing',
  voice_id TEXT DEFAULT 'elevenlabs_rachel',
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  provider_costs JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'admin'
);

-- Index for admin listing
CREATE INDEX idx_video_reels_created_at ON video_reels(created_at DESC);
CREATE INDEX idx_video_reels_status ON video_reels(status);
```

---

## Implementation Order

1. **Phase 1: Core Pipeline** (Day 1)
   - [ ] Create `src/lib/video/` directory structure
   - [ ] Implement `fal-client.ts`
   - [ ] Implement `elevenlabs-tts.ts`
   - [ ] Implement `kling-video.ts`
   - [ ] Implement `script-generator.ts`

2. **Phase 2: Assembly** (Day 1)
   - [ ] Implement `reel-assembler.ts`
   - [ ] Create `video.functions.ts`
   - [ ] Add `video_reels` table to Supabase

3. **Phase 3: Admin UI** (Day 2)
   - [ ] Create `admin.reels.tsx` page
   - [ ] Add "Video Reels" nav link
   - [ ] Add `.env.example` variables

4. **Phase 4: Polish** (Day 2)
   - [ ] Add reel templates
   - [ ] Add cost tracking integration
   - [ ] Add Telegram notification on completion
   - [ ] Test end-to-end flow

---

## Notes

- All video generation is async (fal.ai queue system)
- Each clip takes ~30-60 seconds to generate
- Full 30s reel: ~3-5 minutes total generation time
- Videos stored locally at `/tmp/reels/` (Railway ephemeral storage)
- For persistent storage, consider adding Supabase Storage upload
- FFmpeg must be available on Railway (check with `which ffmpeg`)
