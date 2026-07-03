// ComfyUI API Client — Local image generation via ComfyUI server
// Supports: txt2img, img2img, workflow execution, health checks

const COMFYUI_BASE = process.env.COMFYUI_BASE_URL || "http://localhost:8188";
const TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

// ── Types ──────────────────────────────────────────────

export interface ComfyUIConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  model?: string;
  sampler?: string;
  scheduler?: string;
  batchSize?: number;
}

export interface GenerateImageResult {
  images: Buffer[];
  width: number;
  height: number;
  seed: number;
  prompt: string;
  model: string;
  elapsedMs: number;
}

export interface WorkflowResult {
  promptId: string;
  images: Buffer[];
  elapsedMs: number;
}

export interface HealthStatus {
  available: boolean;
  models: string[];
  activeModel: string | null;
  queueSize: number;
  uptime: number;
  error?: string;
}

// ── Client ─────────────────────────────────────────────

let healthCache: { status: HealthStatus; timestamp: number } | null = null;
const HEALTH_CACHE_TTL = 30_000;

async function comfyFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${COMFYUI_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI ${response.status}: ${text}`);
    }

    return response.json();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`ComfyUI timeout after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function comfyFetchRaw(endpoint: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${COMFYUI_BASE}${endpoint}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ComfyUI raw fetch error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`ComfyUI timeout after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Health Check ───────────────────────────────────────

export async function isComfyUIAvailable(): Promise<boolean> {
  const status = await getHealthStatus();
  return status.available;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  if (healthCache && Date.now() - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.status;
  }

  try {
    // Get system stats
    const stats = await comfyFetch("/system_stats");
    const queue = await comfyFetch("/queue");

    // Get available models
    const objectInfo = await comfyFetch("/object_info");
    const checkpoints = objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
    const activeModel = checkpoints.length > 0 ? checkpoints[0] : null;

    const status: HealthStatus = {
      available: true,
      models: checkpoints,
      activeModel,
      queueSize: queue.queue_running?.length || 0,
      uptime: stats.system?.uptime || 0,
    };

    healthCache = { status, timestamp: Date.now() };
    return status;
  } catch (err: any) {
    const status: HealthStatus = {
      available: false,
      models: [],
      activeModel: null,
      queueSize: 0,
      uptime: 0,
      error: err.message,
    };
    healthCache = { status, timestamp: Date.now() };
    return status;
  }
}

// ── Workflow Builder ───────────────────────────────────

interface ComfyUINode {
  class_type: string;
  inputs: Record<string, any>;
}

interface ComfyUIWorkflow {
  [nodeId: string]: ComfyUINode;
}

function buildTxt2ImgWorkflow(input: GenerateImageInput, checkpoint: string): ComfyUIWorkflow {
  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 32);
  const width = input.width ?? 1024;
  const height = input.height ?? 1024;
  const steps = input.steps ?? 20;
  const cfg = input.cfg ?? 7.0;
  const sampler = input.sampler ?? "euler";
  const scheduler = input.scheduler ?? "normal";

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: input.prompt,
        clip: ["7", 0],
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: input.negativePrompt || "blurry, low quality, distorted, deformed, ugly, bad anatomy",
        clip: ["7", 0],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: {
        width,
        height,
        batch_size: input.batchSize || 1,
      },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1.0,
        model: ["6", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "7": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "barbieverse",
        images: ["8", 0],
      },
    },
  };
}

function buildTxt2ImgWithFaceDetailer(
  input: GenerateImageInput,
  checkpoint: string,
): ComfyUIWorkflow {
  const base = buildTxt2ImgWorkflow(input, checkpoint);

  // Add FaceDetailer nodes after VAEDecode
  base["10"] = {
    class_type: "UltralyticsDetectorProvider",
    inputs: {
      model_name: "face_yolov8m.pt",
    },
  };

  base["11"] = {
    class_type: "SAMLoader",
    inputs: {
      model_name: "sam_vit_b_01ec64.pth",
      device_mode: "AUTO",
    },
  };

  base["12"] = {
    class_type: "FaceDetailer",
    inputs: {
      image: ["8", 0],
      model: ["6", 0],
      clip: ["7", 0],
      vae: ["1", 2],
      positive: ["2", 0],
      negative: ["3", 0],
      bbox_detector: ["10", 0],
      sam_model_opt: ["11", 0],
      guide_size: 384,
      guide_size_for: true,
      max_size: 1024,
      seed: input.seed ?? Math.floor(Math.random() * 2 ** 32),
      steps: input.steps ?? 20,
      cfg: input.cfg ?? 7.0,
      sampler_name: input.sampler ?? "euler",
      scheduler: input.scheduler ?? "normal",
      denoise: 0.4,
      feather: 5,
      noise_mask: true,
      force_inpaint: true,
      bbox_threshold: 0.5,
      bbox_dilation: 10,
      bbox_crop_factor: 3.0,
      sam_detection_hint: "center-1",
      sam_dilation: 0,
      sam_threshold: 0.93,
      sam_bbox_expansion: 0,
      sam_mask_hint_threshold: 0.7,
      sam_mask_hint_use_negative: "False",
      drop_size: 10,
      wildcard: "",
      cycle: 1,
      infernode_name: "FaceDetailer",
      detailer_hook: null,
    },
  };

  base["13"] = {
    class_type: "SaveImage",
    inputs: {
      filename_prefix: "barbieverse_detailed",
      images: ["12", 0],
    },
  };

  return base;
}

// ── Workflow Execution ─────────────────────────────────

async function executeWorkflow(workflow: ComfyUIWorkflow): Promise<WorkflowResult> {
  const start = Date.now();

  // Queue the workflow
  const promptId = await comfyFetch("/prompt", {
    method: "POST",
    body: JSON.stringify({ prompt: workflow }),
  });

  // Poll for completion
  let completed = false;
  let attempts = 0;
  const maxAttempts = Math.floor(TIMEOUT_MS / POLL_INTERVAL_MS);

  while (!completed && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;

    try {
      const history = await comfyFetch(`/history/${promptId.prompt_id}`);

      if (history[promptId.prompt_id]?.outputs) {
        completed = true;
        const outputs = history[promptId.prompt_id].outputs;

        // Find image outputs
        const images: Buffer[] = [];
        for (const nodeId of Object.keys(outputs)) {
          const nodeOutput = outputs[nodeId];
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              const imgBuffer = await comfyFetchRaw(
                `/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type}`,
              );
              images.push(imgBuffer);
            }
          }
        }

        return {
          promptId: promptId.prompt_id,
          images,
          elapsedMs: Date.now() - start,
        };
      }
    } catch {
      // History not ready yet, continue polling
    }
  }

  throw new Error(`ComfyUI workflow timeout after ${TIMEOUT_MS}ms`);
}

// ── Public API ─────────────────────────────────────────

/**
 * Generate image using ComfyUI with automatic FaceDetailer.
 * Falls back to basic workflow if FaceDetailer models not available.
 */
export async function generateImage(
  input: GenerateImageInput,
  options?: {
    checkpoint?: string;
    useFaceDetailer?: boolean;
  },
): Promise<GenerateImageResult> {
  const start = Date.now();
  const health = await getHealthStatus();

  if (!health.available) {
    throw new Error(`ComfyUI not available: ${health.error}`);
  }

  // Pick checkpoint
  const checkpoint = options?.checkpoint || health.activeModel || health.models[0];
  if (!checkpoint) {
    throw new Error("No checkpoint models available in ComfyUI");
  }

  // Build workflow
  const useFaceDetailer = options?.useFaceDetailer !== false; // default true
  let workflow: ComfyUIWorkflow;

  if (useFaceDetailer && health.models.some((m) => m.includes("face_yolov8m"))) {
    workflow = buildTxt2ImgWithFaceDetailer(input, checkpoint);
  } else {
    workflow = buildTxt2ImgWorkflow(input, checkpoint);
  }

  // Execute
  const result = await executeWorkflow(workflow);

  return {
    images: result.images,
    width: input.width || 1024,
    height: input.height || 1024,
    seed: input.seed ?? 0,
    prompt: input.prompt,
    model: checkpoint,
    elapsedMs: Date.now() - start,
  };
}

/**
 * Get list of available checkpoints.
 */
export async function listModels(): Promise<string[]> {
  const health = await getHealthStatus();
  return health.models;
}

/**
 * Get ComfyUI queue status.
 */
export async function getQueueStatus(): Promise<{
  running: number;
  pending: number;
}> {
  try {
    const queue = await comfyFetch("/queue");
    return {
      running: queue.queue_running?.length || 0,
      pending: queue.queue_pending?.length || 0,
    };
  } catch {
    return { running: 0, pending: 0 };
  }
}

/**
 * Interrupt current generation.
 */
export async function interrupt(): Promise<void> {
  await comfyFetch("/interrupt", { method: "POST" });
}

export { COMFYUI_BASE };
