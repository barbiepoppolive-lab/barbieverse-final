// Moj Contact Extraction
//
// Moj's web surface has no DM, no messaging, no contact button. A scraped
// Moj handle on its own is unreachable — which is why a "perfect" Moj
// scraper still produced zero signups: every lead was a dead end.
//
// The way out is that Indian short-video creators very commonly publish a
// business contact in their own bio — an Instagram handle, a WhatsApp
// number, sometimes Telegram or a booking email. That's public,
// deliberately-published contact info, and it's the only automatable path
// from "found them on Moj" to "actually spoke to them".
//
// Two rules this module enforces, deliberately:
//  1. Only what the creator published themselves. No cross-referencing,
//     no guessing a number from a partial, no probing other platforms to
//     resolve an identity. If the bio doesn't say it, we don't have it.
//  2. Numbers must look like real Indian mobiles. Bios are full of digits
//     (follower counts, dates, "24x7", song names) and a naive number grab
//     produces garbage that burns your WhatsApp sending reputation.

export type ContactChannel = "whatsapp" | "instagram" | "telegram" | "youtube" | "email";

export interface ExtractedContact {
  channel: ContactChannel;
  /** Normalized value: E.164-ish digits for phone, bare handle for socials */
  value: string;
  /** Directly actionable link (wa.me / instagram.com / t.me / mailto) */
  actionUrl: string;
  /** How confident we are this is really a contact and not noise (0-1) */
  confidence: number;
}

// ── Indian mobile validation ─────────────────────────────
// Indian mobile numbers are exactly 10 digits and start with 6, 7, 8 or 9.
// Anything else (landline, short code, follower count, year) is rejected.

function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  // Strip country code / trunk prefixes if present
  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 13 && local.startsWith("091")) local = local.slice(3);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);

  if (local.length !== 10) return null;
  if (!/^[6-9]/.test(local)) return null;

  // Reject obvious non-numbers: all-same-digit, trivially sequential
  if (/^(\d)\1{9}$/.test(local)) return null;
  if (local === "9876543210" || local === "1234567890") return null;

  return `91${local}`;
}

/**
 * A bio like "1.2M followers | 2024 best creator | 9876543210" has several
 * digit runs. We only accept a run that is plausibly a phone number AND
 * isn't immediately adjacent to a follower/count word.
 */
// NOTE on the k/m case: an earlier version of this used /k\b|m\b/ to catch
// "500K likes" / "1.2M followers". That matched the tail of any word ending
// in k or m — and because the lookaround window is a fixed character slice,
// it routinely cut "instagram" mid-word into "...instagram" whose trailing
// "m" then satisfied m\b. Result: a perfectly good phone number sitting next
// to an Instagram URL was silently discarded as a "follower count". The
// count markers now have to be attached to digits to count.
const COUNT_CONTEXT = /(follower|following|subscriber|likes?|views?|fans?|crore|lakh|\d\s*[km]\b)/i;

// Bios are written as delimited fields — "500K views daily | 9812345678
// whatsapp | insta @me". A fixed character window spills across those
// delimiters and lets a follower count in one field veto a real phone number
// in another (which is exactly what happened to the line above). So the
// context check is scoped to the field the match actually sits in.
function looksLikeCountContext(bio: string, matchIndex: number, matchLength: number): boolean {
  // Find the bounds of the field containing this match
  let start = 0;
  let end = bio.length;
  const delimRe = /[|•·\n\r]/g;
  for (const d of bio.matchAll(delimRe)) {
    const i = d.index ?? 0;
    if (i < matchIndex) start = i + 1;
    else if (i >= matchIndex + matchLength) { end = i; break; }
  }

  const before = bio.slice(start, matchIndex);
  const after = bio.slice(matchIndex + matchLength, end);
  return COUNT_CONTEXT.test(before) || COUNT_CONTEXT.test(after);
}

// ── Handle sanity ────────────────────────────────────────
// Instagram handles: 1-30 chars, letters/digits/period/underscore.
// We additionally reject handles that are pure generic words, which show up
// constantly as false positives ("@me", "@live", "@video", "@follow").

const GENERIC_HANDLE_BLOCKLIST = new Set([
  "me", "you", "live", "video", "videos", "follow", "followme", "subscribe",
  "moj", "mojapp", "instagram", "insta", "whatsapp", "telegram", "youtube",
  "home", "official", "team", "india", "love", "music", "song", "reels",
]);

function isPlausibleHandle(handle: string): boolean {
  const h = handle.toLowerCase().replace(/^@/, "");
  if (h.length < 3 || h.length > 30) return false;
  if (!/^[a-z0-9._]+$/.test(h)) return false;
  if (GENERIC_HANDLE_BLOCKLIST.has(h)) return false;
  if (/^[._]+$/.test(h)) return false;
  return true;
}

// ── Extraction ───────────────────────────────────────────

/**
 * Pull every publicly-published contact channel out of a Moj bio.
 * Returns them sorted best-first (WhatsApp > Instagram > everything else),
 * because a number you can message directly converts far better than a
 * social handle where you're one DM among hundreds.
 */
export function extractContacts(bio: string): ExtractedContact[] {
  if (!bio || bio.trim().length === 0) return [];

  const found: ExtractedContact[] = [];
  const seen = new Set<string>();

  const push = (c: ExtractedContact) => {
    const dedupeKey = `${c.channel}:${c.value.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    found.push(c);
  };

  // ── WhatsApp: explicit wa.me / api.whatsapp.com links (highest confidence)
  const waLinkRe = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?\d[\d\s-]{8,15})/gi;
  for (const m of bio.matchAll(waLinkRe)) {
    const normalized = normalizeIndianMobile(m[1]);
    if (normalized) {
      push({
        channel: "whatsapp",
        value: normalized,
        actionUrl: `https://wa.me/${normalized}`,
        confidence: 0.95,
      });
    }
  }

  // ── WhatsApp: a number sitting next to an explicit whatsapp/wtsp/call word
  const waLabelledRe = /(?:whats\s?app|whatsapp|wtsapp|wtsp|w\.?a\.?|call|contact|dm|booking|collab|enquiry|enquiries)\D{0,12}(\+?9?1?[\s-]?\d[\d\s-]{8,14})/gi;
  for (const m of bio.matchAll(waLabelledRe)) {
    const normalized = normalizeIndianMobile(m[1]);
    if (normalized && !looksLikeCountContext(bio, m.index ?? 0, m[0].length)) {
      push({
        channel: "whatsapp",
        value: normalized,
        actionUrl: `https://wa.me/${normalized}`,
        confidence: 0.85,
      });
    }
  }

  // ── WhatsApp: a bare 10-digit mobile with no label. Real, but noisier —
  // lower confidence so downstream can require a labelled match if it wants.
  const bareNumberRe = /(?:^|[^\d])(\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})(?!\d)/g;
  for (const m of bio.matchAll(bareNumberRe)) {
    const normalized = normalizeIndianMobile(`${m[1] || ""}${m[2]}`);
    if (normalized && !looksLikeCountContext(bio, m.index ?? 0, m[0].length)) {
      push({
        channel: "whatsapp",
        value: normalized,
        actionUrl: `https://wa.me/${normalized}`,
        confidence: 0.6,
      });
    }
  }

  // ── Instagram: full URL
  const igUrlRe = /(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{3,30})/gi;
  for (const m of bio.matchAll(igUrlRe)) {
    if (isPlausibleHandle(m[1])) {
      push({
        channel: "instagram",
        value: m[1],
        actionUrl: `https://instagram.com/${m[1]}`,
        confidence: 0.95,
      });
    }
  }

  // ── Instagram: "insta - @handle" / "ig: handle" / "IG @handle"
  // A separator is REQUIRED between the label and the handle. Without it this
  // matched the "instagram" inside "instagram.com/realhandle" and captured
  // ".com" as the handle. The capture also has to start with an alphanumeric
  // so a leading dot can never begin a handle.
  const igLabelledRe = /(?:insta(?:gram)?|ig)\s*(?:[:\-–—>|]+|\s)\s*@?([A-Za-z0-9_][A-Za-z0-9._]{2,29})/gi;
  for (const m of bio.matchAll(igLabelledRe)) {
    if (isPlausibleHandle(m[1])) {
      push({
        channel: "instagram",
        value: m[1],
        actionUrl: `https://instagram.com/${m[1]}`,
        confidence: 0.8,
      });
    }
  }

  // ── Telegram
  const tgRe = /(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,32})/gi;
  for (const m of bio.matchAll(tgRe)) {
    if (isPlausibleHandle(m[1])) {
      push({
        channel: "telegram",
        value: m[1],
        actionUrl: `https://t.me/${m[1]}`,
        confidence: 0.95,
      });
    }
  }

  // ── YouTube
  const ytRe = /youtube\.com\/(?:@|c\/|channel\/|user\/)?([A-Za-z0-9._-]{3,40})/gi;
  for (const m of bio.matchAll(ytRe)) {
    if (m[1] && m[1].toLowerCase() !== "watch") {
      push({
        channel: "youtube",
        value: m[1],
        actionUrl: `https://youtube.com/@${m[1].replace(/^@/, "")}`,
        confidence: 0.85,
      });
    }
  }

  // ── Email
  const emailRe = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  for (const m of bio.matchAll(emailRe)) {
    push({
      channel: "email",
      value: m[1].toLowerCase(),
      actionUrl: `mailto:${m[1].toLowerCase()}`,
      confidence: 0.9,
    });
  }

  // Rank: channel priority first, then confidence
  const channelRank: Record<ContactChannel, number> = {
    whatsapp: 0, instagram: 1, telegram: 2, email: 3, youtube: 4,
  };
  found.sort((a, b) => {
    const byChannel = channelRank[a.channel] - channelRank[b.channel];
    if (byChannel !== 0) return byChannel;
    return b.confidence - a.confidence;
  });

  return found;
}

/**
 * The single best contact to actually use, or null if the creator published
 * nothing reachable (→ they go to the manual in-app comment queue instead).
 * `minConfidence` guards against acting on a shaky bare-number match.
 */
export function bestContact(bio: string, minConfidence = 0.6): ExtractedContact | null {
  const all = extractContacts(bio).filter((c) => c.confidence >= minConfidence);
  return all[0] || null;
}
