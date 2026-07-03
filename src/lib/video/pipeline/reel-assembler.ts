import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

export interface AssembleInput {
  clips: Array<{ url: string; duration: number }>;
  audioUrl: string;
  outputName?: string;
  resolution?: string;
  textOverlays?: Array<{ text: string; startSec: number; duration: number }>;
}

export interface AssembleResult {
  outputPath: string;
  outputFilename: string;
  duration: number;
  fileSize: number;
}

const TMP_DIR = "/tmp/reels";

export async function assembleReel(input: AssembleInput): Promise<AssembleResult> {
  await mkdir(TMP_DIR, { recursive: true });

  const name = input.outputName || `reel_${randomBytes(8).toString("hex")}`;
  const [width, height] = (input.resolution || "1080x1920").split("x").map(Number);

  // Download all clips
  const clipPaths: string[] = [];
  for (let i = 0; i < input.clips.length; i++) {
    const clipPath = join(TMP_DIR, `${name}_clip_${i}.mp4`);
    const response = await fetch(input.clips[i].url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(clipPath, buffer);
    clipPaths.push(clipPath);
  }

  // Download audio
  const audioPath = join(TMP_DIR, `${name}_audio.mp3`);
  const audioResponse = await fetch(input.audioUrl);
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  await writeFile(audioPath, audioBuffer);

  // Create concat list file
  const concatFile = join(TMP_DIR, `${name}_concat.txt`);
  const concatContent = clipPaths.map((p) => `file '${p}'`).join("\n");
  await writeFile(concatFile, concatContent);

  // Normalize all clips to same resolution/fps before concatenating
  const normalizedPaths: string[] = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const normPath = join(TMP_DIR, `${name}_norm_${i}.mp4`);
    await execAsync(
      `ffmpeg -y -i "${clipPaths[i]}" ` +
        `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fps=30" ` +
        `-c:v libx264 -preset fast -crf 23 -an ` +
        `-t ${input.clips[i].duration} ` +
        `"${normPath}"`
    );
    normalizedPaths.push(normPath);
  }

  // Write normalized concat list
  const normConcatFile = join(TMP_DIR, `${name}_norm_concat.txt`);
  await writeFile(normConcatFile, normalizedPaths.map((p) => `file '${p}'`).join("\n"));

  // Concatenate normalized clips
  const concatenatedPath = join(TMP_DIR, `${name}_concat.mp4`);
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${normConcatFile}" -c copy "${concatenatedPath}"`
  );

  const totalDuration = input.clips.reduce((sum, c) => sum + c.duration, 0);

  // Get audio duration
  const { stdout: audioDurOut } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`
  );
  const audioDuration = parseFloat(audioDurOut.trim()) || totalDuration;

  // Merge video + audio, trim to shorter of the two
  const mergeDuration = Math.min(totalDuration, audioDuration);
  const outputPath = join(TMP_DIR, `${name}.mp4`);

  let filterComplex = "";
  if (input.textOverlays && input.textOverlays.length > 0) {
    const overlays = input.textOverlays
      .map(
        (o) =>
          `drawtext=text='${o.text.replace(/'/g, "\\'")}':fontsize=42:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.85:enable='between(t,${o.startSec},${o.startSec + o.duration})'`
      )
      .join(",");
    filterComplex = `-vf "${overlays}"`;
  }

  await execAsync(
    `ffmpeg -y -i "${concatenatedPath}" -i "${audioPath}" ` +
      `-map 0:v -map 1:a ` +
      `-c:v libx264 -preset medium -crf 23 ` +
      `-c:a aac -b:a 128k -ar 44100 ` +
      `${filterComplex} ` +
      `-t ${mergeDuration} ` +
      `-movflags +faststart ` +
      `"${outputPath}"`
  );

  // Get output file size
  const stats = await readFile(outputPath).then(() => import("fs/promises")).then((fs) =>
    fs.stat(outputPath)
  );

  // Cleanup temp files
  const cleanupFiles = [
    ...clipPaths,
    ...normalizedPaths,
    audioPath,
    concatFile,
    normConcatFile,
    concatenatedPath,
  ];
  for (const p of cleanupFiles) {
    try {
      await unlink(p);
    } catch {}
  }

  return {
    outputPath,
    outputFilename: `${name}.mp4`,
    duration: mergeDuration,
    fileSize: stats.size,
  };
}
