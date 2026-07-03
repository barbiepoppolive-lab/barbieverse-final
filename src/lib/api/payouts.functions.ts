import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listEligiblePayouts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(1000).default(500),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const offset = (data.page - 1) * data.pageSize;
    return q(
      `SELECT id, application_id, mobile_number, upi_id, platform, status,
              reward_status, paid_at, payout_reference, created_at
         FROM creator_leads
        WHERE reward_status IN ('Approved','Pending Review','Paid')
        ORDER BY (reward_status = 'Paid') ASC, created_at DESC
        LIMIT $1 OFFSET $2`,
      [data.pageSize, offset],
    );
  });

export const markPayoutsPaid = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        reference: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(
      `UPDATE creator_leads
          SET reward_status = 'Paid',
              status = CASE WHEN status NOT IN ('Reward Paid','Rejected') THEN 'Reward Paid' ELSE status END,
              paid_at = COALESCE(paid_at, now()),
              payout_reference = COALESCE($2, payout_reference)
        WHERE id = ANY($1::uuid[])`,
      [data.ids, data.reference ?? null],
    );
    return { ok: true, count: data.ids.length };
  });

export const liveCreatorStats = createServerFn({ method: "GET" }).handler(async () => {
  const { q1 } = await import("../db.server");
  const row = await q1<{ today: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS today,
       COUNT(*)::int AS total
     FROM creator_leads`,
  );
  return row ?? { today: 0, total: 0 };
});

// Renamed from "liveCreatorStats" to "creatorStats" in UI to avoid confusion
// This actually counts total creators, not currently-live streamers
