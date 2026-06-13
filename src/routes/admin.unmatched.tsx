import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listUnmatchedPayments } from "@/lib/api/unmatched.functions";

const qo = queryOptions({
  queryKey: ["admin", "unmatched-payments"],
  queryFn: () => listUnmatchedPayments(),
});

export const Route = createFileRoute("/admin/unmatched")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: UnmatchedPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function UnmatchedPage() {
  const { data: rows } = useSuspenseQuery(qo);
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Unmatched UPI Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Payments captured by MacroDroid that didn't match any active order. Review and refund or credit manually.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">UTR</th>
              <th className="px-4 py-3">Payer UPI</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Raw</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-semibold">₹{(r.amount_paise / 100).toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.utr || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.payer_upi || "—"}</td>
                <td className="px-4 py-3 text-xs">{r.reason}</td>
                <td className="px-4 py-3 max-w-[280px] truncate text-xs text-muted-foreground" title={r.raw_payload || ""}>
                  {r.raw_payload || "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No unmatched payments. 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
