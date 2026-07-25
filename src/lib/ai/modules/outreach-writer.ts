// Outreach DM writer
//
// ── What was wrong before ───────────────────────────────────────────────
// The first version used fixed templates like:
//
//   "Hi Priya! Saw you doing live on Moj — you're already good at this.
//    I run Barbieverse, an agency for Poppo/Vone Live hosts. Same format you
//    already do, but we guarantee ₹1,150 for your first week (₹575 for male
//    hosts) just for streaming 2 hours a day for 7 days — paid whether or not
//    you get gifts. Worth a look?"
//
// Three things kill that message:
//
//   1. It's a brochure. Every number in the offer is dumped before the person
//      has shown one flicker of interest. Real recruiters don't do this;
//      salespeople who do get ignored.
//   2. It's obviously a template. "Saw you doing live on Moj" fits ten
//      thousand people, so it reads as a mail-merge, because it is one.
//   3. It's long. Nobody reads a five-line DM from a stranger.
//
// The goal of a first message is ONE thing: get a reply. Not to explain the
// offer, not to close. So this writes something short and specific to the
// actual person, holds the numbers back for the second message, and sounds
// like a human typing on a phone.

import { aiChat } from "../router";

export type OutreachAngle = "switch_agency" | "already_creator" | "money_motivated" | "new_to_streaming";

export interface OutreachDM {
  message: string;
  angle: OutreachAngle;
  /** What specific detail it hooked onto — lets you sanity-check it's real */
  hook: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You write first-contact DMs for a live streaming agency in India called Barbieverse. You are a real person — a friendly Indian talent manager in your 20s — not a marketing bot.

YOUR ONE GOAL: get a reply. Not explain the offer. Not close a deal. Just start a conversation.

HARD LIMITS:
- MAXIMUM 2 sentences. Ideally 1 plus a short question.
- Under 220 characters total. Shorter is better.
- Write like you type on a phone: lowercase is fine, contractions, no corporate polish.

THE MOST IMPORTANT RULE — BE SPECIFIC:
You are given their bio and their post caption. Hook onto ONE concrete detail from it. Their dance style, the song they used, their city, the fact they stream late nights, their editing, the language they post in. If your opening line could be sent to 1000 different people unchanged, it is WRONG — rewrite it.
Bad: "Saw your content, you're talented!"
Good: "that transition on the bhojpuri edit was clean"
Good: "you post in tamil mostly? asking bc most of our hosts do"

NEVER PUT NUMBERS IN THE FIRST MESSAGE:
Do NOT mention ₹1,150, ₹575, 2 hours a day, 7 days, salary, guarantees, or earnings amounts. Those are for the SECOND message, after they reply. Dumping the offer up front is what makes it read like spam.

LANGUAGE:
Match the language of their bio/caption. Hindi post → Hinglish reply. Tamil → Tamil. English → English. Hinglish is natural and preferred for most Indian creators. Never reply in formal English to a Hindi speaker.

TONE:
- No "Hi [Name]! I hope you're doing well"
- No "I wanted to reach out regarding an exciting opportunity"
- No exclamation marks stacked, max one emoji, often zero
- Don't say "collab" if you mean recruiting — that's a bait and switch
- Being slightly casual beats being polished

ANGLE-SPECIFIC GUIDANCE:

switch_agency (they ALREADY host on Poppo/Vone):
- They know the platform. Do NOT explain what Poppo is. That instantly marks you as a bot.
- The only real question is whether their current agency treats them well.
- Ask about their experience, don't pitch. "how's your agency treating you? payouts on time?"
- Respect that they might be happy where they are. Pushiness here backfires badly.

already_creator (short-video creator, not yet streaming live):
- Compliment something specific and real, then a light curiosity question about going live.
- "ever tried going live? you'd do well at it" is enough.

money_motivated (posts about earning/side income):
- They're already interested in making money, so don't oversell.
- Be concrete about what it is without numbers: "it's live streaming, not affiliate stuff"
- Many have been burned by scams. Sounding too good = sounding fake.

new_to_streaming:
- Lowest context. Keep it simplest and warmest.
- One specific compliment plus one easy question.

NEVER:
- Write a paragraph
- Use "opportunity", "leverage", "unlock", "empower", "exclusive", "limited"
- Promise earnings or guarantee anything
- Say "DM me" (you are already in their DMs)
- Use the same opening line structure every time
- Claim you watched something you weren't told about

Return EXACTLY this JSON and nothing else:
{
  "message": "the DM text",
  "hook": "the specific detail you hooked onto",
  "confidence": 0.0-1.0
}`;

function extractJson(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    // Models sometimes emit unescaped newlines inside the string value
    try {
      return JSON.parse(match[0].replace(/\n/g, " "));
    } catch {
      return null;
    }
  }
}

/**
 * Short, human fallbacks. Used only when the AI call fails — still no
 * numbers, still short, so a degraded message is merely bland rather than
 * spammy. Several variants so a failing AI doesn't produce one identical
 * message to everyone.
 */
const FALLBACKS: Record<OutreachAngle, string[]> = {
  switch_agency: [
    "hey, saw you host on poppo. how's your agency treating you, payouts coming on time?",
    "hi! you're on poppo/vone right? curious how your agency's been, ours pays weekly",
    "hey, fellow poppo person here. happy with your current agency?",
  ],
  already_creator: [
    "your content's good. ever thought about going live? you'd suit it",
    "hey! do you ever go live? feels like you'd do well at it",
    "nice stuff. you ever tried live streaming instead of just shorts?",
  ],
  money_motivated: [
    "hey, saw your posts about earning online. do you do live streaming at all?",
    "hi! quick one — have you tried live streaming? actual work, not affiliate stuff",
    "hey, curious if you've looked at live streaming for income?",
  ],
  new_to_streaming: [
    "hey, really like your content. ever thought about going live?",
    "hi! your videos are good. do you stream at all?",
    "hey — do you ever go live? think you'd be good at it",
  ],
};

function pickFallback(angle: OutreachAngle, seed: string): string {
  const list = FALLBACKS[angle];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/** Guard rails applied to whatever the model returns. */
const BANNED = [
  /₹\s?\d/,
  /\bguarantee/i,
  /\bopportunity\b/i,
  /\bleverage\b/i,
  /\bexclusive\b/i,
  /\bunlock\b/i,
  /\bempower\b/i,
  /\bearn up ?to\b/i,
];

function violatesRules(msg: string): string | null {
  if (!msg || msg.trim().length < 10) return "too short/empty";
  if (msg.length > 320) return "too long";
  for (const re of BANNED) {
    if (re.test(msg)) return `banned phrasing: ${re}`;
  }
  // More than 3 sentence-enders means it's a paragraph, not a DM
  const sentences = (msg.match(/[.!?]+/g) || []).length;
  if (sentences > 3) return "too many sentences";
  return null;
}

export async function generateOutreachDM(input: {
  name: string;
  angle: OutreachAngle;
  platform: string;
  bio?: string;
  postCaption?: string;
  followers?: number;
  /** Recently sent messages — so the writer doesn't repeat its own patterns */
  recentMessages?: string[];
}): Promise<OutreachDM> {
  const context = [
    `Their name: ${input.name}`,
    `Platform you're messaging them on: ${input.platform}`,
    `Angle: ${input.angle}`,
    input.followers ? `Followers: ${input.followers}` : "",
    input.bio ? `Their bio:\n"""${input.bio.slice(0, 400)}"""` : "",
    input.postCaption ? `Their recent post caption:\n"""${input.postCaption.slice(0, 400)}"""` : "",
  ].filter(Boolean).join("\n");

  const antiRepeat = input.recentMessages?.length
    ? `\n\nYou recently sent these. Do NOT reuse their structure or opening words — this one must read differently:\n${input.recentMessages.slice(0, 6).map((m) => `- "${m}"`).join("\n")}`
    : "";

  const prompt = `Write the first DM to this person.

${context}${antiRepeat}

Remember: max 2 sentences, no numbers or money amounts, hook onto something specific from their bio or caption.`;

  try {
    const result = await aiChat(prompt, { systemPrompt: SYSTEM_PROMPT, maxTokens: 400 });
    const parsed = extractJson(result.text);

    if (parsed?.message) {
      const violation = violatesRules(parsed.message);
      if (!violation) {
        return {
          message: parsed.message.trim(),
          angle: input.angle,
          hook: parsed.hook || "",
          confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.6)),
        };
      }
      console.warn(`[outreach-writer] rejected AI message (${violation}): ${parsed.message}`);
    }
  } catch (e: any) {
    console.error("[outreach-writer] generation failed:", e?.message);
  }

  return {
    message: pickFallback(input.angle, input.name + (input.bio || "")),
    angle: input.angle,
    hook: "fallback — AI unavailable or output rejected",
    confidence: 0.25,
  };
}

/**
 * The follow-up, sent only after they reply. THIS is where the offer lives.
 * Kept as a stable template on purpose — once someone is actually asking,
 * they want the real numbers stated plainly and identically every time, and
 * an AI paraphrasing your commercial terms is a genuine liability.
 */
export function offerFollowUp(): string {
  return (
    `So how it works: you stream on Poppo or Vone under our agency ID. ` +
    `New hosts get a guaranteed first week — ₹1,150 for female hosts, ₹575 for male hosts — ` +
    `for streaming 2 hours a day across 7 days. That's paid whether or not you receive any gifts. ` +
    `After that it's gift-based, and most consistent hosts land somewhere between ₹4,000–15,000 in month one. ` +
    `We never ask for your password, only your User ID. Want me to send the signup link?`
  );
}
