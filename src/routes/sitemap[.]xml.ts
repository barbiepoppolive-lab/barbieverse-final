import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = process.env.PUBLIC_APP_URL || "https://barbieverse-final-production.up.railway.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/join", changefreq: "weekly", priority: "0.9" },
          { path: "/coins", changefreq: "weekly", priority: "0.9" },
          { path: "/academy", changefreq: "monthly", priority: "0.9" },
          { path: "/academy/what-is-poppo-live", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/coins-points-gifts-explained", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/vone-app-india", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/how-to-become-poppo-host", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/poppo-live-earning-india", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/poppo-daily-tasks", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/pk-battle-guide", changefreq: "monthly", priority: "0.8" },
          { path: "/academy/poppo-withdrawal-guide", changefreq: "monthly", priority: "0.8" },
          { path: "/track-application", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
          { path: "/creator-reward-policy", changefreq: "yearly", priority: "0.4" },
          { path: "/recharge-policy", changefreq: "yearly", priority: "0.4" },
        ];

        const entries = [...staticEntries];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
