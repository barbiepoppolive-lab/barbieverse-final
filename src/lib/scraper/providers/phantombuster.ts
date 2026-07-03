// Phantombuster Integration — Instagram deep scraping
// API Docs: https://docs.phantombuster.com/
// Supports: profiles, posts, followers, hashtags, comments

import type {
  ScraperProviderInterface,
  ScraperProvider,
  Platform,
  ScrapeJob,
  ScrapedProfile,
  ScrapedPost,
  ScrapedComment,
} from "../scraper-abstraction";
import { normalizeProfile, normalizePost } from "../scraper-abstraction";

const PHANTOMBUSTER_BASE = "https://api.phantombuster.com/api/v2";

// Phantombuster agent IDs for Instagram
// These are the standard agent packages
const AGENTS = {
  instagram_profile_scraper: "2360939817830865", // Instagram Profile Scraper
  instagram_post_scraper: "1064839648819498", // Instagram Post Scraper
  instagram_hashtag_collector: "2864799521912376", // Instagram Hashtag Collector
  instagram_follower_collector: "1842630292475809", // Instagram Follower Collector
} as const;

export class PhantombusterScraper implements ScraperProviderInterface {
  name: ScraperProvider = "phantombuster";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PHANTOMBUSTER_API_KEY || "";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ── Launch a phantom and wait for results ────────────

  private async launchPhantom(
    agentId: string,
    args: Record<string, any>
  ): Promise<any> {
    if (!this.apiKey) throw new Error("PHANTOMBUSTER_API_KEY not configured");

    const res = await fetch(`${PHANTOMBUSTER_BASE}/phantoms/launch`, {
      method: "POST",
      headers: {
        "X-Phantombuster-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId,
        arguments: args,
        output: "json",
        cooldown: 30, // seconds between retries
        maxRetries: 3,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Phantombuster launch failed: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return data; // { id, status, outputUrl, ... }
  }

  private async getPhantomOutput(phantomId: string): Promise<any[]> {
    const res = await fetch(`${PHANTOMBUSTER_BASE}/phantoms/${phantomId}`, {
      headers: { "X-Phantombuster-Key": this.apiKey },
    });

    if (!res.ok) throw new Error("Failed to get phantom status");

    const phantom = await res.json();

    if (phantom.status === "running") {
      // Wait and retry
      await new Promise((r) => setTimeout(r, 5000));
      return this.getPhantomOutput(phantomId);
    }

    if (phantom.status === "completed" && phantom.outputUrl) {
      const outputRes = await fetch(phantom.outputUrl);
      const outputText = await outputRes.text();
      // Phantombuster outputs newline-delimited JSON
      return outputText
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }

    if (phantom.status === "error") {
      throw new Error(`Phantom failed: ${phantom.error || "unknown error"}`);
    }

    return [];
  }

  // ── Scrape Instagram Profiles ────────────────────────

  async scrapeProfiles(
    platform: Platform,
    urls: string[]
  ): Promise<ScrapedProfile[]> {
    if (platform !== "instagram") {
      throw new Error("Phantombuster only supports Instagram profiles");
    }

    const result = await this.launchPhantom(AGENTS.instagram_profile_scraper, {
      profiles: urls.join("\n"),
      "session-file": "",
    });

    const rawData = await this.getPhantomOutput(result.id);
    return rawData.map((d) => normalizeProfile(d, "phantombuster", "instagram"));
  }

  // ── Scrape Instagram Posts ───────────────────────────

  async scrapePosts(
    platform: Platform,
    urls: string[],
    limit = 20
  ): Promise<ScrapedPost[]> {
    if (platform !== "instagram") {
      throw new Error("Phantombuster only supports Instagram posts");
    }

    const result = await this.launchPhantom(AGENTS.instagram_post_scraper, {
      "post-urls": urls.join("\n"),
      "number-of-posts": limit,
      "session-file": "",
    });

    const rawData = await this.getPhantomOutput(result.id);
    return rawData.map((d) => normalizePost(d, "phantombuster", "instagram"));
  }

  // ── Scrape Instagram Followers ───────────────────────

  async scrapeFollowers(
    platform: Platform,
    profileUrls: string[],
    limit = 100
  ): Promise<ScrapedProfile[]> {
    if (platform !== "instagram") {
      throw new Error("Phantombuster only supports Instagram followers");
    }

    const result = await this.launchPhantom(AGENTS.instagram_follower_collector, {
      "profile-url": profileUrls[0],
      "number-of-followers": limit,
      "session-file": "",
    });

    const rawData = await this.getPhantomOutput(result.id);
    return rawData.map((d) => normalizeProfile(d, "phantombuster", "instagram"));
  }

  // ── Scrape Instagram Hashtags ────────────────────────

  async scrapeHashtags(
    hashtags: string[],
    limit = 20
  ): Promise<ScrapedPost[]> {
    const result = await this.launchPhantom(AGENTS.instagram_hashtag_collector, {
      hashtags: hashtags.join("\n"),
      "number-of-posts": limit,
      "session-file": "",
    });

    const rawData = await this.getPhantomOutput(result.id);
    return rawData.map((d) => normalizePost(d, "phantombuster", "instagram"));
  }

  // ── Job Status ───────────────────────────────────────

  async getJobStatus(jobId: string): Promise<ScrapeJob> {
    const res = await fetch(`${PHANTOMBUSTER_BASE}/phantoms/${jobId}`, {
      headers: { "X-Phantombuster-Key": this.apiKey },
    });

    if (!res.ok) throw new Error("Failed to get job status");

    const phantom = await res.json();

    return {
      id: phantom.id,
      provider: "phantombuster",
      platform: "instagram",
      target: "profiles",
      status:
        phantom.status === "completed"
          ? "completed"
          : phantom.status === "running"
          ? "running"
          : phantom.status === "error"
          ? "failed"
          : "pending",
      input: phantom.args || {},
      result_count: phantom.output?.length || 0,
      error: phantom.error || undefined,
      created_at: phantom.createdAt || new Date().toISOString(),
      completed_at: phantom.status === "completed" ? new Date().toISOString() : undefined,
    };
  }
}
