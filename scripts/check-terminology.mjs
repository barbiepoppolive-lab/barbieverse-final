#!/usr/bin/env node
/**
 * Terminology guard.
 *
 * The audience is "streamers", never "creators". That rule lives in exactly
 * one place — src/lib/ai/brand-terminology.ts — and every prompt imports it.
 *
 * This script fails if anything reintroduces a contradicting literal into a
 * prompt template. It exists because the rule has been silently reversed
 * before, and a reversal in a prompt string produces wrong copy with no test
 * failure, no type error, and no obvious diff signal.
 *
 * Run:  node scripts/check-terminology.mjs
 * Or:   npm run check:terminology
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
// fileURLToPath lives in node:url, not node:path. It is what makes this work
// on Windows — `new URL(...).pathname` yields "/C:/Users/..." there, which is
// not a valid filesystem path.
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");
const SRC = join(ROOT, "src");

// The one file allowed to define the rule.
const SOURCE_OF_TRUTH = "src/lib/ai/brand-terminology.ts";

// Identifiers that legitimately contain "creator" — DB tables, routes,
// config modules. Renaming these would require a migration; they are not
// output copy and are deliberately exempt.
const ALLOWED_IDENTIFIER_PATTERNS = [
  /creator[_-]?leads/i,
  /creator[_-]config/i,
  /creatorLeads/,
  /admin\.creator/i,
  /\/creator-/i,
];

const VIOLATIONS = [
  {
    // The exact reversal that has happened before.
    re: /call the audience ["']creators["'],?\s*never ["']streamers["']/gi,
    msg: 'Terminology reversed — says "creators, never streamers".',
  },
  {
    re: /the people doing it are ["']creators["']/gi,
    msg: 'Terminology reversed — asserts the audience are "creators".',
  },
  {
    // A second TERMINOLOGY block anywhere but the source of truth means
    // someone re-inlined a copy instead of importing the constant.
    re: /TERMINOLOGY \(STRICT\)/g,
    msg: "Inlined TERMINOLOGY block. Import TERMINOLOGY_RULES from brand-terminology.ts instead.",
  },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

let failures = 0;

// Non-global copies for cheap whole-file pre-filtering. Scanning line-by-line
// across every file is far too slow; almost no file contains a violation, so
// test the whole blob first and only walk lines on the rare hit.
const PREFILTER = VIOLATIONS.map((v) => ({
  ...v,
  probe: new RegExp(v.re.source, v.re.flags.replace("g", "")),
}));

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === SOURCE_OF_TRUTH) continue;

  const text = readFileSync(file, "utf8");

  const hits = PREFILTER.filter((v) => v.probe.test(text));
  if (hits.length === 0) continue;

  const lines = text.split("\n");
  for (const { probe, msg } of hits) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!probe.test(line)) continue;
      if (ALLOWED_IDENTIFIER_PATTERNS.some((p) => p.test(line))) continue;
      failures++;
      console.error(`\n  ${rel}:${i + 1}`);
      console.error(`    ${msg}`);
      console.error(`    > ${line.trim().slice(0, 100)}`);
    }
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} terminology violation(s).\n` +
      `The audience is "streamers". Edit ${SOURCE_OF_TRUTH} if you want to change that —\n` +
      `do not inline a variant into a prompt template.\n`,
  );
  process.exit(1);
}

console.log("Terminology OK — all prompts reference the shared constant.");
