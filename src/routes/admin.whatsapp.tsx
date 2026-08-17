import { createFileRoute, Link } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useCallback, Fragment } from "react";
import {
  listWhatsappPipeline,
  listWhatsappLeads,
  getLeadChatHistory,
  getGrokCosts,
} from "@/lib/api/whatsapp.functions";
import {
  MessageCircle,
  ExternalLink,
  Pause,
  Play,
  Send,
  Loader2,
  DollarSign,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";

const STAGE_ORDER = [
  "NEW",
  "ASKED",
  "LINK_SENT",
  "INSTALLING",
  "INSTALLED",
  "AGENCY_LINKED",
  "FACE_VERIFIED",
  "FIRST_LIVE",
  "ACTIVE",
  "STALLED",
  "ESCALATED",
  "NOT_INTERESTED",
];

const STAGE_STAR: Record<string, boolean> = {
  AGENCY_LINKED: true,
  FACE_VERIFIED: true,
  FIRST_LIVE: true,
};

const STAGE_COLOR: Record<string, string> = {
  NEW: "bg-secondary/40 text-muted-foreground",
  ASKED: "bg-blue-500/10 text-blue-400",
  LINK_SENT: "bg-blue-500/20 text-blue-300",
  INSTALLING: "bg-purple-500/20 text-purple-300",
  INSTALLED: "bg-purple-500/10 text-purple-400",
  AGENCY_LINKED: "bg-green-500/20 text-green-300",
  FACE_VERIFIED: "bg-emerald-500/20 text-emerald-300",
  FIRST_LIVE: "bg-pink-500/20 text-pink-300",
  ACTIVE: "bg-pink-500/10 text-pink-400",
  STALLED: "bg-amber-500/20 text-amber-300",
  ESCALATED: "bg-red-500/20 text-red-300",
  NOT_INTERESTED: "bg-muted text-muted-foreground",
};

// Bot server URL — set via env, falls back to the Railway deployment
const BOT_URL =
  import.meta.env.VITE_WA_BOT_URL ||
  "https://wa-auto-reply-production-d682.up.railway.app";
const BOT_KEY = import.meta.env.VITE_WA_BOT_KEY || "";

const qo = queryOptions({
  queryKey: ["admin", "whatsapp-pipeline"],
  queryFn: () => listWhatsappPipeline(),
});

const leadsQO = queryOptions({
  queryKey: ["admin", "whatsapp-leads"],
  queryFn: () => listWhatsappLeads(),
});

const grokCostsQO = queryOptions({
  queryKey: ["admin", "grok-costs"],
  queryFn: () => getGrokCosts(),
});

export const Route = createFileRoute("/admin/whatsapp")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: WhatsappPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function WhatsappPage() {
  const { data } = useSuspenseQuery(qo);
  const leadData = useSuspenseQuery(leadsQO);
  const grokData = useSuspenseQuery(grokCostsQO);
  const leads = leadData.data.leads || [];
  const stageMap = new Map(
    (data.byStage || []).map((r: any) => [r.stage, r.count]),
  );
  const msgMap = new Map(
    (data.todaysMessages || []).map((r: any) => [r.direction, r.count]),
  );
  const s = data.draftStats;

  // Bot control state
  const [botPaused, setBotPaused] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignResult, setCampaignResult] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const togglePause = useCallback(async (action: "pause" | "resume") => {
    setPausing(true);
    try {
      const res = await fetch(`${BOT_URL}/pause?action=${action}&k=${BOT_KEY}`);
      const data = await res.json();
      setBotPaused(data.paused);
    } catch (e) {
      console.error("Failed to toggle pause:", e);
    } finally {
      setPausing(false);
    }
  }, []);

  const toggleChatHistory = useCallback(
    async (phone: string) => {
      if (expandedLead === phone) {
        setExpandedLead(null);
        setChatHistory([]);
        return;
      }
      setExpandedLead(phone);
      setLoadingChat(true);
      try {
        const result = await getLeadChatHistory({ data: { phone } });
        setChatHistory(result.messages || []);
      } catch {
        setChatHistory([]);
      } finally {
        setLoadingChat(false);
      }
    },
    [expandedLead],
  );

  const startCampaign = useCallback(async () => {
    // Get all leads that are in ASKED or LINK_SENT stage (lost leads)
    const lostLeads = leads
      .filter(
        (l: any) => ["ASKED", "LINK_SENT"].includes(l.stage) && !l.escalated,
      )
      .map((l: any) => String(l.phone).replace(/[^\d]/g, ""));

    if (!lostLeads.length) {
      setCampaignResult("No lost leads to contact");
      setTimeout(() => setCampaignResult(null), 3000);
      return;
    }

    setCampaignRunning(true);
    setCampaignResult(null);
    try {
      const res = await fetch(`${BOT_URL}/campaign?k=${BOT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: lostLeads }),
      });
      const data = await res.json();
      if (data.accepted) {
        setCampaignResult(`Campaign started — ${data.total} leads queued`);
      } else {
        setCampaignResult(data.error || "Failed to start campaign");
      }
    } catch (e) {
      setCampaignResult("Failed to reach bot server");
    } finally {
      setCampaignRunning(false);
      setTimeout(() => setCampaignResult(null), 5000);
    }
  }, [leads]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">WhatsApp Agent</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Inbound leads, stage pipeline, and the unedited-send rate that tells you
        when a stage is safe to auto-send.
      </p>

      {/* today's traffic */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Inbound today" value={msgMap.get("in") ?? 0} />
        <Stat label="Outbound today" value={msgMap.get("out") ?? 0} />
        <Stat
          label="Pending drafts (need you)"
          value={s.pending ?? 0}
          accent={s.pending > 0}
        />
      </div>

      {/* Grok cost monitor */}
      {grokData.data && (
        <CostMonitor data={grokData.data} />
      )}

      {/* bot controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => togglePause(botPaused ? "resume" : "pause")}
          disabled={pausing}
          className={
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors " +
            (botPaused
              ? "border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
              : "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20")
          }
        >
          {pausing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : botPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          {botPaused ? "Resume Bot" : "Pause Bot"}
        </button>

        <button
          onClick={startCampaign}
          disabled={campaignRunning}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {campaignRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Re-engage Lost Leads (
          {
            leads.filter(
              (l: any) =>
                ["ASKED", "LINK_SENT"].includes(l.stage) && !l.escalated,
            ).length
          }
          )
        </button>

        {campaignResult && (
          <span className="text-sm text-muted-foreground">
            {campaignResult}
          </span>
        )}
      </div>

      {/* stage pipeline */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          <span className="text-sm font-semibold">Pipeline by stage</span>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {STAGE_ORDER.map((stage) => {
            const n = stageMap.get(stage) ?? 0;
            if (n === 0 && stage === "INSTALLING") return null;
            return (
              <div
                key={stage}
                className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2"
              >
                <span
                  className={
                    "rounded-md px-2 py-0.5 text-xs font-medium " +
                    (STAGE_COLOR[stage] ||
                      "bg-secondary/40 text-muted-foreground")
                  }
                >
                  {stage}
                  {STAGE_STAR[stage] ? " ★" : ""}
                </span>
                <span className="text-sm font-bold">{n}</span>
              </div>
            );
          })}
          {STAGE_ORDER.filter(
            (s) => stageMap.has(s) && !STAGE_ORDER.includes(s),
          ).length > 0 && (
            <div className="text-xs text-muted-foreground">
              (+ unknown stages:{" "}
              {STAGE_ORDER.filter(
                (s) => stageMap.has(s) && !STAGE_ORDER.includes(s),
              ).join(", ")}
              )
            </div>
          )}
        </div>
      </div>

      {/* unedited-send rate */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-sm font-semibold">Unedited-send rate</div>
          <div className="mt-2 text-3xl font-bold">
            {s.uneditedRate === null ? "—" : `${s.uneditedRate.toFixed(0)}%`}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.sentDrafts} sent · {s.uneditedSends} unedited · {s.editedSends}{" "}
            edited. Over 85% across 100+ drafts in a stage → that stage can move
            to all-auto.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-sm font-semibold">Draft decisions</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Chip label="sent" value={s.sentDrafts} />
            <Chip label="skipped" value={s.skipped} />
            <Chip label="takeover" value={s.takeovers} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-sm font-semibold">Conversions</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Chip
              label="agency linked"
              value={stageMap.get("AGENCY_LINKED") ?? 0}
              star
            />
            <Chip
              label="face verified"
              value={stageMap.get("FACE_VERIFIED") ?? 0}
              star
            />
            <Chip
              label="first live"
              value={stageMap.get("FIRST_LIVE") ?? 0}
              star
            />
          </div>
        </div>
      </div>

      {/* recent drafts */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">She said</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Decision</th>
            </tr>
          </thead>
          <tbody>
            {(data.recent || []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="px-4 py-3 text-xs">
                  {new Date(r.created_at).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 font-medium">
                  {r.display_name || "—"}
                  <div className="text-xs text-muted-foreground">{r.phone}</div>
                </td>
                <td
                  className="px-4 py-3 max-w-[220px] truncate text-xs"
                  title={r.trigger_text || ""}
                >
                  {r.trigger_text || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {r.source}
                </td>
                <td className="px-4 py-3">
                  <DecisionBadge
                    decision={r.decision}
                    wasEdited={r.was_edited}
                  />
                </td>
              </tr>
            ))}
            {(data.recent || []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No drafts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* per-lead status table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
          <div>
            <span className="text-sm font-semibold">
              All leads — where they are, where stuck
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {leads.length} conversations
            </span>
          </div>
          <Link
            to="/admin/hosts"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View converted hosts
          </Link>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Where stuck</th>
              <th className="px-4 py-3">Last msg</th>
              <th className="px-4 py-3">Next follow-up</th>
              <th className="px-4 py-3">Drafts</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => (
              <Fragment key={l.id}>
                <tr className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.display_name || "—"}</div>
                    <button
                      onClick={() => toggleChatHistory(String(l.phone))}
                      className="text-xs text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      {l.phone}{" "}
                      {expandedLead === String(l.phone) ? "▲" : "▼"}
                    </button>
                  </td>
                <td className="px-4 py-3">
                  <StagePill stage={l.stage} />
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        l.pending_drafts > 0
                          ? "text-amber-400"
                          : l.escalated || l.is_stale
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }
                    >
                      {l.next_cue || l.stage}
                    </span>
                    {l.escalated && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                        escalated
                        {l.escalated_reason ? `: ${l.escalated_reason}` : ""}
                      </span>
                    )}
                    {l.pending_drafts > 0 && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                        {l.pending_drafts} draft(s) need you
                      </span>
                    )}
                    {l.is_stale && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                        idle 48h+
                      </span>
                    )}
                  </div>
                  {l.source && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      src: {l.source}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {l.last_message_in ? (
                    <div>
                      <div>in: {relTime(l.last_message_in)}</div>
                      {l.last_message_out && (
                        <div>out: {relTime(l.last_message_out)}</div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {l.follow_up_due ? (
                    <div>
                      <div>{relTime(l.follow_up_due)}</div>
                      <div className="text-[11px]">
                        {l.follow_up_count}/4 chases
                      </div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {l.pending_drafts > 0 ? (
                    <span className="font-bold text-amber-400">
                      {l.pending_drafts}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://wa.me/${String(l.phone).replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
                    title="Open WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
              {expandedLead === String(l.phone) && (
                <tr className="border-t border-border/40 bg-secondary/20">
                  <td colSpan={8} className="px-4 py-3">
                    {loadingChat ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading chat history...
                      </div>
                    ) : chatHistory.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No messages found</div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {chatHistory.map((m: any, i: number) => (
                          <div
                            key={i}
                            className={
                              "flex " + (m.direction === "out" ? "justify-end" : "justify-start")
                            }
                          >
                            <div
                              className={
                                "max-w-[70%] rounded-lg px-3 py-1.5 text-xs " +
                                (m.direction === "out"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-background/60 text-foreground")
                              }
                            >
                              <div>{m.body}</div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground">
                                {new Date(m.created_at).toLocaleString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No WhatsApp conversations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function relTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StagePill({ stage }: { stage: string }) {
  const cls = STAGE_COLOR[stage] || "bg-secondary/40 text-muted-foreground";
  return (
    <span className={"rounded-md px-2 py-0.5 text-xs font-medium " + cls}>
      {stage}
      {STAGE_STAR[stage] ? " ★" : ""}
    </span>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-card/40 p-4 " +
        (accent ? "border-amber-500/40" : "border-border/60")
      }
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Chip({
  label,
  value,
  star,
}: {
  label: string;
  value: number;
  star?: boolean;
}) {
  return (
    <span className="rounded-md bg-secondary/40 px-2 py-1 text-xs">
      {label}
      {star ? " ★" : ""}: {value}
    </span>
  );
}

function DecisionBadge({
  decision,
  wasEdited,
}: {
  decision: string;
  wasEdited?: boolean;
}) {
  if (!decision) return <span className="text-xs text-amber-400">pending</span>;
  if (decision === "sent" && wasEdited)
    return <span className="text-xs text-blue-400">sent (edited)</span>;
  if (decision === "sent")
    return <span className="text-xs text-green-400">sent</span>;
  if (decision === "skipped")
    return <span className="text-xs text-muted-foreground">skipped</span>;
  if (decision === "takeover")
    return <span className="text-xs text-purple-400">takeover</span>;
  return <span className="text-xs">{decision}</span>;
}

function CostMonitor({ data }: { data: any }) {
  const { totals, byModel, today, toolUsage, costEstimate } = data;
  if (!totals || totals.total_calls === 0) return null;

  const cacheHitRate = totals.total_input_tokens
    ? ((totals.total_cached_tokens / totals.total_input_tokens) * 100).toFixed(1)
    : "0";
  const errorRate = totals.total_calls
    ? ((totals.total_errors / totals.total_calls) * 100).toFixed(1)
    : "0";
  const todayCacheRate = today?.input_tokens
    ? ((today.cached_tokens / today.input_tokens) * 100).toFixed(1)
    : "0";

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-green-400" />
        <span className="text-sm font-semibold">Grok Agent — Cost Monitor</span>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" /> Total cost
          </div>
          <div className="mt-1 text-2xl font-bold text-green-400">
            ${costEstimate.total.toFixed(4)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            input ${(costEstimate.input + costEstimate.cached).toFixed(4)} · output ${costEstimate.output.toFixed(4)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" /> Total calls
          </div>
          <div className="mt-1 text-2xl font-bold">{totals.total_calls}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {totals.total_errors} errors ({errorRate}%)
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Avg latency
          </div>
          <div className="mt-1 text-2xl font-bold">{totals.avg_latency_ms}ms</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            cache hit {cacheHitRate}%
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Today
          </div>
          <div className="mt-1 text-2xl font-bold">{today?.calls || 0}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {today?.input_tokens || 0} in · {today?.output_tokens || 0} out · cache {todayCacheRate}%
          </div>
        </div>
      </div>

      {/* Per-model + tool usage */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Per-model */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-xs font-semibold text-muted-foreground">By model</div>
          <div className="mt-2 space-y-2">
            {byModel.map((m: any) => (
              <div key={m.model} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.model}</span>
                  {m.errors > 0 && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">
                      {m.errors} err
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{m.calls} calls</span>
                  <span>{m.avg_latency_ms}ms</span>
                  <span>{m.input_tokens.toLocaleString()} tok</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tool usage */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-xs font-semibold text-muted-foreground">Tool usage</div>
          <div className="mt-2 space-y-2">
            {toolUsage.length === 0 && (
              <div className="text-xs text-muted-foreground">No tool calls yet</div>
            )}
            {toolUsage.map((t: any) => (
              <div key={t.tool_name} className="flex items-center justify-between text-xs">
                <span className="font-medium">{t.tool_name}</span>
                <span className="text-muted-foreground">{t.calls}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost breakdown note */}
      <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-2 text-[11px] text-muted-foreground">
        Pricing: grok-4.20-0309-non-reasoning · $1.25/M input · $0.20/M cached · $2.50/M output · Cache hit rate directly reduces cost
      </div>
    </div>
  );
}
