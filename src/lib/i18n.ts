// Lightweight EN/HI translation store. Persisted to localStorage.
// Uses a shared module-level state so all components re-render together.
import { useSyncExternalStore } from "react";

export type Lang = "en" | "hi";
const KEY = "bv_lang";

const DICT = {
  en: {
    "nav.home": "Home",
    "nav.join": "Join Agency",
    "nav.coins": "Buy Coins",
    "nav.blog": "Journal",
    "nav.track": "Track Status",
    "nav.contact": "Contact",
    "cta.get500": "Get ₹500",
    "cta.get500short": "Get ₹500",
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
    "coins.title": "Buy Poppo Coins",
    "coins.subtitle": "Top up your Poppo wallet instantly via UPI.",
    "contact.title": "Contact Us",
    "contact.subtitle": "Have a question? Reach out on WhatsApp or email.",
  },
  hi: {
    "nav.home": "होम",
    "nav.join": "एजेंसी जॉइन करें",
    "nav.coins": "कॉइन खरीदें",
    "nav.blog": "जर्नल",
    "nav.track": "स्टेटस देखें",
    "nav.contact": "संपर्क",
    "cta.get500": "₹500 पाएँ",
    "cta.get500short": "₹500 पाएँ",
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
    "coins.title": "Poppo कॉइन खरीदें",
    "coins.subtitle": "UPI से तुरंत अपना Poppo वॉलेट टॉप अप करें।",
    "contact.title": "संपर्क करें",
    "contact.subtitle": "कोई सवाल है? WhatsApp या ईमेल पर संपर्क करें।",
  },
} as const;

export type TranslationKey = keyof typeof DICT["en"];

// --- Shared state (module-level) ---
let listeners: Array<() => void> = [];
function emitChange() {
  for (const listener of listeners) listener();
}

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "hi" || v === "en") return v;
  } catch {}
  return "en";
}

function subscribeLang(cb: () => void) {
  listeners = [...listeners, cb];
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getLangSnapshot(): Lang {
  return _currentLang;
}

let _currentLang: Lang = typeof window !== "undefined" ? getInitialLang() : "en";

export function setGlobalLang(l: Lang) {
  _currentLang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  emitChange();
}

export function getGlobalLang(): Lang {
  return _currentLang;
}

// Initialize from localStorage on first load (client only)
if (typeof window !== "undefined") {
  _currentLang = getInitialLang();
}

export function useLang() {
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, () => "en" as Lang);
  const setLang = (l: Lang) => setGlobalLang(l);
  const t = (k: TranslationKey) => DICT[lang][k] ?? DICT.en[k] ?? k;
  return { lang, setLang, t };
}
