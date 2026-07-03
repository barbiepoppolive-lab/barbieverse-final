// Lead Enrichment — Auto-fetch profile data when lead is created
// Fetches Instagram/social data for leads with usernames

import { ApifyScraper } from "@/lib/scraper/providers/apify";
import { detectPlatform } from "@/lib/scraper/scraper-abstraction";

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: process.env.DB_SSL_INSECURE === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return dbPool;
}

export interface EnrichmentResult {
  success: boolean;
  profile?: {
    username: string;
    display_name?: string;
    bio?: string;
    followers?: number;
    following?: number;
    posts_count?: number;
    is_verified?: boolean;
    is_business?: boolean;
    profile_pic_url?: string;
    external_url?: string;
  };
  error?: string;
}

// ── Extract Username from Instagram URL or Handle ──────

function extractInstagramUsername(input: string): string | null {
  if (!input) return null;

  // Direct username (no URL)
  if (/^[a-zA-Z0-9_.]+$/.test(input.trim())) {
    return input.trim();
  }

  // Instagram URL
  const urlMatch = input.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  if (urlMatch) return urlMatch[1];

  // Handle with @
  if (input.startsWith("@")) return input.slice(1);

  return null;
}

// ── Enrich a Single Lead ───────────────────────────────

export async function enrichLead(
  leadId: string,
  instagramInput?: string,
  platformHint?: string
): Promise<EnrichmentResult> {
  const db = await getDb();

  // Get the lead
  const leadResult = await db.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  if (leadResult.rows.length === 0) {
    return { success: false, error: "Lead not found" };
  }

  const lead = leadResult.rows[0];
  const instagram = instagramInput || lead.instagram || "";

  const username = extractInstagramUsername(instagram);
  if (!username) {
    return { success: false, error: "No valid Instagram username found" };
  }

  // Check if already enriched
  if (lead.followers && lead.followers > 0) {
    return { success: true, profile: { username, followers: lead.followers } };
  }

  try {
    const scraper = new ApifyScraper();
    if (!scraper.isConfigured()) {
      return { success: false, error: "Apify not configured" };
    }

    const profiles = await scraper.scrapeProfiles("instagram", [
      `https://instagram.com/${username}`,
    ]);

    if (profiles.length === 0) {
      return { success: false, error: "Profile not found or private" };
    }

    const profile = profiles[0];

    // Update lead with enriched data
    await db.query(
      `UPDATE leads SET
        followers = $1,
        following = $2,
        posts_count = $3,
        is_verified = $4,
        is_business = $5,
        bio = $6,
        profile_pic_url = $7,
        external_url = $8,
        enriched_at = NOW()
       WHERE id = $9`,
      [
        profile.followers || 0,
        profile.following || 0,
        profile.posts_count || 0,
        profile.is_verified || false,
        profile.is_business || false,
        profile.bio || "",
        profile.profile_pic_url || "",
        profile.external_url || "",
        leadId,
      ]
    );

    return {
      success: true,
      profile: {
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        posts_count: profile.posts_count,
        is_verified: profile.is_verified,
        is_business: profile.is_business,
        profile_pic_url: profile.profile_pic_url,
        external_url: profile.external_url,
      },
    };
  } catch (err: any) {
    console.error(`[enrichment] Failed for ${username}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Batch Enrich Multiple Leads ────────────────────────

export async function batchEnrichLeads(
  leadIds: string[]
): Promise<{ enriched: number; failed: number; skipped: number }> {
  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (const leadId of leadIds) {
    const result = await enrichLead(leadId);
    if (result.success) enriched++;
    else if (result.error === "Lead not found" || result.error === "No valid Instagram username found") skipped++;
    else failed++;

    // Rate limit: 1 request per 2 seconds
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { enriched, failed, skipped };
}

// ── Enrich All Unenriched Leads ────────────────────────

export async function enrichAllUnenriched(): Promise<{
  enriched: number;
  failed: number;
  skipped: number;
}> {
  const db = await getDb();

  // Find leads with Instagram but no follower data
  const result = await db.query(`
    SELECT id, instagram FROM leads
    WHERE instagram IS NOT NULL
    AND instagram != ''
    AND (followers IS NULL OR followers = 0)
    AND (enriched_at IS NULL OR enriched_at < NOW() - INTERVAL '7 days')
    ORDER BY created_at DESC
    LIMIT 50
  `);

  if (result.rows.length === 0) {
    return { enriched: 0, failed: 0, skipped: 0 };
  }

  return batchEnrichLeads(result.rows.map((r: any) => r.id));
}
