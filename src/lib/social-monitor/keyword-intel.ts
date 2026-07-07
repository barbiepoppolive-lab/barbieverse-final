// Keyword Intelligence — scoring, evolution, cross-platform seeding
// Every discovered profile feeds keywords back into the search engine

import type { SocialPlatform } from "./types";

// ── Types ──────────────────────────────────────────────

export interface KeywordScore {
  id: string;
  keyword: string;
  platform: string;
  pool: "proven" | "ai_discovered" | "experimental";
  source: "manual" | "ai_generated" | "bio_extracted" | "cross_platform";
  total_searches: number;
  total_results: number;
  unique_streamers: number;
  hot_leads: number;
  warm_leads: number;
  last_used_at: string | null;
  last_new_discovery_at: string | null;
  score: number;
}

// ── Score a keyword after a discovery ──────────────────

export async function scoreKeywordAfterDiscovery(
  keyword: string,
  platform: string,
  isNewStreamers: boolean,
  category: "hot" | "warm" | "cold"
): Promise<void> {
  try {
    const { q } = await import("@/lib/db.server");

    // Upsert keyword score record
    await q(
      `INSERT INTO keyword_scores (keyword, platform, total_searches, total_results, unique_streamers, hot_leads, warm_leads, last_used_at, last_new_discovery_at, score)
       VALUES ($1, $2, 1, 1, $3, $4, $5, now(), $6, 50)
       ON CONFLICT (keyword, platform) DO UPDATE SET
         total_searches = keyword_scores.total_searches + 1,
         total_results = keyword_scores.total_results + 1,
         unique_streamers = keyword_scores.unique_streamers + $3,
         hot_leads = keyword_scores.hot_leads + $4,
         warm_leads = keyword_scores.warm_leads + $5,
         last_used_at = now(),
         last_new_discovery_at = CASE WHEN $3 = 1 THEN now() ELSE keyword_scores.last_new_discovery_at END`,
      [
        keyword,
        platform,
        isNewStreamers ? 1 : 0,
        category === "hot" ? 1 : 0,
        category === "warm" ? 1 : 0,
      ]
    );

    // Recalculate score
    await recalculateScore(keyword, platform);
  } catch (e: any) {
    console.error(`[keyword-intel] Failed to score keyword "${keyword}":`, e?.message);
  }
}

// ── Recalculate keyword score ──────────────────────────

async function recalculateScore(keyword: string, platform: string): Promise<void> {
  try {
    const { q } = await import("@/lib/db.server");

    const rows = await q<{
      unique_streamers: number;
      hot_leads: number;
      warm_leads: number;
      total_searches: number;
      last_new_discovery_at: string | null;
    }>(
      `SELECT unique_streamers, hot_leads, warm_leads, total_searches, last_new_discovery_at
       FROM keyword_scores WHERE keyword = $1 AND platform = $2`,
      [keyword, platform]
    );

    if (rows.length === 0) return;
    const r = rows[0];

    // discovery_rate: 0-1 scale (capped at 1.0)
    const discoveryRate = r.total_searches > 0
      ? Math.min(1, r.unique_streamers / r.total_searches)
      : 0;

    // freshness: exponential decay from last new discovery
    let freshness = 0.1;
    if (r.last_new_discovery_at) {
      const daysSince = (Date.now() - new Date(r.last_new_discovery_at).getTime()) / (1000 * 60 * 60 * 24);
      freshness = Math.max(0.1, Math.exp(-0.3 * daysSince));
    }

    // quality: hot leads weighted 3x, warm 1x
    const quality = r.unique_streamers > 0
      ? Math.min(1, (r.hot_leads * 3 + r.warm_leads * 1) / (r.unique_streamers * 3))
      : 0;

    // Composite score 0-100
    const score = Math.round(
      (discoveryRate * 40) +
      (freshness * 30) +
      (quality * 20) +
      (10) // base efficiency component
    );

    await q(
      `UPDATE keyword_scores SET score = $1 WHERE keyword = $2 AND platform = $3`,
      [Math.min(100, Math.max(0, score)), keyword, platform]
    );
  } catch (e: any) {
    console.error(`[keyword-intel] Score recalc failed:`, e?.message);
  }
}

// ── Select keywords for a platform (weighted by score) ─

export async function selectKeywordsForPlatform(
  platform: SocialPlatform,
  count: number
): Promise<string[]> {
  try {
    const { q } = await import("@/lib/db.server");

    // Get keywords for this platform + 'all' (cross-platform keywords)
    const rows = await q<{ keyword: string; score: number; pool: string }>(
      `SELECT keyword, score, pool FROM keyword_scores
       WHERE platform = $1 OR platform = 'all'
       ORDER BY
         CASE WHEN pool = 'proven' THEN 3
              WHEN pool = 'ai_discovered' THEN 2
              WHEN pool = 'experimental' THEN 1
              ELSE 0 END DESC,
         score DESC
       LIMIT $2`,
      [platform, count * 3] // fetch extra for weighted selection
    );

    if (rows.length === 0) return [];

    // Weighted random selection by score
    const totalScore = rows.reduce((sum, r) => sum + (r.score || 50), 0);
    const selected: string[] = [];
    const used = new Set<string>();

    for (let i = 0; i < Math.min(count, rows.length); i++) {
      let remaining = Math.random() * totalScore;
      for (const row of rows) {
        if (used.has(row.keyword)) continue;
        remaining -= row.score || 50;
        if (remaining <= 0) {
          selected.push(row.keyword);
          used.add(row.keyword);
          break;
        }
      }
    }

    return selected;
  } catch {
    return [];
  }
}

// ── Extract keywords from post text ────────────────────

export async function ingestDiscoveryKeywords(
  postText: string,
  platform: string,
  sourceKeyword: string,
  extractedHashtags: string[] = [],
  extractedMentions: string[] = [],
  extractedNiche: string = ""
): Promise<string[]> {
  const newKeywords: string[] = [];

  try {
    const { q } = await import("@/lib/db.server");

    // Extract bio-like terms from post text
    const bioTerms = extractBioTerms(postText);

    // Combine all extracted terms
    const terms = new Map<string, string>(); // term -> source

    for (const term of bioTerms) {
      if (term.length < 3) continue;
      terms.set(term.toLowerCase(), "bio_extracted");
    }

    for (const tag of extractedHashtags) {
      const clean = tag.replace(/^#/, "").trim().toLowerCase();
      if (clean.length >= 3) {
        terms.set(clean, "bio_extracted");
      }
    }

    for (const mention of extractedMentions) {
      const clean = mention.replace(/^@/, "").trim().toLowerCase();
      if (clean.length >= 3) {
        terms.set(clean, "cross_platform");
      }
    }

    // Insert each new term as experimental keyword
    for (const [term, source] of terms) {
      // Skip if already exists
      const existing = await q<{ id: string }>(
        `SELECT id FROM keyword_scores WHERE keyword = $1 AND platform = $2`,
        [term, platform]
      );

      if (existing.length > 0) continue;

      await q(
        `INSERT INTO keyword_scores (keyword, platform, pool, source, score)
         VALUES ($1, $2, 'experimental', $3, 50)
         ON CONFLICT (keyword, platform) DO NOTHING`,
        [term, platform, source]
      );

      newKeywords.push(term);
    }
  } catch (e: any) {
    console.error(`[keyword-intel] Ingest failed:`, e?.message);
  }

  return newKeywords;
}

// ── Extract bio-like terms from text ───────────────────

function extractBioTerms(text: string): string[] {
  const terms: string[] = [];
  const lower = text.toLowerCase();

  // Common streaming/bio patterns
  const patterns = [
    /(?:live\s*stream(?:er)?|streaming|going\s*live)/gi,
    /(?:poppo|vone|tiktok\s*live|youtube\s*live)/gi,
    /(?:follow\s*me|sub\s*to|check\s*out)/gi,
    /(?:earn|money|income|payout|gifts?)/gi,
    /(?:gaming|beauty|music|irl|vlog|cooking|fitness)/gi,
    /(?:new\s*(?:here|host|streamer)|looking\s*for)/gi,
  ];

  for (const pattern of patterns) {
    const matches = lower.match(pattern);
    if (matches) {
      for (const match of matches) {
        terms.push(match.trim());
      }
    }
  }

  // Extract capitalized words (likely proper nouns/niches)
  const words = text.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length >= 4 && /^[A-Z]/.test(clean) && !/^(I|A|The|And|But|Or|For|Nor|Yet|So|Is|Am|Are|Was|Were|Be|Been|Being|Have|Has|Had|Do|Does|Did|Will|Would|Could|Should|May|Might|Shall|Can|This|That|These|Those|My|Your|His|Her|Its|Our|Their|Me|Him|Her|Us|Them|You|It|He|She|We|They)$/i.test(clean)) {
      terms.push(clean.toLowerCase());
    }
  }

  return [...new Set(terms)];
}

// ── Evolve keywords: promote, demote, retire ───────────

export async function evolveKeywords(): Promise<{
  promoted: number;
  demoted: number;
  retired: number;
}> {
  let promoted = 0;
  let demoted = 0;
  let retired = 0;

  try {
    const { pool } = await import("@/lib/db.server");

    // PROMOTE: experimental keywords with score >= 80 → proven
    const promoteResult = await pool.query(
      `UPDATE keyword_scores SET pool = 'proven'
       WHERE pool = 'experimental' AND score >= 80`
    );
    promoted = promoteResult.rowCount || 0;

    // DEMOTE: proven keywords with score < 20 → experimental
    const demoteResult = await pool.query(
      `UPDATE keyword_scores SET pool = 'experimental'
       WHERE pool = 'proven' AND score < 20`
    );
    demoted = demoteResult.rowCount || 0;

    // RETIRE: keywords with score < 10 AND no discovery in 7+ days
    const retireResult = await pool.query(
      `DELETE FROM keyword_scores
       WHERE score < 10
         AND (last_new_discovery_at IS NULL OR last_new_discovery_at < now() - interval '7 days')
         AND pool != 'proven'`
    );
    retired = retireResult.rowCount || 0;

    if (promoted + demoted + retired > 0) {
      console.log(`[keyword-intel] Evolved: ${promoted} promoted, ${demoted} demoted, ${retired} retired`);
    }
  } catch (e: any) {
    console.error(`[keyword-intel] Evolution failed:`, e?.message);
  }

  return { promoted, demoted, retired };
}

// ── Seed keywords from admin config (one-time) ────────

export async function seedKeywordsFromConfig(
  keywords: string[],
  platform: string
): Promise<number> {
  let inserted = 0;

  try {
    const { pool } = await import("@/lib/db.server");

    for (const kw of keywords) {
      const trimmed = kw.trim().toLowerCase();
      if (trimmed.length < 2) continue;

      const result = await pool.query(
        `INSERT INTO keyword_scores (keyword, platform, pool, source, score)
         VALUES ($1, $2, 'proven', 'manual', 70)
         ON CONFLICT (keyword, platform) DO NOTHING`,
        [trimmed, platform]
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
    }
  } catch (e: any) {
    console.error(`[keyword-intel] Seed failed:`, e?.message);
  }

  return inserted;
}

// ── Get keyword stats for admin dashboard ──────────────

export async function getKeywordStats(): Promise<KeywordScore[]> {
  try {
    const { q } = await import("@/lib/db.server");
    return await q<KeywordScore>(
      `SELECT * FROM keyword_scores
       ORDER BY
         CASE WHEN pool = 'proven' THEN 3
              WHEN pool = 'ai_discovered' THEN 2
              WHEN pool = 'experimental' THEN 1
              ELSE 0 END DESC,
         score DESC
       LIMIT 100`
    );
  } catch {
    return [];
  }
}
