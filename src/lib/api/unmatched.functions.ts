import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listUnmatchedPayments = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const offset = (data.page - 1) * data.pageSize;
    return q<any>(
      `SELECT id, amount_paise, utr, payer_upi, raw_payload, reason, created_at
       FROM unmatched_payments
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [data.pageSize, offset],
    );
  });
