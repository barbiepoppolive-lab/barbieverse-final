// Provider switch — everything else imports from HERE, never from a vendor file.
//
// WA_PROVIDER=cloud    → Meta Cloud API direct (free webhooks, no platform fee)
// WA_PROVIDER=aisensy  → AiSensy BSP (default, currently proven working)
//
// Both modules export identical names and signatures, so switching providers
// is one environment variable and no code change. That is the whole point:
// the answer bank, follow-up engine, stage ladder and approval flow have never
// known which vendor is underneath, and must not learn.

import * as aisensy from "./aisensy";
import * as cloud from "./cloud-api";

export type ProviderName = "aisensy" | "cloud";

export function providerName(): ProviderName {
  return process.env.WA_PROVIDER === "cloud" ? "cloud" : "aisensy";
}

const impl = providerName() === "cloud" ? cloud : aisensy;

export const normalisePhone = impl.normalisePhone;
export const normaliseInbound = impl.normaliseInbound;
export const sendSession = impl.sendSession;
export const sendImage = impl.sendImage;
export const sendVideo = impl.sendVideo;
export const sendTemplate = impl.sendTemplate;
export const windowOpen = impl.windowOpen;

// Cloud-only helpers. Undefined on AiSensy — callers must guard.
export const verifyWebhook = (cloud as any).verifyWebhook as
  | ((p: URLSearchParams) => string | null)
  | undefined;
export const resolveMediaUrl = (cloud as any).resolveMediaUrl as
  | ((id: string) => Promise<string | null>)
  | undefined;
