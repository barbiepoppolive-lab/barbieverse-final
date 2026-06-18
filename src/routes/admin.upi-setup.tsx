import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/upi-setup")({
  component: UpiSetupPage,
});

function CodeBlock({ children, label }: { children: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl border border-border/60 bg-background/60">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] hover:border-primary"
        >
          <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-foreground">{children}</pre>
    </div>
  );
}

function UpiSetupPage() {
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/upi-webhook`
      : "https://barbieverse.org/api/public/upi-webhook";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Payment Flow Setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How payments work on Barbieverse. Customers pay via UPI, then you verify and deliver coins from the admin panel.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">How It Works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Customer picks a coin package on <b>/coins</b> page</li>
          <li>Pays via UPI to <b>thestrongwingsofficial@okaxis</b></li>
          <li>Enters their 12-digit UTR transaction ID</li>
          <li>Order moves to <b>paid_pending_delivery</b> — you get a <b>Telegram alert</b></li>
          <li>You verify payment in bank app, send coins via Poppo/Vone</li>
          <li>Go to <b>Admin → Orders</b>, click WhatsApp button → send "Coins Credited" message</li>
          <li>Change order status to <b>completed</b></li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Telegram Alerts</h2>
        <p className="text-sm text-muted-foreground">
          You receive instant Telegram alerts for:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><b>New coin order</b> — when customer submits UTR</li>
          <li><b>Order completed</b> — when you mark an order as delivered</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Bot token and chat ID are configured in Railway environment variables.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Admin Panel — One-Click WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Go to <b>Admin → Orders</b>. Hover over the WhatsApp icon next to any order to see quick message templates:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><b>Payment Received</b> — send after verifying payment</li>
          <li><b>Coins Credited</b> — send after delivering coins</li>
          <li><b>Refund Processed</b> — send if order is rejected</li>
          <li><b>Welcome Message</b> — send to new customers</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Optional: Auto-Verification (MacroDroid)</h2>
        <p className="text-sm text-muted-foreground">
          For automatic payment matching, you can set up <b>MacroDroid</b> on a dedicated Android phone with your UPI ID. It forwards payment notifications to:
        </p>
        <CodeBlock label="Webhook URL">{webhookUrl}</CodeBlock>
        <p className="text-xs text-muted-foreground">
          This is optional. Manual verification via the admin panel works without MacroDroid.
        </p>
      </section>
    </div>
  );
}
