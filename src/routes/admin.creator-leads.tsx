import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MessageCircle, Download } from "lucide-react";
import {
  listCreatorLeads,
  creatorLeadStats,
  updateCreatorLead,
} from "@/lib/api/creator-leads.functions";
import { platformLabel } from "@/lib/creator-config";

const leadsQO = (status: string) =>
  queryOptions({
    queryKey: ["admin", "creator-leads", status],
    queryFn: () => listCreatorLeads({ data: { status } }),
  });

const statsQO = queryOptions({
  queryKey: ["admin", "creator-leads", "stats"],
  queryFn: () => creatorLeadStats(),
});

const STATUSES = [
  "Lead Created",
  "Joined Platform",
  "Verified Creator",
  "First Stream Completed",
  "Reward Eligible",
  "Reward Paid",
  "Rejected",
] as const;

const REWARD_STATUSES = ["Not Eligible", "Pending Review", "Approved", "Paid"] as const;

const BADGE_COLORS: Record<string, string> = {
  "Lead Created": "bg-muted text-muted-foreground",
  "Joined Platform": "bg-blue-500/20 text-blue-300",
  "Verified Creator": "bg-purple-500/20 text-purple-300",
  "First Stream Completed": "bg-indigo-500/20 text-indigo-300",
  "Reward Eligible": "bg-orange-500/20 text-orange-300",
  "Reward Paid": "bg-emerald-500/20 text-emerald-300",
  "Rejected": "bg-destructive/20 text-destructive",
};

export const Route = createFileRoute("/admin/creator-leads")({
  component: CreatorLeadsPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Error: {error.message}</div>,
});

function CreatorLeadsPage() {
  const [status, setStatus] = useState("all");
  const { data: leads } = useSuspenseQuery(leadsQO(status));
  const { data: stats } = useSuspenseQuery(statsQO);
  const qc = useQueryClient();
  const update = useServerFn(updateCreatorLead);

  async function patch(id: string, patch: any) {
    await update({ data: { id, ...patch } });
    qc.invalidateQueries({ queryKey: ["admin", "creator-leads"] });
  }

  const exportCsv = () => {
    const headers = ["Application ID", "Mobile", "WhatsApp", "UPI", "Platform", "Status", "Reward", "Source", "Created", "Notes"];
    const rows = leads.map((l: any) =>
      [l.application_id, l.mobile_number, l.whatsapp_number ?? "", l.upi_id, l.platform, l.status, l.reward_status, l.lead_source ?? "", new Date(l.created_at).toISOString(), l.notes ?? ""]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `creator-leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Creator Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acquisition pipeline for Poppo & Vone via BarbieVerse.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-semibold hover:border-primary">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total Leads" value={stats.total ?? 0} />
        <StatCard label="Today" value={stats.today ?? 0} />
        <StatCard label="Poppo" value={stats.poppo ?? 0} />
        <StatCard label="Vone" value={stats.vone ?? 0} />
        <StatCard label="Pending Verification" value={stats.pending_verification ?? 0} />
        <StatCard label="Pending Rewards" value={stats.pending_rewards ?? 0} />
        <StatCard label="Rewards Paid" value={stats.rewards_paid ?? 0} />
      </div>

      {/* Filter */}
      <div className="mt-6">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-input/40 px-2 text-sm text-foreground">
            <option value="all">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">UPI</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reward</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => (
              <tr key={l.id} className="border-t border-border/40 align-top">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gradient-pink">{l.application_id}</td>
                <td className="px-4 py-3">
                  <div>{l.mobile_number}</div>
                  {l.whatsapp_number && <div className="text-xs text-muted-foreground">WA: {l.whatsapp_number}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{l.upi_id}</td>
                <td className="px-4 py-3 text-xs font-semibold capitalize">{platformLabel(l.platform)}</td>
                <td className="px-4 py-3 text-xs">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[l.status] || ""}`}>{l.status}</span>
                  <select
                    defaultValue={l.status}
                    onChange={(e) => patch(l.id, { status: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-input/40 px-1 py-0.5 text-xs"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={l.reward_status}
                    onChange={(e) => patch(l.id, { reward_status: e.target.value })}
                    className="rounded-md border border-border bg-input/40 px-1 py-0.5 text-xs"
                  >
                    {REWARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    defaultValue={l.notes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (l.notes ?? "")) patch(l.id, { notes: e.target.value });
                    }}
                    placeholder="Add note…"
                    className="h-8 w-40 rounded-md border border-border bg-input/40 px-2 text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://wa.me/${String(l.whatsapp_number || l.mobile_number).replace(/[^\d]/g, "")}`}
                    target="_blank" rel="noreferrer"
                    title="Open WhatsApp"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-emerald-400 hover:border-emerald-400"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No creator leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
