// Scout AI Dashboard — Lead intelligence & scoring
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  getScoutDashboard,
  scoreAllUnscoredLeads,
} from "@/lib/api/scout-ai.functions";
import { Radar, Target, Flame, Snowflake, Cloud, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/scout")({
  component: ScoutDashboard,
});

function ScoutDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await getScoutDashboard();
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleScoreAll = async () => {
    setScoring(true);
    setScoreResult(null);
    try {
      const result = await scoreAllUnscoredLeads();
      setScoreResult(result);
      await loadDashboard();
    } catch (err) {
      console.error("Scoring failed:", err);
    }
    setScoring(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Scout AI...</span>
      </div>
    );
  }

  const hotCount =
    dashboard?.distribution?.find((d: any) => d.category === "hot")?.count || 0;
  const warmCount =
    dashboard?.distribution?.find((d: any) => d.category === "warm")?.count || 0;
  const coldCount =
    dashboard?.distribution?.find((d: any) => d.category === "cold")?.count || 0;
  const avgHot =
    dashboard?.distribution?.find((d: any) => d.category === "hot")?.avg_score || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="h-6 w-6 text-primary" />
            Scout AI Dashboard
          </h1>
          <p className="text-muted-foreground">
            Automated lead intelligence & scoring
          </p>
        </div>
        <button
          onClick={handleScoreAll}
          disabled={scoring || dashboard?.unscored_count === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {scoring ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Target className="h-4 w-4" />
          )}
          {scoring
            ? "Scoring..."
            : `Score ${dashboard?.unscored_count || 0} Unsored Leads`}
        </button>
      </div>

      {scoreResult && (
        <div className="rounded-lg border bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-200">
          ✅ Scored {scoreResult.scored} leads —
          🔥 {scoreResult.categories.hot} hot | 🌤️{" "}
          {scoreResult.categories.warm} warm | ❄️ {scoreResult.categories.cold}{" "}
          cold
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Hot Leads"
          value={hotCount}
          sub={`Avg score: ${avgHot}`}
          color="orange"
        />
        <StatCard
          icon={<Cloud className="h-5 w-5 text-yellow-500" />}
          label="Warm Leads"
          value={warmCount}
          color="yellow"
        />
        <StatCard
          icon={<Snowflake className="h-5 w-5 text-blue-500" />}
          label="Cold Leads"
          value={coldCount}
          color="blue"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-500" />}
          label="Unscored"
          value={dashboard?.unscored_count || 0}
          color="purple"
        />
      </div>

      {/* Top Hot Leads */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Top Hot Leads
        </h2>
        {dashboard?.hot_leads?.length === 0 ? (
          <p className="text-muted-foreground">
            No hot leads yet. Score some leads to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Application ID</th>
                  <th className="pb-2 font-medium">Platform</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.hot_leads?.map((lead: any) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">
                      {lead.application_id}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                        {lead.platform}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-orange-500">
                        {lead.score}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {lead.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently Scored */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Recently Scored</h2>
        {dashboard?.recently_scored?.length === 0 ? (
          <p className="text-muted-foreground">No leads scored yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Application ID</th>
                  <th className="pb-2 font-medium">Platform</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.recently_scored?.slice(0, 10).map((lead: any) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">
                      {lead.application_id}
                    </td>
                    <td className="py-3">{lead.platform}</td>
                    <td className="py-3 font-bold">{lead.score}</td>
                    <td className="py-3">
                      <CategoryBadge category={lead.category} />
                    </td>
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

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles = {
    hot: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    warm: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
    cold: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[category as keyof typeof styles] || ""}`}
    >
      {category}
    </span>
  );
}
