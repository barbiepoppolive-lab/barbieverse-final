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
    (l.last_inbound_at is not null
        and now() - l.last_inbound_at > interval '48 hours'
        and l.stage not in ('ACTIVE','NOT_INTERESTED')) as is_stale
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
              when l.escalated or is_stale then 2
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
      process.env.WA_BOT_URL || "https://wa-bot-production-da76.up.railway.app";
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
