// Apify Integration — Multi-platform scraping
// API Docs: https://docs.apify.com/api/v2
// Supports: Instagram, Facebook, Twitter/X, YouTube, Telegram

import type {
  ScraperProviderInterface,
  ScraperProvider,
  Platform,
  ScrapeJob,
  ScrapedProfile,
  ScrapedPost,
  ScrapedComment,
} from "../scraper-abstraction";
import { normalizeProfile, normalizePost, normalizeComment } from "../scraper-abstraction";

const APIFY_BASE = "https://api.apify.com/v2";

// Apify actor IDs for each platform
const ACTORS = {
  instagram: {
    scraper: "apify/instagram-scraper",
    profiles: "apify/instagram-scraper",
  },
  facebook: {
    pages_scraper: "apify/facebook-pages-scraper",
    posts_scraper: "apify/facebook-posts-scraper",
    groups_scraper: "apify/facebook-groups-scraper",
  },
  twitter: {
    scraper: "apify/twitter-scraper",
  },
  youtube: {
    scraper: "streamers/youtube-scraper",
  },
  telegram: {
    channel_scraper: "viralanalyzer/telegram-channel-scraper",
  },
} as const;

export class ApifyScraper implements ScraperProviderInterface {
  name: ScraperProvider = "apify";
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.APIFY_TOKEN || "";
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  // ── Run an actor and get results ─────────────────────

  private async runActor(
    actorId: string,
    input: Record<string, any>,
    timeoutSecs = 120
  ): Promise<any[]> {
    if (!this.token) throw new Error("APIFY_TOKEN not configured");

    const runUrl = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`;

    const res = await fetch(runUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Apify run failed: ${err.error?.message || res.statusText}`);
    }

    const run = await res.json();
    const runId = run.data?.id;
    if (!runId) throw new Error("No run ID returned");

    // Poll until finished
    const startTime = Date.now();
    const maxWait = timeoutSecs * 1000;

    while (Date.now() - startTime < maxWait) {
      await new Promise((r) => setTimeout(r, 3000));

      const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === "SUCCEEDED") {
        // Get dataset items
        const datasetId = statusData.data?.defaultDatasetId;
        if (datasetId) {
          const itemsRes = await fetch(
            `${APIFY_BASE}/datasets/${datasetId}/items?format=json`,
            { headers: { Authorization: `Bearer ${this.token}` } }
          );
          if (itemsRes.ok) {
            return await itemsRes.json();
          }
        }
        return [];
      }

      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        throw new Error(`Apify run ${status}: ${statusData.data?.statusMessage || "unknown"}`);
      }
    }

    throw new Error("Apify run timed out");
  }

  // ── Instagram ────────────────────────────────────────

  private async scrapeInstagramProfiles(urls: string[]): Promise<ScrapedProfile[]> {
    const results = await this.runActor(ACTORS.instagram.scraper, {
      directUrls: urls.map((u) => (u.includes("/p/") ? u.replace(/\/p\/.*/, "/") : u)),
      resultsLimit: urls.length,
      addParentData: false,
    });
    return results.map((d: any) => normalizeProfile(d, "apify", "instagram"));
  }

  private async scrapeInstagramPosts(urls: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.instagram.scraper, {
      directUrls: urls,
      resultsLimit: limit,
      addParentData: false,
      resultsType: "posts",
    });
    return results.map((d: any) => normalizePost(d, "apify", "instagram"));
  }

  private async scrapeInstagramHashtags(hashtags: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.instagram.scraper, {
      hashtags: hashtags.map((h) => (h.startsWith("#") ? h.slice(1) : h)),
      resultsLimit: limit,
      resultsType: "posts",
    });
    return results.map((d: any) => normalizePost(d, "apify", "instagram"));
  }

  // ── Facebook ─────────────────────────────────────────

  private async scrapeFacebookProfiles(urls: string[]): Promise<ScrapedProfile[]> {
    const results = await this.runActor(ACTORS.facebook.pages_scraper, {
      startUrls: urls.map((u) => ({ url: u })),
      resultsLimit: urls.length,
      scrapeAbout: true,
    });
    return results.map((d: any) => normalizeProfile(d, "apify", "facebook"));
  }

  private async scrapeFacebookPosts(urls: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.facebook.posts_scraper, {
      startUrls: urls.map((u) => ({ url: u + "/posts" })),
      resultsLimit: limit,
    });
    return results.map((d: any) => normalizePost(d, "apify", "facebook"));
  }

  // ── Twitter/X ────────────────────────────────────────

  private async scrapeTwitterProfiles(urls: string[]): Promise<ScrapedProfile[]> {
    const results = await this.runActor(ACTORS.twitter.scraper, {
      startUrls: urls.map((u) => ({ url: u })),
      maxItems: urls.length,
      getFollowers: false,
      getFollowing: false,
    });
    return results.map((d: any) => normalizeProfile(d, "apify", "twitter"));
  }

  private async scrapeTwitterPosts(urls: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.twitter.scraper, {
      startUrls: urls.map((u) => ({ url: u })),
      maxItems: limit,
      addUserInfo: true,
    });
    return results.map((d: any) => normalizePost(d, "apify", "twitter"));
  }

  // ── YouTube ──────────────────────────────────────────

  private async scrapeYouTubeProfiles(urls: string[]): Promise<ScrapedProfile[]> {
    const results = await this.runActor(ACTORS.youtube.scraper, {
      startUrls: urls.map((u) => ({ url: u })),
      maxItems: urls.length,
      scrapeAboutChannel: true,
    });
    return results.map((d: any) => normalizeProfile(d, "apify", "youtube"));
  }

  private async scrapeYouTubePosts(urls: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.youtube.scraper, {
      startUrls: urls.map((u) => ({ url: u + "/videos" })),
      maxItems: limit,
      scrapeTranscript: false,
    });
    return results.map((d: any) => normalizePost(d, "apify", "youtube"));
  }

  // ── Telegram ─────────────────────────────────────────

  private async scrapeTelegramChannels(urls: string[]): Promise<ScrapedProfile[]> {
    const results = await this.runActor(ACTORS.telegram.channel_scraper, {
      channelUrls: urls,
      messagesLimit: 0, // only channel info
    });
    return results.map((d: any) => normalizeProfile(d, "apify", "telegram"));
  }

  private async scrapeTelegramPosts(urls: string[], limit = 20): Promise<ScrapedPost[]> {
    const results = await this.runActor(ACTORS.telegram.channel_scraper, {
      channelUrls: urls,
      messagesLimit: limit,
    });
    return results.map((d: any) => normalizePost(d, "apify", "telegram"));
  }

  // ── Public Interface ─────────────────────────────────

  async scrapeProfiles(platform: Platform, urls: string[]): Promise<ScrapedProfile[]> {
    switch (platform) {
      case "instagram":
        return this.scrapeInstagramProfiles(urls);
      case "facebook":
        return this.scrapeFacebookProfiles(urls);
      case "twitter":
        return this.scrapeTwitterProfiles(urls);
      case "youtube":
        return this.scrapeYouTubeProfiles(urls);
      case "telegram":
        return this.scrapeTelegramChannels(urls);
      default:
        throw new Error(`Platform "${platform}" not supported`);
    }
  }

  async scrapePosts(
    platform: Platform,
    urls: string[],
    limit = 20
  ): Promise<ScrapedPost[]> {
    switch (platform) {
      case "instagram":
        return this.scrapeInstagramPosts(urls, limit);
      case "facebook":
        return this.scrapeFacebookPosts(urls, limit);
      case "twitter":
        return this.scrapeTwitterPosts(urls, limit);
      case "youtube":
        return this.scrapeYouTubePosts(urls, limit);
      case "telegram":
        return this.scrapeTelegramPosts(urls, limit);
      default:
        throw new Error(`Platform "${platform}" not supported`);
    }
  }

  async scrapeComments(
    platform: Platform,
    urls: string[],
    limit = 50
  ): Promise<ScrapedComment[]> {
    if (platform === "instagram") {
      const results = await this.runActor(ACTORS.instagram.scraper, {
        directUrls: urls,
        resultsLimit: limit,
        resultsType: "comments",
      });
      return results.map((d: any) => normalizeComment(d, "apify", "instagram"));
    }
    throw new Error(`Comments scraping for "${platform}" not yet supported`);
  }

  // ── Job Status ───────────────────────────────────────

  async getJobStatus(jobId: string): Promise<ScrapeJob> {
    if (!this.token) throw new Error("APIFY_TOKEN not configured");

    const res = await fetch(`${APIFY_BASE}/actor-runs/${jobId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) throw new Error("Failed to get job status");

    const data = await res.json();
    const run = data.data;

    return {
      id: run.id,
      provider: "apify",
      platform: "instagram", // default, could be inferred
      target: "profiles",
      status:
        run.status === "SUCCEEDED"
          ? "completed"
          : run.status === "RUNNING"
          ? "running"
          : run.status === "FAILED"
          ? "failed"
          : "pending",
      input: {},
      result_count: 0,
      error: run.statusMessage || undefined,
      created_at: run.startedAt || new Date().toISOString(),
      completed_at: run.finishedAt || undefined,
    };
  }
}
