// Telegram Bot Webhook — Handles incoming commands
// Configure: POST https://barbieverse.org/api/public/telegram-bot
// Set via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>

import { createFileRoute } from "@tanstack/react-router";
import { scoreCreatorLead, scoreAllUnscoredLeads, getScoutDashboard } from "@/lib/api/scout-ai.functions";
import { runScrapeJob } from "@/lib/api/scraper.functions";
import { getScrapeSchedules, createScrapeSchedule, toggleScrapeSchedule, runScheduledScrapes, autoScoreNewLeads } from "@/lib/automation/scraper-cron";
import { enrichAllUnenriched } from "@/lib/automation/lead-enrichment";
import { runOutreachCycle } from "@/lib/automation/outreach-sender";
import { runSocialOutreach } from "@/lib/automation/social-outreach";
import { runContentCycle, type PublishPlatform } from "@/lib/social-publish";
import { runMojPipeline } from "@/lib/automation/moj-pipeline";
import { runInstagramMojPipeline } from "@/lib/automation/instagram-moj-pipeline";
import { handleGroupMessage } from "@/lib/social-monitor/telegram-groups";

export const Route = createFileRoute("/api/public/telegram-bot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const message = body.message || body.callback_query?.message;

          if (!message) {
            return new Response("ok");
          }

          const chatId = message.chat.id.toString();
          const text = message.text?.trim() || "";
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const adminChatId = process.env.TELEGRAM_CHAT_ID;
          const chatType = message.chat.type; // private | group | supergroup

          // Messages from groups/supergroups are host-group chatter, not
          // admin commands. Score them for buying intent instead of ignoring
          // them (previously anything not from the admin chat was dropped).
          //
          // Requires privacy mode OFF for the bot: @BotFather → /setprivacy
          // → Disable. Otherwise Telegram only forwards commands and this
          // never fires.
          if (chatType === "group" || chatType === "supergroup") {
            if (text && !text.startsWith("/")) {
              await handleGroupMessage({
                chatId,
                chatTitle: message.chat.title || "unknown group",
                messageId: message.message_id,
                userId: message.from?.id ?? 0,
                username: message.from?.username,
                firstName: message.from?.first_name,
                text,
              });
            }
            return new Response("ok");
          }

          // Only process commands from admin
          if (chatId !== adminChatId) {
            return new Response("ok");
          }

          // Parse command
          const [command, ...args] = text.split(" ");

          switch (command.toLowerCase()) {
            case "/scout":
              return await handleScoutCommand(chatId, args, botToken);

            case "/score":
              return await handleScoreCommand(chatId, args, botToken);

            case "/briefing":
              return await handleBriefingCommand(chatId, botToken);

            case "/scrape":
              return await handleScrapeCommand(chatId, args, botToken);

            case "/schedules":
              return await handleSchedulesCommand(chatId, botToken);

            case "/enrich":
              return await handleEnrichCommand(chatId, botToken);

            case "/outreach":
              return await handleOutreachCommand(chatId, botToken);

            case "/run":
              return await handleRunNowCommand(chatId, args, botToken);

            case "/content":
              return await handleContentCommand(chatId, args, botToken);

            case "/moj":
              return await handleMojCommand(chatId, args, botToken);

            case "/igmoj":
              return await handleIgMojCommand(chatId, botToken);

            case "/pitch":
              return await handlePitchCommand(chatId, botToken);

            case "/social-outreach":
              return await handleSocialOutreachCommand(chatId, args, botToken);

            default:
              return new Response("ok");
          }
        } catch (err) {
          console.error("[telegram-bot] Error:", err);
          return new Response("ok");
        }
      },
    },
  },
});

// ── Command Handlers ───────────────────────────────────

async function handleScoutCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  await sendTelegramMessage(
    chatId,
    "🔍 <b>Scout AI</b>\n\nScoring unscored leads...",
    botToken,
  );

  try {
    const result = await scoreAllUnscoredLeads();

    if (result.scored === 0) {
      await sendTelegramMessage(
        chatId,
        "✅ All leads are already scored!\n\nUse /briefing for today's summary.",
        botToken,
      );
    } else {
      const { hot = 0, warm = 0, cold = 0 } = result.categories ?? {};
      await sendTelegramMessage(
        chatId,
        `🎯 <b>Scoring Complete!</b>\n\n` +
          `Scored: ${result.scored} leads\n` +
          `🔥 Hot: ${hot}\n` +
          `🌤️ Warm: ${warm}\n` +
          `❄️ Cold: ${cold}\n\n` +
          `Use /briefing for today's summary.`,
        botToken,
      );
    }
  } catch (err: any) {
    await sendTelegramMessage(
      chatId,
      `❌ Scoring failed: ${err.message}`,
      botToken,
    );
  }

  return new Response("ok");
}

async function handleScoreCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  if (args.length === 0) {
    await sendTelegramMessage(
      chatId,
      "Usage: /score <lead_id>\n\nExample: /score 550e8400-e29b-41d4-a716-446655440000",
      botToken,
    );
    return new Response("ok");
  }

  const leadId = args[0];

  try {
    await sendTelegramMessage(chatId, "⏳ Scoring lead...", botToken);

    const result = await scoreCreatorLead({ data: { lead_id: leadId } });
    const score = result.score;

    const emoji =
      score.category === "hot" ? "🔥" : score.category === "warm" ? "🌤️" : "❄️";

    await sendTelegramMessage(
      chatId,
      `${emoji} <b>Lead Score: ${score.score}/100</b>\n\n` +
        `Category: ${score.category.toUpperCase()}\n` +
        `Reasoning: ${score.reasoning}\n` +
        `Action: ${score.recommended_action}`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(
      chatId,
      `❌ Error: ${err.message}`,
      botToken,
    );
  }

  return new Response("ok");
}

async function handleBriefingCommand(
  chatId: string,
  botToken?: string,
): Promise<Response> {
  await sendTelegramMessage(chatId, "📊 Generating daily briefing...", botToken);

  try {
    const result = await getScoutDashboard();

    const hotCount =
      result.distribution.find((d: any) => d.category === "hot")?.count || 0;
    const warmCount =
      result.distribution.find((d: any) => d.category === "warm")?.count || 0;
    const coldCount =
      result.distribution.find((d: any) => d.category === "cold")?.count || 0;

    let msg =
      `📊 <b>Scout Dashboard</b>\n\n` +
      `🔥 Hot: ${hotCount} | 🌤️ Warm: ${warmCount} | ❄️ Cold: ${coldCount}\n` +
      `📝 Unscored: ${result.unscored_count}\n\n`;

    if (result.hot_leads.length > 0) {
      msg += `<b>Top Hot Leads:</b>\n`;
      result.hot_leads.slice(0, 5).forEach((lead: any) => {
        msg += `• ${lead.application_id} — Score ${lead.score}\n`;
      });
    }

    await sendTelegramMessage(chatId, msg, botToken);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Error: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Scrape Command ─────────────────────────────────────

async function handleScrapeCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  // /scrape <platform> <url> [limit]
  // /scrape run — run all due scheduled scrapes
  // /scrape status — show scheduled scrapes

  if (args.length === 0) {
    await sendTelegramMessage(
      chatId,
      `🔧 <b>Scraper Commands</b>\n\n` +
      `/scrape run — Run all due scheduled scrapes\n` +
      `/scrape status — Show scheduled scrapes\n` +
      `/scrape instagram https://instagram.com/username — Scrape a profile\n` +
      `/scrape now — Run all schedules immediately\n\n` +
      `Use /schedules to manage schedules.`,
      botToken,
    );
    return new Response("ok");
  }

  if (args[0] === "run" || args[0] === "now") {
    await sendTelegramMessage(chatId, "🔄 Running scheduled scrapes...", botToken);

    try {
      const result = await runScheduledScrapes();

      if (result.executed === 0) {
        await sendTelegramMessage(
          chatId,
          "✅ No scheduled scrapes due right now.\n\nUse /scrape <platform> <url> for one-off scrapes.",
          botToken,
        );
      } else {
        let msg = `🔄 <b>Ran ${result.executed} scrape(s)</b>\n\n`;
        for (const r of result.results) {
          const status = r.error ? "❌" : "✅";
          msg += `${status} ${r.name}: ${r.resultCount} results\n`;
        }
        await sendTelegramMessage(chatId, msg, botToken);
      }
    } catch (err: any) {
      await sendTelegramMessage(chatId, `❌ Error: ${err.message}`, botToken);
    }

    return new Response("ok");
  }

  if (args[0] === "status") {
    try {
      const schedules = await getScrapeSchedules();

      if (schedules.length === 0) {
        await sendTelegramMessage(
          chatId,
          "📋 No scrape schedules configured.\n\nUse the admin panel to create schedules.",
          botToken,
        );
      } else {
        let msg = `📋 <b>Scrape Schedules</b>\n\n`;
        for (const s of schedules) {
          const status = s.enabled ? "🟢" : "🔴";
          msg += `${status} <b>${s.name}</b>\n`;
          msg += `  Platform: ${s.platform} | Cron: ${s.cron_expr}\n`;
          msg += `  Last run: ${s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : "Never"}\n\n`;
        }
        await sendTelegramMessage(chatId, msg, botToken);
      }
    } catch (err: any) {
      await sendTelegramMessage(chatId, `❌ Error: ${err.message}`, botToken);
    }

    return new Response("ok");
  }

  // One-off scrape: /scrape <platform> <url> [limit]
  if (args.length >= 2) {
    const platform = args[0].toLowerCase();
    const url = args[1];
    const limit = parseInt(args[2]) || 10;

    if (!["instagram", "facebook", "twitter", "youtube", "telegram"].includes(platform)) {
      await sendTelegramMessage(
        chatId,
        "Usage: /scrape <platform> <url> [limit]\n\nPlatforms: instagram, facebook, twitter, youtube, telegram",
        botToken,
      );
      return new Response("ok");
    }

    await sendTelegramMessage(chatId, `🔄 Scraping ${platform}: ${url}...`, botToken);

    try {
      const result = await runScrapeJob({
        data: {
          provider: "apify",
          platform: platform as any,
          target: "profiles",
          urls: [url],
          limit,
        },
      });

      await sendTelegramMessage(
        chatId,
        `✅ <b>Scrape Complete</b>\n\n` +
        `Platform: ${platform}\n` +
        `Results: ${result.resultCount}\n` +
        `Job ID: ${result.jobId}\n\n` +
        `Use /enrich to auto-enrich leads.`,
        botToken,
      );
    } catch (err: any) {
      await sendTelegramMessage(chatId, `❌ Scrape failed: ${err.message}`, botToken);
    }

    return new Response("ok");
  }

  await sendTelegramMessage(chatId, "Usage: /scrape <platform> <url> [limit]", botToken);
  return new Response("ok");
}

// ── Schedules Command ──────────────────────────────────

async function handleSchedulesCommand(
  chatId: string,
  botToken?: string,
): Promise<Response> {
  try {
    const schedules = await getScrapeSchedules();

    if (schedules.length === 0) {
      await sendTelegramMessage(
        chatId,
        "📋 No scrape schedules.\n\nCreate them in Admin → Scraper → Schedules tab.",
        botToken,
      );
      return new Response("ok");
    }

    let msg = `📋 <b>Scrape Schedules</b>\n\n`;
    for (const s of schedules) {
      const status = s.enabled ? "🟢 Enabled" : "🔴 Disabled";
      msg += `<b>${s.name}</b> — ${status}\n`;
      msg += `  ${s.platform} | ${s.target} | ${s.cron_expr}\n`;
      msg += `  URLs: ${s.urls.length} | Limit: ${s.limit}\n`;
      msg += `  Last: ${s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "Never"}\n\n`;
    }

    await sendTelegramMessage(chatId, msg, botToken);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Error: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Enrich Command ─────────────────────────────────────

async function handleEnrichCommand(
  chatId: string,
  botToken?: string,
): Promise<Response> {
  await sendTelegramMessage(chatId, "🔍 Enriching unenriched leads...", botToken);

  try {
    const result = await enrichAllUnenriched();

    await sendTelegramMessage(
      chatId,
      `🔍 <b>Enrichment Complete</b>\n\n` +
      `✅ Enriched: ${result.enriched}\n` +
      `❌ Failed: ${result.failed}\n` +
      `⏭️ Skipped: ${result.skipped}`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Enrichment failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Outreach Command ───────────────────────────────────

async function handleOutreachCommand(
  chatId: string,
  botToken?: string,
): Promise<Response> {
  await sendTelegramMessage(chatId, "📨 Running outreach cycle...", botToken);

  try {
    const result = await runOutreachCycle();

    await sendTelegramMessage(
      chatId,
      `📨 <b>Outreach Cycle Complete</b>\n\n` +
      `🔥 Hot leads notified: ${result.hotNotified}\n` +
      `🌤️ Warm digest sent: ${result.warmDigest ? "Yes" : "No"}`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Outreach failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Social Outreach Command ─────────────────────────────
// /social-outreach — send Telegram comment alerts for hot/warm social leads

async function handleSocialOutreachCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  await sendTelegramMessage(chatId, "📱 Running social outreach...", botToken);

  try {
    const result = await runSocialOutreach();

    await sendTelegramMessage(
      chatId,
      `📱 <b>Social Outreach Complete</b>\n\n` +
      `🔥 Hot alerts sent: ${result.hotSent}\n` +
      `🌤️ Warm digest sent: ${result.warmDigest ? "Yes" : "No"}`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Social outreach failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Content Publish Command ────────────────────────────
// /content <topic...>            — generate + publish to all configured platforms
// /content facebook <topic...>   — just one platform
// Note: this text command can't attach an image, so Instagram will report
// "skipped — no image" (Instagram has no text-only post type). Use the
// admin panel for image posts, or attach a photo to this message in a
// future version of this handler.

/**
 * /pitch — the offer message, for AFTER someone replies.
 *
 * First messages deliberately contain no numbers (a stranger's DM that opens
 * with pricing reads as spam and gets ignored). Once they answer, this is
 * the follow-up. It's a fixed template on purpose — commercial terms should
 * be stated identically every time, not paraphrased by an AI.
 */
async function handlePitchCommand(chatId: string, botToken?: string): Promise<Response> {
  const { offerFollowUp } = await import("@/lib/ai/modules/outreach-writer");
  await sendTelegramMessage(
    chatId,
    `💬 <b>Send this once they reply:</b>\n\n<code>${offerFollowUp()}</code>`,
    botToken,
  );
  return new Response("ok");
}

/**
 * /igmoj — find Moj creators on Instagram.
 *
 * The higher-yield sibling of /moj: Instagram has hashtag search and DMs,
 * so this needs no seeds and every result is reachable.
 */
async function handleIgMojCommand(chatId: string, botToken?: string): Promise<Response> {
  await sendTelegramMessage(
    chatId,
    `📸 Searching Instagram for Moj creators… this takes a few minutes (Apify runs are slow).`,
    botToken,
  );

  try {
    const result = await runInstagramMojPipeline();
    await sendTelegramMessage(
      chatId,
      `📸 <b>Done</b>\n\nScanned ${result.postsScanned} posts → ${result.stored} new leads ` +
      `(${result.skippedDuplicate} already seen, ${result.rejectedAsNoise} rejected as not-really-Moj).`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Instagram run failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

/**
 * /moj — run the Moj creator-recruitment crawl.
 *
 * The pipeline reports its own detailed results to Telegram (one message per
 * contactable lead, plus a batched manual-comment queue), so this handler
 * only needs to kick it off and confirm the headline numbers.
 */
async function handleMojCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  if (args[0] === "help") {
    await sendTelegramMessage(
      chatId,
      `🎯 <b>Moj Recruitment</b>\n\n` +
      `/moj — crawl Moj for creators to recruit\n` +
      `/moj &lt;pages&gt; — limit how many pages to crawl (default 25)\n\n` +
      `Results split two ways:\n` +
      `✅ <b>Contactable</b> — they published an Instagram/WhatsApp in their Moj bio. You get a tappable link + a ready opener.\n` +
      `📋 <b>Manual queue</b> — nothing reachable published, so you comment inside the Moj app. Suggested comment included.\n\n` +
      `⚠️ Crawl quality depends entirely on <code>scraper_moj_seeds</code> in settings. Moj has no keyword search, so the crawler walks outward from seed videos through the related-video feed. Seed it with 3-4 videos about live streaming or earning from home.`,
      botToken,
    );
    return new Response("ok");
  }

  const maxPages = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : undefined;

  await sendTelegramMessage(chatId, `🎯 Crawling Moj for creators… this takes a few minutes.`, botToken);

  try {
    const result = await runMojPipeline({ maxPages });
    await sendTelegramMessage(
      chatId,
      `🎯 <b>Moj run finished</b>\n\n` +
      `Candidates: ${result.candidates}\n` +
      `✅ Contactable: ${result.contactable}\n` +
      `📋 Manual queue: ${result.queued}\n` +
      `↩️ Already seen: ${result.skippedDuplicate}`,
      botToken,
    );
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Moj run failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

async function handleContentCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  if (args.length === 0) {
    await sendTelegramMessage(
      chatId,
      `📝 <b>Content Publish</b>\n\n` +
      `/content <topic> — generate + publish to Facebook, Instagram, Moj, YouTube\n` +
      `/content facebook|instagram|moj|youtube <topic> — just one platform\n\n` +
      `Instagram and YouTube need a media file (no text-only posts) — this command can't attach one, so both will show "skipped" unless you supply an image/video URL from the admin panel.`,
      botToken,
    );
    return new Response("ok");
  }

  const knownPlatforms: PublishPlatform[] = ["facebook", "instagram", "moj", "youtube"];
  let platforms: PublishPlatform[] | undefined;
  let topicWords = args;

  if (knownPlatforms.includes(args[0].toLowerCase() as PublishPlatform)) {
    platforms = [args[0].toLowerCase() as PublishPlatform];
    topicWords = args.slice(1);
  }

  const topic = topicWords.join(" ").trim();
  if (!topic) {
    await sendTelegramMessage(chatId, "Usage: /content <topic>", botToken);
    return new Response("ok");
  }

  await sendTelegramMessage(chatId, `✍️ Generating + publishing: "${topic}"...`, botToken);

  try {
    const results = await runContentCycle({ topic, platforms });

    let msg = `📝 <b>Content Cycle Complete</b>\n\n<b>${topic}</b>\n\n`;
    for (const r of results) {
      const emoji = r.status === "published" ? "✅" : r.status === "sent_for_manual" ? "📲" : r.status === "skipped" ? "⏭️" : "❌";
      const detail = r.status === "published" ? `posted (${r.postId})`
        : r.status === "sent_for_manual" ? "sent above for manual upload"
        : r.status === "skipped" ? r.error
        : `failed — ${r.error}`;
      msg += `${emoji} <b>${r.platform}</b>: ${detail}\n`;
    }

    await sendTelegramMessage(chatId, msg, botToken);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Content cycle failed: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Run Now Command ────────────────────────────────────

async function handleRunNowCommand(
  chatId: string,
  args: string[],
  botToken?: string,
): Promise<Response> {
  const action = args[0] || "all";

  await sendTelegramMessage(chatId, `🔄 Running automation: ${action}...`, botToken);

  try {
    if (action === "all" || action === "scrape") {
      const scrapeResult = await runScheduledScrapes();
      await sendTelegramMessage(
        chatId,
        `🔄 Scrapes: ${scrapeResult.executed} executed`,
        botToken,
      );
    }

    if (action === "all" || action === "score") {
      const scoreResult = await autoScoreNewLeads();
      await sendTelegramMessage(
        chatId,
        `🎯 Scoring: ${scoreResult.scored} scored, ${scoreResult.errors} errors`,
        botToken,
      );
    }

    if (action === "all" || action === "enrich") {
      const enrichResult = await enrichAllUnenriched();
      await sendTelegramMessage(
        chatId,
        `🔍 Enrichment: ${enrichResult.enriched} enriched`,
        botToken,
      );
    }

    if (action === "all" || action === "outreach") {
      const outreachResult = await runOutreachCycle();
      await sendTelegramMessage(
        chatId,
        `📨 Outreach: ${outreachResult.hotNotified} hot notified`,
        botToken,
      );
    }

    await sendTelegramMessage(chatId, "✅ Automation cycle complete!", botToken);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Error: ${err.message}`, botToken);
  }

  return new Response("ok");
}

// ── Helpers ────────────────────────────────────────────

async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken?: string,
): Promise<void> {
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[telegram-bot] Send failed:", err);
  }
}
