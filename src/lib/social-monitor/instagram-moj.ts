// Finding Moj creators on Instagram
//
// ── Why this exists ─────────────────────────────────────────────────────
// Moj is a terrible place to PROSPECT and a fine place to have an audience.
// It has no public search, no DMs, tag pages that need internal numeric IDs,
// and Google barely indexes its profile pages — so there is no reliable way
// to go from "I want live-streaming creators" to "here is a list of them"
// on Moj itself.
//
// But Moj creators cross-post their clips to Instagram and tag them #moj,
// #mojstar, #mojapp, #mojindia — and Instagram gives you the two things Moj
// withholds: hashtag search, and a way to actually message someone.
//
// So we hunt the same humans on the platform where hunting is possible.
// Contact rate here is far better than the Moj crawler's, because on
// Instagram the DM itself is always a valid channel — a creator with no
// phone number in their bio is still reachable, which was never true on Moj.

import type { SocialPost } from "./types";
import { searchInstagramPosts } from "./instagram";
import { classifyCandidate, type MojSegment } from "./moj";
import { extractContacts, type ExtractedContact } from "./moj-contact";

const APIFY_BASE_URL = "https://api.apify.com/v2";

/**
 * Hashtags Moj creators actually use when cross-posting. Ordered by how
 * specific they are — #mojstar and #mojindia skew heavily to real Moj
 * creators, while #moj alone picks up a lot of unrelated noise (it's a word
 * in several languages), so it's last and lower-weighted.
 */
export const DEFAULT_MOJ_HASHTAGS = [
  "mojstar",
  "mojindia",
  "mojapp",
  "mojlive",
  "moj",
];

/**
 * Poppo/Vone hashtags. Strategically these are the BEST pool in the whole
 * system: anyone tagging #poppolive is already streaming on the exact
 * platform you recruit for. There's no "will they try live streaming?"
 * question — they do it already. The pitch is just "switch agency", and
 * your guaranteed first week is a concrete, checkable reason to.
 *
 * The catch is that these tags are also where every rival agency
 * advertises, so roughly half of what comes back is competitors recruiting
 * rather than hosts to recruit. detectCompetitorAgency() below separates
 * them — and those accounts are worth keeping, just for a different purpose
 * (their followers are hosts shopping for an agency).
 */
export const DEFAULT_POPPO_VONE_HASHTAGS = [
  "poppolive",
  "poppo",
  "vonelive",
  "vone",
  "poppoliveindia",
  "poppohost",
];

/** Everything we search by default: Moj creators + existing Poppo/Vone hosts. */
export const DEFAULT_CREATOR_HASHTAGS = [
  ...DEFAULT_POPPO_VONE_HASHTAGS,
  ...DEFAULT_MOJ_HASHTAGS,
];

/** Which pool a candidate came out of — drives which opener they get. */
export type CreatorSource = "moj" | "poppo_vone" | "both";

export interface InstagramMojCandidate extends SocialPost {
  segment: MojSegment;
  fitScore: number;
  fitReason: string;
  username: string;
  /** Evidence this is genuinely a target creator, not just tag noise */
  mojEvidence: string[];
  source: CreatorSource;
  bio: string;
  followers: number;
  /** Bio-published contact, if any. DM is always available regardless. */
  contact: ExtractedContact | null;
}

/** A rival agency account — not a lead, but their followers are. */
export interface CompetitorAgency {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  signals: string[];
}

// ── Is this actually a target creator? ───────────────────
// The hashtag alone is weak evidence — brands, hashtag-spammers and
// unrelated foreign-language posts all use these tags. Require corroboration.

const MOJ_LINK_RE = /mojapp\.in|moj\.app|sharechat\.com/i;
const MOJ_WORD_RE = /\bmoj\b/i;
const POPPO_VONE_RE = /\b(poppo|vone)\b/i;
const POPPO_VONE_LINK_RE = /poppo\.live|vone\.live|poppolive|vonelive/i;
/** Poppo/Vone hosts publish a numeric User ID — strong proof they stream. */
const HOST_ID_RE = /\b(?:id|user\s?id|poppo\s?id|vone\s?id)\s*[:\-–—]?\s*\d{5,12}\b/i;

export function scoreCreatorEvidence(input: {
  caption: string;
  bio: string;
  hashtags: string[];
}): { isCreator: boolean; evidence: string[]; source: CreatorSource | null } {
  const evidence: string[] = [];
  const text = `${input.caption} ${input.bio}`;
  let mojHit = false;
  let poppoHit = false;

  // ── Moj signals
  if (MOJ_LINK_RE.test(input.bio)) { evidence.push("Moj/ShareChat link in bio"); mojHit = true; }
  if (MOJ_WORD_RE.test(input.bio)) { evidence.push("mentions Moj in bio"); mojHit = true; }
  if (MOJ_LINK_RE.test(input.caption)) { evidence.push("Moj link in caption"); mojHit = true; }

  const mojTags = input.hashtags.filter((h) =>
    /^(mojstar|mojindia|mojapp|mojlive|mojpehimojhai)$/i.test(h.replace(/^#/, ""))
  );
  if (mojTags.length > 0) {
    evidence.push(`Moj-specific hashtag${mojTags.length > 1 ? "s" : ""}: ${mojTags.join(", ")}`);
    mojHit = true;
  }

  // ── Poppo/Vone signals. Stronger than the Moj ones: someone who names
  // Poppo or Vone is almost certainly a host, because unlike "moj" these
  // aren't words in any language and nobody tags them casually.
  if (POPPO_VONE_LINK_RE.test(input.bio)) { evidence.push("Poppo/Vone link in bio"); poppoHit = true; }
  if (POPPO_VONE_RE.test(input.bio)) { evidence.push("names Poppo/Vone in bio"); poppoHit = true; }
  if (HOST_ID_RE.test(text)) { evidence.push("publishes a host User ID — already streaming"); poppoHit = true; }

  const pvTags = input.hashtags.filter((h) =>
    /^(poppo|poppolive|vone|vonelive|poppoliveindia|poppohost)$/i.test(h.replace(/^#/, ""))
  );
  if (pvTags.length > 0) {
    evidence.push(`Poppo/Vone hashtag${pvTags.length > 1 ? "s" : ""}: ${pvTags.join(", ")}`);
    poppoHit = true;
  }

  // A generic #moj tag with nothing else behind it is not enough — that's
  // how you end up messaging a Slovenian bakery ("moj" is a real word in
  // several languages) or a hashtag-stuffing meme page.
  const source: CreatorSource | null =
    mojHit && poppoHit ? "both" : poppoHit ? "poppo_vone" : mojHit ? "moj" : null;

  return { isCreator: evidence.length > 0, evidence, source };
}

/** Back-compat alias — earlier code and tests referenced this name. */
export function scoreMojEvidence(input: { caption: string; bio: string; hashtags: string[] }) {
  const r = scoreCreatorEvidence(input);
  return { isMojCreator: r.isCreator, evidence: r.evidence };
}

// ── Competitor agencies ──────────────────────────────────
// The Poppo/Vone hashtags are where rival agencies advertise, so a large
// share of results are recruiters, not recruits. Messaging them is wasted
// effort and looks amateurish. But they're not worthless: an agency's
// follower list is made almost entirely of hosts, and hosts who follow
// agencies are hosts thinking about agencies. So these get set aside rather
// than thrown away.

const AGENCY_SIGNALS = [
  "agency", "agencies", "we provide", "join us", "join our", "hiring",
  "host required", "hosts required", "vacancy", "recruitment", "recruiting",
  "dm for id", "dm for join", "contact for id", "free id", "id provide",
  "salary", "guaranteed salary", "daily payout", "instant withdraw",
  "best agency", "official agency", "authorised agency", "authorized agency",
];

export function detectCompetitorAgency(input: {
  bio: string;
  fullName: string;
  username: string;
}): { isAgency: boolean; signals: string[] } {
  const hay = `${input.bio} ${input.fullName} ${input.username}`.toLowerCase();
  const signals = AGENCY_SIGNALS.filter((s) => hay.includes(s));

  // The word "agency" in a handle or display name is close to conclusive —
  // real hosts don't name themselves that.
  const nameHasAgency = /agency|agencies/i.test(`${input.username} ${input.fullName}`);
  if (nameHasAgency && !signals.includes("agency")) signals.push("'agency' in name/handle");

  // Two independent signals, or one unambiguous recruiting phrase.
  const strong = signals.some((s) =>
    ["host required", "hosts required", "dm for id", "hiring", "vacancy", "recruitment", "'agency' in name/handle"].includes(s)
  );

  return { isAgency: strong || signals.length >= 2, signals };
}

// ── Profile enrichment via Apify ─────────────────────────
// Hashtag results carry the post and the username but not the bio, and the
// bio is where both the contact info and the strongest Moj evidence live.

interface IgProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
}

async function fetchInstagramProfiles(usernames: string[]): Promise<Map<string, IgProfile>> {
  const out = new Map<string, IgProfile>();
  const token = process.env.APIFY_TOKEN;
  if (!token || usernames.length === 0) return out;

  try {
    const runRes = await fetch(`${APIFY_BASE_URL}/acts/apify~instagram-scraper/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        directUrls: usernames.map((u) => `https://www.instagram.com/${u}/`),
        resultsType: "details",
        resultsLimit: usernames.length,
      }),
    });
    if (!runRes.ok) {
      console.error(`[instagram-moj] profile run failed: ${runRes.status}`);
      return out;
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) return out;

    // Profile detail runs are slower than post runs — allow more budget
    let status = "RUNNING";
    for (let i = 0; i < 12 && (status === "RUNNING" || status === "READY"); i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const st = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`);
      status = (await st.json()).data?.status || "RUNNING";
    }
    if (status !== "SUCCEEDED") {
      console.error(`[instagram-moj] profile run ended: ${status}`);
      return out;
    }

    const dsRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${runData.data?.defaultDatasetId}/items?token=${token}&format=json`
    );
    const items = await dsRes.json();

    for (const it of items) {
      const username = it.username || it.ownerUsername;
      if (!username) continue;
      out.set(username.toLowerCase(), {
        username,
        fullName: it.fullName || it.ownerFullName || username,
        bio: it.biography || it.bio || "",
        followers: it.followersCount ?? it.followers ?? 0,
        postsCount: it.postsCount ?? 0,
        isPrivate: !!it.private,
        isVerified: !!it.verified,
      });
    }
  } catch (e: any) {
    console.error("[instagram-moj] profile fetch error:", e?.message);
  }

  return out;
}

function extractHashtags(caption: string): string[] {
  return [...caption.matchAll(/#([A-Za-z0-9_ऀ-ॿ]+)/g)].map((m) => m[1]);
}

// ── Main ─────────────────────────────────────────────────

export interface InstagramMojResult {
  candidates: InstagramMojCandidate[];
  /** Rival agencies found — not leads, but their followers are worth mining */
  competitorAgencies: CompetitorAgency[];
  postsScanned: number;
  profilesEnriched: number;
  rejectedAsNoise: number;
  warnings: string[];
}

export async function findMojCreatorsOnInstagram(opts?: {
  hashtags?: string[];
  maxPerHashtag?: number;
  minFitScore?: number;
  newerThan?: string;
  keywords?: string[];
}): Promise<InstagramMojResult> {
  const hashtags = opts?.hashtags?.length ? opts.hashtags : DEFAULT_CREATOR_HASHTAGS;
  const maxPerHashtag = opts?.maxPerHashtag ?? 30;
  const minFitScore = opts?.minFitScore ?? 35;
  const warnings: string[] = [];

  if (!process.env.APIFY_TOKEN) {
    return {
      candidates: [], competitorAgencies: [], postsScanned: 0, profilesEnriched: 0,
      rejectedAsNoise: 0,
      warnings: ["APIFY_TOKEN not configured — Instagram discovery cannot run."],
    };
  }

  // 1. Collect posts across the Moj hashtag family
  const byUser = new Map<string, SocialPost>();
  let postsScanned = 0;

  for (const tag of hashtags) {
    const posts = await searchInstagramPosts(tag, maxPerHashtag, opts?.newerThan ?? "14 days");
    postsScanned += posts.length;

    for (const p of posts) {
      const u = (p.authorUsername || "").toLowerCase();
      if (!u) continue;
      const existing = byUser.get(u);
      // Keep their best-performing post as the representative
      if (!existing || p.likes + p.comments > existing.likes + existing.comments) {
        byUser.set(u, p);
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (postsScanned === 0) {
    warnings.push(
      "No Instagram posts returned. Either the Apify actor failed, the token is out of credits, " +
      "or the hashtags returned nothing in the time window."
    );
  }

  // 2. Enrich profiles in batches (bio = contact + Moj evidence)
  const usernames = [...byUser.keys()];
  const profiles = new Map<string, IgProfile>();
  const BATCH = 25;
  for (let i = 0; i < usernames.length; i += BATCH) {
    const batch = await fetchInstagramProfiles(usernames.slice(i, i + BATCH));
    for (const [k, v] of batch) profiles.set(k, v);
  }

  // 3. Verify + classify
  const candidates: InstagramMojCandidate[] = [];
  const competitorAgencies: CompetitorAgency[] = [];
  let rejectedAsNoise = 0;

  for (const [username, post] of byUser) {
    const profile = profiles.get(username);
    const bio = profile?.bio || "";
    const tags = extractHashtags(post.postText || "");

    const { isCreator, evidence, source } = scoreCreatorEvidence({
      caption: post.postText || "",
      bio,
      hashtags: tags,
    });

    if (!isCreator || !source) {
      rejectedAsNoise++;
      continue;
    }

    // Rival agency — set aside, don't pitch. Their follower list is the
    // actual prize here, so keep enough to act on later.
    const agency = detectCompetitorAgency({
      bio,
      fullName: profile?.fullName || "",
      username: profile?.username || username,
    });
    if (agency.isAgency) {
      competitorAgencies.push({
        username: profile?.username || username,
        fullName: profile?.fullName || username,
        bio,
        followers: profile?.followers ?? 0,
        signals: agency.signals,
      });
      continue;
    }

    // Private accounts can't be evaluated and rarely convert — skip quietly
    if (profile?.isPrivate) {
      rejectedAsNoise++;
      continue;
    }

    const { segment, fitScore: baseScore, fitReason } = classifyCandidate({
      caption: post.postText || "",
      bio,
      followers: profile?.followers,
      postCount: profile?.postsCount,
      keywords: opts?.keywords,
    });

    // Someone already streaming on Poppo/Vone is the single most convertible
    // person in this whole system — no platform change, no new habit, just a
    // better agency. Weight that explicitly rather than letting them blend in
    // with generic short-video creators.
    let fitScore = baseScore;
    const reasons = [fitReason];
    if (source === "poppo_vone" || source === "both") {
      fitScore = Math.min(100, fitScore + 20);
      reasons.push("already on Poppo/Vone — switch pitch, not a cold pitch");
    }

    if (fitScore < minFitScore) continue;

    const contacts = extractContacts(bio);

    candidates.push({
      ...post,
      platform: "instagram",
      authorName: profile?.fullName || post.authorName,
      segment,
      fitScore,
      fitReason: reasons.join("; "),
      username: profile?.username || username,
      mojEvidence: evidence,
      source,
      bio,
      followers: profile?.followers ?? 0,
      contact: contacts[0] || null,
    });
  }

  candidates.sort((a, b) => b.fitScore - a.fitScore);
  competitorAgencies.sort((a, b) => b.followers - a.followers);

  return {
    candidates,
    competitorAgencies,
    postsScanned,
    profilesEnriched: profiles.size,
    rejectedAsNoise,
    warnings,
  };
}
