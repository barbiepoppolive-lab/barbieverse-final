import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listWhatsappPipeline } from "@/lib/api/whatsapp.functions";

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

const qo = queryOptions({
  queryKey: ["admin", "whatsapp-pipeline"],
  queryFn: () => listWhatsappPipeline(),
});

export const Route = createFileRoute("/admin/whatsapp")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: WhatsappPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function WhatsappPage() {
  const { data } = useSuspenseQuery(qo);
  const stageMap = new Map(
    (data.byStage || []).map((r: any) => [r.stage, r.count]),
  );
  const msgMap = new Map(
    (data.todaysMessages || []).map((r: any) => [r.direction, r.count]),
  );
  const s = data.draftStats;

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
                    (STAGE_COLOR[stage] || "bg-secondary/40 text-muted-foreground")
                  }
                >
                  {stage}
                  {STAGE_STAR[stage] ? " ★" : ""}
                </span>
                <span className="text-sm font-bold">{n}</span>
              </div>
            );
          })}
          {STAGE_ORDER.filter((s) => stageMap.has(s) && !STAGE_ORDER.includes(s)).length >
            0 && (
            <div className="text-xs text-muted-foreground">
              (+ unknown stages:{" "}
              {STAGE_ORDER.filter((s) => stageMap.has(s) && !STAGE_ORDER.includes(s)).join(", ")})
            </div>
          )}
        </div>
      </div>

      {/* unedited-send rate */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="text-sm font-semibold">Unedited-send rate</div>
          <div className="mt-2 text-3xl font-bold">
            {s.uneditedRate === null
              ? "—"
              : `${s.uneditedRate.toFixed(0)}%`}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.sentDrafts} sent · {s.uneditedSends} unedited · {s.editedSends} edited.
            Over 85% across 100+ drafts in a stage → that stage can move to all-auto.
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
            <Chip label="agency linked" value={stageMap.get("AGENCY_LINKED") ?? 0} star />
            <Chip label="face verified" value={stageMap.get("FACE_VERIFIED") ?? 0} star />
            <Chip label="first live" value={stageMap.get("FIRST_LIVE") ?? 0} star />
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
                <td className="px-4 py-3 max-w-[220px] truncate text-xs" title={r.trigger_text || ""}>
                  {r.trigger_text || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.source}</td>
                <td className="px-4 py-3">
                  <DecisionBadge decision={r.decision} wasEdited={r.was_edited} />
                </td>
              </tr>
            ))}
            {(data.recent || []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  No drafts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
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

function Chip({ label, value, star }: { label: string; value: number; star?: boolean }) {
  return (
    <span className="rounded-md bg-secondary/40 px-2 py-1 text-xs">
      {label}
      {star ? " ★" : ""}: {value}
    </span>
  );
}

function DecisionBadge({ decision, wasEdited }: { decision: string; wasEdited?: boolean }) {
  if (!decision) return <span className="text-xs text-amber-400">pending</span>;
  if (decision === "sent" && wasEdited)
    return <span className="text-xs text-blue-400">sent (edited)</span>;
  if (decision === "sent") return <span className="text-xs text-green-400">sent</span>;
  if (decision === "skipped") return <span className="text-xs text-muted-foreground">skipped</span>;
  if (decision === "takeover") return <span className="text-xs text-purple-400">takeover</span>;
  return <span className="text-xs">{decision}</span>;
}