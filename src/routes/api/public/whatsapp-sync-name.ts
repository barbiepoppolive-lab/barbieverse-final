import { createFileRoute } from "@tanstack/react-router";

/**
 * POST { phone: "919876543210", name: "Priya" }
 * Called by the Railway bot when it resolves a contact name.
 * Updates wa_leads.display_name so the dashboard shows real names.
 */
export const Route = createFileRoute("/api/public/whatsapp-sync-name")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad json" }, { status: 400 });
        }

        const phone = String(body.phone || "").replace(/[^\d]/g, "");
        const name = String(body.name || "").trim();
        if (!phone || !name) {
          return Response.json(
            { error: "phone and name required" },
            { status: 400 },
          );
        }

        try {
          const { q } = await import("@/lib/db.server");
          // Upsert: update name if lead exists, no-op if not
          await q(
            `update wa_leads set display_name = $2, updated_at = now()
             where phone = $1 and (display_name is null or display_name = '')`,
            [phone, name],
          );
          return Response.json({ ok: true, phone, name });
        } catch (e: any) {
          console.error("[whatsapp-sync-name]", e?.message);
          return Response.json({ error: e?.message }, { status: 500 });
        }
      },
    },
  },
});
