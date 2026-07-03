// Scraper Module — Public API
// Multi-platform scraping: Instagram, Facebook, Twitter/X, YouTube, Telegram

export {
  // Abstraction
  type ScraperProvider,
  type Platform,
  type ScrapeTarget,
  type ScrapeJobStatus,
  type ScrapeJob,
  type ScrapedProfile,
  type ScrapedPost,
  type ScrapedComment,
  type ScraperProviderInterface,
  detectPlatform,
  extractUsername,
  normalizeProfile,
  normalizePost,
  normalizeComment,
  PLATFORM_PATTERNS,
} from "./scraper-abstraction";

// Providers
export { PhantombusterScraper } from "./providers/phantombuster";
export { ApifyScraper } from "./providers/apify";

// Import
export {
  importFromFile,
  getCSVTemplate,
  CSV_TEMPLATES,
  type ImportResult,
} from "./providers/csv-import";
