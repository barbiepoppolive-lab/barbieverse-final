import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron-social")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify cron secret
        const cronSecret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");

        if (!cronSecret || provided !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
          const results = await monitorAllPlatforms();

          return Response.json({
            ok: true,
            timestamp: new Date().toISOString(),
            results,
          });
        } catch (e: any) {
          console.error("[cron-social] Error:", e?.message);
          return Response.json(
            { ok: false, error: e?.message },
            { status: 500 }
          );
        }
      },

      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret");

        if (!cronSecret || provided !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
          const results = await monitorAllPlatforms();

          return Response.json({
            ok: true,
            timestamp: new Date().toISOString(),
            results,
          });
        } catch (e: any) {
          console.error("[cron-social] Error:", e?.message);
          return Response.json(
            { ok: false, error: e?.message },
            { status: 500 }
          );
        }
      },
    },
  },
});