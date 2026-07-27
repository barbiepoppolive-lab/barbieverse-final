// Meta Marketing API scaffold — NOT wired to anything yet.
//
// This is deliberately a stub, not a working integration, because none of
// its prerequisites exist yet:
//   1. A Meta Business Manager account with a verified ad account and a
//      payment method attached (separate from the Postiz organic-posting
//      setup — Postiz doesn't touch paid ads at all).
//   2. Marketing API access with the `ads_management` permission, which
//      requires its own Meta App Review — the same kind of bureaucracy this
//      project specifically avoided for organic posting by using Postiz.
//      There is no Postiz-equivalent shortcut for paid ads; Meta's Marketing
//      API is the only way to programmatically create/launch campaigns.
//   3. A firm decision from you on autonomous spend. Even once the above
//      exists, this code will not be wired into any cron job or automatic
//      trigger — creating and launching ad campaigns spends real money, and
//      that should always go through a human clicking "launch," the same
//      way computer-use agents are barred from executing trades or
//      transfers unattended. Use this to make campaign creation FASTER once
//      you review and approve creative, not to remove you from the loop.
//
// ── Setup checklist (do this before any of these functions are usable) ──
//   a. business.facebook.com → create/verify a Business Manager
//   b. Create an ad account inside it, attach a payment method
//   c. developers.facebook.com → create an app, add the Marketing API
//      product, request `ads_management` + `ads_read` permissions (App
//      Review required — expect this to take days, similar to what you
//      avoided with the Graph API for organic posting)
//   d. Generate a long-lived System User access token scoped to the ad
//      account (Business Settings → System Users) rather than a personal
//      token that expires
//   e. Set META_AD_ACCOUNT_ID and META_MARKETING_ACCESS_TOKEN below
//
// ── Compliance note: Special Ad Category (Employment) ──
// Recruiting people for paid work is very likely to be classified by Meta
// as an Employment ad under its Special Ad Category rules. When declared
// (Meta may also auto-detect and require this), age/gender/zip-code-radius
// targeting is restricted or disabled entirely in the US and several other
// countries — you may not be able to target "female creators only" as an
// audience filter even though the CREATIVE can still mention that female
// creators earn more under the first-week guarantee. Check Meta's current
// Special Ad Category rules for India specifically before assuming any
// targeting plan is compliant — this changes periodically and varies by
// country, so don't take this comment as the final word.

export interface MetaMarketingConfig {
  adAccountId: string;
  accessToken: string;
}

function getConfig(): MetaMarketingConfig | null {
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_MARKETING_ACCESS_TOKEN;
  if (!adAccountId || !accessToken) return null;
  return { adAccountId, accessToken };
}

export function isMetaMarketingConfigured(): boolean {
  return getConfig() !== null;
}

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface MetaApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a campaign shell (objective + name + status). Does NOT create ad
 * sets or ads — those are separate calls, matching Meta's actual object
 * hierarchy (Campaign → Ad Set → Ad → Creative).
 */
export async function createCampaign(opts: {
  name: string;
  objective?: "OUTCOME_LEADS" | "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT";
  status?: "PAUSED" | "ACTIVE";
  specialAdCategories?: string[]; // e.g. ["EMPLOYMENT"] — see compliance note above
}): Promise<MetaApiResult<{ id: string }>> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "META_AD_ACCOUNT_ID / META_MARKETING_ACCESS_TOKEN not configured — see setup checklist in this file's header comment" };
  }

  try {
    const res = await fetch(`${GRAPH_BASE}/act_${config.adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts.name,
        objective: opts.objective || "OUTCOME_LEADS",
        status: opts.status || "PAUSED", // always create paused — a human reviews and activates
        special_ad_categories: opts.specialAdCategories || [],
        access_token: config.accessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

/**
 * Create an ad set (targeting + budget + schedule) under a campaign.
 * NOTE: if the campaign is declared under a Special Ad Category, the
 * `targeting` object's allowed fields are restricted by Meta server-side —
 * this function does not itself enforce or strip anything, so a targeting
 * payload that includes age/gender/geo-radius restrictions may be rejected
 * or silently modified by Meta depending on the category and country.
 */
export async function createAdSet(opts: {
  campaignId: string;
  name: string;
  dailyBudgetCents: number;
  targeting: Record<string, any>;
  optimizationGoal?: string;
  billingEvent?: string;
  status?: "PAUSED" | "ACTIVE";
}): Promise<MetaApiResult<{ id: string }>> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "META_AD_ACCOUNT_ID / META_MARKETING_ACCESS_TOKEN not configured" };
  }

  try {
    const res = await fetch(`${GRAPH_BASE}/act_${config.adAccountId}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: opts.campaignId,
        name: opts.name,
        daily_budget: opts.dailyBudgetCents,
        targeting: opts.targeting,
        optimization_goal: opts.optimizationGoal || "LEAD_GENERATION",
        billing_event: opts.billingEvent || "IMPRESSIONS",
        status: opts.status || "PAUSED",
        access_token: config.accessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

/**
 * Create an ad creative (the actual copy + image, referencing an already
 * page-connected image hash or URL) and attach it to an ad set as an ad.
 * This is intentionally two Graph API calls under the hood
 * (adcreatives then ads) mirrored as one function since they're always
 * used together in this app's flow.
 */
export async function createAdFromCreative(opts: {
  adSetId: string;
  pageId: string;
  name: string;
  headline: string;
  primaryText: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  cta: "SIGN_UP" | "LEARN_MORE" | "APPLY_NOW" | "CONTACT_US";
  status?: "PAUSED" | "ACTIVE";
}): Promise<MetaApiResult<{ creativeId: string; adId: string }>> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "META_AD_ACCOUNT_ID / META_MARKETING_ACCESS_TOKEN not configured" };
  }

  try {
    const creativeRes = await fetch(`${GRAPH_BASE}/act_${config.adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts.name,
        object_story_spec: {
          page_id: opts.pageId,
          link_data: {
            message: opts.primaryText,
            link: opts.linkUrl,
            name: opts.headline,
            description: opts.description,
            picture: opts.imageUrl,
            call_to_action: { type: opts.cta, value: { link: opts.linkUrl } },
          },
        },
        access_token: config.accessToken,
      }),
    });
    const creativeData = await creativeRes.json();
    if (!creativeRes.ok) return { ok: false, error: creativeData?.error?.message || `HTTP ${creativeRes.status} creating creative` };

    const adRes = await fetch(`${GRAPH_BASE}/act_${config.adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts.name,
        adset_id: opts.adSetId,
        creative: { creative_id: creativeData.id },
        status: opts.status || "PAUSED", // always create paused
        access_token: config.accessToken,
      }),
    });
    const adData = await adRes.json();
    if (!adRes.ok) return { ok: false, error: adData?.error?.message || `HTTP ${adRes.status} creating ad` };

    return { ok: true, data: { creativeId: creativeData.id, adId: adData.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
