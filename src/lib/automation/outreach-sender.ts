// Outreach Automation — Auto-send outreach messages for hot leads
// Sends via Telegram alert (for manual send) or WhatsApp URL generator
//
// FIXED 2026-07-24: this whole module queried `FROM leads` joined to
// `lead_scores`, but lead_scores.lead_id actually references creator_leads(id)
// (see scoreCreatorLead in scout-ai.functions.ts and the FK in
// 20260702_004_ai_router.sql). The `leads` table (direct/wobb join-form
// submissions) never gets a lead_scores row at all, so this join always
// returned zero rows — "Outreach: 0 hot notified" on every single cron run,
// forever, regardless of how many applicants actually scored hot. It also
// filtered on status = 'new', which isn't a creator_leads status either (the
// real values are "Lead Created", "Joined Platform", etc. — see
// admin.creator-leads.tsx). Net effect: nobody who applied and scored "hot"
// or "warm" ever got proactively followed up with.
//
// creator_leads has no `name`/`instagram` columns (it's the join-application
// tracker, not a scraped-profile table) — name is the first line of `notes`
// per scout-ai.functions.ts, and the contact number is whatsapp_number /
// mobile_number. Framing is adjusted from "cold DM to a stranger" to
// "follow up with someone who already applied," which is what this data
// actually represents. `notified_at` (already a column on creator_leads) is
// used to avoid re-notifying, instead of inventing a non-existent status.

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: process.env.DB_SSL_INSECURE === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return dbPool;
}

// ── Send Telegram Alert for Outreach ───────────────────

async function sendTelegramAlert(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[outreach-alert] Send failed:", err);
  }
}

// ── Generate WhatsApp Click-to-Chat URL ────────────────

function generateWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

// ── Auto-Notify Hot Leads ──────────────────────────────
// Called after scoring — sends Telegram alert for hot leads

export async function autoNotifyHotLeads(
  scoredLeads: Array<{
    lead_id: string;
    score: number;
    category: string;
    reasoning: string;
  }>
): Promise<{ notified: number }> {
  const db = await getDb();
  let notified = 0;

  const hotLeads = scoredLeads.filter((s) => s.category === "hot");
  if (hotLeads.length === 0) return { notified: 0 };

  for (const hot of hotLeads) {
    // Fetch lead details from creator_leads (see file header for why)
    const leadResult = await db.query(
      `SELECT * FROM creator_leads WHERE id = $1`,
      [hot.lead_id]
    );

    if (leadResult.rows.length === 0) continue;

    const lead = leadResult.rows[0];
    const name = lead.notes?.split("\n")[0]?.trim() || "there";
    const whatsapp = lead.whatsapp_number || lead.mobile_number || "";

    // Build WhatsApp follow-up message — this person already applied to
    // join BarbieVerse and scored "hot" (serious intent / verified UGC),
    // so this is a check-in, not a cold-outreach pitch.
    const waMessage = `Hi ${name}! This is BarbieVerse — saw your application and wanted to personally check in. Need any help getting started or going live for the first time? Happy to walk you through it.`;

    const waUrl = whatsapp ? generateWhatsAppUrl(whatsapp, waMessage) : "";

    // Send Telegram alert
    await sendTelegramAlert(
      `🔥 <b>HOT APPLICANT — FOLLOW UP NEEDED</b>\n\n` +
      `👤 ${name}\n` +
      `📱 Contact: ${whatsapp || "—"}\n` +
      `📋 Status: ${lead.status}\n` +
      `🎯 Score: ${hot.score}/100\n` +
      `💡 ${hot.reasoning}\n\n` +
      `${waUrl ? `📱 <a href="${waUrl}">Open WhatsApp Chat</a>` : "⚠️ No phone number on file"}` +
      `\n\n→ <a href="https://barbieverse.org/admin/creator-leads">View in Admin</a>`
    );

    // Mark as notified so we don't nudge them again every cron run
    await db.query(
      `UPDATE creator_leads SET notified_at = NOW() WHERE id = $1`,
      [hot.lead_id]
    );

    notified++;
  }

  return { notified };
}

// ── Auto-Notify Warm Leads (Daily Digest) ──────────────
// Sends a daily summary of warm leads that need attention

export async function sendWarmLeadDigest(): Promise<{ sent: boolean }> {
  const db = await getDb();

  // This is meant to be a once-a-day digest, but the cron endpoint that calls
  // it can run far more often than daily — without a throttle it would repost
  // the same warm applicants every run. Gate to once per 20h using the same
  // settings-table pattern used elsewhere for per-platform run tracking.
  const lastSentRows = await db.query(
    `SELECT value FROM settings WHERE key = 'warm_digest_last_sent_at'`
  );
  const lastSentAt = lastSentRows.rows[0]?.value ? new Date(lastSentRows.rows[0].value) : null;
  if (lastSentAt && Date.now() - lastSentAt.getTime() < 20 * 60 * 60 * 1000) {
    return { sent: false };
  }

  const warmResult = await db.query(`
    SELECT cl.*, ls.score, ls.category, ls.reasoning
    FROM creator_leads cl
    JOIN lead_scores ls ON cl.id = ls.lead_id
    WHERE ls.category = 'warm'
    AND cl.notified_at IS NULL
    ORDER BY ls.score DESC
    LIMIT 10
  `);

  if (warmResult.rows.length === 0) return { sent: false };

  let msg = `🌤️ <b>WARM APPLICANTS DIGEST</b>\n\n`;
  msg += `${warmResult.rows.length} applicants scored "warm" and could use a nudge:\n\n`;

  for (const lead of warmResult.rows) {
    const name = lead.notes?.split("\n")[0]?.trim() || "Unknown";
    const contact = lead.whatsapp_number || lead.mobile_number;
    msg += `• ${name} — Score ${lead.score}/100\n`;
    if (contact) msg += `  📱 ${contact}\n`;
  }

  msg += `\n→ <a href="https://barbieverse.org/admin/creator-leads">View All in Admin</a>`;

  await sendTelegramAlert(msg);

  await db.query(
    `INSERT INTO settings (key, value) VALUES ('warm_digest_last_sent_at', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [new Date().toISOString()]
  );

  return { sent: true };
}

// ── Run Full Outreach Automation Cycle ─────────────────
// Called by cron or after batch scoring

export async function runOutreachCycle(): Promise<{
  hotNotified: number;
  warmDigest: boolean;
}> {
  const db = await getDb();

  // Get recently scored hot applicants that haven't been notified
  const hotResult = await db.query(`
    SELECT cl.id, ls.score, ls.category, ls.reasoning
    FROM creator_leads cl
    JOIN lead_scores ls ON cl.id = ls.lead_id
    WHERE ls.category = 'hot'
    AND cl.notified_at IS NULL
    ORDER BY ls.score DESC
    LIMIT 10
  `);

  let hotNotified = 0;

  if (hotResult.rows.length > 0) {
    const scoredLeads = hotResult.rows.map((r: any) => ({
      lead_id: r.id,
      score: r.score,
      category: r.category,
      reasoning: r.reasoning,
    }));

    const result = await autoNotifyHotLeads(scoredLeads);
    hotNotified = result.notified;
  }

  // Send warm digest
  const digest = await sendWarmLeadDigest();

  return { hotNotified, warmDigest: digest.sent };
}
