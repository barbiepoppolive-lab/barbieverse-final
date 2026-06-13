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
      : "https://your-domain.lovable.app/api/public/upi-webhook";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">UPI Auto-Verify Setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure your dedicated UPI phone with MacroDroid to forward every payment notification to Barbieverse. Once set up, customer payments are matched and confirmed automatically within seconds — no manual UTR checking.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">1. Install MacroDroid</h2>
        <p className="text-sm text-muted-foreground">
          On your dedicated UPI Android phone, install <b>MacroDroid</b> from the Play Store. Grant it Notification access in Settings → Apps → MacroDroid → Notifications.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">2. Create the macro</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Open MacroDroid → <b>Add Macro</b>.</li>
          <li><b>Trigger:</b> Device Events → Notification → <i>Notification Received</i>. Select your UPI / banking app (PhonePe, GPay, HDFC, SBI, Paytm…). Filter text contains: <span className="font-mono text-foreground">credited</span> or <span className="font-mono text-foreground">received</span>.</li>
          <li><b>Action:</b> Connectivity → HTTP Request.</li>
          <li>Configure as shown below.</li>
          <li><b>Constraint:</b> none (run always).</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">3. HTTP Request settings</h2>
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4 text-sm">
          <div><span className="text-muted-foreground">Method:</span> <b>POST</b></div>
          <div><span className="text-muted-foreground">URL:</span> <span className="font-mono break-all text-xs">{webhookUrl}</span></div>
          <div><span className="text-muted-foreground">Content type:</span> <b>application/json</b></div>
        </div>

        <CodeBlock label="Custom Header">{`x-webhook-secret: <your UPI_WEBHOOK_SECRET>`}</CodeBlock>

        <CodeBlock label="Request Body (JSON)">{`{
  "amount_paise": [lv=amount_paise],
  "utr": "[lv=utr]",
  "payer_upi": "[lv=payer]",
  "raw_payload": "[notification_text]"
}`}</CodeBlock>
        <p className="text-xs text-muted-foreground">
          MacroDroid replaces <span className="font-mono">[notification_text]</span> with the SMS / notification body automatically. Set the other <span className="font-mono">lv=…</span> values using "Local Variables" + a regex parser in step 4.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">4. Parse amount and UTR (regex)</h2>
        <p className="text-sm text-muted-foreground">
          Before the HTTP action, add <b>Logic → Variables → Set String</b> actions using regex on <span className="font-mono">[notification_text]</span>. Common patterns:
        </p>

        <CodeBlock label="Amount in rupees (capture group → multiply by 100)">{`Rs\\.?\\s?([\\d,]+(?:\\.\\d{1,2})?)`}</CodeBlock>

        <CodeBlock label="UTR / Reference number">{`(?:UTR|Ref(?:erence)?(?:\\s*No)?)[:\\s]*([A-Za-z0-9]{8,22})`}</CodeBlock>

        <CodeBlock label="Sender UPI ID">{`from\\s+([\\w.\\-]+@[\\w.\\-]+)`}</CodeBlock>

        <p className="text-xs text-muted-foreground">
          Convert the amount to paise: take the captured value, strip commas/decimal, multiply by 100 (or parse <span className="font-mono">{"\\d+"}</span> and <span className="font-mono">{"\\d{1,2}"}</span> separately).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">5. Test it</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Send yourself <b>₹1.00</b> on the dedicated UPI ID.</li>
          <li>Within ~3 seconds, check <a href="/admin/orders" className="text-primary underline">Orders</a> — a matched payment switches to <span className="font-mono">paid_pending_delivery</span>.</li>
          <li>If nothing matches (no order with ₹1.00), it appears in <a href="/admin/unmatched" className="text-primary underline">Unmatched Payments</a>. That confirms MacroDroid is reaching the server.</li>
          <li>If neither: the secret header is wrong, or the regex didn't capture anything. Check MacroDroid → System Log.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">6. Security notes</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Use a dedicated SIM + bank account only for Barbieverse — easier to audit.</li>
          <li>The webhook secret is shared between this app and MacroDroid. Rotate it any time in Settings.</li>
          <li>Keep the phone connected to charger + Wi-Fi. Disable battery optimization for MacroDroid.</li>
          <li>Optionally turn on MacroDroid's <i>Trigger Log</i> for the first week — it shows every payload sent.</li>
        </ul>
      </section>
    </div>
  );
}
