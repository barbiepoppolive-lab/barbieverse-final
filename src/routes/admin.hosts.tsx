import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listHosts } from "@/lib/api/whatsapp.functions";
import { MessageCircle, ArrowLeft, Download } from "lucide-react";

const hostsQO = queryOptions({
  queryKey: ["admin", "hosts"],
  queryFn: () => listHosts(),
});

export const Route = createFileRoute("/admin/hosts")({
  component: HostsPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

const STAGE_LABEL: Record<string, string> = {
  AGENCY_LINKED: "Agency linked",
  FACE_VERIFIED: "Face verified",
  FIRST_LIVE: "First live",
  ACTIVE: "Active",
};

function HostsPage() {
  const { data } = useSuspenseQuery(hostsQO);
  const hosts = data.hosts || [];

  const exportCsv = () => {
    const headers = ["Name", "WhatsApp", "Stage", "Joined"];
    const rows = hosts.map((h: any) =>
      [h.display_name, h.phone, h.stage, new Date(h.created_at).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hosts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/whatsapp"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> WhatsApp Agent
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">My Hosts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hosts.length} converted host{hosts.length === 1 ? "" : "s"} —
              reached the agency-linked / live stage.
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-semibold hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["ACTIVE", "FIRST_LIVE", "FACE_VERIFIED", "AGENCY_LINKED"].map(
          (stage) => {
            const n = hosts.filter((h: any) => h.stage === stage).length;
            return (
              <div
                key={stage}
                className="rounded-2xl border border-border/60 bg-card/40 p-4"
              >
                <div className="text-sm text-muted-foreground">
                  {STAGE_LABEL[stage] || stage}
                </div>
                <div className="mt-1 text-3xl font-bold">{n}</div>
              </div>
            );
          },
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Host</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((h: any) => (
              <tr key={h.id} className="border-t border-border/40">
                <td className="px-4 py-3">
                  <div className="font-semibold">{h.display_name || "—"}</div>
                  {h.source && (
                    <div className="text-xs text-muted-foreground">
                      src: {h.source}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-md px-2 py-0.5 text-xs font-medium " +
                      (h.stage === "ACTIVE"
                        ? "bg-pink-500/10 text-pink-400"
                        : h.stage === "FIRST_LIVE"
                          ? "bg-pink-500/20 text-pink-300"
                          : h.stage === "FACE_VERIFIED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-green-500/20 text-green-300")
                    }
                  >
                    {STAGE_LABEL[h.stage] || h.stage} ★
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  +{h.phone}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {h.last_outbound_at
                    ? new Date(h.last_outbound_at).toLocaleDateString("en-IN")
                    : h.last_inbound_at
                      ? new Date(h.last_inbound_at).toLocaleDateString("en-IN")
                      : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://wa.me/${String(h.phone).replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </td>
              </tr>
            ))}
            {hosts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No converted hosts yet. Leads reach this page once they pass
                  the agency-linked stage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
