import { fal } from "@fal-ai/client";

let initialized = false;

export function initFal() {
  if (initialized) return fal;
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY environment variable not set — get one at https://fal.ai/dashboard/keys");
  fal.config({ credentials: key });
  initialized = true;
  return fal;
}
