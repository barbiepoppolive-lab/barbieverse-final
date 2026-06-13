import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listMarketingContacts, sendBulkPromo } from "@/lib/api/marketing.functions";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { MessageCircle, Send, Download, Loader2, CheckCircle2 } from "lucide-react";

const contactsQO = queryOptions({
  queryKey: ["admin", "marketing", "contacts"],
  queryFn: () => listMarketingContacts(),
});

export const Route = createFileRoute("/admin/marketing")({
  component: MarketingPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function MarketingPage() {
  const { data: contacts } = useSuspenseQuery(contactsQO);
  const send = useServerFn(sendBulkPromo);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(contacts.map((c: any) => c.whatsapp)));
  const [message, setMessage] = useState(
    "💖 Barbieverse offer! Get bonus coins on your next Poppo recharge. Reply YES for today's deal.",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const allSelected = selected.size === contacts.length && contacts.length > 0;
  const toggle = (n: string) => {
    const next = new Set(selected);
    next.has(n) ? next.delete(n) : next.add(n);
    setSelected(next);
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(contacts.map((c: any) => c.whatsapp)));

  const selectedNumbers = useMemo(() => Array.from(selected), [selected]);

  const exportCsv = () => {
    const headers = ["WhatsApp", "Name", "Orders", "Total Spent", "Last Order"];
    const rows = contacts.map((c: any) =>
      [c.whatsapp, c.name, c.orders_count, c.total_spent, new Date(c.last_order_at).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing-contacts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const broadcast = async () => {
    if (!selectedNumbers.length || !message.trim()) return;
    if (!confirm(`Send promo to ${selectedNumbers.length} contacts via WhatsApp?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res: any = await send({ data: { numbers: selectedNumbers, message: message.trim() } });
      setResult({ sent: res.sent, failed: res.failed });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Marketing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contacts.length} unique WhatsApp contacts collected from payments
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-semibold hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-5">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Promotional message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          className="mt-2 w-full rounded-lg border border-input bg-input/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedNumbers.length} of {contacts.length} selected · sent via Interakt WhatsApp
          </p>
          <button
            onClick={broadcast}
            disabled={sending || !selectedNumbers.length || !message.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-pink px-5 text-sm font-bold text-primary-foreground glow-pink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {selectedNumbers.length}
          </button>
        </div>
        {result && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sent {result.sent} · Failed {result.failed}
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Last Order</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c: any) => (
              <tr key={c.whatsapp} className="border-t border-border/40">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.whatsapp)}
                    onChange={() => toggle(c.whatsapp)}
                  />
                </td>
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs">+{c.whatsapp}</td>
                <td className="px-4 py-3">{c.orders_count}</td>
                <td className="px-4 py-3 font-semibold">₹{c.total_spent}</td>
                <td className="px-4 py-3 text-xs">
                  {new Date(c.last_order_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open WhatsApp chat with this message"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  No contacts yet — they'll appear here after the first paid order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
