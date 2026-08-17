import { createServerFn } from "@tanstack/react-start";

// Derived column mapping the Dashboard renders to answer "where stuck".
// Kept in SQL so the dashboard never ships a stage w/ no explanation.
const NEXTCUE_SQL = `
  case
    when l.stage in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE') then 'Converted'
    when l.stage = 'NOT_INTERESTED' then 'Said no'
    when l.stage = 'STALLED' then 'Chase exhausted / blocked'
    when l.stage = 'ESCALATED' then 'Escalated to Barbie'
    when l.stage = 'NEW' then 'First message only'
    when l.stage = 'ASKED' then 'Answering questions'
    when l.stage = 'LINK_SENT' then 'Waiting for install'
    when l.stage = 'INSTALLING' then 'Installing now'
    when l.stage = 'INSTALLED' then 'Waiting for agency screenshot'
    else 'In progress'
  end
`;

const IS_STALE_SQL = `(l.last_inbound_at is not null and now() - l.last_inbound_at > interval '48 hours' and l.stage not in ('ACTIVE','NOT_INTERESTED'))`;

export const LIST_LEADS_SQL = `
  select
    l.id,
    l.phone,
    l.display_name,
    l.stage,
    l.source,
    l.language,
    l.escalated,
    l.escalated_reason,
    l.human_takeover,
    l.agency_verified_at,
    l.face_verified_at,
    l.first_live_at,
    l.created_at,
    l.last_inbound_at,
    l.last_outbound_at,
    l.window_expires_at,
    l.follow_up_due,
    l.follow_up_count,
    ${NEXTCUE_SQL} as next_cue,
    coalesce(d.pending_drafts, 0)::int as pending_drafts,
    w.last_in as last_message_in,
    w.last_out as last_message_out,
    ${IS_STALE_SQL} as is_stale
  from wa_leads l
  left join (
    select lead_id,
           count(*) filter (where decision is null) as pending_drafts
      from wa_drafts
     group by lead_id
  ) d on d.lead_id = l.id
  left join (
    select lead_id,
           max(created_at) filter (where direction = 'in') as last_in,
           max(created_at) filter (where direction = 'out') as last_out
      from wa_messages
     group by lead_id
  ) w on w.lead_id = l.id
`;

export const listWhatsappLeads = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const rows = await q<any>(
      `${LIST_LEADS_SQL} order by
         case when l.stage in ('ESCALATED') then 0
              when pending_drafts is not null and pending_drafts > 0 then 1
              when l.escalated or ${IS_STALE_SQL} then 2
              else 3 end,
         greatest(l.updated_at, l.created_at) desc`,
    );

    return { leads: rows };
  },
);

export const listHosts = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q } = await import("../db.server");

  const rows = await q<any>(
    `${LIST_LEADS_SQL}
        where l.stage in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE')
        order by
          case l.stage
            when 'ACTIVE' then 0 when 'FIRST_LIVE' then 1
            when 'FACE_VERIFIED' then 2 else 3 end,
          l.updated_at desc`,
  );

  return { hosts: rows };
});

export const listWhatsappPipeline = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    // pipeline by stage
    const byStage = await q<any>(
      `SELECT stage, count(*)::int AS count
         FROM wa_leads
        GROUP BY stage ORDER BY min(created_at)`,
    );

    // today's inbound / outbound counts
    const today = await q<any>(
      `SELECT direction, count(*)::int AS count
         FROM wa_messages
        WHERE created_at >= CURRENT_DATE
        GROUP BY direction`,
    );

    // unedited-send rate across all drafted-and-decided rows
    // A draft is "unedited" if it was sent without Barbie hand-editing it
    // first (was_edited=false). This is the metric that decides when a stage
    // is safe to auto-send: >85% across 100+ drafts → consider all-auto.
    const draftStats = await q<any>(
      `SELECT
         count(*) FILTER (WHERE decision = 'sent' AND final_text IS NOT NULL)::int AS sent_drafts,
         count(*) FILTER (WHERE decision = 'sent' AND was_edited = false)::int AS unedited_sends,
         count(*) FILTER (WHERE decision = 'sent' AND was_edited = true)::int AS edited_sends,
         count(*) FILTER (WHERE decision = 'skipped')::int AS skipped,
         count(*) FILTER (WHERE decision = 'takeover')::int AS takeovers,
         count(*) FILTER (WHERE decision IS NULL)::int AS pending,
         count(*)::int AS total
       FROM wa_drafts`,
    );

    // recent drafts with decisions, newest first
    const recent = await q<any>(
      `SELECT d.id, d.trigger_text, d.source, d.draft_text, d.final_text,
              d.decision, d.was_edited, d.media_tag, d.created_at, l.phone,
              l.display_name, l.stage
         FROM wa_drafts d JOIN wa_leads l ON l.id = d.lead_id
        ORDER BY d.created_at DESC LIMIT 50`,
    );

    const s = draftStats[0] || {};
    return {
      byStage,
      todaysMessages: today,
      draftStats: {
        sentDrafts: s.sent_drafts ?? 0,
        uneditedSends: s.unedited_sends ?? 0,
        editedSends: s.edited_sends ?? 0,
        skipped: s.skipped ?? 0,
        takeovers: s.takeovers ?? 0,
        pending: s.pending ?? 0,
        total: s.total ?? 0,
        uneditedRate: s.sent_drafts
          ? (s.unedited_sends / s.sent_drafts) * 100
          : null,
      },
      recent,
    };
  },
);

/** Update a lead's display name from the admin dashboard. */
export const updateLeadName = createServerFn({ method: "POST" })
  .validator((data: { phone: string; name: string }) => data)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const phone = data.phone.replace(/[^\d]/g, "");
    const name = data.name.trim();
    if (!phone || !name) return { ok: false, error: "phone and name required" };

    await q(
      `update wa_leads set display_name = $2, updated_at = now() where phone = $1`,
      [phone, name],
    );
    return { ok: true };
  });

/** Broadcast a message to all hosts via the Railway bot. */
export const broadcastToHosts = createServerFn({ method: "POST" })
  .validator((data: { message: string }) => data)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const message = data.message.trim();
    if (!message) return { ok: false, error: "message required" };

    // Get all host phones
    const hosts = await q<{ phone: string }>(
      `select phone from wa_leads
       where stage in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE')`,
    );
    if (!hosts.length) return { ok: false, error: "no hosts found" };

    const phones = hosts.map((h) => h.phone.replace(/[^\d]/g, ""));

    // Call the Railway bot's broadcast endpoint
    const botUrl =
      process.env.WA_BOT_URL ||
      "https://wa-auto-reply-production-d682.up.railway.app";
    const botKey = process.env.WA_BOT_KEY || "";
    try {
      const res = await fetch(`${botUrl}/broadcast?k=${botKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: err };
      }
      return { ok: true, total: phones.length };
    } catch (e: any) {
      return { ok: false, error: e?.message || "failed to reach bot" };
    }
  });

/** Get chat history for a specific lead. */
export const getLeadChatHistory = createServerFn({ method: "GET" })
  .validator((data: { phone: string }) => data)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const phone = data.phone.replace(/[^\d]/g, "");
    if (!phone) return { messages: [] };

    const rows = await q<any>(
      `SELECT m.direction, m.body, m.created_at
       FROM wa_messages m
       JOIN wa_leads l ON l.id = m.lead_id
       WHERE l.phone = $1 AND m.body IS NOT NULL AND m.body != ''
       ORDER BY m.created_at ASC`,
      [phone],
    );

    return { messages: rows };
  });

/** Grok cost monitor — aggregates grok_interactions for the dashboard. */
export const getGrokCosts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    // Overall totals
    const totals = await q<{
      total_calls: number;
      total_input_tokens: number;
      total_cached_tokens: number;
      total_output_tokens: number;
      total_errors: number;
      avg_latency_ms: number;
    }>(
      `SELECT
         count(*)::int AS total_calls,
         coalesce(sum(input_tokens), 0)::int AS total_input_tokens,
         coalesce(sum(cached_tokens), 0)::int AS total_cached_tokens,
         coalesce(sum(output_tokens), 0)::int AS total_output_tokens,
         sum(case when error is not null then 1 else 0 end)::int AS total_errors,
         coalesce(avg(latency_ms), 0)::int AS avg_latency_ms
       FROM grok_interactions`,
    );

    // Per-model breakdown
    const byModel = await q<{
      model: string;
      calls: number;
      input_tokens: number;
      cached_tokens: number;
      output_tokens: number;
      avg_latency_ms: number;
      errors: number;
    }>(
      `SELECT
         model,
         count(*)::int AS calls,
         coalesce(sum(input_tokens), 0)::int AS input_tokens,
         coalesce(sum(cached_tokens), 0)::int AS cached_tokens,
         coalesce(sum(output_tokens), 0)::int AS output_tokens,
         coalesce(avg(latency_ms), 0)::int AS avg_latency_ms,
         sum(case when error is not null then 1 else 0 end)::int AS errors
       FROM grok_interactions
       GROUP BY model ORDER BY calls DESC`,
    );

    // Today's stats
    const today = await q<{
      calls: number;
      input_tokens: number;
      cached_tokens: number;
      output_tokens: number;
      errors: number;
    }>(
      `SELECT
         count(*)::int AS calls,
         coalesce(sum(input_tokens), 0)::int AS input_tokens,
         coalesce(sum(cached_tokens), 0)::int AS cached_tokens,
         coalesce(sum(output_tokens), 0)::int AS output_tokens,
         sum(case when error is not null then 1 else 0 end)::int AS errors
       FROM grok_interactions
       WHERE created_at >= CURRENT_DATE`,
    );

    // Tool usage stats
    const toolUsage = await q<{
      tool_name: string;
      calls: number;
    }>(
      `SELECT
         tc->>'name' AS tool_name,
         count(*)::int AS calls
       FROM grok_interactions,
            jsonb_array_elements(tool_calls) AS tc
       WHERE tc->>'name' IS NOT NULL
       GROUP BY tc->>'name'
       ORDER BY calls DESC`,
    );

    // Cost estimate (grok-4.20-0309-non-reasoning pricing)
    const t = totals[0] || {};
    const totalInput = t.total_input_tokens || 0;
    const totalCached = t.total_cached_tokens || 0;
    const totalOutput = t.total_output_tokens || 0;
    const nonCachedInput = totalInput - totalCached;
    // $1.25/M input, $0.20/M cached input, $2.50/M output
    const costInput = (nonCachedInput / 1_000_000) * 1.25;
    const costCached = (totalCached / 1_000_000) * 0.2;
    const costOutput = (totalOutput / 1_000_000) * 2.5;
    const totalCost = costInput + costCached + costOutput;

    return {
      totals: t,
      byModel,
      today: today[0] || {},
      toolUsage,
      costEstimate: {
        input: costInput,
        cached: costCached,
        output: costOutput,
        total: totalCost,
      },
    };
  },
);

// ── Meta Ads: CSV spend import ───────────────────────────────────────────────
// Accepts the CSV export from Meta Ads Manager (or a simplified JSON format)
// and upserts into meta_ad_insights_daily. No developer account needed —
// just export from business.facebook.com/adsmanager/ads/reporting
export const importAdSpend = createServerFn({ method: "POST" })
  .validator(
    (data: {
      rows: Array<{
        date: string;
        campaign_name: string;
        ad_name?: string;
        spend: number;
        impressions: number;
        clicks: number;
        results?: number;
        ctr?: number;
        cpm?: number;
        cpc?: number;
      }>;
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    let imported = 0;
    for (const row of data.rows) {
      const campaignName = row.campaign_name?.trim();
      const spend = Number(row.spend) || 0;
      if (!campaignName || spend <= 0) continue;

      // Upsert campaign
      const campaignSlug = campaignName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 60);
      await q(
        `INSERT INTO meta_ad_campaigns (id, name, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (id) DO UPDATE SET name = $2`,
        [campaignSlug, campaignName],
      );

      // Upsert daily insight
      await q(
        `INSERT INTO meta_ad_insights_daily
           (date, campaign_id, ad_id, spend, impressions, clicks, results, ctr, cpm, cpc)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (date, campaign_id, ad_id) DO UPDATE SET
           spend = $4, impressions = $5, clicks = $6, results = $7,
           ctr = $8, cpm = $9, cpc = $10`,
        [
          row.date,
          campaignSlug,
          row.ad_name || "unknown",
          spend,
          Number(row.impressions) || 0,
          Number(row.clicks) || 0,
          Number(row.results) || 0,
          Number(row.ctr) || 0,
          Number(row.cpm) || 0,
          Number(row.cpc) || 0,
        ],
      );
      imported++;
    }

    return { ok: true, imported };
  });

// ── Meta Ads: ROI dashboard data ─────────────────────────────────────────────
// Joins ad spend against lead conversions to calculate cost-per-host.
export const getAdROI = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q } = await import("../db.server");

  // Total spend by campaign
  const spendByCampaign = await q<{
    campaign_id: string;
    campaign_name: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_leads: number;
    days: number;
  }>(
    `SELECT
       i.campaign_id,
       c.name as campaign_name,
       sum(i.spend)::numeric(10,2) as total_spend,
       sum(i.impressions)::int as total_impressions,
       sum(i.clicks)::int as total_clicks,
       coalesce(sum(i.results), 0)::int as total_leads,
       count(distinct i.date)::int as days
     FROM meta_ad_insights_daily i
     LEFT JOIN meta_ad_campaigns c ON c.id = i.campaign_id
     GROUP BY i.campaign_id, c.name
     ORDER BY sum(i.spend) DESC`,
  );

  // Total spend overall
  const totalSpend = await q<{ total: number }>(
    `SELECT coalesce(sum(spend), 0)::numeric(10,2) as total FROM meta_ad_insights_daily`,
  );

  // Leads per prefill_variant (attribution)
  const leadsByVariant = await q<{
    prefill_variant: string;
    count: number;
    converted: number;
  }>(
    `SELECT
       coalesce(prefill_variant, 'unknown') as prefill_variant,
       count(*)::int as count,
       count(*) filter (where stage in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE'))::int as converted
     FROM wa_leads
     WHERE prefill_variant IS NOT NULL
     GROUP BY prefill_variant
     ORDER BY count DESC`,
  );

  // Overall conversion stats
  const conversions = await q<{
    total_leads: number;
    converted: number;
  }>(
    `SELECT
       count(*)::int as total_leads,
       count(*) filter (where stage in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE'))::int as converted
     FROM wa_leads`,
  );

  const conv = conversions[0] || { total_leads: 0, converted: 0 };
  const spend = totalSpend[0]?.total || 0;

  return {
    spendByCampaign,
    totalSpend: spend,
    leadsByVariant,
    conversions: conv,
    costPerLead: conv.total_leads > 0 ? spend / conv.total_leads : 0,
    costPerConversion: conv.converted > 0 ? spend / conv.converted : 0,
    conversionRate: conv.total_leads > 0 ? (conv.converted / conv.total_leads) * 100 : 0,
  };
});
