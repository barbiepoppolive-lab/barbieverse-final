// CSV/JSON Import Service — Manual lead import from files
// Supports: CSV, JSON, TSV files for all platforms

import type { Platform, ScrapedProfile, ScrapedPost } from "../scraper-abstraction";
import { normalizeProfile, detectPlatform } from "../scraper-abstraction";

// ── CSV Parser ─────────────────────────────────────────

function parseCSVLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string, delimiter = ","): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

// ── File Import ────────────────────────────────────────

export interface ImportResult {
  profiles: ScrapedProfile[];
  posts: ScrapedPost[];
  errors: string[];
  totalRows: number;
  successRows: number;
}

export async function importFromFile(
  content: string,
  filename: string,
  platformHint?: Platform
): Promise<ImportResult> {
  const ext = filename.split(".").pop()?.toLowerCase();
  const result: ImportResult = {
    profiles: [],
    posts: [],
    errors: [],
    totalRows: 0,
    successRows: 0,
  };

  try {
    if (ext === "json") {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      result.totalRows = items.length;

      for (const item of items) {
        try {
          const platform = platformHint || detectPlatform(item.url || item.profile_url || "") || "instagram";
          const profile = normalizeProfile(item, "csv", platform);
          if (profile.username) {
            result.profiles.push(profile);
            result.successRows++;
          } else {
            result.errors.push(`Row: missing username`);
          }
        } catch (e: any) {
          result.errors.push(`Row: ${e.message}`);
        }
      }
    } else if (ext === "csv" || ext === "tsv") {
      const delimiter = ext === "tsv" ? "\t" : ",";
      const rows = parseCSV(content, delimiter);
      result.totalRows = rows.length;

      for (const row of rows) {
        try {
          // Auto-detect platform from URL or handle/username fields
          const url = row.url || row.profile_url || row["Profile URL"] || "";
          const platform = platformHint || detectPlatform(url) || "instagram";

          const profile = normalizeProfile(row, "csv", platform);
          if (profile.username) {
            result.profiles.push(profile);
            result.successRows++;
          } else {
            result.errors.push(`Row ${result.successRows + result.errors.length + 1}: missing username`);
          }
        } catch (e: any) {
          result.errors.push(`Row: ${e.message}`);
        }
      }
    } else {
      result.errors.push(`Unsupported file format: ${ext}`);
    }
  } catch (e: any) {
    result.errors.push(`Parse error: ${e.message}`);
  }

  return result;
}

// ── Template Generators ────────────────────────────────

export const CSV_TEMPLATES = {
  instagram: `username,full_name,bio,followers,following,posts,is_verified,is_business,website,email
 exampleuser,Example User,"Digital creator",15000,500,120,true,true,https://example.com,hello@example.com`,

  facebook: `page_name,page_id,category,followers,likes,about,website
 ExamplePage,123456789,Digital Creator,25000,30000,"We create digital art",https://example.com`,

  twitter: `username,name,description,followers,following,tweets,is_verified
 exampleuser,Example User,"Digital creator & artist",12000,300,500,true`,

  youtube: `channel_name,channel_id,subscribers,description,video_count
 Example Channel,UC1234567890,50000,"We create amazing videos",150`,

  telegram: `channel_name,username,members,description
 Example Channel,examplechannel,10000,"Our official channel"`,
};

export function getCSVTemplate(platform: Platform): string {
  return CSV_TEMPLATES[platform] || CSV_TEMPLATES.instagram;
}
