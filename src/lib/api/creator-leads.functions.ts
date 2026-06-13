// src/lib/api/creator-leads.functions.ts
// UPDATED: Creator leads API with intent-based segmentation and UGC support

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid mobile number");

const upiSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID (e.g. name@bank)");

const intentSchema = z.enum(["reward_only", "serious", "existing", "curious"]);

function normalizeMobile(v: string) {
  return v.replace(/[^\d+]/g, "");
}

async function generateApplicationId(q: any): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const n = 10000 + Math.floor(Math.random() * 89999);
    const id = `BV-${n}`;
    const rows = await q(`SELECT 1 FROM creator_leads WHERE application_id = $1 LIMIT 1`, [id]);
    if (rows.length === 0) return id;
  }
  return `BV-${Date.now().toString().slice(-6)}`;
}

/**
 * Submit creator lead with intent selection
 * This is the main entry point for the signup flow
 */
export const submitCreatorLead = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        mobile_number: mobileSchema,
        whatsapp_number: z.string().trim().max(20).optional().or(z.literal("")),
        upi_id: upiSchema,
        platform: z.enum(["poppo", "vone"]),
        intent: intentSchema,
        lead_source: z.string().trim().max(60).optional(),
        landing_page: z.string().trim().max(200).optional(),
        utm_source: z.string().trim().max(80).optional(),
        utm_campaign: z.string().trim().max(80).optional(),
        referral_code: z.string().trim().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q, q1 } = await import("../db.server");
    const mobile = normalizeMobile(data.mobile_number);
    const whatsapp = data.whatsapp_number ? normalizeMobile(data.whatsapp_number) : null;
    const upi = data.upi_id.trim();

    // Check for duplicates
    const dupe = await q1<{ application_id: string }>(
      `SELECT application_id FROM creator_leads
        WHERE mobile_number = $1 OR lower(upi_id) = lower($2)
        LIMIT 1`,
      [mobile, upi],
    );
    if (dupe) {
      return {
        ok: false as const,
        duplicate: true,
        message:
          "We already have an active application associated with these details. Please contact support if you need assistance.",
      };
    }

    const application_id = await generateApplicationId(q);
    const segment_priority = data.intent === "existing";

    await q(
      `INSERT INTO creator_leads
         (application_id, mobile_number, whatsapp_number, upi_id, platform, intent,
          lead_source, landing_page, utm_source, utm_campaign, referral_code, segment_priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        application_id,
        mobile,
        whatsapp,
        upi,
        data.platform,
        data.intent,
        data.lead_source ?? "homepage_carousel",
        data.landing_page ?? null,
        data.utm_source ?? null,
        data.utm_campaign ?? null,
        data.referral_code ?? null,
        segment_priority,
      ],
    );

    // Send welcome WhatsApp message based on intent
    try {
      const { sendCreatorWelcome } = await import("../creator-notifications.server");
      await sendCreatorWelcome({
        to: whatsapp ?? mobile,
        application_id,
        platform: data.platform,
        intent: data.intent,
      });
    } catch (e) {
      console.error("[creator welcome notify]", e);
    }

    return { ok: true as const, application_id, platform: data.platform, intent: data.intent };
  });

/**
 * List creator leads with filtering by status, intent, and UGC verification
 */
export const listCreatorLeads = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        status: z.string().default("all"),
        intent: z.string().default("all"),
        ugc_verified: z.enum(["all", "verified", "pending", "rejected"]).default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(1000).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const where: string[] = [];
    const params: any[] = [];

    if (data.status !== "all") {
      params.push(data.status);
      where.push(`status = $${params.length}`);
    }

    if (data.intent !== "all") {
      params.push(data.intent);
      where.push(`intent = $${params.length}`);
    }

    if (data.ugc_verified !== "all") {
      if (data.ugc_verified === "verified") {
        where.push(`ugc_verified = true`);
      } else if (data.ugc_verified === "pending") {
        where.push(`ugc_submitted_at IS NOT NULL AND ugc_verified = false`);
      } else if (data.ugc_verified === "rejected") {
        where.push(`reward_status = 'Rejected'`);
      }
    }

    const offset = (data.page - 1) * data.pageSize;
    const sql = `SELECT * FROM creator_leads ${
      where.length ? "WHERE " + where.join(" AND ") : ""
    } ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    return q(sql, [...params, data.pageSize, offset]);
  });

/**
 * Get analytics stats for creator leads
 */
export const creatorLeadStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");

    const stats = await q(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE platform = 'poppo') as poppo,
        COUNT(*) FILTER (WHERE platform = 'vone') as vone,
        COUNT(*) FILTER (WHERE ugc_submitted_at IS NOT NULL AND ugc_verified = false) as pending_verification,
        COUNT(*) FILTER (WHERE reward_status = 'Approved') as pending_rewards,
        COUNT(*) FILTER (WHERE reward_status = 'Paid') as rewards_paid,
        COUNT(*) FILTER (WHERE intent = 'reward_only') as intent_reward_only,
        COUNT(*) FILTER (WHERE intent = 'serious') as intent_serious,
        COUNT(*) FILTER (WHERE intent = 'existing') as intent_existing,
        COUNT(*) FILTER (WHERE intent = 'curious') as intent_curious
      FROM creator_leads
    `);

    return stats[0] || {};
  });

/**
 * Update creator lead (admin only)
 */
export const updateCreatorLead = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.string().optional(),
        reward_status: z.string().optional(),
        notes: z.string().optional(),
        ugc_verified: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q, q1 } = await import("../db.server");

    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      params.push(data.status);
      updates.push(`status = $${params.length}`);
    }
    if (data.reward_status !== undefined) {
      params.push(data.reward_status);
      updates.push(`reward_status = $${params.length}`);
    }
    if (data.notes !== undefined) {
      params.push(data.notes);
      updates.push(`notes = $${params.length}`);
    }
    if (data.ugc_verified !== undefined) {
      params.push(data.ugc_verified);
      updates.push(`ugc_verified = $${params.length}`);
    }

    updates.push(`updated_at = now()`);
    params.push(data.id);

    if (updates.length === 1) {
      return { ok: false, error: "No fields to update" };
    }

    const sql = `UPDATE creator_leads SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`;
    const updated = await q1(sql, params);

    return { ok: true, data: updated };
  });

/**
 * Submit UGC screenshot for verification
 */
export const submitUgcScreenshot = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        mobile_number: mobileSchema,
        screenshot_url: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");
    const mobile = normalizeMobile(data.mobile_number);

    // Find existing lead
    const lead = await q1<any>(
      `SELECT id, application_id, whatsapp_number, intent FROM creator_leads 
       WHERE mobile_number = $1`,
      [mobile]
    );

    if (!lead) {
      return {
        ok: false,
        error: "We could not find your registration. Please join first at /join",
      };
    }

    // Validate screenshot via Claude Vision
    try {
      const { validateUgcScreenshot } = await import("./ugc-validation.functions");
      const validation = await validateUgcScreenshot({ data: { screenshot_url: data.screenshot_url } });

      if ((validation as any).ok !== false && (validation as any).valid) {
        // Update lead
        await updateCreatorLead({
          data: {
            id: lead.id,
            ugc_verified: true,
          },
        });

        // Update additional fields separately
        const { q } = await import("../db.server");
        await q(
          `UPDATE creator_leads SET 
             ugc_submitted_at = now(),
             ugc_screenshot_url = $1,
             status = 'Story Uploaded',
             reward_status = 'Pending Review'
           WHERE id = $2`,
          [data.screenshot_url, lead.id]
        );

        // Send verified message
        try {
          const { sendVerificationMessage } = await import("../creator-notifications.server");
          await sendVerificationMessage({
            to: lead.whatsapp_number || mobile,
            application_id: lead.application_id,
          });
        } catch (e) {
          console.error("[verification message]", e);
        }

        return { ok: true, message: "Screenshot verified! Pending admin approval." };
      } else {
        return {
          ok: false,
          error: (validation as any).reason || "Screenshot did not meet requirements",
          checks: validation,
        };
      }
    } catch (e: any) {
      console.error("[UGC validation error]", e);
      return {
        ok: false,
        error: "Validation service error. Please try again.",
      };
    }
  });

/**
 * Approve creator reward (admin)
 */
export const approveCreatorReward = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q1 } = await import("../db.server");
    const lead = await q1<any>(
      `SELECT id, whatsapp_number, mobile_number, application_id, upi_id FROM creator_leads WHERE id = $1`,
      [data.id]
    );

    if (!lead) {
      return { ok: false, error: "Lead not found" };
    }

    // Update reward status
    await updateCreatorLead({
      data: {
        id: data.id,
        reward_status: "Approved",
        status: "Reward Eligible",
      },
    });

    // Send approval message
    try {
      const { sendApprovalMessage } = await import("../creator-notifications.server");
      await sendApprovalMessage({
        to: lead.whatsapp_number || lead.mobile_number,
        application_id: lead.application_id,
        upi_id: lead.upi_id,
      });
    } catch (e) {
      console.error("[approval message]", e);
    }

    return { ok: true };
  });

/**
 * Track creator application by ID or mobile number
 */
export const trackCreatorApplication = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        query: z.string().min(3),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");
    let lead: any = null;

    // Try to find by application_id first (format: BV-12345)
    if (/^BV-\d+$/.test(data.query)) {
      lead = await q1<any>(
        `SELECT * FROM creator_leads WHERE application_id = $1`,
        [data.query]
      );
    } else {
      // Try to find by mobile number
      const mobile = data.query.replace(/[^\d+]/g, "");
      lead = await q1<any>(
        `SELECT * FROM creator_leads WHERE mobile_number = $1`,
        [mobile]
      );
    }

    if (!lead) {
      return {
        ok: false as const,
        message: "We could not find an application with this ID or mobile number.",
      };
    }

    return {
      ok: true as const,
      lead,
    };
  });
