import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { generateImage, getHealthStatus } from "./src/lib/ai/comfyui.js";

async function main() {
  console.log("=== ComfyUI health ===");
  const health = await getHealthStatus();
  console.log("available:", health.available, "| models:", health.models.slice(0, 5));
  if (!health.available) {
    console.error("ComfyUI not available:", health.error);
    process.exit(1);
  }

  const checkpoint = health.models.find((m) => m.includes("Realistic_Vision")) || health.models[0];
  console.log("Using checkpoint:", checkpoint);

  console.log("\n=== Generating test image (9:16) ===");
  const result = await generateImage(
    {
      prompt:
        "photorealistic portrait of a confident young Indian woman, pink and gold studio lighting, neon glow, professional, high detail",
      negativePrompt: "blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs",
      width: 720,
      height: 1280,
      steps: 20,
      cfg: 7.0,
      sampler: "euler",
      scheduler: "normal",
    },
    { checkpoint, useFaceDetailer: false }
  );

  const dir = path.join(process.cwd(), "public", "generated-videos");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `test-comfy-${Date.now()}.png`);
  fs.writeFileSync(out, result.images[0]);
  console.log("Saved:", out, `(${Math.round(result.images[0].length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
