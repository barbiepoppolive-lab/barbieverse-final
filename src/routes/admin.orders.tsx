// src/routes/admin.orders.tsx
// UPDATED: Admin notes, refund flow, status logs, UTR visibility

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  listOrders,
  updateOrderStatus,
  updateOrderNotes,
  updateRefundStatus,
  orderStats,
} from "@/lib/api/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Download,
  MessageCircle,
  StickyNote,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ordersQO = (status: string, refund_status: string) =>
  queryOptions({
    queryKey: ["admin", "orders", status, refund_status],
    queryFn: () => listOrders({ data: { status, refund_status } }),
  });

const statsQO = queryOptions({
  queryKey: ["admin", "order-stats"],
  queryFn: () => orderStats(),
});

const STATUSES = [
  "awaiting_payment",
  "pending",
  "paid_pending_delivery",
  "verified",
  "completed",
  "rejected",
] as const;

const REFUND_STATUSES = ["none", "requested", "approved", "completed"] as const;

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function rowClass(s: string) {
  if (s === "awaiting_payment") return "bg-muted/20";
  if (s === "pending") return "bg-yellow-500/5";
  if (s === "paid_pending_delivery") return "bg-blue-500/10";
  if (s === "rejected") return "bg-destructive/10";
  if (s === "completed") return "bg-green-500/5";
  return "";
}

function refundBadge(s: string) {
  if (!s || s === "none") return null;
  const map: Record<string, string> = {
    requested: "bg-yellow-500/20 text-yellow-400",
    approved:  "bg-blue-500/20 text-blue-400",
    completed: "bg-emerald-500/20 text-emerald-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[s] || ""}`}>
      Refund: {s}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value ?? 0}</div>
    </div>
  );
}

// ── Expandable row ─────────────────────────────────────────────────────────

function OrderRow({ o, onRefresh }: { o: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [noteVal, setNoteVal] = useState(o.admin_notes || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [refundStatus, setRefundStatus] = useState(o.refund_status || "none");

  const updStatus = useServerFn(updateOrderStatus);
  const updNotes = useServerFn(updateOrderNotes);
  const updRefund = useServerFn(updateRefundStatus);

  const saveNote = async () => {
    setNoteSaving(true);
    await updNotes({ data: { id: o.id, admin_notes: noteVal } });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    onRefresh();
  };

  const handleRefund = async (status: string) => {
    await updRefund({ data: { id: o.id, refund_status: status as any } });
    setRefundStatus(status);
    onRefresh();
  };

  return (
    <>
      <tr className={`border-t border-border/40 ${rowClass(o.status)}`}>
        {/* Customer */}
        <td className="px-4 py-3">
          <div className="font-semibold">{o.name}</div>
          <div className="text-xs text-muted-foreground">{o.whatsapp}</div>
          {refundBadge(o.refund_status)}
        </td>

        {/* Poppo ID */}
        <td className="px-4 py-3 font-mono text-xs">{o.poppo_id}</td>

        {/* Package */}
        <td className="px-4 py-3">
          <div>{o.package}</div>
          <div className="text-xs text-muted-foreground">{o.coins} coins</div>
        </td>

        {/* Amount */}
        <td className="px-4 py-3 font-semibold">₹{o.amount}</td>

        {/* Method */}
        <td className="px-4 py-3 text-xs uppercase">{o.payment_method || "upi"}</td>

        {/* UTR */}
        <td className="px-4 py-3 font-mono text-xs">
          {o.utr || <span className="text-muted-foreground/50">—</span>}
          {o.utr_submitted_at && (
            <div className="text-[10px] text-emerald-400 mt-0.5">
              Submitted {new Date(o.utr_submitted_at).toLocaleTimeString("en-IN")}
            </div>
          )}
        </td>

        {/* Status dropdown */}
        <td className="px-4 py-3">
          <select
            defaultValue={o.status}
            onChange={async (e) => {
              await updStatus({ data: { id: o.id, status: e.target.value as any } });
              onRefresh();
            }}
            className="rounded-md border border-border bg-input/40 px-2 py-1 text-xs capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-xs">
          {new Date(o.created_at).toLocaleString("en-IN")}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <a
              href={`https://wa.me/${o.whatsapp.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              title="WhatsApp customer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setExpanded((v) => !v)}
              title="Expand for notes & refund"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
            >
              {expanded
                ? <ChevronUp className="h-3.5 w-3.5" />
                : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded panel — notes + refund */}
      {expanded && (
        <tr className={`border-t border-border/20 ${rowClass(o.status)}`}>
          <td colSpan={9} className="px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Admin Notes */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <StickyNote className="h-3.5 w-3.5" /> Admin Notes
                </div>
                <textarea
                  value={noteVal}
                  onChange={(e) => setNoteVal(e.target.value)}
                  rows={3}
                  placeholder="Add private note visible only to admins..."
                  className="w-full rounded-lg border border-border/60 bg-input/30 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none"
                />
                <button
                  onClick={saveNote}
                  disabled={noteSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/20 border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/30 disabled:opacity-50"
                >
                  {noteSaved
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</>
                    : noteSaving
                      ? "Saving..."
                      : <><StickyNote className="h-3.5 w-3.5" /> Save Note</>}
                </button>
              </div>

              {/* Refund Controls */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <RefreshCcw className="h-3.5 w-3.5" /> Refund
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Current refund status:{" "}
                  <span className="font-semibold capitalize">{refundStatus}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {refundStatus === "none" && (
                    <button
                      onClick={() => handleRefund("requested")}
                      className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/20"
                    >
                      Mark Refund Requested
                    </button>
                  )}
                  {refundStatus === "requested" && (
                    <button
                      onClick={() => handleRefund("approved")}
                      className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20"
                    >
                      Approve Refund
                    </button>
                  )}
                  {refundStatus === "approved" && (
                    <button
                      onClick={() => handleRefund("completed")}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Mark Refund Completed
                    </button>
                  )}
                  {refundStatus === "completed" && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Refund completed
                    </div>
                  )}
                </div>

                {o.refund_notes && (
                  <div className="rounded-lg bg-secondary/40 p-2 text-xs text-muted-foreground mt-2">
                    {o.refund_notes}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function OrdersPage() {
  const [status, setStatus] = useState("all");
  const [refundFilter, setRefundFilter] = useState("all");
  const { data: orders } = useSuspenseQuery(ordersQO(status, refundFilter));
  const { data: stats } = useSuspenseQuery(statsQO);
  const qc = useQueryClient();

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "orders"] });

  const exportCsv = () => {
    const headers = ["Name", "WhatsApp", "Poppo ID", "Package", "Coins", "Amount", "Method", "UTR", "Status", "Refund", "Notes", "Date"];
    const rows = orders.map((o: any) =>
      [o.name, o.whatsapp, o.poppo_id, o.package, o.coins, o.amount,
        o.payment_method || "upi", o.utr, o.status, o.refund_status, o.admin_notes,
        new Date(o.created_at).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} results</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-semibold hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Today" value={(stats as any)?.today} />
        <StatCard label="This Week" value={(stats as any)?.week} />
        <StatCard label="Total Orders" value={(stats as any)?.total} />
        <StatCard label="Pending" value={(stats as any)?.pending} highlight />
        <StatCard label="Pending Refunds" value={(stats as any)?.pending_refunds} highlight />
        <StatCard label="Revenue" value={`₹${(stats as any)?.revenue ?? 0}`} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          Status:
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-input bg-input/40 px-2 text-sm text-foreground capitalize"
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          Refund:
          <select
            value={refundFilter}
            onChange={(e) => setRefundFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-input/40 px-2 text-sm text-foreground capitalize"
          >
            <option value="all">All</option>
            {REFUND_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Poppo ID</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">UTR / Ref</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <OrderRow key={o.id} o={o} onRefresh={refresh} />
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
