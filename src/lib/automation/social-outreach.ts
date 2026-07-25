// Social Outreach — Auto-alert for hot/warm social leads
// Sends Telegram alerts with pre-written comments + post URLs
// so the admin can one-tap post them.

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return dbPool;
}

async function sendTelegram(text: string): Promise<boolean> {
  const botToken = process.env.CONTENT_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.CONTENT_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch (err) {
    console.error("[social-outreach] Telegram send failed:", err);
    return false;
  }
}

const PLATFORM_BADGE: Record<string, string> = {
  youtube: "📺",
  moj: "🎵",
  tiktok: "🎭",
  instagram: "📸",
  facebook: "👥",
  twitter: "🐦",
  reddit: "🤖",
};

// ── Send Hot Lead Outreach Alerts ──────────────────────
// Picks top N un-contacted hot leads and sends individual Telegram alerts

export async function sendHotLeadOutreach(limit = 5): Promise<{ sent: number }> {
  const db = await getDb();

  // Status filter matters here. The Moj crawler and the Instagram finder
  // insert leads as 'discovered' / 'queued_manual' with the opener already
  // written into ai_generated_comment — they never pass through the
  // 'ai_reviewed' stage that the older comment-generation flow used. Filtering
  // on 'ai_reviewed' alone meant every lead from those two channels was
  // written to the table and then never surfaced to anyone, which is the
  // exact silent-dead-end this whole pipeline exists to remove.
  const leads = await db.query(`
    SELECT id, platform, post_url, post_text, author_name, author_username,
           author_profile_url, ai_generated_comment, ai_category, ai_confidence,
           keyword_matched, contact_channel, contact_value, contact_action_url,
           moj_segment, moj_fit_score
    FROM social_leads
    WHERE ai_category = 'hot'
    AND status IN ('ai_reviewed', 'discovered', 'queued_manual')
    AND notified_at IS NULL
    AND opted_out_at IS NULL
    AND ai_generated_comment IS NOT NULL
    AND ai_generated_comment != ''
    ORDER BY moj_fit_score DESC NULLS LAST, ai_confidence DESC, created_at DESC
    LIMIT $1
  `, [limit]);

  if (leads.rows.length === 0) return { sent: 0 };

  let sent = 0;
  for (const lead of leads.rows) {
    const badge = PLATFORM_BADGE[lead.platform] || "📱";
    const postLink = lead.post_url;
    const profileLink = lead.author_profile_url || "";
    const comment = lead.ai_generated_comment;

    // Two different actions depending on what we know about this person.
    // With a contact channel it's a direct message — far better than a
    // public comment. Without one, commenting on their post is the only
    // way to get noticed at all.
    const hasContact = !!lead.contact_action_url;

    const msg = [
      hasContact
        ? `${badge} <b>HOT LEAD — MESSAGE THEM</b>`
        : `${badge} <b>HOT LEAD — COMMENT NOW</b>`,
      ``,
      `👤 <b>${lead.author_name}</b> (@${lead.author_username || "?"})`,
      `🏷️ ${lead.platform}${lead.moj_segment ? ` · ${lead.moj_segment}` : ""}` +
        `${lead.moj_fit_score ? ` · fit ${lead.moj_fit_score}/100` : ` · confidence ${lead.ai_confidence}`}`,
      lead.keyword_matched ? `🔍 ${lead.keyword_matched}` : null,
      ``,
      hasContact ? `📱 <b>${lead.contact_channel}</b>: ${lead.contact_value || ""}` : null,
      hasContact ? `${lead.contact_action_url}` : null,
      hasContact ? `` : null,
      lead.post_text ? `📝 ${lead.post_text.slice(0, 200)}` : null,
      `🔗 <a href="${postLink}">Open Post</a>`,
      profileLink && !hasContact ? `👤 <a href="${profileLink}">View Profile</a>` : null,
      ``,
      hasContact ? `<b>Message to send:</b>` : `<b>Comment to post:</b>`,
      `<code>${comment}</code>`,
    ].filter(Boolean).join("\n");

    const ok = await sendTelegram(msg);
    if (ok) sent++;

    // Record that it was surfaced. Using notified_at rather than forcing
    // status='commented' — we genuinely don't know whether the admin sent
    // it, and claiming "commented" would make the funnel stats lie.
    await db.query(
      `UPDATE social_leads SET notified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [lead.id]
    );

    // Small delay between alerts to avoid Telegram rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  return { sent };
}

// ── Send Warm Lead Daily Digest ────────────────────────
// Groups warm leads by platform and sends a summary

export async function sendWarmLeadOutreach(limit = 20): Promise<{ sent: boolean }> {
  const db = await getDb();

  // Throttle: once per 20 hours
  const lastSent = await db.query(
    `SELECT value FROM settings WHERE key = 'social_warm_outreach_last_sent'`
  );
  const lastAt = lastSent.rows[0]?.value ? new Date(lastSent.rows[0].value) : null;
  if (lastAt && Date.now() - lastAt.getTime() < 20 * 60 * 60 * 1000) {
    return { sent: false };
  }

  const leads = await db.query(`
    SELECT platform, ai_category, count(*) as count,
           array_agg(author_name ORDER BY ai_confidence DESC) as names
    FROM social_leads
    WHERE ai_category = 'warm'
    AND status IN ('ai_reviewed', 'discovered', 'queued_manual')
    AND notified_at IS NULL
    AND opted_out_at IS NULL
    AND ai_generated_comment IS NOT NULL
    GROUP BY platform, ai_category
    ORDER BY count DESC
  `);

  if (leads.rows.length === 0) return { sent: false };

  let msg = `🌤️ <b>WARM LEADS DIGEST</b>\n\n`;
  msg += `Ready to comment on these posts:\n\n`;

  let totalWarm = 0;
  for (const row of leads.rows) {
    const badge = PLATFORM_BADGE[row.platform] || "📱";
    const topNames = (row.names || []).slice(0, 3).join(", ");
    msg += `${badge} <b>${row.platform}</b>: ${row.count} leads\n`;
    msg += `  e.g. ${topNames}\n\n`;
    totalWarm += Number(row.count);
  }

  msg += `Total: ${totalWarm} warm leads with pre-written comments\n`;
  msg += `→ <a href="https://barbieverse.org/admin/social-leads">View in Dashboard</a>`;

  const ok = await sendTelegram(msg);

  if (ok) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ('social_warm_outreach_last_sent', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [new Date().toISOString()]
    );
  }

  return { sent: ok };
}

// ── Run Full Social Outreach Cycle ─────────────────────

export async function runSocialOutreach(): Promise<{
  hotSent: number;
  warmDigest: boolean;
}> {
  const hotResult = await sendHotLeadOutreach(5);
  const warmResult = await sendWarmLeadOutreach(20);

  return {
    hotSent: hotResult.sent,
    warmDigest: warmResult.sent,
  };
}
