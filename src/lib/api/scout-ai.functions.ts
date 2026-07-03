// Scout AI Server Functions — Lead intelligence API

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool } from "@/lib/db.server";
import {
  scoreLead,
  scoreLeadsBatch,
  discoverLeadFromProfile,
  recommendOutreach,
  generateDailyBriefing,
  type LeadProfile,
} from "@/lib/ai/modules/scout-ai";

// ── Score a Single Lead ────────────────────────────────

export const scoreCreatorLead = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        lead_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const pool = pool;

    // Fetch lead from creator_leads table
    const leadResult = await pool.query(
      "SELECT * FROM creator_leads WHERE id = $1",
      [data.lead_id],
    );

    if (leadResult.rows.length === 0) {
      throw new Error("Lead not found");
    }

    const row = leadResult.rows[0];
    const lead: LeadProfile = {
      id: row.id,
      name: row.notes?.split("\n")[0] || undefined,
      mobile: row.mobile_number,
      platform: row.platform,
      intent: row.intent,
      status: row.status,
      ugc_verified: row.ugc_verified,
      notes: row.notes,
    };

    // Score the lead
    const score = await scoreLead(lead);

    // Save score to database
    await pool.query(
      `INSERT INTO lead_scores (lead_id, score, category, reasoning)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lead_id) DO UPDATE SET
         score = EXCLUDED.score,
         category = EXCLUDED.category,
         reasoning = EXCLUDED.reasoning,
         scored_at = NOW()`,
      [data.lead_id, score.score, score.category, score.reasoning],
    );

    return {
      lead_id: data.lead_id,
      score,
    };
  });

// ── Score All Unsored Leads ────────────────────────────

export const scoreAllUnscoredLeads = createServerFn({ method: "POST" })
  .handler(async () => {
    const pool = pool;

    // Get leads without scores
    const unscoredResult = await pool.query(`
      SELECT cl.* FROM creator_leads cl
      LEFT JOIN lead_scores ls ON cl.id = ls.lead_id
      WHERE ls.id IS NULL
      ORDER BY cl.created_at DESC
      LIMIT 50
    `);

    const leads: LeadProfile[] = unscoredResult.rows.map((row: any) => ({
      id: row.id,
      name: row.notes?.split("\n")[0] || undefined,
      mobile: row.mobile_number,
      platform: row.platform,
      intent: row.intent,
      status: row.status,
      ugc_verified: row.ugc_verified,
      notes: row.notes,
    }));

    if (leads.length === 0) {
      return { scored: 0, message: "All leads already scored" };
    }

    // Batch score
    const scores = await scoreLeadsBatch(leads);

    // Save all scores
    for (const [leadId, score] of scores) {
      await pool.query(
        `INSERT INTO lead_scores (lead_id, score, category, reasoning)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (lead_id) DO UPDATE SET
           score = EXCLUDED.score,
           category = EXCLUDED.category,
           reasoning = EXCLUDED.reasoning,
           scored_at = NOW()`,
        [leadId, score.score, score.category, score.reasoning],
      );
    }

    // Count by category
    const categories = { hot: 0, warm: 0, cold: 0 };
    scores.forEach((score) => {
      categories[score.category]++;
    });

    return {
      scored: leads.length,
      categories,
    };
  });

// ── Get Lead Score ─────────────────────────────────────

export const getLeadScore = createServerFn({ method: "GET" })
  .validator((d) =>
    z
      .object({
        lead_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const pool = pool;
    const result = await pool.query(
      "SELECT * FROM lead_scores WHERE lead_id = $1",
      [data.lead_id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  });

// ── Get Lead Scores Dashboard ──────────────────────────

export const getScoutDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const pool = pool;

    // Get score distribution
    const distribution = await pool.query(`
      SELECT category, COUNT(*) as count, AVG(score)::INTEGER as avg_score
      FROM lead_scores
      GROUP BY category
    `);

    // Get top hot leads
    const hotLeads = await pool.query(`
      SELECT cl.*, ls.score, ls.category, ls.reasoning
      FROM creator_leads cl
      JOIN lead_scores ls ON cl.id = ls.lead_id
      WHERE ls.category = 'hot'
      ORDER BY ls.score DESC
      LIMIT 10
    `);

    // Get recently scored
    const recent = await pool.query(`
      SELECT cl.*, ls.score, ls.category
      FROM creator_leads cl
      JOIN lead_scores ls ON cl.id = ls.lead_id
      ORDER BY ls.scored_at DESC
      LIMIT 20
    `);

    // Get unscored count
    const unscored = await pool.query(`
      SELECT COUNT(*) as count FROM creator_leads cl
      LEFT JOIN lead_scores ls ON cl.id = ls.lead_id
      WHERE ls.id IS NULL
    `);

    return {
      distribution: distribution.rows,
      hot_leads: hotLeads.rows,
      recently_scored: recent.rows,
      unscored_count: parseInt(unscored.rows[0].count),
    };
  });

// ── Discover Lead from Profile ─────────────────────────

export const discoverLead = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        profile_data: z.string().min(10),
        source: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const discovery = await discoverLeadFromProfile(
      data.profile_data,
      data.source || "manual",
    );

    return discovery;
  });

// ── Get Outreach Plan ──────────────────────────────────

export const getOutreachPlan = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        lead_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const pool = pool;

    // Fetch lead
    const leadResult = await pool.query(
      "SELECT * FROM creator_leads WHERE id = $1",
      [data.lead_id],
    );

    if (leadResult.rows.length === 0) {
      throw new Error("Lead not found");
    }

    const row = leadResult.rows[0];
    const lead: LeadProfile = {
      id: row.id,
      name: row.notes?.split("\n")[0] || undefined,
      mobile: row.mobile_number,
      platform: row.platform,
      intent: row.intent,
      status: row.status,
      ugc_verified: row.ugc_verified,
      notes: row.notes,
    };

    // Get or create score
    let scoreResult = await pool.query(
      "SELECT * FROM lead_scores WHERE lead_id = $1",
      [data.lead_id],
    );

    let score;
    if (scoreResult.rows.length > 0) {
      const s = scoreResult.rows[0];
      score = {
        score: s.score,
        category: s.category as "hot" | "warm" | "cold",
        reasoning: s.reasoning,
        factors: { follower_quality: 50, engagement_potential: 50, niche_match: 50, activity_level: 50, platform_fit: 50 },
        recommended_action: "",
      };
    } else {
      score = await scoreLead(lead);
    }

    const plan = await recommendOutreach(lead, score);

    return plan;
  });

// ── Daily Briefing ─────────────────────────────────────

export const getDailyBriefing = createServerFn({ method: "GET" })
  .handler(async () => {
    const pool = pool;

    // Get recent leads with scores
    const result = await pool.query(`
      SELECT cl.*, ls.score, ls.category
      FROM creator_leads cl
      LEFT JOIN lead_scores ls ON cl.id = ls.lead_id
      ORDER BY cl.created_at DESC
      LIMIT 50
    `);

    const leads: LeadProfile[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.notes?.split("\n")[0] || undefined,
      platform: row.platform,
      intent: row.intent,
      status: row.status,
    }));

    const scores = new Map(
      result.rows
        .filter((r: any) => r.score != null)
        .map((r: any) => [
          r.id,
          {
            score: r.score,
            category: r.category,
            reasoning: "",
            factors: { follower_quality: 50, engagement_potential: 50, niche_match: 50, activity_level: 50, platform_fit: 50 },
            recommended_action: "",
          },
        ]),
    );

    const briefing = await generateDailyBriefing(leads, scores);

    return { briefing };
  });
