// src/lib/api/settings.functions.ts
// Admin-configurable settings for Creator Acquisition System

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const settingSchema = z.object({
  key: z.string().min(3).max(200),
  value: z.string().max(2000),
  category: z.string().optional(),
  description: z.string().optional(),
});

const settingKeySchema = z.string().min(3).max(200);

// Keys that are safe for public consumption
const PUBLIC_SETTING_KEYS = new Set([
  "hero_eyebrow", "hero_name", "hero_title", "hero_subtitle", "hero_intro", "hero_signature", "hero_photo_url",
  "hero_cta_primary_text", "hero_cta_primary_link", "hero_cta_secondary_text", "hero_cta_secondary_link",
  "hero_trust_badges", "vip_tiers", "vip_support_text", "vip_cta_text",
  "coin_package_1", "coin_package_2", "coin_package_3", "coin_package_4",
  "testimonials_json", "homepage_announcement",
  "poppo_referral_url", "vone_referral_url",
  "creator_intent_option_1_label", "creator_intent_option_2_label",
  "creator_intent_option_3_label", "creator_intent_option_4_label",
  "upi_payee_name",
  "contact_general_label", "contact_general_value", "contact_creator_label", "contact_creator_value",
  "contact_recharge_label", "contact_recharge_value", "contact_business_label", "contact_business_value",
  "contact_response_time",
  "policy_privacy", "policy_terms", "policy_creator_reward", "policy_recharge",
]);

// Admin-only keys (sensitive)
const ADMIN_SETTING_KEYS = new Set([
  "upi_id", "usdt_network", "usdt_wallet_address", "usdt_inr_rate",
  "bank_account_name", "bank_account_number", "bank_ifsc", "bank_name", "bank_branch",
  "admin_whatsapp", "interakt_webhook_url", "interakt_webhook",
  "brevo_sender_email", "brevo_sender_name",
  "refund_msg", "usdt_confirm_msg", "netbank_confirm_msg",
]);

/**
 * Get public-only settings (safe to expose to anyone)
 */
export const getPublicSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { q } = await import("../db.server");
    const keys = Array.from(PUBLIC_SETTING_KEYS);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
    const rows = await q(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
      keys,
    );
    const result: Record<string, string> = {};
    rows.forEach((row: any) => {
      result[row.key] = row.value;
    });
    return result;
  });

/**
 * Get all settings with optional filtering
 * Admin-only - returns all settings including sensitive ones
 */
export const getSettings = createServerFn({ method: "GET" })
  .inputValidator((d) => 
    z.object({
      category: z.string().optional(),
      keys: z.array(z.string()).optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    
    let sql = "SELECT key, value, category, description FROM settings";
    const params: any[] = [];
    const where: string[] = [];

    if (data.category) {
      where.push(`category = $${params.length + 1}`);
      params.push(data.category);
    }

    if (data.keys && data.keys.length > 0) {
      const placeholders = data.keys.map((_, i) => `$${params.length + 1 + i}`).join(",");
      where.push(`key IN (${placeholders})`);
      params.push(...data.keys);
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += " ORDER BY category, key";
    const rows = await q(sql, params);
    
    // Convert to key-value object for easier consumption
    const result: Record<string, string> = {};
    rows.forEach((row: any) => {
      result[row.key] = row.value;
    });
    
    return result;
  });

/**
 * Get all settings (admin only) - used by admin dashboard pages
 */
export const getAllSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const rows = await q<{ key: string; value: string }>(
      "SELECT key, value FROM settings ORDER BY key",
    );
    const result: Record<string, string> = {};
    rows.forEach((r) => (result[r.key] = r.value));
    return result;
  });

/**
 * Get single setting by key
 */
export const getSetting = createServerFn({ method: "GET" })
  .inputValidator((d) => settingKeySchema.parse(d))
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");
    const row = await q1<{ value: string }>(
      "SELECT value FROM settings WHERE key = $1",
      [data]
    );
    return row?.value ?? null;
  });

/**
 * Update or insert setting (admin only)
 */
export const updateSetting = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      key: z.string().min(3).max(200),
      value: z.string().max(2000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    
    const { q } = await import("../db.server");
    
    await q(
      `INSERT INTO settings (key, value, category, description)
       VALUES ($1, $2, 'creator_acquisition', NULL)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [data.key, data.value]
    );

    return { ok: true };
  });

/**
 * Get all referral URLs (public)
 */
export const getReferralUrls = createServerFn({ method: "GET" })
  .handler(async () => {
    const { q } = await import("../db.server");
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN ($1, $2)`,
      ["poppo_referral_url", "vone_referral_url"],
    );
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    return {
      poppo: map.poppo_referral_url || "https://poppo.live/register?agency=barbieverse",
      vone: map.vone_referral_url || "https://vone.live/register?agency=barbieverse",
    };
  });

/**
 * Get all intent options configured in admin (public)
 */
export const getIntentOptions = createServerFn({ method: "GET" })
  .handler(async () => {
    const { q } = await import("../db.server");
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key = ANY($1::text[])`,
      [["creator_intent_option_1_label", "creator_intent_option_2_label",
        "creator_intent_option_3_label", "creator_intent_option_4_label"]],
    );
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    
    return [
      { label: map.creator_intent_option_1_label || "I want to claim the ₹500 reward only", value: "reward_only" },
      { label: map.creator_intent_option_2_label || "I want to start streaming seriously", value: "serious" },
      { label: map.creator_intent_option_3_label || "I am already streaming, need agency support", value: "existing" },
      { label: map.creator_intent_option_4_label || "Just curious, exploring options", value: "curious" },
    ];
  });

/**
 * Get WhatsApp message template by type
 */
export const getWhatsAppMessage = createServerFn({ method: "GET" })
  .inputValidator((d) => z.enum([
    "signup_reward_only",
    "signup_serious", 
    "signup_existing",
    "signup_curious",
    "verified",
    "approved",
    "rejected"
  ]).parse(d))
  .handler(async ({ data }) => {
    const keyMap: Record<string, string> = {
      "signup_reward_only": "whatsapp_msg_signup_reward_only",
      "signup_serious": "whatsapp_msg_signup_serious",
      "signup_existing": "whatsapp_msg_signup_existing",
      "signup_curious": "whatsapp_msg_signup_curious",
      "verified": "whatsapp_msg_verified",
      "approved": "whatsapp_msg_approved",
      "rejected": "whatsapp_msg_rejected",
    };
    
    const result = await getSetting(keyMap[data]);
    return result || "";
  });
