// Inbound WhatsApp webhook (AiSensy → us)
// ---------------------------------------------------------------------------
// PHASE 1 BEHAVIOUR: log everything, reply to nothing.
//
// This is deliberate. The exact shape of AiSensy's webhook envelope is not
// documented publicly, and guessing it is how you end up with a bot that
// silently drops every third message. So: point AiSensy here, send yourself a
// few test messages, read the rows in wa_messages, THEN switch AGENT_ENABLED on.
//
// Set AGENT_ENABLED=true in env once the payload shape is confirmed.

import { createFileRoute } from "@tanstack/react-router";
import {
  normaliseInbound,
  sendSession,
  sendImage,
  windowOpen,
  verifyWebhook,
  providerName,
  resolveMediaUrl,
} from "@/lib/whatsapp/provider";
import {
  matchAnswer,
  needsEscalation,
  complianceCheck,
} from "@/lib/whatsapp/answer-bank";

// Approve mode controls how much automation vs human-approval per reply.
//   all-manual  → every reply needs a Telegram tap (WA_AGENT_ENABLED=false alias)
//   canned-auto → canned answers auto-send; LLM-written needs a tap (default)
//   all-auto    → everything auto-sends (gate must pass)
type ApproveMode = "all-manual" | "canned-auto" | "all-auto";
function resolveApproveMode(): ApproveMode {
  // WA_APPROVE_MODE wins. It is the real setting; the boolean below is only a
  // fallback for old deploys. Getting this order wrong silently pins the whole
  // agent to all-manual — which is the exact failure this feature was built to
  // remove — so it must stay first.
  const m = process.env.WA_APPROVE_MODE;
  if (m === "all-manual" || m === "canned-auto" || m === "all-auto") return m;
  // legacy alias: WA_AGENT_ENABLED=false → all-manual, true → canned-auto
  if (process.env.WA_AGENT_ENABLED !== undefined) {
    console.warn(
      "[wa] WA_AGENT_ENABLED is deprecated — set WA_APPROVE_MODE instead",
    );
    return process.env.WA_AGENT_ENABLED === "true"
      ? "canned-auto"
      : "all-manual";
  }
  return "canned-auto";
}
const APPROVE_MODE = resolveApproveMode();
// Printed once at boot so the operating mode is never a guess.
console.log(`[wa] approve mode: ${APPROVE_MODE}`);

const MEDIA_BASE = `${process.env.PUBLIC_APP_URL || "https://barbieverse.org"}/cards`;

// in-memory replay guard; the unique index on provider_msg_id is the real one
const recent = new Set<string>();
function seen(id: string) {
  if (recent.has(id)) return true;
  recent.add(id);
  setTimeout(() => recent.delete(id), 120_000);
  return false;
}

async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("[wa] telegram notify failed", e);
  }
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      // AiSensy may verify the endpoint with a GET before it starts posting.
      GET: async ({ request }) => {
        const url = new URL(request.url);

        // Meta's webhook verification. It sends hub.mode=subscribe with a
        // hub.verify_token you chose, and expects hub.challenge echoed back
        // as the raw body. Echoing the challenge WITHOUT checking the token
        // would let anyone register their endpoint against our URL, so the
        // token comparison is the security boundary here, not a formality.
        if (verifyWebhook) {
          const challenge = verifyWebhook(url.searchParams);
          if (challenge) return new Response(challenge, { status: 200 });
          // A verification attempt that fails the token check must not fall
          // through to the permissive branch below.
          if (url.searchParams.get("hub.mode") === "subscribe") {
            console.warn("[wa] webhook verification failed — bad verify_token");
            return new Response("forbidden", { status: 403 });
          }
        }

        // AiSensy (and manual pings) — no verify token in play.
        const challenge = url.searchParams.get("hub.challenge");
        if (challenge) return new Response(challenge, { status: 200 });
        return Response.json({ ok: true, provider: providerName() });
      },

      POST: async ({ request }) => {
        // Always answer fast. Providers retry aggressively on slow endpoints,
        // and a retry storm looks like duplicate replies to the lead.
        // Read the body as TEXT first: verifying Meta's signature requires the
        // exact raw bytes. Re-serialising parsed JSON changes whitespace and
        // key order, and the hash no longer matches.
        let raw = "";
        let body: any = null;
        try {
          raw = await request.text();
          body = JSON.parse(raw);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        // Meta signs every delivery with X-Hub-Signature-256 = HMAC-SHA256 of
        // the raw body using the App Secret. This is the Cloud API's answer to
        // the shared-secret query param AiSensy uses — different mechanism, so
        // the AiSensy check below must not run against Meta's requests or
        // every real webhook would 401.
        if (providerName() === "cloud") {
          const appSecret = process.env.WA_APP_SECRET;
          if (appSecret) {
            const sig = request.headers.get("x-hub-signature-256") || "";
            const { createHmac, timingSafeEqual } = await import("node:crypto");
            const expected =
              "sha256=" +
              createHmac("sha256", appSecret).update(raw).digest("hex");
            const a = Buffer.from(sig);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              console.warn("[wa] rejected webhook — bad X-Hub-Signature-256");
              return new Response("forbidden", { status: 403 });
            }
          }
        }

        // Optional shared secret. AiSensy's header name is confirmed during
        // Phase 1 by logging request headers on the first real delivery.
        const secret =
          providerName() === "cloud" ? null : process.env.WA_WEBHOOK_SECRET;
        if (secret) {
          const provided =
            request.headers.get("x-webhook-secret") ||
            request.headers.get("x-aisensy-signature") ||
            new URL(request.url).searchParams.get("secret");
          if (provided !== secret)
            return new Response("unauthorized", { status: 401 });
        }

        const msg = normaliseInbound(body);

        // PHASE 1: keep the raw envelope so the shape can be inspected for real.
        if (!msg) {
          console.log(
            "[wa] UNPARSED payload:",
            JSON.stringify(body).slice(0, 2000),
          );
          try {
            const { q } = await import("@/lib/db.server");
            await q(
              `insert into wa_messages (lead_id, direction, body, status)
               select id, 'in', $1, 'unparsed' from wa_leads where phone = 'unknown'
               limit 1`,
              [JSON.stringify(body).slice(0, 4000)],
            );
          } catch {
            /* table may not exist yet */
          }
          return Response.json({ ok: true, parsed: false });
        }

        if (seen(msg.providerMsgId))
          return Response.json({ ok: true, duplicate: true });

        try {
          const { q, q1 } = await import("@/lib/db.server");

          // upsert the lead and reset the 24h free-reply window
          const lead = await q1<any>(
            `insert into wa_leads (phone, display_name, last_inbound_at, window_expires_at, follow_up_due)
             values ($1, $2, now(), now() + interval '24 hours', now() + interval '20 hours')
             on conflict (phone) do update
               set last_inbound_at   = now(),
                   window_expires_at = now() + interval '24 hours',
                   follow_up_due     = null,          -- she replied; cancel the chase
                   display_name      = coalesce(wa_leads.display_name, excluded.display_name),
                   updated_at        = now()
             returning *`,
            [msg.phone, msg.name ?? null],
          );

          await q(
            `insert into wa_messages (lead_id, direction, provider_msg_id, body, media_url, media_type, status)
             values ($1,'in',$2,$3,$4,$5,'received')
             on conflict (provider_msg_id) do nothing`,
            [
              lead!.id,
              msg.providerMsgId,
              msg.text,
              msg.mediaUrl ?? null,
              msg.mediaType ?? null,
            ],
          );

          // A screenshot almost always means "I did the step" — that's a human
          // check. Send it to Barbie with the right Verify button(s) attached.
          if (msg.mediaUrl) {
            // On Cloud API this is a media ID, not a link — exchange it for a
            // real (short-lived, ~5 min) URL before showing it to Barbie.
            let mediaLink = msg.mediaUrl;
            if (providerName() === "cloud" && resolveMediaUrl) {
              mediaLink = (await resolveMediaUrl(msg.mediaUrl)) ?? msg.mediaUrl;
            }
            const { sendScreenshotCard } =
              await import("@/lib/whatsapp/stages");
            await sendScreenshotCard(
              lead!.id,
              msg.phone,
              mediaLink,
              lead!.stage,
            );

            // An image with no caption carries no question to answer. Falling
            // through would hand the LLM an empty prompt and drop a generic
            // line on top of the verify card Barbie is already looking at.
            // The reply to a screenshot is her Verify tap, not the bot.
            if (!msg.text.trim()) {
              return Response.json({ ok: true, awaiting: "screenshot-review" });
            }
          }

          const escalation = needsEscalation(msg.text);
          if (escalation) {
            await q(
              `update wa_leads set escalated = true, escalated_reason = $2 where id = $1`,
              [lead!.id, escalation],
            );
            await notifyTelegram(
              `🚨 <b>Escalation — ${escalation}</b>\n+${msg.phone}\n\n"${msg.text.slice(0, 300)}"\n\n` +
                `The bot has not replied. This one is yours.`,
            );
            return Response.json({ ok: true, escalated: escalation });
          }

          const answer = matchAnswer(msg.text);

          // No more 24h window restriction — we reply to inbound messages anytime.

          // Build the reply text whenever one is needed (canned or LLM).
          const chooseReply = async (): Promise<{
            text: string;
            source: string;
            mediaTag?: string;
          } | null> => {
            if (answer) {
              return {
                text: [answer.reply, answer.nextNudge]
                  .filter(Boolean)
                  .join("\n\n"),
                source: `canned:${answer.id}`,
                mediaTag: answer.mediaTag,
              };
            }
            // No canned match → LLM writer drafts from the bank + her voice.
            const { writeReply } = await import("@/lib/whatsapp/llm-writer");
            const res = await writeReply({
              text: msg.text,
              topicsAsked: lead!.topics_asked,
            });
            if (!res.text) return null;
            return {
              text: res.text,
              source: `llm:${res.source}`,
              mediaTag: undefined,
            };
          };

          // Whether this reply can auto-send in the current mode:
          //   all-manual  → never auto-send
          //   canned-auto → canned auto-sends, llm never auto-sends
          //   all-auto    → everything auto-sends
          const autoSend =
            APPROVE_MODE === "all-auto" ||
            (APPROVE_MODE === "canned-auto" && !!answer);

          // ── everything needs a draft row so the funnel & metric stay honest ─
          // decision is left NULL on purpose. It is written only on the path
          // that actually succeeded — otherwise blocked and failed sends would
          // count as "sent" and inflate the unedited-send rate, which is the
          // number that decides when a stage is safe to promote to all-auto.
          const cannedText = answer
            ? [answer.reply, answer.nextNudge].filter(Boolean).join("\n\n")
            : "(drafting…)";
          const draft = await q1<any>(
            `insert into wa_drafts (lead_id, trigger_text, source, draft_text, media_tag, decision)
             values ($1,$2,$3,$4,$5, null)
             returning id`,
            [
              lead!.id,
              msg.text,
              answer ? `canned:${answer.id}` : "llm-pending",
              cannedText,
              answer?.mediaTag ?? null,
            ],
          );

          if (autoSend) {
            const reply = await chooseReply();
            if (!reply) {
              await notifyTelegram(
                `⚠️ <b>+${msg.phone}</b> — no reply could be generated.\n"${msg.text.slice(0, 250)}"`,
              );
              return Response.json({ ok: true, unmatched: true });
            }
            const gate = complianceCheck(reply.text);
            if (!gate.ok) {
              await q(
                `update wa_drafts set draft_text = $2, decision = 'blocked',
                        compliance = $3::jsonb, decided_at = now() where id = $1`,
                [
                  draft!.id,
                  reply.text,
                  JSON.stringify({ ok: false, issues: gate.issues }),
                ],
              );
              await notifyTelegram(
                `⛔ Blocked auto-reply to +${msg.phone}: ${gate.issues.join("; ")}`,
              );
              return Response.json({ ok: true, blocked: gate.issues });
            }

            // The card is a nice-to-have; the words are the message. If the
            // image 404s (card not deployed yet) she must still get the text,
            // so the image failure is contained here and does not abort.
            if (reply.mediaTag) {
              try {
                await sendImage(
                  msg.phone,
                  `${MEDIA_BASE}/${reply.mediaTag}.png`,
                );
              } catch (e: any) {
                console.error(
                  "[wa] card send failed, continuing with text:",
                  e?.message,
                );
              }
            }
            try {
              await sendSession(msg.phone, reply.text);
            } catch (e: any) {
              await q(
                `update wa_drafts set draft_text = $2, decision = 'send-error', decided_at = now()
                  where id = $1`,
                [draft!.id, reply.text],
              );
              await notifyTelegram(
                `⚠️ Send FAILED to +${msg.phone}: ${e?.message}\n\nDraft:\n${reply.text.slice(0, 400)}`,
              );
              return Response.json({
                ok: false,
                sendError: String(e?.message ?? e),
              });
            }

            await q(
              `insert into wa_messages (lead_id, direction, body, media_url, status) values ($1,'out',$2,$3,'sent')`,
              [
                lead!.id,
                reply.text,
                reply.mediaTag ? `${MEDIA_BASE}/${reply.mediaTag}.png` : null,
              ],
            );
            await q(
              `update wa_leads
                 set last_outbound_at = now(),
                     topics_asked = case
                       when $2 = any(topics_asked) then topics_asked
                       else array_append(topics_asked, $2) end,
                     follow_up_due = now() + interval '20 hours',
                     updated_at = now()
               where id = $1`,
              [lead!.id, answer ? answer.id : "llm"],
            );

            // Stage transition: sending the join link moves her to LINK_SENT.
            // The first real answer on a fresh lead also moves NEW → ASKED.
            if (
              answer?.id === "Q11" ||
              (answer?.label ?? "").match(/join kaise|process|link/i)
            ) {
              const { transitionStage } = await import("@/lib/whatsapp/stages");
              await transitionStage(q, lead!.id, "LINK_SENT", lead!.stage, {
                trigger: "link_sent",
              });
            } else if (lead!.stage === "NEW") {
              const { transitionStage } = await import("@/lib/whatsapp/stages");
              await transitionStage(q, lead!.id, "ASKED", lead!.stage, {
                trigger: "first_reply",
              });
            }

            await q(
              `update wa_drafts set draft_text = $2, final_text = $2,
                      decision = 'sent', decided_at = now() where id = $1`,
              [draft!.id, reply.text],
            );
            return Response.json({
              ok: true,
              sent: answer ? answer.id : "llm",
            });
          }

          // ── human approval path ── generate the draft text first (so the card
          //    shows a real LLM draft, not a placeholder), then send the card.
          let draftText: string;
          let finalSource = "llm-pending";
          if (answer) {
            draftText = [answer.reply, answer.nextNudge]
              .filter(Boolean)
              .join("\n\n");
            finalSource = `canned:${answer.id}`;
          } else {
            const reply = await chooseReply();
            draftText = reply
              ? reply.text
              : "(could not draft automatically — write by hand, then Send)";
            finalSource = reply ? `llm:${reply.source}` : "llm-pending";
          }

          await q(
            `update wa_drafts set draft_text = $2, source = $3 where id = $1`,
            [draft!.id, draftText, finalSource],
          );

          const { sendApproveCard } = await import("@/lib/whatsapp/approve");
          await sendApproveCard({
            draftId: draft!.id,
            phone: msg.phone,
            displayName: msg.name,
            triggerText: msg.text,
            draftText,
            source: finalSource,
            mediaTag: answer?.mediaTag ?? undefined,
          });

          return Response.json({
            ok: true,
            mode: APPROVE_MODE,
            matched: answer?.id ?? null,
            awaiting: "approval",
          });
        } catch (err: any) {
          console.error("[wa] handler error", err);
          // Never 500 at a provider — it triggers retries and duplicate sends.
          return Response.json({
            ok: false,
            error: String(err?.message ?? err),
          });
        }
      },
    },
  },
});
