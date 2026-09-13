import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Radio,
  Smartphone,
  Activity,
  TrendingUp,
  Clock,
  Coins,
  Wifi,
  WifiOff,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/luckysender")({
  component: LuckySenderDashboard,
});

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card/60 p-5 backdrop-blur-md transition-all duration-200 ${
        accent
          ? "border-primary/40 shadow-[0_0_20px_oklch(0.72_0.12_210/0.08)]"
          : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon
          className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`}
        />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      {sub && (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: "bg-emerald-500/20 text-emerald-400",
    tapping: "bg-primary/20 text-primary",
    idle: "bg-yellow-500/20 text-yellow-400",
    offline: "bg-muted text-muted-foreground",
    error: "bg-destructive/20 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] || colors.offline}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "online" || status === "tapping"
            ? "bg-emerald-400 animate-pulse"
            : status === "idle"
              ? "bg-yellow-400"
              : "bg-muted-foreground"
        }`}
      />
      {status}
    </span>
  );
}

function LuckySenderDashboard() {
  const { data: devices } = useQuery({
    queryKey: ["luckysender", "devices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("luckysender_devices")
        .select("*")
        .order("updated_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const { data: recentSessions } = useQuery({
    queryKey: ["luckysender", "sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("luckysender_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const { data: recentHeartbeats } = useQuery({
    queryKey: ["luckysender", "heartbeats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("luckysender_heartbeats")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const onlineDevices = devices?.filter(
    (d) => d.status === "online" || d.status === "tapping"
  ) || [];
  const totalTaps = devices?.reduce((sum, d) => sum + (d.total_taps || 0), 0) || 0;
  const totalHostEarnings =
    devices?.reduce((sum, d) => sum + (d.total_host_earnings || 0), 0) || 0;
  const totalGiftCost =
    devices?.reduce((sum, d) => sum + (d.total_gift_cost || 0), 0) || 0;
  const latestHeartbeat = recentHeartbeats?.[0];
  const currentBalance = latestHeartbeat?.balance || 0;

  const formatCoins = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const timeSince = (ts: string | null) => {
    if (!ts) return "never";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">LuckySender</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Device monitoring &amp; performance dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={Wifi}
          label="Online Devices"
          value={`${onlineDevices.length}/${devices?.length || 0}`}
          accent
        />
        <Stat icon={Zap} label="Total Taps" value={totalTaps.toLocaleString()} />
        <Stat
          icon={Coins}
          label="Coins Sent to Host"
          value={formatCoins(totalHostEarnings)}
          sub={`from ${formatCoins(totalGiftCost)} sent`}
        />
        <Stat
          icon={TrendingUp}
          label="Balance Remaining"
          value={formatCoins(currentBalance)}
        />
        <Stat
          icon={Activity}
          label="Win Rate"
          value={
            totalTaps > 0
              ? `${((recentSessions?.[0]?.win_rate || 0) * 100).toFixed(1)}%`
              : "—"
          }
        />
      </div>

      {/* Device Table */}
      <div className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
        <h3 className="font-display text-lg font-bold">Devices</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4">Device</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Taps Today</th>
                <th className="pb-3 pr-4">Coins Sent</th>
                <th className="pb-3 pr-4">Host Commission</th>
                <th className="pb-3 pr-4">Balance</th>
                <th className="pb-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {devices?.map((d) => (
                <tr
                  key={d.device_id}
                  className="border-b border-border/20 transition-colors hover:bg-muted/30"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{d.device_name || d.device_model || d.device_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{d.device_brand} {d.device_model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={d.status || "offline"} />
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm">
                    {(d.total_taps || 0).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm">
                    {formatCoins(d.total_gift_cost || 0)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm text-primary">
                    {formatCoins(d.total_host_earnings || 0)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm">
                    {formatCoins(d.balance || 0)}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {timeSince(d.last_heartbeat)}
                  </td>
                </tr>
              ))}
              {(!devices || devices.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No devices connected yet. Install the app and enable the service.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
          <h3 className="font-display text-lg font-bold">Recent Sessions</h3>
          <div className="mt-4 space-y-3">
            {recentSessions?.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${s.ended_at ? "bg-muted-foreground" : "bg-emerald-400 animate-pulse"}`}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {s.device_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.total_taps || 0} taps · {s.total_wins || 0} wins
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono text-sm ${(s.net_profit || 0) >= 0 ? "text-emerald-400" : "text-destructive"}`}
                  >
                    {(s.net_profit || 0) >= 0 ? "+" : ""}
                    {formatCoins(s.net_profit || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Host: {formatCoins(s.total_host_earnings || 0)}
                  </div>
                </div>
              </div>
            ))}
            {(!recentSessions || recentSessions.length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No sessions recorded yet
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
          <h3 className="font-display text-lg font-bold">Live Heartbeats</h3>
          <div className="mt-4 space-y-2">
            {recentHeartbeats?.slice(0, 12).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/15 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{h.device_id.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>Bal: {formatCoins(h.balance || 0)}</span>
                  <span>Taps: {h.taps_session || 0}</span>
                  <span>{h.poppo_running ? "🟢" : "⚪"}</span>
                </div>
              </div>
            ))}
            {(!recentHeartbeats || recentHeartbeats.length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Waiting for device heartbeats...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
