import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { listSocialLeads, getSocialLeadStats, updateSocialLeadStatus, runSocialMonitor } from "@/lib/api/social-leads.functions";
import {
  Globe, Facebook, Twitter, Youtube, MessageCircle,
  ExternalLink, Copy, CheckCircle, Flame, Sun, Snowflake,
  RefreshCw, Eye, Send, Loader2, AlertCircle, Hash, Camera,
} from "lucide-react";

export const Route = createFileRoute("/admin/social-leads")({
  component: SocialLeadsDashboard,
});

const PLATFORM_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  facebook: { icon: Facebook, color: "text-blue-400", label: "Facebook" },
  reddit: { icon: MessageCircle, color: "text-orange-400", label: "Reddit" },
  twitter: { icon: Twitter, color: "text-sky-400", label: "Twitter" },
  youtube: { icon: Youtube, color: "text-red-400", label: "YouTube" },
  instagram: { icon: Camera, color: "text-pink-400", label: "Instagram" },
};

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  hot: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
  warm: { icon: Sun, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  cold: { icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10" },
};

type FilterTab = "all" | "facebook" | "reddit" | "twitter" | "youtube" | "instagram" | "hot" | "warm" | "cold";

function SocialLeadsDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<"date" | "score" | "category">("score");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [monitoring, setMonitoring] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLeads = useServerFn(listSocialLeads);
  const fetchStats = useServerFn(getSocialLeadStats);
  const runMonitorFn = useServerFn(runSocialMonitor);
  const updateStatusFn = useServerFn(updateSocialLeadStatus);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsResult, statsResult] = await Promise.all([
        fetchLeads({
          data: {
            platform: ["facebook", "reddit", "twitter", "youtube", "instagram"].includes(filter) ? filter as any : undefined,
            category: ["hot", "warm", "cold"].includes(filter) ? filter as any : undefined,
            sort,
            page,
            limit: 20,
          },
        }),
        fetchStats(),
      ]);
      setLeads(leadsResult?.leads || []);
      setTotal(leadsResult?.total || 0);
      setStats(statsResult);
    } catch (e: any) {
      console.error("[social-leads] fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, sort, page]);

  const runMonitor = async () => {
    setMonitoring(true);
    try {
      await runMonitorFn();
      await fetchData();
    } catch (e) {
      console.error("[social-leads] monitor error:", e);
    } finally {
      setMonitoring(false);
    }
  };

  const markCommented = async (id: string) => {
    await updateStatusFn({ data: { leadId: id, status: "commented" } });
    await fetchData();
  };

  const copyComment = (comment: string, id: string) => {
    navigator.clipboard.writeText(comment);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: stats?.total },
    { id: "youtube", label: "YouTube", count: stats?.byPlatform?.youtube },
    { id: "facebook", label: "Facebook", count: stats?.byPlatform?.facebook },
    { id: "instagram", label: "Instagram", count: stats?.byPlatform?.instagram },
    { id: "reddit", label: "Reddit", count: stats?.byPlatform?.reddit },
    { id: "twitter", label: "Twitter", count: stats?.byPlatform?.twitter },
    { id: "hot", label: "Hot", count: stats?.hot },
    { id: "warm", label: "Warm", count: stats?.warm },
    { id: "cold", label: "Cold", count: stats?.cold },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Social Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-monitored social media leads with pre-generated comments.
          </p>
        </div>
        <button
          onClick={runMonitor}
          disabled={monitoring}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-pink px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {monitoring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {monitoring ? "Running..." : "Run Monitor"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Leads" value={stats.total} icon={Globe} />
          <StatCard label="Hot Leads" value={stats.hot} icon={Flame} accent="text-orange-400" />
          <StatCard label="Warm Leads" value={stats.warm} icon={Sun} accent="text-yellow-400" />
          <StatCard label="Commented" value={stats.commented} icon={Send} accent="text-green-400" />
          <StatCard label="Pending" value={stats.discovered} icon={Eye} warning />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              filter === tab.id
                ? "bg-gradient-pink text-primary-foreground glow-pink"
                : "border border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1 text-xs ${filter === tab.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as any); setPage(1); }}
          className="ml-auto rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <option value="score">Sort by Score</option>
          <option value="date">Sort by Date</option>
          <option value="category">Sort by Category</option>
        </select>
      </div>

      {/* Leads List */}
      <div className="mt-6 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading leads...
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No social leads found. Run the monitor to scan platforms.</p>
          </div>
        )}

        {!loading && leads.map((lead) => {
          const platConf = PLATFORM_CONFIG[lead.platform] || { icon: Globe, color: "text-gray-400", label: lead.platform };
          const catConf = CATEGORY_CONFIG[lead.ai_category] || CATEGORY_CONFIG.cold;
          const PlatIcon = platConf.icon;
          const CatIcon = catConf.icon;

          return (
            <div
              key={lead.id}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Platform + Category badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${platConf.color} bg-card/60 border border-border/40`}>
                      <PlatIcon className="h-3 w-3" /> {platConf.label}
                    </span>
                    {lead.subreddit && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-orange-400 bg-card/60 border border-border/40">
                        r/{lead.subreddit}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${catConf.color} ${catConf.bg}`}>
                      <CatIcon className="h-3 w-3" /> {lead.ai_category}
                    </span>
                    {lead.status === "commented" && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-green-400 bg-green-500/10">
                        <CheckCircle className="h-3 w-3" /> Commented
                      </span>
                    )}
                  </div>

                  {/* Post text */}
                  <p className="mt-3 text-sm text-foreground line-clamp-3">
                    {lead.post_text}
                  </p>

                  {/* Author + engagement */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{lead.author_name || lead.author_username}</span>
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {lead.engagement_score} engagement
                    </span>
                    <span>{new Date(lead.discovered_at).toLocaleDateString()}</span>
                  </div>

                  {/* AI Comment */}
                  {lead.ai_generated_comment && (
                    <div className="mt-3 rounded-xl bg-secondary/40 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        AI Comment (confidence: {Math.round((lead.ai_confidence || 0) * 100)}%)
                      </div>
                      <p className="mt-1.5 text-sm text-foreground/90">
                        {lead.ai_generated_comment}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    href={lead.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                  <button
                    onClick={() => copyComment(lead.ai_generated_comment || "", lead.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === lead.id ? (
                      <><CheckCircle className="h-3.5 w-3.5 text-green-400" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                  {lead.status !== "commented" && (
                    <button
                      onClick={() => markCommented(lead.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-pink px-3 text-xs font-bold text-primary-foreground"
                    >
                      <Send className="h-3.5 w-3.5" /> Commented
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="rounded-lg border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent, warning,
}: {
  label: string; value: any; icon: any; accent?: string; warning?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-card/60 p-5 backdrop-blur-md ${
      warning ? "border-yellow-500/40" : "border-border/60"
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className={`mt-3 font-display text-2xl font-bold ${accent || ""}`}>
        {value ?? 0}
      </div>
    </div>
  );
}
