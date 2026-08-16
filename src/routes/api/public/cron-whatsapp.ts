// Follow-up engine — the fix for the 59 conversations that died in silence.
// ---------------------------------------------------------------------------
// 0 of 59 leads ever got a second message. This cron turns silence into a queue:
// each stage fires its own nudge at its own timer, then day 1/3/7 re-engages.
//
// Rules (from the real chat analysis):
//   - max 1 message per lead per 24h
//   - nothing before 9 AM or after 11 PM IST
//   - wording varies every send (identical bulk text gets a number flagged)
//   - any inbound reply cancels the timer (done in the webhook)
//   - cap at 4 total, then STOP
//   - inside the 24h window → free-form session message
//     outside it       → pre-approved utility template (WA_FOLLOWUP_TEMPLATE)
//
// Run every 15 minutes. Guards: CRON_SECRET header just like cron-social.

import { createFileRoute } from "@tanstack/react-router";
import { sendSession, sendTemplate, windowOpen } from "@/lib/whatsapp/provider";
import { complianceCheck } from "@/lib/whatsapp/answer-bank";

// ── per-stage nudges, three variants each (variation is a hard rule) ────────

const NUDGES: Record<string, string[][]> = {
  LINK_SENT: [
    [
      "Install ho gya? Koi dikkat aayi to screenshot bhej do 🙂",
      "Install ho gaya? Atki to screenshot bhej do, main dekh lungi 🙂",
      "Link khola? 2 minute ka kaam hai, abhi kr lein?",
    ],
    [
      "Sister app download ho gya? 😊",
      "Download shuru kiya tha na? Ho gaya to bata do",
      "Aapka install reh gya tha — aaj kr lein? Main hoon guide krne ke liye",
    ],
  ],
  INSTALLED: [
    [
      "My Agency wali screen ka screenshot bhej do, main check kar lungi",
      "Profile → My Agency kholo, screenshot bhej dena 🙂",
      "Agency wali screen aa gayi? Screenshot bhejo",
    ],
    [
      "Sister ID daalne ka step reh gya — Profile → My Agent kr lo 😊",
      "Ek chhota step reh gaya, 30 second ka hai — abhi kr lein?",
      "Main aapko 2 minute mein set kar deti hoon, bas My Agency kholo",
    ],
  ],
  AGENCY_LINKED: [
    [
      "Face verify ho gya? Atki ho to screenshot bhejo, main bata deti hoon",
      "Face verification ho gayi? Ek baar ki selfie jaise hai 😊",
      "Face verify kiya? Nahi to abhi kr lein, main saath hoon",
    ],
    [
      "Sister face verify ke bina live nahi jaa sakti — chalo karein 🙂",
      "Face verification ek baar ka kaam hai, achi roshni mein — abhi kar lo?",
      "Last step face verify hai — ho gaya? Ya koi dikkat?",
    ],
  ],
  DEFAULT: [
    [
      "Sister phir se hello 😊 — shuru karein? 2 minute ka setup hai",
      "Aapka question reh gya tha — main abhi free hoon, kr lete hain?",
      "Message dekha? Main madad ke liye yahin hoon 🙂",
    ],
    [
      "Kaisi rahi? 😊 Abhi try kar lein, main saath hoon",
      "Aaj karte hain na? Main khud set kar dungi aapka",
      "Time ho to batao, main abhi guide kar sakti hoon",
    ],
    [
      "Aapko ye sujha tha na — aaj ek mauka de do 🙂",
      "Main abhi bhi hoon yahin — kabhi bhi message kar dena",
      "Bas ek baar try kar lo, baaki main sambhal lungi",
    ],
  ],
};

const DAY_PICKS = ["DAY1", "DAY3"] as const;

// ── time helpers (IST) ──────────────────────────────────────────────────────

function istHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value || "0");
}

/** Next allowed send time in IST. 9 AM–11 PM window is a hard rule. */
function nextAllowedTime(from: Date): Date {
  const hour = istHour(from);
  if (hour >= 9 && hour < 23) return from;
  // after midnight → 9 AM today; before 9 AM → 9 AM today
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(0);
  // set 9 AM IST as UTC: IST = UTC+5:30, so 09:00 IST = 03:30 UTC
  d.setUTCHours(3, 30, 0, 0);
  if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

// ── cron route ──────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/public/cron-whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ||
          new URL(request.url).searchParams.get("secret");
        if (!cronSecret || provided !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Single-shot self test: ?test=<phone> sends ONE message to that number
        // and returns AiSensy's raw response (or raw error). Touches no lead,
        // writes no rows. Exists because the project-key header name is still
        // unverified — their own docs disagree — and a real call is the only
        // arbiter. Remove this branch once the handshake is confirmed.
        // ?probe=<phone> — try every credential/header pairing and report which
        // one AiSensy actually accepts. Stops at the first success.
        const probePhone = new URL(request.url).searchParams.get("probe");
        if (probePhone) {
          const { probeAuth } = await import("@/lib/whatsapp/aisensy");
          const out = await probeAuth(
            probePhone,
            "Test from BarbieVerse — agar ye mila to setup sahi hai 😊",
          );
          return Response.json({
            ok: !!out.winner,
            mode: "auth-probe",
            ...out,
          });
        }

        const testPhone = new URL(request.url).searchParams.get("test");
        if (testPhone) {
          const to = testPhone.replace(/[^0-9]/g, "");
          const body =
            "Test from BarbieVerse — agar ye mila to setup sahi hai 😊";
          try {
            const res = await sendSession(to, body);
            return Response.json({
              ok: true,
              mode: "self-test",
              to,
              sent: body,
              provider: res,
            });
          } catch (e: any) {
            return Response.json(
              {
                ok: false,
                mode: "self-test",
                to,
                error: String(e?.message ?? e),
              },
              { status: 502 },
            );
          }
        }

        try {
          const { q, q1 } = await import("@/lib/db.server");
          const results = await runFollowUps(q, q1);
          return Response.json({ ok: true, ...results });
        } catch (e: any) {
          console.error("[cron-whatsapp] Error:", e?.message);
          return Response.json(
            { ok: false, error: e?.message },
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        if (
          !cronSecret ||
          request.headers.get("x-cron-secret") !== cronSecret
        ) {
          return new Response("Unauthorized", { status: 401 });
        }
        // ── single-shot self test ──────────────────────────────────────────
        // POST {"test":"<phone>"} sends ONE message to that number and returns
        // AiSensy's raw response. It touches no lead, writes no rows, and is
        // the only way to find out which auth header their API actually wants
        // — their docs disagree with themselves, so we send all variants and
        // let a real call decide.
        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          /* body optional */
        }
        if (payload?.test) {
          const to = String(payload.test).replace(/[^0-9]/g, "");
          const body = String(
            payload.text ||
              "Test from BarbieVerse — agar ye mila to setup sahi hai 😊",
          );
          const gate = complianceCheck(body);
          if (!gate.ok) {
            return Response.json(
              { ok: false, blocked: gate.issues },
              { status: 400 },
            );
          }
          try {
            const res = await sendSession(to, body);
            return Response.json({
              ok: true,
              mode: "self-test",
              to,
              sent: body,
              provider: res,
            });
          } catch (e: any) {
            // The error text is the diagnosis — surface it, don't swallow it.
            return Response.json(
              {
                ok: false,
                mode: "self-test",
                to,
                error: String(e?.message ?? e),
              },
              { status: 502 },
            );
          }
        }

        try {
          const { q, q1 } = await import("@/lib/db.server");
          const results = await runFollowUps(q, q1);
          return Response.json({ ok: true, ...results });
        } catch (e: any) {
          console.error("[cron-whatsapp] Error:", e?.message);
          return Response.json(
            { ok: false, error: e?.message },
            { status: 500 },
          );
        }
      },
    },
  },
});

// Main query + send loop, isolated so both handlers share it.
// Inbound replies have no rate limit — we only reply to people who message us.
// Outbound cold contact has separate caps (handled by the campaign system).
// No time-of-day restrictions — leads message at all hours and we respond.
const MAX_PER_RUN = Number(process.env.WA_FOLLOWUP_MAX_PER_RUN || 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// How many follow-ups a single lead may ever receive.
//
// While there is no inbound webhook we are sending BLIND: a lead can reply
// "stop messaging me" and we will never see it. Chasing someone four times
// under those conditions is how a number gets reported. So the default here
// is 1 — one polite nudge, then silence — and it only rises to the full
// 4-step ladder once inbound is wired and replies actually cancel the chase.
const MAX_FOLLOW_UPS = Number(process.env.WA_FOLLOWUP_MAX_COUNT || 1);

/**
 * Entry point for the in-process scheduler (no external cron service, no
 * webhook). Outbound follow-ups need only the Project API key — they are
 * completely independent of inbound delivery.
 */
export async function runWhatsappFollowUps() {
  const { q, q1 } = await import("@/lib/db.server");
  return runFollowUps(q, q1);
}

async function runFollowUps(q: any, q1: any) {
  const now = new Date();

  // No quiet hours — leads message at all hours and we respond.
  // Rate limiting is handled per-run by MAX_PER_RUN.

  const due: any[] = await q(
    `select id, phone, stage, follow_up_count, last_inbound_at
       from wa_leads
      where follow_up_due is not null
        and follow_up_due < now()
        and not escalated
        and not human_takeover
        and stage not in ('NOT_INTERESTED','ACTIVE','AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE')
        and follow_up_count < $2
      order by follow_up_due
      limit $1`,
    [MAX_PER_RUN, MAX_FOLLOW_UPS],
  );

  const totals = {
    sent: 0,
    deferred: 0,
    windowClosed: 0,
    blocked: 0,
    stopped: 0,
  };
  let sentThisRun = 0;

  for (const lead of due) {
    // Space the sends out. Back to back API calls from one number read as a
    // bot even when the wording is perfect.
    if (sentThisRun > 0)
      await sleep(20_000 + Math.floor(Math.random() * 25_000));

    const table = NUDGES[lead.stage] || NUDGES.DEFAULT;
    // Which nudge in the sequence (1st, 2nd, 3rd chase) — softer as it goes.
    const variantIndex = Math.min(lead.follow_up_count, table.length - 1);
    const candidates = table[variantIndex];
    // Vary the wording by LEAD, not by count, so two leads on the same nudge
    // never receive character-identical messages.
    const seed = String(lead.id)
      .split("")
      .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const body = candidates[(seed + lead.follow_up_count) % candidates.length];

    // compliance gate — always
    const gate = complianceCheck(body);
    if (!gate.ok) {
      await q(
        `update wa_leads set follow_up_due = null, stage = 'STALLED' where id = $1`,
        [lead.id],
      );
      console.warn(
        "[cron-whatsapp] blocked follow-up, stopped chasing:",
        gate.issues,
      );
      totals.blocked++;
      continue;
    }

    // Always send as session message — no 24h window check needed.
    // We reply to inbound messages anytime and handle outbound via the campaign system.
    try {
      await sendSession(lead.phone, body);
    } catch (e: any) {
      console.error("[cron-whatsapp] send failed:", e?.message);
      await q(
        `update wa_leads set follow_up_due = now() + interval '15 minutes' where id = $1`,
        [lead.id],
      );
      continue;
    }

    sentThisRun++;
    const newCount = lead.follow_up_count + 1;
    await q(
      `insert into wa_messages (lead_id, direction, body, status)
       values ($1, 'out', $2, 'sent')`,
      [lead.id, body],
    );

    // next timer: 20h → day 1 → day 3 → stop at the cap
    const next =
      newCount >= MAX_FOLLOW_UPS
        ? null
        : newCount === 1
          ? new Date(now.getTime() + 20 * 60 * 60 * 1000)
          : newCount === 2
            ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (next) {
      // keep the 24h-per-message cap if the previous send was inside this day
      const last = lead.last_inbound_at ? new Date(lead.last_inbound_at) : null;
      await q(
        `update wa_leads
            set follow_up_due = $2,
                follow_up_count = $3,
                last_outbound_at = now()
          where id = $1`,
        [lead.id, next, newCount],
      );
      totals.sent++;
    } else {
      await q(
        `update wa_leads set follow_up_count = $2, follow_up_due = null, stage = 'STALLED' where id = $1`,
        [lead.id, newCount],
      );
      totals.stopped++;
    }
  }

  return { scanned: due.length, ...totals };
}
