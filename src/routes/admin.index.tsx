import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { leadStats, leadDailySeries } from "@/lib/api/leads.functions";
import { orderStats } from "@/lib/api/orders.functions";
import { Users, ShoppingCart, IndianRupee, Clock, Sparkles, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const leadsQO = queryOptions({ queryKey: ["admin", "lead-stats"], queryFn: () => leadStats() });
const ordersQO = queryOptions({ queryKey: ["admin", "order-stats"], queryFn: () => orderStats() });
const seriesQO = queryOptions({
  queryKey: ["admin", "lead-series"],
  queryFn: () => leadDailySeries(),
});

export const Route = createFileRoute("/admin/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(leadsQO),
      context.queryClient.ensureQueryData(ordersQO),
      context.queryClient.ensureQueryData(seriesQO),
    ]);
  },
  component: Overview,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function Overview() {
  const { data: l } = useSuspenseQuery(leadsQO);
  const { data: o } = useSuspenseQuery(ordersQO);
  const { data: series } = useSuspenseQuery(seriesQO);
  const convRate = l.wobb > 0 ? ((l.wobb_converted / l.wobb) * 100).toFixed(1) : "0";

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Snapshot of your business today.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Leads today" value={l.today} accent />
        <Stat icon={Users} label="Leads this week" value={l.week} />
        <Stat icon={Users} label="Total leads" value={l.total} />
        <Stat icon={Sparkles} label="Wobb leads" value={l.wobb} accent />
        <Stat icon={ShoppingCart} label="Orders today" value={o.today} />
        <Stat icon={ShoppingCart} label="Orders this week" value={o.week} />
        <Stat
          icon={IndianRupee}
          label="Total revenue"
          value={`₹${Number(o.revenue || 0).toLocaleString("en-IN")}`}
          accent
        />
        <Stat icon={Clock} label="Pending orders" value={o.pending} warning />
      </div>

      <div className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-6">
        <h3 className="font-display text-lg font-bold">Wobb vs Direct — last 14 days</h3>
        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--foreground)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="wobb" fill="oklch(0.72 0.21 8)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="direct" fill="oklch(0.55 0.05 280)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">Wobb campaign performance</h3>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Wobb leads" value={l.wobb} />
            <Row label="Direct leads" value={l.direct} />
            <Row label="Wobb conversions" value={l.wobb_converted} />
            <Row label="Wobb conversion rate" value={`${convRate}%`} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Quick wins
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• {o.pending} pending orders waiting for verification</li>
            <li>• {l.today} new leads to follow up today</li>
            <li>• Share /join/wobb on all Wobb campaigns for source tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  warning,
}: {
  icon: any;
  label: string;
  value: any;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card/60 p-5 backdrop-blur-md ${
        accent ? "border-primary/40 glow-pink" : warning ? "border-yellow-500/40" : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon
          className={`h-4 w-4 ${
            accent ? "text-primary" : warning ? "text-yellow-400" : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
