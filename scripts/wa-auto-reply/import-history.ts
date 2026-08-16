// One-time import: no dedup check, uses ON CONFLICT for idempotency
import fs from "fs";
import path from "path";
import { Client } from "pg";

const HISTORY_FILE = path.resolve(
  import.meta.dirname,
  "../../wa-history/leads-with-history.json",
);

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) { console.error("SUPABASE_DB_URL not set"); process.exit(1); }

  const leads = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  console.log(`Loaded ${leads.length} leads`);

  const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  let imported = 0;
  let msgCount = 0;

  for (const lead of leads) {
    const phone = (lead.phone || "").replace(/[^\d]/g, "");
    if (!phone || !/^\d{8,15}$/.test(phone)) continue;

    try {
      await pg.query("BEGIN");

      const leadRes = await pg.query(
        `INSERT INTO wa_leads (phone, stage, topics_asked, last_inbound_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (phone) DO UPDATE SET
           stage = EXCLUDED.stage,
           topics_asked = EXCLUDED.topics_asked,
           last_inbound_at = EXCLUDED.last_inbound_at,
           updated_at = NOW()
         RETURNING id`,
        [phone, lead.stage, lead.topics_covered || [], lead.last_inbound ? new Date(lead.last_inbound) : null],
      );
      const leadId = leadRes.rows[0].id;

      // Bulk insert messages via COPY
      const msgs = (lead.transcript || []).filter(
        (m: any) => m.m && m.m !== "[media]",
      );
      if (msgs.length > 0) {
        // Build VALUES list for bulk insert
        const values: any[] = [];
        const placeholders: string[] = [];
        let idx = 1;
        for (const msg of msgs) {
          const direction = msg.d === "barbie" ? "out" : "in";
          const ts = new Date(msg.t).toISOString();
          values.push(leadId, direction, msg.m, ts);
          placeholders.push(`($${idx},$${idx + 1},$${idx + 2},$${idx + 3}::timestamptz)`);
          idx += 4;
        }
        await pg.query(
          `INSERT INTO wa_messages (lead_id, direction, body, created_at) VALUES ${placeholders.join(",")}`,
          values,
        );
        msgCount += msgs.length;
      }

      await pg.query("COMMIT");
      imported++;
      if (imported % 10 === 0) console.log(`  ${imported}/${leads.length} leads, ${msgCount} msgs`);
    } catch (e: any) {
      await pg.query("ROLLBACK");
      console.error(`  Error ${phone}: ${e?.message?.slice(0, 100)}`);
    }
  }

  await pg.end();
  console.log(`Done: ${imported} leads, ${msgCount} messages`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
