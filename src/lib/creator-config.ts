// Editable referral destination URLs for the Creator Acquisition module.
// Replace with real personal/agency referral links when available.
export const POPPO_REFERRAL_URL = "https://poppo.live/";
export const VONE_REFERRAL_URL = "https://vone.live/";

export const platformReferralUrl = (platform: string) =>
  platform === "vone" ? VONE_REFERRAL_URL : POPPO_REFERRAL_URL;

export const platformLabel = (platform: string) =>
  platform === "vone" ? "Vone" : "Poppo";
