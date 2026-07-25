import pg from "pg";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres.bvkgwdckvqqxpszacrxv:barbieverse-final@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    // Check hot+warm leads with comments
    const sample = await pool.query(`
      SELECT id, platform, post_url, post_text, author_name, author_username,
             ai_generated_comment, ai_category, ai_confidence, status
      FROM social_leads
      WHERE ai_category IN ('hot', 'warm')
      AND ai_generated_comment IS NOT NULL
      AND ai_generated_comment != ''
      ORDER BY ai_confidence DESC
      LIMIT 10
    `);
    console.log(`Hot/warm leads with comments: ${sample.rows.length} (showing top 10)`);
    for (const r of sample.rows) {
      const comment = r.ai_generated_comment?.slice(0, 80);
      console.log(`  [${r.ai_category}] ${r.platform} | ${r.author_name} | conf:${r.ai_confidence}`);
      console.log(`    URL: ${r.post_url}`);
      console.log(`    Comment: "${comment}..."`);
      console.log(`    Status: ${r.status}`);
      console.log();
    }

    // Check how many have no comment
    const noComment = await pool.query(`
      SELECT count(*) as count FROM social_leads
      WHERE ai_category IN ('hot', 'warm')
      AND (ai_generated_comment IS NULL OR ai_generated_comment = '')
    `);
    console.log(`Hot/warm without comments: ${noComment.rows[0].count}`);

    // Check by platform
    const byPlatform = await pool.query(`
      SELECT platform, ai_category, count(*) as count
      FROM social_leads
      WHERE ai_category IN ('hot', 'warm')
      GROUP BY platform, ai_category
      ORDER BY platform, ai_category
    `);
    console.log("\nBy platform + category:");
    for (const r of byPlatform.rows) console.log(`  ${r.platform} ${r.ai_category}: ${r.count}`);

    // Check statuses
    const byStatus = await pool.query(`
      SELECT status, count(*) as count FROM social_leads
      WHERE ai_category IN ('hot', 'warm')
      GROUP BY status ORDER BY count DESC
    `);
    console.log("\nBy status:");
    for (const r of byStatus.rows) console.log(`  ${r.status}: ${r.count}`);

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}

check();
