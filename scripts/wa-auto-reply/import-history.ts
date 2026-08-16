// Import decrypted WhatsApp chat history into Supabase
// Usage: npx tsx scripts/wa-auto-reply/import-history.ts
//
// Reads leads-with-history.json, upserts into wa_leads with correct stages,
// topics, and next_step, then inserts all transcript messages into wa_messages.

import fs from "fs";
import path from "path";
import { Client } from "pg";

const HISTORY_FILE = path.resolve(
  import.meta.dirname,
  "../../wa-history/leads-with-history.json",
);

interface TranscriptMsg {
  d: "barbie" | "them";
  t: string;
  m: string;
}

interface LeadRecord {
  phone: string;
  stage: string;
  ghosted: boolean;
  msgs: number;
  inbound: number;
  sent_media: boolean;
  last_inbound: string;
  topics_covered: string[];
  next_step: string;
  transcript: TranscriptMsg[];
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL not set");
    process.exit(1);
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    console.error("History file not found:", HISTORY_FILE);
    process.exit(1);
  }

  const raw = fs.readFileSync(HISTORY_FILE, "utf8");
  const leads: LeadRecord[] = JSON.parse(raw);
  console.log(`Loaded ${leads.length} leads from history file`);

  const pg = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  let imported = 0;
  let msgCount = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const phone = lead.phone.replace(/[^\d]/g, "");
      if (!phone || !/^\d{8,15}$/.test(phone)) {
        errors++;
        continue;
      }

      // Upsert lead with correct stage, topics, next_step
      const leadRes = await pg.query(
        `INSERT INTO wa_leads (phone, stage, topics_asked, last_inbound_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (phone) DO UPDATE SET
           stage = EXCLUDED.stage,
           topics_asked = EXCLUDED.topics_asked,
           last_inbound_at = EXCLUDED.last_inbound_at,
           updated_at = NOW()
         RETURNING id`,
        [
          phone,
          lead.stage,
          lead.topics_covered || [],
          lead.last_inbound ? new Date(lead.last_inbound) : null,
        ],
      );
      const leadId = leadRes.rows[0].id;

      // Insert transcript messages
      for (const msg of lead.transcript) {
        const direction = msg.d === "barbie" ? "out" : "in";
        const text = msg.m || "";
        if (!text || text === "[media]") continue; // skip media-only entries

        const ts = new Date(msg.t);

        await pg.query(
          `INSERT INTO wa_messages (lead_id, direction, body, created_at)
           SELECT $1, $2, $3, $4
           WHERE NOT EXISTS (
             SELECT 1 FROM wa_messages
             WHERE lead_id = $1 AND body = $3
               AND created_at BETWEEN $4 - interval '5 seconds' AND $4 + interval '5 seconds'
           )`,
          [leadId, direction, text, ts],
        );
        msgCount++;
      }

      imported++;
      if (imported % 10 === 0) {
        console.log(
          `  Progress: ${imported}/${leads.length} leads, ${msgCount} messages`,
        );
      }
    } catch (e) {
      errors++;
      console.error(`  Error on ${lead.phone}:`, e?.message);
    }
  }

  await pg.end();
  console.log(
    `\nDone: ${imported} leads imported, ${msgCount} messages inserted, ${errors} errors`,
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
