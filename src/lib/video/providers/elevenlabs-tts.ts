import { initFal } from "./fal-client";

const ELEVENLABS_FLASH = "fal-ai/elevenlabs/tts/flash";
const ELEVENLABS_MULTILINGUAL = "fal-ai/elevenlabs/tts/multilingual-v2";

export type TTSVoice = "rachel" | "bella" | "antoni" | "elli" | "josh" | "arnold" | "domi" | "sam";

export interface TTSInput {
  text: string;
  voice_id?: TTSVoice;
  model?: "flash" | "multilingual";
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
}

export interface TTSResult {
  audioUrl: string;
  charsUsed: number;
  costUsd: number;
}

export async function generateVoice(input: TTSInput): Promise<TTSResult> {
  const fal = initFal();

  const modelId = input.model === "multilingual" ? ELEVENLABS_MULTILINGUAL : ELEVENLABS_FLASH;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fal.subscribe(modelId, {
    input: {
      text: input.text,
      voice_id: input.voice_id || "rachel",
      voice_settings: {
        stability: input.stability ?? 0.5,
        similarity_boost: input.similarity_boost ?? 0.75,
        style: input.style ?? 0,
        speed: input.speed ?? 1.0,
      },
    },
  });

  const charsUsed = input.text.length;
  const costPerChar = input.model === "multilingual" ? 0.0001 : 0.00005;

  return {
    audioUrl: result.data?.audio?.url || result.audio?.url || "",
    charsUsed,
    costUsd: charsUsed * costPerChar,
  };
}
