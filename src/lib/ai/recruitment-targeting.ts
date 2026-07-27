// Recruitment Targeting — who BarbieVerse is actually talking to.
//
// The brand voice used to say "young Indian creators (18-30)", which is broad
// enough that the model wrote for nobody in particular. That vagueness is the
// root cause of generic output: a hook that works on a woman already streaming
// 4 hours a day is not the hook that works on someone who lost her job.
//
// This module defines the real segments and what actually moves each one, so
// prompts can be built per-segment instead of per-vibe.

export type Segment = "active_streamer" | "influencer" | "job_seeking";

export interface SegmentProfile {
  id: Segment;
  label: string;
  /** Who they are, in one line the model can reason about. */
  who: string;
  /** What they're already doing right now. */
  currentState: string;
  /** The real friction in their life we can speak to. */
  painPoints: string[];
  /** The angle that lands. */
  angle: string;
  /** Hook patterns proven for this segment. Use as inspiration, not templates. */
  hookPatterns: string[];
  /** Things that make THIS segment tune out immediately. */
  turnOffs: string[];
  /** Where they are. */
  platforms: string[];
}

export const SEGMENTS: Record<Segment, SegmentProfile> = {
  active_streamer: {
    id: "active_streamer",
    label: "Already streaming",
    who: "Women already live streaming on Poppo, Vone, Bigo, Moj or Instagram Live — often solo, unagented, plateaued.",
    currentState:
      "Streaming regularly but earning inconsistently. No agency behind them. Figuring out payouts, PK battles and coin conversion alone.",
    painPoints: [
      "Income swings wildly week to week with no floor",
      "No one explains why some streams earn 10x others",
      "Payout delays and unclear withdrawal rules",
      "Burnout from streaming long hours with no strategy",
      "Watching less-talented streamers out-earn them via agency support",
    ],
    angle:
      "You are already doing the hard part. You are just doing it without support. An agency is the difference between streaming and a streaming career.",
    hookPatterns: [
      "Contrast their effort against their return — the gap is the hook",
      "Name a specific mechanic they struggle with (PK matchmaking, coin conversion) to prove we actually know the platform",
      "Peer proof: a streamer at their level who joined and what changed",
    ],
    turnOffs: [
      "Being talked to like a beginner — they know the platform better than most",
      "Vague 'grow your audience' advice",
      "Anything implying their current effort is worthless",
    ],
    platforms: ["instagram", "moj", "youtube", "facebook"],
  },

  influencer: {
    id: "influencer",
    label: "Influencers / content creators",
    who: "Women with an existing audience on Instagram, YouTube, Moj or elsewhere — any niche: fashion, beauty, comedy, dance, lifestyle, food, finance.",
    currentState:
      "Has reach and an engaged audience, but monetises it poorly. Brand deals are sporadic, underpaid, and depend on constantly chasing sponsors.",
    painPoints: [
      "Good engagement that converts to almost no reliable income",
      "Brand deals are irregular, underpaid, and take endless negotiation",
      "Affiliate links pay pennies relative to the reach",
      "Constant pressure to produce content with no stable income underneath it",
      "Audience growth has plateaued and there is no obvious next step",
    ],
    angle:
      "You already built the hard part — an audience that shows up. Live streaming turns that audience into income directly, without waiting for a brand to pick you.",
    hookPatterns: [
      "Reach-to-income gap: she has the audience, just not the income to match",
      "Frame streaming as a format she can add, not a career change",
      "Independence angle: paid by her audience directly, not by sponsors who ghost her",
      "For finance/side-hustle creators specifically, it doubles as content material she can document",
    ],
    turnOffs: [
      "Anything resembling an MLM or referral pyramid — this segment spots it instantly",
      "Unsourced income claims; they will fact-check publicly and loudly",
      "Being treated as an influencer for hire rather than a partner",
      "Implying her current content is not working",
    ],
    platforms: ["instagram", "youtube", "moj", "twitter"],
  },

  job_seeking: {
    id: "job_seeking",
    label: "Seeking income",
    who: "Women between jobs, recently graduated, on a career break, or seeking work that fits around family responsibilities.",
    currentState:
      "Actively looking for income. Likely applying to jobs with poor response rates. Time-rich, cash-poor, and cautious.",
    painPoints: [
      "Applications disappear into silence",
      "Most remote work listings are scams asking for money upfront",
      "Needs work that fits around family or study commitments",
      "No specialised skill or degree that unlocks a fast income",
      "Family scepticism about anything internet-based",
    ],
    angle:
      "Real work, no upfront cost, no degree required, and you can start this week. We tell you exactly what it takes before you commit.",
    hookPatterns: [
      "Lead with what makes it NOT a scam — this segment's first question is always 'what's the catch'",
      "Concrete, checkable specifics: what you do, how long, when you are paid",
      "Address the family-scepticism objection directly; it is often the real blocker",
    ],
    turnOffs: [
      "Hype and urgency — reads exactly like the scams they are dodging daily",
      "Anything asking for money, deposits or 'registration fees'",
      "Vague promises of 'unlimited earning potential'",
      "Pressure tactics or fake scarcity",
    ],
    platforms: ["facebook", "instagram", "moj", "youtube"],
  },
};

/**
 * Universal audience rules — apply to every segment, no exceptions.
 *
 * The adults-only rule is not optional. This is live-streaming recruitment
 * aimed at women; content must never read as targeting minors, and any lead
 * that appears to be under 18 must be dropped rather than contacted.
 */
export const AUDIENCE_RULES = `
AUDIENCE (STRICT):
- Adults only, 18+. Never write copy that would appeal to or address minors.
  Never reference school, college entrance, or teenage framing.
- Write for women. Warm and direct, never patronising.
- Indian audience. Hinglish is welcome where natural; never forced.
- Assume she has been targeted by scams before and is on guard. Earn trust
  before asking for anything.
`.trim();

/**
 * Honesty rules. These exist for two reasons that happen to align:
 * deceptive income claims are both wrong and the fastest way to get an
 * account flagged or an ad rejected under Meta's employment policies.
 */
export const CLAIMS_RULES = `
CLAIMS (STRICT — these get accounts banned when broken):
- NEVER state any earnings figure. No rupee amounts, no first-week numbers,
  no monthly or annual ranges, no "up to X", no "from X". None.
  Forbidden: "Earn Rs 1,150 in your first week", "make Rs 20,000/month",
             "earn up to Rs 15,000", "Rs 500 per day".
  Correct:   "Payouts are based on streaming hours and viewer gifting — the
              team walks you through the current terms before you commit."
- Never write "guaranteed", "assured", "promised", or "you WILL earn".
- If she asks what she can earn, describe the MECHANISM (how gifting and
  payouts work, what affects them) and hand off to the team for figures.
  Never improvise a number to keep a conversation moving.
- Sell the mechanics, not the money: no joining fee, direct platform payout,
  agency support, flexible hours. These are concrete, checkable, and true —
  which makes them more persuasive than a number she does not believe anyway.
- Never ask for money, deposits, registration or joining fees — we never
  charge, and saying so plainly is a genuine advantage worth stating.
- Never request passwords. Only a Poppo/Vone User ID is ever needed.
`.trim();

export function getSegment(segment: Segment): SegmentProfile {
  return SEGMENTS[segment];
}

/**
 * Pick the most plausible segment for a scraped lead, based on their bio and
 * post text. Falls back to job_seeking, the broadest of the three.
 */
export function inferSegment(text: string): Segment {
  const t = (text || "").toLowerCase();

  const streamingSignals = [
    "live", "stream", "poppo", "vone", "bigo", "host", "pk battle",
    "going live", "livestream", "broadcaster",
  ];
  const influencerSignals = [
    // Audience / creator markers, any niche
    "influencer", "creator", "content creator", "blogger", "vlogger",
    "collab", "collaboration", "brand deal", "pr package", "dm for collab",
    "youtuber", "subscribe", "followers", "link in bio",
    // Niche markers
    "fashion", "beauty", "makeup", "skincare", "outfit", "ootd",
    "comedy", "dance", "choreography", "food", "recipe", "travel",
    "lifestyle", "fitness",
    // Finance sub-niche (still an influencer, just a specific vertical)
    "finance", "money", "invest", "saving", "sip", "mutual fund", "stock",
    "budget", "side hustle", "passive income", "financial",
  ];
  const seekingSignals = [
    "looking for job", "unemployed", "fresher", "job seeker", "need work",
    "work from home", "hiring", "career break", "housewife", "homemaker",
  ];

  const score = (signals: string[]) => signals.filter((s) => t.includes(s)).length;

  const streaming = score(streamingSignals);
  const influencer = score(influencerSignals);
  const seeking = score(seekingSignals);

  if (streaming >= influencer && streaming >= seeking && streaming > 0) return "active_streamer";
  if (influencer >= seeking && influencer > 0) return "influencer";
  return "job_seeking";
}

/**
 * Build the segment-specific block that gets injected into a generation prompt.
 */
export function buildSegmentBrief(segment: Segment): string {
  const p = SEGMENTS[segment];
  return `
TARGET SEGMENT: ${p.label}
Who she is: ${p.who}
Where she is right now: ${p.currentState}

What she struggles with:
${p.painPoints.map((x) => `- ${x}`).join("\n")}

The angle that works:
${p.angle}

Hook direction:
${p.hookPatterns.map((x) => `- ${x}`).join("\n")}

She will tune out instantly if you:
${p.turnOffs.map((x) => `- ${x}`).join("\n")}

${AUDIENCE_RULES}

${CLAIMS_RULES}
`.trim();
}
