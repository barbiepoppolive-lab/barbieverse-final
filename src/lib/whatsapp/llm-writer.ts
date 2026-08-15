// LLM writer for the long tail (~20% of inbound that no canned answer covers).
// ---------------------------------------------------------------------------
// Grounds every generation in two things:
//   1. The answer bank — money facts never leave the bank; the model may only
//      vary WORD ORDER, never a number.
//   2. Her voice profile, measured from 1,516 real messages — short bursts,
//      Roman Hinglish, "sister"/"aap", no full stops, one 😊.
//
// Output is 1-3 short messages. The compliance gate still runs on the result
// before anything is sent (see answer-bank.complianceCheck).

import { aiRoute } from "@/lib/ai/router";
import { ANSWERS, complianceCheck } from "./answer-bank";

// Her measured voice rules, embedded verbatim so the model writes like her.
const VOICE_PROFILE = `
Barbie ki awaaz — humne uske 1,516 messages se measure kiya hai. Ise FOLLOW:
- Median message length: 23 characters. 75% of messages are under 40 chars.
- Split thoughts into 2-4 SHORT messages, never one paragraph.
- Spelling (mat badlo): nhi (78) not nahi · kr (200) not kar · skte (55) not
  sakte · mei (154) not mein · krna (30) not karna.
- Address: "sister" (115x) · "ji" (92x) · "aap" (185x). Never "tum", never
  "mam", never "dear".
- Emoji: at most one, and only 😊 or rarely 👍/👇. Never more than one.
- Never end with a full stop. Start with a capital letter 91% of the time.
- Signature opener: "Haan, batati hoon 😊" (used 62x) — use it to open.
- Be warm, plain, like a helpful older sister. Not a call centre.

Money facts are LOCKED. Never change a number. Never add a rupee figure of
your own. If the lead presses for a number, use the locked answer text.
`;

export interface WriterInput {
  text: string;           // what she said
  topicsAsked?: string[]; // which canned answers she already got (never repeat)
  stage?: string;
}

export interface WriterResult {
  text: string;                    // the reply (1-3 short lines, joined by \n\n)
  source: "llm" | "safety";
  blocked?: boolean;
}

/** The relevant locked money facts, in her words, for the model to draw on. */
function groundingFacts(topicsAsked: string[] = []): string {
  const seen = new Set(topicsAsked);
  const facts: string[] = [];
  for (const a of ANSWERS) {
    if (seen.has(a.id)) continue; // never repeat an answer she already got
    facts.push(`${a.id}: ${a.reply}`);
  }
  return facts.length ? facts.join("\n\n") : "(she has seen all answers — answer fresh, stay within the same facts)";
}

export async function writeReply(input: WriterInput): Promise<WriterResult> {
  const systemPrompt = `${VOICE_PROFILE}

TUM KYA HO: Barbie ki WhatsApp agent. Sirf BarbieVerse hosting ke sawaalo ke liye.
Kisi bhi cheez ke baare mein general help mat karo — hosting nahi hai to politely
redirect kar do aur ruk jao.

LOCKED ANSWERS (ye facts change nahi hote, sirf word order badal sakte ho):
${groundingFacts(input.topicsAsked)}

AB RULES:
- Rupee figure apne se kabhi mat banao. Number lock answers se hi lo.
- "guarantee" word kabhi mat likho.
- App ka naam kabhi mat likho.
- Under-18 feel ho to keh do sirf adults ke liye hai, aur ruk jao.
- Her own payout/refund ho to mat jawab do — keh do team se karwa dengi.
- Hamesha ek chota sawaal ya agla step ke saath khatam karo. Kabhi dead end mat chhodo.
- Ek baar mein 1-3 chhoti lines.`;

  try {
    const result = await aiRoute({
      prompt: input.text,
      taskType: "chat",
      systemPrompt,
      maxTokens: 300,
      temperature: 0.7,
    });

    const text = result.text.trim();
    if (!text) return { text: "", source: "safety" };

    const gate = complianceCheck(text);
    if (!gate.ok) {
      console.warn("[whatsapp/llm-writer] blocked after generation:", gate.issues);
      return { text: "", source: "safety", blocked: true };
    }
    return { text, source: "llm" };
  } catch (err) {
    console.error("[whatsapp/llm-writer] generation failed:", err);
    return { text: "", source: "safety" };
  }
}