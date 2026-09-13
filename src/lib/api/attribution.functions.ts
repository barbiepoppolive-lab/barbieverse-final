// src/lib/api/attribution.functions.ts
// Attribution chain: Meta click → lead → poppo_host_id

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";

/**
 * Mint a first-party bv_click_id and record the click.
 * Called on first load of /join page.
 */
export const recordJoinClick = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        fbclid: z.string().max(200).optional(),
        bv_cid: z.string().max(40).optional(),
        bv_asid: z.string().max(40).optional(),
        bv_adid: z.string().max(40).optional(),
        utm_source: z.string().max(80).optional(),
        utm_medium: z.string().max(80).optional(),
        utm_campaign: z.string().max(200).optional(),
        utm_content: z.string().max(200).optional(),
        landing_path: z.string().max(300).default("/join"),
        user_agent: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");
    const bv_click_id = randomUUID();

    await q1(
      `INSERT INTO attribution_clicks
         (bv_click_id, fbclid, bv_campaign_id, bv_adset_id, bv_ad_id,
          utm_source, utm_medium, utm_campaign, utm_content,
          landing_path, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        bv_click_id,
        data.fbclid ?? null,
        data.bv_cid ?? null,
        data.bv_asid ?? null,
        data.bv_adid ?? null,
        data.utm_source ?? null,
        data.utm_medium ?? null,
        data.utm_campaign ?? null,
        data.utm_content ?? null,
        data.landing_path,
        data.user_agent ?? null,
      ],
    );

    return { bv_click_id };
  });

/**
 * Submit a join application linked to a bv_click_id.
 * Only after this succeeds is the Poppo invite link revealed.
 */
export const submitJoinApplication = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        bv_click_id: z.string().uuid(),
        name: z.string().min(1).max(120),
        mobile_number: z
          .string()
          .trim()
          .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid mobile number"),
        whatsapp_number: z.string().max(20).optional().or(z.literal("")),
        upi_id: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID"),
        platform: z.enum(["poppo", "vone"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q, q1 } = await import("../db.server");
    const mobile = data.mobile_number.replace(/[^\d+]/g, "");
    const whatsapp = data.whatsapp_number ? data.whatsapp_number.replace(/[^\d+]/g, "") : null;

    // Check for duplicate mobile or UPI
    const dupe = await q1<{ id: string }>(
      `SELECT id FROM attribution_leads
        WHERE mobile_number = $1 OR lower(upi_id) = lower($2)
        LIMIT 1`,
      [mobile, data.upi_id],
    );
    if (dupe) {
      return {
        ok: false as const,
        message: "An application with these details already exists.",
      };
    }

    // Generate application ID
    let application_id = "";
    for (let i = 0; i < 12; i++) {
      const n = 10000 + Math.floor(Math.random() * 89999);
      const id = `BV-${n}`;
      const exists = await q1(`SELECT 1 FROM attribution_leads WHERE application_id = $1`, [id]);
      if (!exists) {
        application_id = id;
        break;
      }
    }
    if (!application_id) application_id = `BV-${Date.now().toString().slice(-6)}`;

    await q(
      `INSERT INTO attribution_leads
         (application_id, bv_click_id, name, mobile_number, whatsapp_number,
          upi_id, platform)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        application_id,
        data.bv_click_id,
        data.name,
        mobile,
        whatsapp,
        data.upi_id,
        data.platform,
      ],
    );

    return {
      ok: true as const,
      application_id,
      invite_link: "https://poppoapp.com/agency/2517496",
    };
  });

/**
 * Attach a Poppo host ID to an existing lead.
 * Called from /track-application after the user provides their host details.
 */
export const attachPoppoHostId = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        application_id: z.string().min(3),
        poppo_host_id: z.string().min(1).max(40),
        poppo_host_code: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");

    const lead = await q1<any>(
      `SELECT id, application_id FROM attribution_leads WHERE application_id = $1`,
      [data.application_id],
    );
    if (!lead) {
      return {
        ok: false as const,
        message: "Application not found. Please check your Application ID.",
      };
    }

    // Check if host ID is already attached to another lead
    const existing = await q1<any>(
      `SELECT application_id FROM attribution_leads
        WHERE poppo_host_id = $1 AND application_id != $2`,
      [data.poppo_host_id, data.application_id],
    );
    if (existing) {
      return {
        ok: false as const,
        message: `This Host ID is already linked to application ${existing.application_id}.`,
      };
    }

    await q1(
      `UPDATE attribution_leads
         SET poppo_host_id = $1,
             poppo_host_code = $2,
             host_verified_at = now(),
             updated_at = now()
       WHERE application_id = $3`,
      [data.poppo_host_id, data.poppo_host_code ?? null, data.application_id],
    );

    return { ok: true as const, application_id: data.application_id };
  });
