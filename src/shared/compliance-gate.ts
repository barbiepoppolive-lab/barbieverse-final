// Compliance Gate — the last thing content passes through before publishing.
//
// Blocks at generation time rather than flagging for review. Three failure
// modes it exists to prevent:
//
//   1. Income claims that violate Meta/LinkedIn employment-ad policy. These
//      get ad accounts restricted, not just posts removed.
//   2. Scam-pattern language. Recruitment copy aimed at women looking for
//      income sits in the exact semantic neighbourhood that spam classifiers
//      are tuned to catch. Sounding like a scam gets you treated as one, even
//      when the offer is real.
//   3. Near-duplicate posts. Publishing structurally identical content across
//      a platform is the single most reliable way to get flagged as
//      inauthentic behaviour.
//
// Note on (1) and (2): the honest version of this copy is also the version
// that survives review. These rules are not in tension with conversion.

export type Severity = "block" | "warn";

export interface ComplianceIssue {
  rule: string;
  severity: Severity;
  detail: string;
  match?: string;
  suggestion?: string;
}

export interface ComplianceResult {
  passed: boolean;
  issues: ComplianceIssue[];
  /** 0-100. Not a quality score — purely a risk measure. Lower is safer. */
  riskScore: number;
}

// ── Rule: guaranteed-income language ───────────────────
// Meta's employment ad policy prohibits guaranteeing earnings. The user has
// confirmed the first-week figure is conditional, so stating it as a
// guarantee would be inaccurate as well as non-compliant.

const GUARANTEE_PATTERNS: Array<{ re: RegExp; detail: string; suggestion: string }> = [
  {
    // Catch-all: ANY currency amount. Per the operator's decision, no earnings
    // figure of any kind may appear in generated content — not conditional,
    // not "up to", not a range. This fires on the number itself rather than
    // on the framing, because framing is what models talk their way around.
    re: /(₹|\brs\.?\s?|\binr\s?)\s?\d[\d,]*(\.\d+)?(\s*(k|lakh|lakhs|cr|crore))?/gi,
    detail:
      "Contains a rupee figure. No earnings amounts of any kind are permitted in generated content.",
    suggestion:
      "Remove the number. Describe how payouts work (hours + viewer gifting) and hand off to the team for figures.",
  },
  {
    // Bare numbers attached to earning verbs, e.g. "earn 20000 monthly".
    re: /\b(earn|earning|make|paid|income|salary|stipend)\b[^.!?]{0,30}\b\d{3,}\b/gi,
    detail: "States a numeric earnings figure without a currency symbol.",
    suggestion: "Remove the figure entirely.",
  },
  {
    // Indian numerals without a currency marker: "9 lakh", "2 crore", "50k".
    // The negative lookahead spares audience metrics — "100k followers" and
    // "2 lakh views" are legitimate influencer copy and not income claims.
    re: /\b\d+(\.\d+)?\s*(lakh|lakhs|lac|lacs|crore|crores|k)\b(?!\s*(followers?|subs?|subscribers?|views?|likes?|streams?|members?|downloads?))/gi,
    detail:
      "Indian-numeral money figure (lakh/crore/k) without a currency symbol. Reads as an earnings claim.",
    suggestion:
      "Remove the figure. Point to published proof instead of quoting a number.",
  },
  {
    re: /\b(guarantee[ds]?|assured|100%\s*(sure|certain)|promise[ds]?)\b[^.!?]{0,60}\b(earn|income|payment|money|salary|pay)/gi,
    detail: "Guarantees earnings — prohibited by Meta employment ad policy.",
    suggestion: "Remove the guarantee. Describe the mechanism, not an outcome.",
  },
  {
    re: /\byou\s+will\s+(earn|make|get\s+paid|receive)\b/gi,
    detail: 'Asserts a certain outcome ("you will earn").',
    suggestion: "Describe how payouts work instead of promising a result.",
  },
  {
    re: /\b(unlimited|limitless)\s+(earning|income|money)\b/gi,
    detail: "Unlimited earning claim — classic scam signal and policy violation.",
    suggestion: "Remove entirely.",
  },
];

// ── Rule: scam-pattern language ────────────────────────
// These make honest offers read as fraudulent to both classifiers and the
// job_seeking segment, who are actively screening for exactly these phrases.

const SCAM_PATTERNS: Array<{ re: RegExp; detail: string; suggestion: string }> = [
  {
    // Negated mentions are GOOD copy ("no joining fee, ever") — that's a
    // trust signal we actively want. Only fire when the fee is being asked for.
    re: /(?<!\b(?:no|never|without|zero|not)\s)(?<!\b(?:no|never|without|zero|not)\s\w{1,12}\s)\b(registration|joining|security|processing)\s+fee\b/gi,
    detail: "Appears to reference charging an upfront fee. BarbieVerse never charges.",
    suggestion: 'Remove, or phrase as the negative: "no joining fee, ever".',
  },
  {
    // Same logic: "we never ask for your password" is a trust signal.
    re: /(?<!\b(?:never|not|don't|dont|no)\s)(?<!\b(?:never|not|don't|dont|no)\s\w{1,12}\s)\b(send|share|give|ask\s+for)\s+(me\s+)?(your\s+)?(password|otp|pin|bank\s+details|aadhaar)\b/gi,
    detail: "Requests credentials. Never legitimate.",
    suggestion: "Remove. Only a Poppo/Vone User ID is ever required.",
  },
  {
    re: /\b(no\s+(work|effort|skill)\s+required|easy\s+money|quick\s+money|ghar\s+baithe\s+paise)\b/gi,
    detail: "Effortless-money framing — strong spam signal.",
    suggestion: "Describe the actual work honestly; it is the more persuasive angle.",
  },
  {
    re: /\b(limited\s+(seats|slots|spots)|hurry|last\s+chance|only\s+\d+\s+(seats|slots|spots)\s+left)\b/gi,
    detail: "Manufactured urgency — flagged as pressure tactics, and the job_seeking segment reads it as a scam tell.",
    suggestion: "Remove. Genuine deadlines only.",
  },
  {
    re: /\b(dm\s+me\s+now|whatsapp\s+me\s+now|inbox\s+me\s+fast)\b/gi,
    detail: "High-pressure DM solicitation — common spam pattern.",
    suggestion: 'Use a calmer CTA: "DM if you want the details".',
  },
];

// ── Rule: minors ───────────────────────────────────────
// Non-negotiable. Live-streaming recruitment must never read as addressing
// anyone under 18.

const MINOR_PATTERNS: Array<{ re: RegExp; detail: string }> = [
  {
    re: /\b(school\s*(girl|student)|teen(ager|age)?s?|under\s*18|1[0-7]\s*(year|yr)s?\s*old|class\s*(9|10|11|12)\b)/gi,
    detail: "Language addressing or describing minors. This content targets adults only.",
  },
];

// ── Rule: link and CTA hygiene ─────────────────────────

const MAX_LINKS_PER_POST = 1;
const MAX_HASHTAGS = 12;

// ── Near-duplicate detection ───────────────────────────

/** Normalise for comparison: strip punctuation, emoji, case, whitespace. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Character-level trigram set. Robust to word reordering and small edits. */
function trigrams(text: string): Set<string> {
  const s = normalise(text);
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Jaccard similarity, 0-1. */
export function similarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared);
}

/** Above this, two posts are close enough that platforms treat them as spam. */
export const DUPLICATE_THRESHOLD = 0.72;

// ── Main check ─────────────────────────────────────────

export interface ComplianceInput {
  content: string;
  hashtags?: string[];
  /** Recent posts on the SAME platform, newest first. Used for dedup. */
  recentPosts?: string[];
  platform?: string;
}

export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const issues: ComplianceIssue[] = [];
  const text = input.content || "";

  const scan = (
    patterns: Array<{ re: RegExp; detail: string; suggestion?: string }>,
    rule: string,
    severity: Severity,
  ) => {
    for (const p of patterns) {
      // Fresh regex each time — these are /g and carry lastIndex state.
      const re = new RegExp(p.re.source, p.re.flags);
      const m = re.exec(text);
      if (m) {
        issues.push({
          rule,
          severity,
          detail: p.detail,
          match: m[0].slice(0, 80),
          suggestion: p.suggestion,
        });
      }
    }
  };

  scan(GUARANTEE_PATTERNS, "income_claim", "block");
  scan(SCAM_PATTERNS, "scam_pattern", "block");
  scan(MINOR_PATTERNS, "minor_targeting", "block");

  // Link hygiene
  const links = text.match(/https?:\/\/\S+/g) || [];
  if (links.length > MAX_LINKS_PER_POST) {
    issues.push({
      rule: "link_count",
      severity: "warn",
      detail: `${links.length} links in one post (max ${MAX_LINKS_PER_POST}). Multiple links suppress reach and look spammy.`,
      suggestion: "Keep one link; move the rest to bio or a follow-up comment.",
    });
  }

  // Hashtag hygiene
  const tagCount = (input.hashtags?.length ?? 0) || (text.match(/#\w+/g) || []).length;
  if (tagCount > MAX_HASHTAGS) {
    issues.push({
      rule: "hashtag_count",
      severity: "warn",
      detail: `${tagCount} hashtags (max ${MAX_HASHTAGS}).`,
      suggestion: "Trim to the most relevant tags.",
    });
  }

  // ALL-CAPS shouting
  const words = text.split(/\s+/).filter((w) => w.length > 3);
  const shouty = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (words.length > 8 && shouty.length / words.length > 0.3) {
    issues.push({
      rule: "shouting",
      severity: "warn",
      detail: "Heavy ALL-CAPS usage reads as spam.",
      suggestion: "Use sentence case; emphasise with word choice instead.",
    });
  }

  // Near-duplicate against recent posts
  if (input.recentPosts?.length) {
    for (const prev of input.recentPosts) {
      const sim = similarity(text, prev);
      if (sim >= DUPLICATE_THRESHOLD) {
        issues.push({
          rule: "near_duplicate",
          severity: "block",
          detail: `${Math.round(sim * 100)}% similar to a recent post on this platform. Repetitive posting triggers inauthentic-behaviour detection.`,
          match: prev.slice(0, 80),
          suggestion: "Regenerate with a different hook framework and structure.",
        });
        break;
      }
    }
  }

  const blocks = issues.filter((i) => i.severity === "block").length;
  const warns = issues.filter((i) => i.severity === "warn").length;
  const riskScore = Math.min(100, blocks * 35 + warns * 10);

  return { passed: blocks === 0, issues, riskScore };
}

/**
 * Prompt fragment describing these rules, so the generator avoids violations
 * up front rather than relying on the gate to catch them after the fact.
 */
export const COMPLIANCE_PROMPT_RULES = `
COMPLIANCE (violating any of these makes the post unpublishable):
- NEVER write any rupee amount or earnings figure. Not "up to", not a range,
  not "starting from". Any number attached to money makes the post
  unpublishable. Describe how payouts work — hours streamed plus viewer
  gifting — and point her to the team for current terms.
- Never guarantee earnings, and never write "you will earn".
- Never mention fees, deposits, or registration charges. There are none.
- Never ask for passwords, OTPs, or bank details. Only a User ID.
- No manufactured urgency: no "limited seats", "hurry", "last chance".
- No "easy money" / "no work required" framing.
- Adults only, 18+. No school, teen, or minor-adjacent language.
- One link maximum. Twelve hashtags maximum. No ALL-CAPS shouting.
- Every post must be structurally distinct from recent posts — different hook,
  different shape, not a reworded copy.
`.trim();

/** Compact, model-readable summary of what to fix. */
export function formatIssuesForRevision(result: ComplianceResult): string {
  if (result.issues.length === 0) return "";
  return [
    "The draft failed compliance. Fix every item below and preserve the message:",
    ...result.issues.map(
      (i) =>
        `- [${i.severity.toUpperCase()}] ${i.detail}` +
        (i.match ? ` (found: "${i.match}")` : "") +
        (i.suggestion ? ` Fix: ${i.suggestion}` : ""),
    ),
  ].join("\n");
}
