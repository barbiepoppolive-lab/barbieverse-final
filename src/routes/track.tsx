// src/routes/track.tsx
// Public order tracking page — customer enters Order ID + WhatsApp to check status

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackOrder, submitUtr } from "@/lib/api/orders.functions";
import { CheckCircle2, Clock, XCircle, Loader2, Package, Coins, Search } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order | Barbieverse" },
      { name: "description", content: "Check the status of your Poppo Live coin recharge order." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : "",
  }),
  component: TrackPage,
});

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock; desc: string }> = {
  awaiting_payment:     { label: "Awaiting Payment",   color: "text-yellow-400",  icon: Clock,        desc: "We are waiting for your UPI payment." },
  pending:              { label: "Pending",             color: "text-yellow-400",  icon: Clock,        desc: "Your order is pending payment verification." },
  paid_pending_delivery:{ label: "Payment Received ✓", color: "text-blue-400",    icon: Clock,        desc: "Payment confirmed. Our team is sending your coins now." },
  verified:             { label: "Verified",            color: "text-purple-400",  icon: CheckCircle2, desc: "Payment verified. Coins being credited." },
  completed:            { label: "Coins Credited ✓",   color: "text-emerald-400", icon: CheckCircle2, desc: "Your coins have been credited to your Poppo account." },
  rejected:             { label: "Rejected",            color: "text-red-400",     icon: XCircle,      desc: "This order was rejected. Please contact support." },
};

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function TrackPage() {
  const search = useSearch({ from: "/track" });
  const [orderId, setOrderId] = useState((search as any).id || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // UTR submission state
  const [utrInput, setUtrInput] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrDone, setUtrDone] = useState(false);

  const track = useServerFn(trackOrder);
  const submitUtrFn = useServerFn(submitUtr);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const res: any = await track({ data: { order_id: orderId.trim(), whatsapp: whatsapp.trim() } });
      if (res?.ok) {
        setResult(res);
      } else {
        setError(res?.error || "Order not found. Check your Order ID and WhatsApp number.");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) return;
    setUtrLoading(true);
    try {
      const res: any = await submitUtrFn({ data: { order_id: result.order.id, utr: utrInput.trim() } });
      if (res?.ok) {
        setUtrDone(true);
        // Re-fetch order to refresh status
        const refreshed: any = await track({ data: { order_id: orderId.trim(), whatsapp: whatsapp.trim() } });
        if (refreshed?.ok) setResult(refreshed);
      }
    } finally {
      setUtrLoading(false);
    }
  };

  const order = result?.order;
  const meta = order ? (STATUS_META[order.status] || STATUS_META["pending"]) : null;
  const StatusIcon = meta?.icon || Clock;

  const needsUtr =
    order &&
    ["usdt", "netbanking"].includes(order.payment_method) &&
    ["pending", "awaiting_payment"].includes(order.status) &&
    !utrDone;

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="mx-auto max-w-xl">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Package className="h-3.5 w-3.5" /> Order Tracking
            </div>
            <h1 className="font-display text-4xl font-bold">Track Your Order</h1>
            <p className="mt-3 text-muted-foreground">
              Enter your Order ID and WhatsApp number to check your coin recharge status.
            </p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md"
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Order ID *
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. a1b2c3d4-..."
                className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none font-mono"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Check your WhatsApp for the Order ID we sent when you placed your order.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                WhatsApp Number *
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-gradient-pink font-semibold text-white hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Searching..." : "Track Order"}
            </button>
          </form>

          {/* Result */}
          {order && meta && (
            <div className="mt-8 space-y-4">

              {/* Status card */}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 bg-card border border-border/60 ${meta.color}`}>
                    <StatusIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${meta.color}`}>{meta.label}</div>
                    <div className="text-sm text-muted-foreground">{meta.desc}</div>
                  </div>
                </div>

                {/* Order details */}
                <div className="mt-5 space-y-2 rounded-xl bg-secondary/40 p-4 text-sm">
                  <Row label="Package" value={`${order.package} — ${order.coins} coins`} />
                  <Row label="Amount" value={`₹${order.amount}`} />
                  <Row label="Poppo ID" value={order.poppo_id} mono />
                  <Row label="Payment" value={order.payment_method.toUpperCase()} />
                  <Row label="Placed" value={fmt(order.created_at)} />
                  {order.paid_at && <Row label="Paid" value={fmt(order.paid_at)} />}
                  {order.delivered_at && <Row label="Delivered" value={fmt(order.delivered_at)} />}
                  {order.refund_status && order.refund_status !== "none" && (
                    <Row label="Refund" value={order.refund_status} highlight />
                  )}
                </div>
              </div>

              {/* UTR submission for USDT / NetBanking */}
              {needsUtr && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6">
                  <h3 className="font-semibold text-yellow-400 mb-1">Submit Your Transaction Reference</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {order.payment_method === "usdt"
                      ? "Enter your USDT transaction hash so our team can verify faster."
                      : "Enter your Net Banking transaction reference / UTR number."}
                  </p>
                  {utrDone ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Reference submitted! Our team will verify shortly.
                    </div>
                  ) : (
                    <form onSubmit={handleUtrSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                        placeholder={order.payment_method === "usdt" ? "Transaction hash..." : "UTR / Ref number..."}
                        className="flex-1 h-10 rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none font-mono"
                        required
                      />
                      <button
                        type="submit"
                        disabled={utrLoading}
                        className="h-10 px-4 rounded-lg bg-gradient-pink text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1"
                      >
                        {utrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Status timeline */}
              {result.logs?.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                    Order Timeline
                  </h3>
                  <div className="space-y-3">
                    {result.logs.map((log: any, i: number) => {
                      const lm = STATUS_META[log.status];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                            lm ? lm.color.replace("text-","bg-") : "bg-gray-400"
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-sm font-semibold capitalize">
                                {lm?.label || log.status.replace(/_/g," ")}
                              </span>
                              <span className="text-xs text-muted-foreground">{fmt(log.at)}</span>
                            </div>
                            {log.note && (
                              <p className="text-xs text-muted-foreground mt-0.5">{log.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Help */}
              <p className="text-xs text-muted-foreground text-center">
                Questions?{" "}
                <a
                  href="https://wa.me/8615736912069"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  WhatsApp us
                </a>
              </p>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold text-right ${mono ? "font-mono text-xs" : ""} ${highlight ? "text-yellow-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}
