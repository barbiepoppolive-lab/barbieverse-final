// Standalone answer bank for the WhatsApp bot
// Copied from src/lib/whatsapp/answer-bank.ts to avoid import path issues

export interface Answer {
  id: string;
  label: string;
  match: RegExp[];
  reply: string;
  mediaTag?: string;
  mediaType?: "photo" | "video"; // defaults to "photo" (.png)
  mediaCaption?: string; // caption sent with the media (if any)
  nextNudge?: string;
}

export const ANSWERS: Answer[] = [
  {
    id: "Q0",
    label: "ad opener / first contact",
    match: [
      /can i get more info/i,
      /more info on this/i,
      /want to join barbieverse/i,
      /और पता चल सकता/,
      /इस बारे में/,
      /नमस्ते/,
      /আরও তথ্য/,
      /হ্যালো/,
      /^\s*(hi|hello|hlo|hey|helo)\s*[!.]?\s*$/i,
    ],
    reply:
      "Haan, batati hoon 😊\n\n" +
      "Ghar baithe apne phone se live aana hota hai — bas baat karni hoti hai, gaana, dance, ya normal gupshup\n\n" +
      "Koi paisa nahi lagta, na koi fees. Training main khud deti hoon",
    mediaTag: "00-haan-batati-hoon",
    mediaType: "video",
    nextNudge: "Aap roz kitna time de sakti hain?",
  },
  {
    id: "Q1",
    label: "kitna milega",
    match: [
      /kitn[ae]/i,
      /kitna milega/i,
      /\bsalary\b/i,
      /\bincome\b/i,
      /monthly.{0,10}(kitna|milega)/i,
      /earning kitn/i,
    ],
    reply:
      "Do jagah se aata hai — viewers ke gift, aur app ke daily task aur rank ka paisa\n\n" +
      "Task wala paisa gift na aaye tab bhi milta hai\n\n" +
      "4-5 ghante roz do to pehle mahine 30k tak ja sakta hai, aage aapki skill pe hai",
    mediaTag: "04-kitna-milega",
    nextNudge: "Install karke khud dekhna chahogi?",
  },
  {
    id: "Q2",
    label: "per minute kitna",
    match: [
      /per minute/i,
      /per hour/i,
      /\bghante ka kitna\b/i,
      /minute me kitna/i,
    ],
    reply:
      "Per minute ka koi fixed rate nahi hota sister\n\n" +
      "Kamai gift se hoti hai — jitne log gift bhejenge utna banega, aur uske upar daily task ka paisa alag\n\n" +
      "Jo agency per minute ka pakka rate bataye, wo sach nahi bata rahi",
    mediaTag: "02-per-minute-nahi",
    nextNudge: "Pehle live se shuru karein?",
  },
  {
    id: "Q3",
    label: "calling app hai kya",
    match: [
      /\bcalling\b/i,
      /\bv?cll\b/i,
      /video call/i,
      /audio call/i,
      /private call/i,
      /\bcall\b.{0,12}(hai|ata|aata|wala)/i,
    ],
    reply:
      "Nahi sister, ye calling app bilkul nahi hai 😊\n\n" +
      "Aap live aati ho, sab log ek saath dekhte hain aur gift bhejte hain. Koi private call nahi, koi aapka personal number nahi le sakta\n\n" +
      "Nudity aur galat kaam allowed hi nahi hai platform pe",
    mediaTag: "01-calling-app-nahi",
    nextNudge: "Meri live dikha doon aapko?",
  },
  {
    id: "Q4",
    label: "earning kaise hoti hai",
    match: [
      /earning.{0,12}(kaise|process)/i,
      /kaise.{0,10}kamai/i,
      /paisa kaise/i,
      /kaise milta/i,
    ],
    reply:
      "Aise hota hai —\n\n" +
      "Viewer real paise se coin kharidta hai, aapko gift bhejta hai, wo aapke points ban jate hain\n\n" +
      "10,000 points = 1 dollar. Points bank mein withdraw ho jate hain",
    mediaTag: "03-earning-kaise-hoti-hai",
    nextNudge: "Link bhej doon? 2 minute ka kaam hai",
  },
  {
    id: "Q5",
    label: "withdrawal",
    match: [
      /withdraw/i,
      /\bnikal(na|ti|ta)?\b/i,
      /\bbank\b/i,
      /paytm/i,
      /\bupi\b/i,
      /paisa kab milega/i,
    ],
    reply:
      "Minimum 10 dollar hai, lagbhag 850 rs\n\n" +
      "Aap khud app se withdraw karti ho, seedha apne bank mein — 24 ghante ke andar aa jata hai\n\n" +
      "Hum aapke paise ko haath nahi lagate",
    mediaTag: "05-withdrawal-850",
    nextNudge: "Account aapka apna hi rahega. Shuru karein?",
  },
  {
    id: "Q6",
    label: "kya karna hota hai",
    match: [
      /kya karna/i,
      /kiya karna/i,
      /kaisa kaam/i,
      /kesa work/i,
      /kaam kya/i,
      /what.{0,8}work/i,
    ],
    reply:
      "Logo se interact krna hai, ghar baithe apne phone se\n\n" +
      "Gaana, gappe, makeup, game — jo aapko accha lagta hai\n\n" +
      "No nudity, koi galat kaam nahi",
    mediaTag: "01-calling-app-nahi",
    nextNudge: "Roz kitna time de sakti ho?",
  },
  {
    id: "Q7",
    label: "face dikhana padega",
    match: [/\bface\b/i, /chehra/i, /camera/i, /dikhana pad/i, /face verif/i],
    reply:
      "Live streaming mein haan — log unhi ko gift bhejte hain jinse baat achi lagti hai\n\n" +
      "Face verification sirf ek baar hota hai, ek selfie jaisa. Usse pata chalta hai ID aapki apni hai\n\n" +
      "Baaki sab aapke control mein — kya baat karni hai, kab aana hai, kisko block karna hai",
    mediaTag: "07-face-verification",
    mediaType: "video",
    nextNudge: "Karke dekhein? Main saath mein hoon",
  },
  {
    id: "Q8",
    label: "kitne ghante",
    match: [
      /kitne ghante/i,
      /kitna time/i,
      /how many hours/i,
      /\bduty\b/i,
      /time dena/i,
    ],
    reply:
      "4-5 ghante roz best hai\n\n" +
      "2 ghante se daily task ka reward shuru ho jata hai, uske aage se regular log aur rank banti hai\n\n" +
      "Peak time 7 se 11 baje raat — tab sabse zyada log hote hain",
    mediaTag: "08-kitna-time",
    nextNudge: "Aapke liye kaunsa time theek rahega?",
  },
  {
    id: "Q9",
    label: "free hai kya / paise lagenge",
    match: [
      /\bfree\b/i,
      /paise dene/i,
      /charge/i,
      /\bfees\b/i,
      /kitna dena/i,
      /investment/i,
      /payment karna/i,
    ],
    reply:
      "Bilkul free hai sister 😊\n\n" +
      "Na registration ka, na training ka, na kisi verification ka — kuch bhi nahi\n\n" +
      "Koi bhi aapse host banne ke liye paisa maange, wo hum nahi hain",
    mediaTag: "09-bilkul-free",
    nextNudge: "To try karne mein kya harj hai?",
  },
  {
    id: "Q10",
    label: "genuine hai / scam",
    match: [
      /\bscam\b/i,
      /\bfake\b/i,
      /fraud/i,
      /genuine/i,
      /\bsafe\b/i,
      /real hai/i,
      /\btrust\b/i,
      /dhokha/i,
    ],
    reply:
      "Teen cheezein khud check kar lo 😊\n\n" +
      "Aap humein kabhi paisa nahi deti. Paisa app se seedha aapke bank mein aata hai, hum beech mein nahi\n\n" +
      "Aur mera rank aur proof barbieverse.org/proof pe hai — khud dekh lo",
    mediaTag: "10-genuine-hai",
    nextNudge: "Meri live dekhna chahengi?",
  },
  {
    id: "Q11",
    label: "join kaise karein",
    match: [
      /kaise join/i,
      /how to join/i,
      /\bprocess\b/i,
      /kaise kare/i,
      /\bsteps?\b/i,
      /link bhej/i,
      /\bshuru\b/i,
    ],
    reply:
      "Bas 4 step, 2 minute ka kaam 👇\n\n" +
      "1) Hamare link se app install karo\n" +
      "2) Apne number se register karo\n" +
      "3) Profile → My Agency kholo\n" +
      "4) Agent ID 2517496 daalo → Apply to Join",
    mediaTag: "06-join-kaise-4-step",
    mediaType: "video",
    nextNudge: "Ho jaye to screenshot bhej dena, main check kar lungi",
  },
  {
    id: "Q12",
    label: "app ka naam kya hai",
    match: [
      /app ka naam/i,
      /kaunsa app/i,
      /konsa app/i,
      /which app/i,
      /app name/i,
    ],
    reply:
      "Link se hi install karna sister — tabhi aap meri agency mein aayengi aur main aapko guide kar paungi\n\n" +
      "Bahar se install kiya to aap kisi ki bhi agency mein nahi hongi, na training milegi na support",
    nextNudge: "Link bhej doon?",
  },
  {
    id: "Q13",
    label: "app problem / otp / login",
    match: [
      /\berror\b/i,
      /nahi ho raha/i,
      /nhi ho raha/i,
      /not working/i,
      /\botp\b/i,
      /\blogin\b/i,
      /same word/i,
      /problem aa/i,
    ],
    reply:
      "Screenshot bhej do jahan atki ho, main dekh ke bata deti hoon\n\n" +
      "Mobile number wale option se login kijiye, sabse upar wala",
    nextNudge: "Main abhi free hoon, saath mein kar lete hain",
  },
  {
    id: "Q14",
    label: "already in another agency",
    match: [
      /dusri agency/i,
      /doosri agency/i,
      /another agency/i,
      /pehle se.{0,15}agency/i,
      /already.{0,12}agency/i,
    ],
    reply:
      "To abhi wahin rahiye sister\n\n" +
      "Ek host sirf ek agency mein reh sakti hai, aur hum kisi ki host nahi todte — platform ke rules ke against hai",
    nextNudge: "Aage baat badle to message kar dijiye, main yahin hoon",
  },
];

export const ESCALATE_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /\bmera\b.{0,20}\b(payment|paisa|withdraw)\b/i,
    reason: "her own money",
  },
  {
    re: /payment nahi aaya|paisa nahi aaya|withdraw nahi hua/i,
    reason: "payout problem",
  },
  { re: /\brefund\b/i, reason: "refund" },
  { re: /\b(police|legal|court|complaint|consumer)\b/i, reason: "legal" },
  {
    re: /\b(chutiya|bhenchod|madarchod|fraud ho|cheater)\b/i,
    reason: "angry/abusive",
  },
  {
    re: /\b(1[0-7]|under\s?18|nabalig)\s?(saal|years|year)?\b/i,
    reason: "possible minor",
  },
  {
    re: /real person|insaan se baat|human se baat/i,
    reason: "asked for a human",
  },
];

export interface MatchResult {
  answer: Answer;
  matchIndex: number; // which regex in the answer's match[] array fired
}

export function matchAnswer(text: string): MatchResult | null {
  const t = (text || "").toLowerCase();
  if (!t) return null;
  for (const a of ANSWERS) {
    for (let i = 0; i < a.match.length; i++) {
      if (a.match[i].test(t)) return { answer: a, matchIndex: i };
    }
  }
  return null;
}

// Q0 variant IDs — maps regex index to a stable prefill variant string.
// MUST stay in sync with Q0's match[] array above.
export const Q0_VARIANTS: Record<number, string> = {
  0: "en-more-info",
  1: "en-more-info-2",
  2: "en-join",
  3: "hi-aur-pata",
  4: "hi-is-baare",
  5: "hi-namaste",
  6: "bn-arothyo",
  7: "bn-hello",
  8: "generic-greeting",
};

export function needsEscalation(text: string): string | null {
  for (const { re, reason } of ESCALATE_PATTERNS) {
    if (re.test(text || "")) return reason;
  }
  return null;
}

const BANNED = [
  { re: /\bguarantee[ds]?\b/i, why: "the word 'guarantee'" },
  { re: /\b(vone|poppo)\b/i, why: "the app name" },
  { re: /\b\d+\s*(lakh|lakhs|crore|cr)\b/i, why: "a lakh/crore figure" },
  { re: /(₹|\brs\.?|\binr\b)\s?\d{3,}/i, why: "a rupee figure" },
  {
    re: /\b\d{3,}[\d,]*\s*(rs\b|rupees?|ruppess|rupaye|₹)/i,
    why: "a rupee figure",
  },
];

const APPROVED = [
  /\b850\s*rs\b/i,
  /\b10\s*dollar/i,
  /10,?000\s*points/i,
  /\b30k\s*tak\b/i,
  /barbieverse\.org/i,
];

export function complianceCheck(text: string): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  for (const b of BANNED) {
    if (!b.re.test(text)) continue;
    let stripped = text;
    for (const ok of APPROVED) stripped = stripped.replace(ok, " ");
    if (b.re.test(stripped)) issues.push(b.why);
  }
  return { ok: issues.length === 0, issues };
}
