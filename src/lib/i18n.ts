// Lightweight EN/HI translation store. Persisted to localStorage.
import { useEffect, useState } from "react";

export type Lang = "en" | "hi";
const KEY = "bv_lang";

const DICT = {
  en: {
    "nav.home": "Home",
    "nav.join": "Join Agency",
    "nav.coins": "Buy Coins",
    "nav.blog": "Journal",
    "cta.get500": "Get ₹500",
    "creator.eyebrow": "For Aspiring Creators",
    "creator.title.start": "Start Your",
    "creator.title.journey": "Creator Journey",
    "creator.tagline":
      "Learn from Barbie, one of Poppo's highest wealth-level creators, and begin your creator journey with agency support.",
    "creator.track": "Already applied? Track your application →",
    "join.title": "Apply in 60 seconds",
    "join.subtitle": "Reserve your ₹500 creator bonus. Eligible after successful onboarding.",
    "join.mobile": "Mobile Number",
    "join.whatsapp": "WhatsApp Number (optional)",
    "join.upi": "UPI ID",
    "join.platform": "Platform",
    "join.continue": "Continue To Join",
    "join.submitting": "Submitting…",
    "counter.label": "joined in the last 24h",
  },
  hi: {
    "nav.home": "होम",
    "nav.join": "एजेंसी जॉइन करें",
    "nav.coins": "कॉइन खरीदें",
    "nav.blog": "जर्नल",
    "cta.get500": "₹500 पाएँ",
    "creator.eyebrow": "नए क्रिएटर्स के लिए",
    "creator.title.start": "शुरू करें अपनी",
    "creator.title.journey": "क्रिएटर जर्नी",
    "creator.tagline":
      "Poppo की टॉप क्रिएटर बार्बी से सीखें और एजेंसी सपोर्ट के साथ अपनी क्रिएटर जर्नी शुरू करें।",
    "creator.track": "पहले से अप्लाई किया? यहाँ ट्रैक करें →",
    "join.title": "60 सेकंड में अप्लाई करें",
    "join.subtitle": "₹500 क्रिएटर बोनस रिज़र्व करें। सफल ऑनबोर्डिंग पर मिलेगा।",
    "join.mobile": "मोबाइल नंबर",
    "join.whatsapp": "व्हाट्सऐप नंबर (वैकल्पिक)",
    "join.upi": "UPI ID",
    "join.platform": "प्लेटफ़ॉर्म",
    "join.continue": "जॉइन करें",
    "join.submitting": "भेजा जा रहा है…",
    "counter.label": "ने पिछले 24 घंटों में जॉइन किया",
  },
} as const;

type Key = keyof typeof DICT["en"];

export function useLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "hi" || v === "en") setLang(v);
    } catch {}
  }, []);
  const change = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  };
  const t = (k: Key) => DICT[lang][k] ?? DICT.en[k] ?? k;
  return { lang, setLang: change, t };
}
