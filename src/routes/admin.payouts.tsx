import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listEligiblePayouts, markPayoutsPaid } from "@/lib/api/payouts.functions";
import { Download, CheckCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const REWARD_AMOUNT = 500;

const payoutsQO = queryOptions({
  queryKey: ["admin", "payouts"],
  queryFn: () => listEligiblePayouts(),
});

export const Route = createFileRoute("/admin/payouts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(payoutsQO),
  component: PayoutsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function PayoutsPage() {
  const { data } = useSuspenseQuery(payoutsQO);
  const qc = useQueryClient();
  const markPaid = useServerFn(markPayoutsPaid);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(
    () => data.filter((r: any) => r.reward_status === "Approved"),
    [data],
  );
  const paid = useMemo(
    () => data.filter((r: any) => r.reward_status === "Paid"),
    [data],
  );
  const pending = useMemo(
    () => data.filter((r: any) => r.reward_status === "Pending Review"),
    [data],
  );

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const selectedTotal = selectedIds.length * REWARD_AMOUNT;

  const toggleAll = (rows: any[], on: boolean) => {
    const next = { ...selected };
    rows.forEach((r) => (next[r.id] = on));
    setSelected(next);
  };

  const downloadCSV = (rows: any[], filename: string) => {
    const header = "application_id,name_or_mobile,upi_id,amount_inr,platform";
    const lines = rows.map(
      (r) => `${r.application_id},${r.mobile_number},${r.upi_id},${REWARD_AMOUNT},${r.platform}`,
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Mark ${selectedIds.length} payout(s) as paid (₹${selectedTotal})?`)) return;
    setBusy(true);
    try {
      await markPaid({ data: { ids: selectedIds, reference: reference.trim() || undefined } });
      toast.success(`Marked ${selectedIds.length} payouts as paid`);
      setSelected({});
      setReference("");
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Bulk Reward Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ₹{REWARD_AMOUNT} per eligible creator · Export CSV for Razorpay/bank upload or mark as paid in bulk.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Approved (Ready to Pay)" value={eligible.length} amount={eligible.length * REWARD_AMOUNT} accent="primary" />
        <Stat label="Pending Review" value={pending.length} accent="muted" />
        <Stat label="Already Paid" value={paid.length} amount={paid.length * REWARD_AMOUNT} accent="emerald" />
      </div>

      {/* Action bar */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-card/80 p-3 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 text-sm">
          <IndianRupee className="h-4 w-4 text-gold" />
          <span className="font-semibold">{selectedIds.length}</span> selected
          {selectedIds.length > 0 && (
            <span className="text-muted-foreground">· Total ₹{selectedTotal.toLocaleString("en-IN")}</span>
          )}
        </div>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="UTR / batch reference (optional)"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-input bg-input/40 px-3 text-sm"
        />
        <button
          disabled={selectedIds.length === 0 || busy}
          onClick={handleMarkPaid}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-pink px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" /> {busy ? "Saving…" : "Mark Paid"}
        </button>
        <button
          disabled={eligible.length === 0}
          onClick={() => downloadCSV(eligible, `payouts-eligible-${Date.now()}.csv`)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-gold/40 bg-card/60 px-4 text-xs font-semibold uppercase tracking-wider hover:border-gold disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export Eligible CSV
        </button>
      </div>

      <Section
        title="Approved — Ready to Pay"
        rows={eligible}
        selected={selected}
        setSelected={setSelected}
        toggleAll={(on) => toggleAll(eligible, on)}
        showCheckbox
      />
      <Section title="Pending Review" rows={pending} />
      <Section title="Already Paid" rows={paid} muted />
    </div>
  );
}

function Stat({ label, value, amount, accent }: { label: string; value: number; amount?: number; accent: string }) {
  const colors: Record<string, string> = {
    primary: "border-primary/40 bg-primary/10 text-primary",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    muted: "border-border bg-card/40 text-muted-foreground",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[accent]}`}>
      <div className="text-[11px] uppercase tracking-wider">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
      {amount !== undefined && (
        <div className="text-xs">₹{amount.toLocaleString("en-IN")}</div>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  selected,
  setSelected,
  toggleAll,
  showCheckbox,
  muted,
}: {
  title: string;
  rows: any[];
  selected?: Record<string, boolean>;
  setSelected?: (s: Record<string, boolean>) => void;
  toggleAll?: (on: boolean) => void;
  showCheckbox?: boolean;
  muted?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className={`font-display text-lg ${muted ? "text-muted-foreground" : ""}`}>{title} ({rows.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/30">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-card/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {showCheckbox && (
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    onChange={(e) => toggleAll?.(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                </th>
              )}
              <th className="p-3">Application ID</th>
              <th className="p-3">Mobile</th>
              <th className="p-3">UPI</th>
              <th className="p-3">Platform</th>
              <th className="p-3">Status</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Paid At / Ref</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-card/40">
                {showCheckbox && selected && setSelected && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={(e) => setSelected({ ...selected, [r.id]: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                )}
                <td className="p-3 font-mono text-xs">{r.application_id}</td>
                <td className="p-3">{r.mobile_number}</td>
                <td className="p-3 font-mono text-xs">{r.upi_id}</td>
                <td className="p-3 capitalize">{r.platform}</td>
                <td className="p-3">{r.reward_status}</td>
                <td className="p-3 font-semibold text-gold">₹{REWARD_AMOUNT}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-IN") : "—"}
                  {r.payout_reference && <div className="font-mono">{r.payout_reference}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
