#!/usr/bin/env node
/**
 * Postiz credential checker.
 *
 * Run after pasting POSTIZ_API_KEY into .env. It will:
 *   1. Confirm the API key works
 *   2. List every channel connected in your Postiz account
 *   3. Print the exact env-var lines to paste for the four platforms
 *   4. Flag any integration ID in .env that no longer matches
 *
 * Usage:  node scripts/check-postiz.mjs
 * Or:     npm run check:postiz
 *
 * Lives in scripts/ rather than the repo root so cleanup passes that sweep
 * stray root-level files don't eat it — an earlier copy at ./check-postiz.ts
 * was deleted exactly that way.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Not `new URL("..", import.meta.url).pathname` — on Windows that yields
// "/C:/Users/..." with a leading slash, which is not a valid path.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader — avoids a dotenv dependency for a standalone script. */
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!m) continue;
      env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("Could not read .env — run this from the repo root.\n");
    process.exit(1);
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };

const BASE =
  (env.POSTIZ_BASE_URL || "").replace(/\/+$/, "") ||
  "https://api.postiz.com/public/v1";
const API_KEY = env.POSTIZ_API_KEY;

// Postiz __type -> the env var our publishers read.
const PLATFORM_ENV = {
  facebook: "FACEBOOK_INTEGRATION_ID",
  instagram: "INSTAGRAM_INTEGRATION_ID",
  youtube: "YOUTUBE_INTEGRATION_ID",
  "linkedin-page": "LINKEDIN_INTEGRATION_ID",
};

async function main() {
  console.log(`\nPostiz endpoint: ${BASE}\n`);

  if (!API_KEY) {
    console.error("FAIL  POSTIZ_API_KEY is not set in .env");
    console.error("      Get one from Postiz > Settings > Public API.\n");
    process.exit(1);
  }

  let res;
  try {
    // Postiz takes the raw key on the REST API — no "Bearer " prefix.
    // (The MCP endpoint does use Bearer. Different endpoints, both correct.)
    res = await fetch(`${BASE}/integrations`, {
      headers: { Authorization: API_KEY },
    });
  } catch (e) {
    console.error(`FAIL  Could not reach ${BASE}`);
    console.error(`      ${e?.message || e}`);
    console.error("      If self-hosting, check POSTIZ_BASE_URL and that the service is up.\n");
    process.exit(1);
  }

  if (res.status === 401) {
    console.error("FAIL  401 — key rejected. Regenerate in Postiz > Settings > Public API.\n");
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`FAIL  HTTP ${res.status} from GET /integrations`);
    console.error(`      ${(await res.text()).slice(0, 400)}\n`);
    process.exit(1);
  }

  const body = await res.json();
  const integrations = Array.isArray(body) ? body : body?.integrations ?? [];

  console.log(`OK    Key valid. ${integrations.length} channel(s) connected.\n`);

  if (integrations.length === 0) {
    console.log("No channels connected yet. In Postiz, add Facebook, Instagram,");
    console.log("YouTube and LinkedIn (Company Page), then re-run this.\n");
    return;
  }

  console.log("Connected channels:");
  for (const i of integrations) {
    const type = i.providerIdentifier || i.identifier || "?";
    console.log(
      `  - ${(i.name || "unnamed").padEnd(26)} type=${String(type).padEnd(16)} id=${i.id}` +
        (i.disabled ? "  [DISABLED]" : ""),
    );
  }

  console.log("\nPaste into .env (and set the same on Railway):\n");

  const missing = [];
  for (const [type, envVar] of Object.entries(PLATFORM_ENV)) {
    const match = integrations.find(
      (i) => (i.providerIdentifier || i.identifier) === type && !i.disabled,
    );
    if (!match) {
      missing.push(`${envVar}  (no active "${type}" channel)`);
      continue;
    }
    console.log(`${envVar}=${match.id}`);
    const current = env[envVar];
    if (current && current !== match.id) {
      console.log(`  ^ WARNING: .env currently has ${current} — stale, replace it.`);
    }
  }

  if (missing.length) {
    console.log("\nStill to connect:");
    for (const m of missing) console.log(`  - ${m}`);
  }

  console.log(
    '\nNote: LinkedIn must be a Company Page channel — the publisher sends\n' +
      '__type "linkedin-page", not plain "linkedin".\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
