// LuckySender heartbeat endpoint — receives device heartbeats every 60s
// Called by the Android app to report device health and status

import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/public/luckysender-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            deviceId,
            deviceName,
            deviceModel,
            deviceBrand,
            appVersion,
            balance,
            tapsTotal,
            tapsSession,
            winRate,
            status,
            poppoRunning,
            uptimeMs,
          } = body;

          if (!deviceId) {
            return new Response(JSON.stringify({ error: "deviceId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Upsert device (update last_heartbeat + stats)
          const { error: upsertErr } = await supabase
            .from("luckysender_devices")
            .upsert(
              {
                device_id: deviceId,
                device_name: deviceName || null,
                device_model: deviceModel || null,
                device_brand: deviceBrand || null,
                app_version: appVersion || "1.0",
                last_heartbeat: new Date().toISOString(),
                status: status || "online",
                balance: balance || 0,
                total_taps: tapsTotal || 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "device_id" }
            );

          if (upsertErr) {
            console.error("Device upsert error:", upsertErr);
          }

          // Insert heartbeat row
          const { error: hbErr } = await supabase.from("luckysender_heartbeats").insert({
            device_id: deviceId,
            balance: balance || 0,
            taps_total: tapsTotal || 0,
            taps_session: tapsSession || 0,
            win_rate: winRate || 0,
            status: status || "online",
            poppo_running: poppoRunning || false,
            uptime_ms: uptimeMs || 0,
          });

          if (hbErr) {
            console.error("Heartbeat insert error:", hbErr);
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Heartbeat error:", err);
          return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
