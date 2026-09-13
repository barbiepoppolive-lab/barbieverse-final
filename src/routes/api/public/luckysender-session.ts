// LuckySender session endpoint — records session start/end data
// Called by the Android app when a tapping session begins or ends

import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/public/luckysender-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            deviceId,
            sessionId,
            action,
            startedAt,
            endedAt,
            tapMode,
            totalTaps,
            totalWins,
            winRate,
            totalGiftCost,
            totalHostEarnings,
            balanceStart,
            balanceEnd,
            balanceChange,
            netProfit,
            stopReason,
          } = body;

          if (!deviceId) {
            return new Response(JSON.stringify({ error: "deviceId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (action === "start") {
            const { error } = await supabase.from("luckysender_sessions").insert({
              device_id: deviceId,
              session_id: sessionId || null,
              started_at: startedAt || new Date().toISOString(),
              tap_mode: tapMode || 0,
              balance_start: balanceStart || 0,
            });

            if (error) {
              console.error("Session start error:", error);
              return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
          } else if (action === "end") {
            // Find the latest session for this device and update it
            const { data: existing, error: findErr } = await supabase
              .from("luckysender_sessions")
              .select("id")
              .eq("device_id", deviceId)
              .is("ended_at", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (findErr || !existing) {
              console.error("Session find error:", findErr);
              // Insert a new session record with all data
              const { error } = await supabase.from("luckysender_sessions").insert({
                device_id: deviceId,
                session_id: sessionId || null,
                started_at: startedAt || new Date().toISOString(),
                ended_at: endedAt || new Date().toISOString(),
                tap_mode: tapMode || 0,
                total_taps: totalTaps || 0,
                total_wins: totalWins || 0,
                win_rate: winRate || 0,
                total_gift_cost: totalGiftCost || 0,
                total_host_earnings: totalHostEarnings || 0,
                balance_start: balanceStart || 0,
                balance_end: balanceEnd || 0,
                balance_change: balanceChange || 0,
                net_profit: netProfit || 0,
                stop_reason: stopReason || "",
              });
              if (error) console.error("Session fallback insert error:", error);
            } else {
              const { error } = await supabase
                .from("luckysender_sessions")
                .update({
                  ended_at: endedAt || new Date().toISOString(),
                  total_taps: totalTaps || 0,
                  total_wins: totalWins || 0,
                  win_rate: winRate || 0,
                  total_gift_cost: totalGiftCost || 0,
                  total_host_earnings: totalHostEarnings || 0,
                  balance_end: balanceEnd || 0,
                  balance_change: balanceChange || 0,
                  net_profit: netProfit || 0,
                  stop_reason: stopReason || "",
                })
                .eq("id", existing.id);

              if (error) {
                console.error("Session update error:", error);
              }
            }

            // Update device totals
            const { error: devErr } = await supabase
              .from("luckysender_devices")
              .update({
                total_taps: totalTaps || 0,
                total_host_earnings: totalHostEarnings || 0,
                total_gift_cost: totalGiftCost || 0,
                updated_at: new Date().toISOString(),
              })
              .eq("device_id", deviceId);

            if (devErr) console.error("Device update error:", devErr);
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Session error:", err);
          return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
