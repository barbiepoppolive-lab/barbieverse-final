import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = process.env.PUBLIC_APP_URL || "https://barbieverse.org";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          `User-agent: *`,
          `Allow: /`,
          `Disallow: /admin`,
          `Disallow: /api/`,
          ``,
          `Sitemap: ${BASE_URL}/sitemap.xml`,
          ``,
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
