// Shared scheduling helper for Postiz posts.
//
// Postiz takes `type: "now"` to publish immediately, or `type: "schedule"`
// with a future `date`. An earlier attempt at scheduling sent
// `type: "schedule"` alongside `date: new Date().toISOString()` — i.e. "schedule
// this for right now" — which Postiz rejects with a 400. That's why every
// publisher was hardcoded back to "now".
//
// The fix is not to avoid scheduling; it's to only use it with a genuinely
// future timestamp. This helper enforces that in one place so the four
// publishers can't drift apart on it.

/** Postiz needs meaningful daylight between now and a scheduled time. */
const MIN_LEAD_MS = 5 * 60_000;

export interface PostizTiming {
  type: "now" | "schedule";
  date: string;
}

/**
 * Build the `type` + `date` pair for a Postiz post body.
 *
 * Pass `scheduledAt` to schedule; omit it to publish immediately. A
 * `scheduledAt` that is missing, unparseable, or too close to now degrades to
 * immediate publishing rather than throwing — a post going out early is a far
 * better failure than a 400 that drops it entirely.
 */
export function postizTiming(scheduledAt?: string | Date): PostizTiming {
  const now = new Date();

  if (!scheduledAt) {
    return { type: "now", date: now.toISOString() };
  }

  const target = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

  if (Number.isNaN(target.getTime())) {
    console.warn(`[postiz] Unparseable scheduledAt (${String(scheduledAt)}) — publishing now`);
    return { type: "now", date: now.toISOString() };
  }

  if (target.getTime() - now.getTime() < MIN_LEAD_MS) {
    console.warn(
      `[postiz] scheduledAt ${target.toISOString()} is inside the ${MIN_LEAD_MS / 60_000}min ` +
        `lead window — publishing now instead`,
    );
    return { type: "now", date: now.toISOString() };
  }

  return { type: "schedule", date: target.toISOString() };
}
