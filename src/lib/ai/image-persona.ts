// Shared image-generation helpers — deterministic per-string seeding and
// gender-aware persona selection for BarbieVerse's generated portraits.
//
// Extracted from cron-content.ts / social-publish/index.ts, which each had
// their own copy. Centralized so the ad-creative generator can reuse the
// exact same "vary seed by topic, pick persona from topic wording" logic
// instead of drifting into a third slightly-different implementation.
//
// Background on why this exists at all: the original implementation used
// ONE hardcoded seed (123456789) for every single generated image across
// the entire campaign, and hardcoded the persona to "young Indian woman"
// unconditionally — so every image looked like a near-duplicate of every
// other, and topics explicitly about male creators still got a woman's
// photo. Both were bugs, not brand-consistency features.

/** Deterministic hash of a string into a positive integer, for use as an
 * image-gen seed — same input always produces the same seed (reproducible),
 * different input produces a different seed (so images actually vary). */
export function seedFromString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

/** Pick a creator persona based on the topic/copy's own wording — explicit
 * gender mentions win, otherwise split evenly (by hash) so a batch of
 * gender-neutral topics doesn't default to one gender every time. */
export function personaForTopic(topic: string): string {
  const lower = topic.toLowerCase();
  if (/\bmale\b|\bmale host\b|\bmale creator\b|\bmale perspective\b|\(male\)/.test(lower)) {
    return "confident young Indian man";
  }
  if (/\bfemale\b|\bshe\b|\bher\b|\(female\)/.test(lower)) {
    return "confident young Indian woman";
  }
  return seedFromString(topic) % 2 === 0 ? "confident young Indian woman" : "confident young Indian man";
}

/** Consistent visual style (lighting, setup, aesthetic) wrapped around
 * whichever persona was chosen — this is what actually stays "on brand"
 * across the campaign, not a fixed seed or a fixed gender. */
export function imageStyleFor(persona: string): string {
  return (
    `professional portrait of a ${persona} content creator, ` +
    "warm friendly smile, modern streaming setup with pink and purple neon " +
    "accent lighting in the background, elegant casual outfit, soft studio " +
    "lighting, high detail, photorealistic, Instagram aesthetic"
  );
}
