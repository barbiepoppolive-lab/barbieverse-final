// Telegram Bot Webhook — Handles incoming commands
// Configure: POST https://barbieverse.org/api/public/telegram-bot
// Set via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>

import { createFileRoute } from "@tanstack/react-router";
import { scoreCreatorLead, scoreAllUnscoredLeads, getScoutDashboard } from "@/lib/api/scout-ai.functions";
import { runScrapeJob } from "@/lib/api/scraper.functions";
import { getScrapeSchedules, createScrapeSchedule, toggleScrapeSchedule, runScheduledScrapes, autoScoreNewLeads } from "@/lib/automation/scraper-cron";
import { enrichAllUnenriched } from "@/lib/automation/lead-enrichment";
import { runOutreachCycle } from "@/lib/automation/outreach-sender";

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
      const { hot, warm, cold } = result.categories;
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
