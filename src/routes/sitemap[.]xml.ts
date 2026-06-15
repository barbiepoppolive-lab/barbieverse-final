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
          { path: "/blog", changefreq: "daily", priority: "0.8" },
          { path: "/track-application", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
          { path: "/creator-reward-policy", changefreq: "yearly", priority: "0.4" },
          { path: "/recharge-policy", changefreq: "yearly", priority: "0.4" },
          { path: "/blog/how-to-earn-money-on-poppo-live-india", changefreq: "monthly", priority: "0.9" },
        ];

        // Dynamic: published blog posts
        let postEntries: SitemapEntry[] = [];
        try {
          const { q } = await import("@/lib/db.server");
          const rows = await q<{ slug: string; updated_at: string }>(
            `SELECT slug, updated_at FROM posts WHERE published = true ORDER BY updated_at DESC LIMIT 1000`,
          );
          postEntries = rows.map((r) => ({
            path: `/blog/${r.slug}`,
            lastmod: new Date(r.updated_at).toISOString(),
            changefreq: "monthly" as const,
            priority: "0.7",
          }));
        } catch (e) {
          console.error("[sitemap] failed to load posts", e);
        }

        const entries = [...staticEntries, ...postEntries];
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
