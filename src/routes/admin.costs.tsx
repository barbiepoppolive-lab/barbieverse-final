// Cost Monitor Dashboard — AI usage, scraper costs, revenue vs expenses
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { aiUsageStats, scraperCostStats, revenueVsCosts } from "@/lib/api/costs.functions";
import {
  Cpu, Globe, IndianRupee, TrendingUp, AlertCircle, Zap, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";

const aiStatsQO = (days: number) =>
  queryOptions({
    queryKey: ["admin", "costs", "ai", days],
    queryFn: () => aiUsageStats({ data: { days } }),
  });

const scraperStatsQO = (days: number) =>
  queryOptions({
    queryKey: ["admin", "costs", "scraper", days],
    queryFn: () => scraperCostStats({ data: { days } }),
  });

const revenueQO = (days: number) =>
  queryOptions({
    queryKey: ["admin", "costs", "revenue", days],
    queryFn: () => revenueVsCosts({ data: { days } }),
  });

export const Route = createFileRoute("/admin/costs")({
  component: CostDashboard,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "#4285F4",
  groq: "#FF6B35",
  mistral: "#FF7000",
  cerebras: "#8B5CF6",
  ollama: "#10B981",
  anthropic: "#D97706",
};

const PIE_COLORS = ["#4285F4", "#FF6B35", "#FF7000", "#8B5CF6", "#10B981", "#D97706"];

function CostDashboard() {
  const [days, setDays] = useState(30);
  const { data: ai } = useSuspenseQuery(aiStatsQO(days));
  const { data: scraper } = useSuspenseQuery(scraperStatsQO(days));
  const { data: rev } = useSuspenseQuery(revenueQO(days));

  const successRate = ai.totals.total_requests > 0
    ? ((Number(ai.totals.successful) / Number(ai.totals.total_requests)) * 100).toFixed(1)
    : "0";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Cost Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI usage, scraper costs & revenue overview.</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* ── Summary Cards ─────────────────────────── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Cpu} label="AI Requests" value={ai.totals.total_requests || 0} accent />
        <Stat icon={Zap} label="Total Tokens" value={formatTokens(ai.totals.total_tokens)} />
        <Stat
          icon={IndianRupee}
          label="Revenue (period)"
          value={`₹${Number(rev.periodRevenue).toLocaleString("en-IN")}`}
          accent
        />
        <Stat
          icon={Globe}
          label="Scraper Cost"
          value={`$${Number(rev.scraperCostUsd).toFixed(2)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Activity} label="Success Rate" value={`${successRate}%`} />
        <Stat icon={Zap} label="Avg Latency" value={`${ai.totals.avg_latency_ms || 0}ms`} />
        <Stat icon={AlertCircle} label="Failed Requests" value={ai.totals.failed || 0} warning />
        <Stat
          icon={Globe}
          label="Scraper Jobs"
          value={scraper.totals.total_jobs || 0}
        />
      </div>

      {/* ── Charts Row ────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* AI Daily Usage */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">AI Requests — Daily</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ai.daily}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="requests" fill="oklch(0.72 0.21 8)" radius={[4, 4, 0, 0]} name="Requests" />
                <Bar dataKey="errors" fill="oklch(0.6 0.2 25)" radius={[4, 4, 0, 0]} name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Tokens — Daily */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">AI Tokens — Daily</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ai.daily}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatTokens(v)} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => [formatTokens(value), "Tokens"]}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN")}
                />
                <Line type="monotone" dataKey="tokens" stroke="#4285F4" strokeWidth={2} dot={false} name="Tokens" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Provider Breakdown + Task Breakdown ────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Provider Pie */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">Requests by Provider</h3>
          {ai.byProvider.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">No AI usage data yet.</p>
          ) : (
            <div className="mt-4 flex items-center gap-6">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ai.byProvider}
                      dataKey="total_requests"
                      nameKey="provider"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {ai.byProvider.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {ai.byProvider.map((p: any, i: number) => (
                  <div key={p.provider} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="flex-1 capitalize">{p.provider}</span>
                    <span className="font-mono text-muted-foreground">{p.total_requests}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task Breakdown */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-bold">Requests by Task Type</h3>
          {ai.byTask.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">No AI usage data yet.</p>
          ) : (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ai.byTask} layout="vertical">
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="task_type"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="total_requests" fill="oklch(0.72 0.21 8)" radius={[0, 4, 4, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Scraper Costs ─────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-6">
        <h3 className="font-display text-lg font-bold">Scraper Costs</h3>
        {scraper.daily.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No scraper data yet.</p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scraper.daily}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                    }}
                    formatter={(value: number) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN")}
                  />
                  <Bar dataKey="cost_usd" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Cost (USD)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {scraper.byPlatform.map((p: any) => (
                <div key={p.platform} className="flex items-center justify-between border-b border-border/40 pb-2 text-sm">
                  <span className="capitalize">{p.platform}</span>
                  <div className="text-right">
                    <span className="font-mono">{p.job_count} jobs</span>
                    <span className="ml-3 font-mono text-muted-foreground">${Number(p.total_cost_usd).toFixed(4)}</span>
                    <span className="ml-3 text-muted-foreground">({p.total_results} results)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Provider Detail Table ──────────────────── */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-6">
        <h3 className="font-display text-lg font-bold">AI Provider Details</h3>
        {ai.byProvider.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No AI usage data yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">Requests</th>
                  <th className="pb-2 font-medium">Input Tokens</th>
                  <th className="pb-2 font-medium">Output Tokens</th>
                  <th className="pb-2 font-medium">Avg Latency</th>
                  <th className="pb-2 font-medium">Success</th>
                  <th className="pb-2 font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {ai.byProvider.map((p: any) => (
                  <tr key={p.provider} className="border-b border-border/20">
                    <td className="py-2 capitalize font-medium">{p.provider}</td>
                    <td className="py-2 font-mono">{p.total_requests}</td>
                    <td className="py-2 font-mono">{Number(p.total_input_tokens || 0).toLocaleString()}</td>
                    <td className="py-2 font-mono">{Number(p.total_output_tokens || 0).toLocaleString()}</td>
                    <td className="py-2 font-mono">{p.avg_latency_ms}ms</td>
                    <td className="py-2 font-mono text-green-400">{p.successful}</td>
                    <td className="py-2 font-mono text-red-400">{p.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function formatTokens(n: number | string): string {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}
