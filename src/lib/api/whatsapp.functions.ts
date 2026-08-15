import { createServerFn } from "@tanstack/react-start";

export const listWhatsappPipeline = createServerFn({ method: "GET" })
  .handler(async () => {
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
        uneditedRate: s.sent_drafts ? (s.unedited_sends / s.sent_drafts) * 100 : null,
      },
      recent,
    };
  });
