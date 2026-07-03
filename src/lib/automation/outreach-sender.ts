// Outreach Automation — Auto-send outreach messages for hot leads
// Sends via Telegram alert (for manual send) or WhatsApp URL generator

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
    // Fetch lead details
    const leadResult = await db.query(
      `SELECT * FROM leads WHERE id = $1`,
      [hot.lead_id]
    );

    if (leadResult.rows.length === 0) continue;

    const lead = leadResult.rows[0];
    const name = lead.name || lead.instagram || "Unknown";
    const whatsapp = lead.whatsapp || "";
    const instagram = lead.instagram || "";

    // Build WhatsApp message
    const waMessage = `Hey ${name}! Your content caught my eye. We're building a creator community at BarbieVerse where people share tips and earn together through live streaming. Would love to have you. Mind if I share more?`;

    const waUrl = whatsapp ? generateWhatsAppUrl(whatsapp, waMessage) : "";

    // Send Telegram alert
    await sendTelegramAlert(
      `🔥 <b>HOT LEAD — ACTION NEEDED</b>\n\n` +
      `👤 ${name}\n` +
      `📱 WhatsApp: ${whatsapp || "—"}\n` +
      `📸 Instagram: ${instagram || "—"}\n` +
      `🎯 Score: ${hot.score}/100\n` +
      `💡 ${hot.reasoning}\n\n` +
      `${waUrl ? `📱 <a href="${waUrl}">Open WhatsApp Chat</a>` : "⚠️ No WhatsApp number — reach via Instagram"}` +
      `\n\n→ <a href="https://barbieverse.org/admin/leads">View in Admin</a>`
    );

    // Mark lead as notified
    await db.query(
      `UPDATE leads SET status = 'contacted', notified_at = NOW() WHERE id = $1 AND status = 'new'`,
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

  const warmResult = await db.query(`
    SELECT cl.*, ls.score, ls.category, ls.reasoning
    FROM leads cl
    LEFT JOIN lead_scores ls ON cl.id = ls.lead_id
    WHERE ls.category = 'warm'
    AND cl.status = 'new'
    ORDER BY ls.score DESC
    LIMIT 10
  `);

  if (warmResult.rows.length === 0) return { sent: false };

  let msg = `🌤️ <b>WARM LEADS DIGEST</b>\n\n`;
  msg += `${warmResult.rows.length} warm leads need attention:\n\n`;

  for (const lead of warmResult.rows) {
    const name = lead.name || lead.instagram || "Unknown";
    msg += `• ${name} — Score ${lead.score}/100\n`;
    if (lead.whatsapp) msg += `  📱 ${lead.whatsapp}\n`;
  }

  msg += `\n→ <a href="https://barbieverse.org/admin/leads">View All in Admin</a>`;

  await sendTelegramAlert(msg);

  return { sent: true };
}

// ── Run Full Outreach Automation Cycle ─────────────────
// Called by cron or after batch scoring

export async function runOutreachCycle(): Promise<{
  hotNotified: number;
  warmDigest: boolean;
}> {
  const db = await getDb();

  // Get recently scored hot leads that haven't been notified
  const hotResult = await db.query(`
    SELECT cl.id, ls.score, ls.category, ls.reasoning
    FROM leads cl
    JOIN lead_scores ls ON cl.id = ls.lead_id
    WHERE ls.category = 'hot'
    AND cl.status = 'new'
    AND (cl.notified_at IS NULL)
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
