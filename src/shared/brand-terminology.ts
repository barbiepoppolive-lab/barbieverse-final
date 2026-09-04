// Brand terminology — SINGLE SOURCE OF TRUTH.
//
// ── Why this file exists ────────────────────────────────────────────────
// This rule block used to be copy-pasted as a raw string into six different
// prompt templates (brand-manager x2, content-ai, ad-creative x2, prompts.ts).
// Six copies meant six chances to drift, and they did drift: at one point
// half of them said "call the audience streamers" and half said the exact
// opposite, with a comment claiming the reversal was a deliberate correction.
// Generated copy was inconsistent depending on which module produced it.
//
// Now there is one constant. Change it here and every prompt changes.
// If you disagree with the wording, edit THIS file — do not re-inline a
// variant string into a prompt template.
//
// `npm run check:terminology` fails the build if a contradicting literal
// reappears anywhere in src/. See scripts/check-terminology.mjs.

/**
 * The word for the people we recruit.
 *
 * "streamer", not "creator". Confirmed by the operator: the business
 * recruits women to live stream, and "creator" reads as generic content
 * production rather than the specific thing being offered.
 */
export const AUDIENCE_NOUN = "streamer";
export const AUDIENCE_NOUN_PLURAL = "streamers";

/** The term that must never appear in generated output copy. */
export const FORBIDDEN_AUDIENCE_NOUNS = ["creator", "creators", "creator economy"] as const;

/**
 * Terminology block injected into every generation prompt.
 *
 * Note this governs OUTPUT COPY only. Identifiers in the codebase —
 * `creator_leads`, `creator-config.ts`, `/admin/creator-leads` — deliberately
 * still say "creator". Renaming those would mean a database migration for a
 * copywriting decision, which is not a trade worth making.
 */
export const TERMINOLOGY_RULES = `
TERMINOLOGY (STRICT):
- Call the audience "${AUDIENCE_NOUN_PLURAL}", never "creators".
- "Live streaming" / "streaming" describes the activity; the people doing it
  are "${AUDIENCE_NOUN_PLURAL}".
- Do not use the phrase "creator economy" in output copy.
- Do not use "content creation" to describe what she would be doing — she
  would be live streaming.
`.trim();
