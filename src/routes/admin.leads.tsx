import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { listLeads, updateLeadStatus } from "@/lib/api/leads.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ExternalLink, MessageCircle, Download } from "lucide-react";

const leadsQO = (source: string, status: string) =>
  queryOptions({
    queryKey: ["admin", "leads", source, status],
    queryFn: () => listLeads({ data: { source: source as any, status } }),
  });

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const STATUSES = ["new", "contacted", "joined", "converted", "rejected"] as const;

function LeadsPage() {
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const { data: leads } = useSuspenseQuery(leadsQO(source, status));
  const qc = useQueryClient();
  const upd = useServerFn(updateLeadStatus);

  const exportCsv = () => {
    const headers = ["Name", "Instagram", "Email", "WhatsApp", "City", "Followers", "Source", "Status", "Date"];
    const rows = leads.map((l: any) =>
      [l.name, l.instagram, l.email, l.whatsapp, l.city, l.follower_count, l.source, l.status, new Date(l.created_at).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">{leads.length} results</p>
        </div>
        <button onClick={exportCsv} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-semibold hover:border-primary">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Select value={source} onChange={setSource} label="Source" options={[["all", "All sources"], ["direct", "Direct"], ["wobb", "Wobb"]]} />
        <Select value={status} onChange={setStatus} label="Status" options={[["all", "All statuses"], ...STATUSES.map((s) => [s, s] as const)]} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <Th>Name</Th><Th>Contact</Th><Th>City</Th><Th>Followers</Th><Th>Source</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => (
              <tr key={l.id} className="border-t border-border/40">
                <Td>
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.email}</div>
                </Td>
                <Td>
                  <div>{l.whatsapp}</div>
                  <div className="text-xs text-muted-foreground">{l.instagram}</div>
                </Td>
                <Td>{l.city || "—"}</Td>
                <Td className="capitalize">{(l.follower_count || "").replace(/_/g, " ")}</Td>
                <Td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.source === "wobb" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {l.source}
                  </span>
                </Td>
                <Td>
                  <select
                    defaultValue={l.status}
                    onChange={async (e) => {
                      await upd({ data: { id: l.id, status: e.target.value as any } });
                      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
                    }}
                    className="rounded-md border border-border bg-input/40 px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
                <Td>{new Date(l.created_at).toLocaleDateString("en-IN")}</Td>
                <Td>
                  <div className="flex gap-1">
                    {l.instagram && (
                      <a
                        href={`https://instagram.com/${l.instagram.replace(/^@/, "")}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
                        title="Open Instagram"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${l.whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </Td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: any }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: any; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
function Select({
  value, onChange, label, options,
}: {
  value: string; onChange: (v: string) => void; label: string; options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {label}:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-input bg-input/40 px-2 text-sm capitalize text-foreground">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
