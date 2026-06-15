import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { submitOrder } from "@/lib/api/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Coins, CheckCircle2, Copy, ShieldCheck, ArrowLeft, Smartphone, Bitcoin, Building2, Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";

type Method = "upi" | "usdt" | "netbanking";
const POPPO_ID_REGEX = /^\d{8,10}$/;

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/coins")({
  head: () => ({
    meta: [
      { title: "Recharge Poppo Live Coins — UPI Auto-Verify | Barbieverse" },
      { name: "description", content: "Recharge Poppo Live coins safely via UPI. Auto-verified payments, coins delivered in minutes." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQO),
  component: CoinsPage,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
});

type Pkg = { name: string; coins: number; price: number };

function parsePkg(v: string | undefined, fallback: Pkg): Pkg {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

function CoinsPage() {
  const { data: settings } = useSuspenseQuery(settingsQO);
  const { t } = useLang();

  // Check if coin sales are enabled (default: enabled)
  const coinsEnabled = settings.coins_enabled !== "false";

  if (!coinsEnabled) {
    return (
      <SiteLayout>
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-md">
            <AlertCircle className="mx-auto h-14 w-14 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold">Coin Sales Paused</h1>
            <p className="mt-3 text-muted-foreground">
              Coin recharge is currently paused. Please check back later or contact support on WhatsApp.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/60 px-5 text-sm font-semibold hover:border-gold/60"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const packages: Pkg[] = [
    parsePkg(settings.coin_package_1, { name: t("section.packages.starter"), coins: 100, price: 99 }),
    parsePkg(settings.coin_package_2, { name: t("section.packages.popular"), coins: 500, price: 449 }),
    parsePkg(settings.coin_package_3, { name: t("section.packages.value"), coins: 1000, price: 849 }),
    parsePkg(settings.coin_package_4, { name: t("section.packages.mega"), coins: 5000, price: 3999 }),
  ];

  const [step, setStep] = useState<"pick" | "form" | "pay" | "done">("pick");
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [method, setMethod] = useState<Method>("upi");
  const [orderResult, setOrderResult] = useState<{ id: string; expected_amount_rupees: string } | null>(null);
  const submit = useServerFn(submitOrder);
  const [loading, setLoading] = useState(false);

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            {t("coins.recharge")} <span className="text-gradient-pink">{t("coins.poppo")}</span> {t("section.packages.coins")}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {t("coins.page.sub")}
          </p>
        </div>

        {step === "pick" && (
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p, i) => (
              <button
                key={i}
                onClick={() => { setSelected(p); setStep("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`group relative rounded-2xl border bg-card/60 p-6 text-left backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary ${i === 1 ? "border-primary glow-pink" : "border-border/60"}`}
              >
                {i === 1 && <span className="absolute -top-3 right-4 rounded-full bg-gradient-pink px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">{t("coins.mostpopular")}</span>}
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <Coins className="h-6 w-6 text-primary" />
                  <span className="font-display text-3xl font-bold">{p.coins}</span>
                  <span className="text-xs text-muted-foreground">{t("coins.coins")}</span>
                </div>
                <div className="mt-4 font-display text-2xl font-bold text-gradient-pink">₹{p.price}</div>
                <div className="mt-4 text-xs text-muted-foreground">≈ ₹{(p.price / p.coins).toFixed(2)}{t("coins.percoin")}</div>
                <div className="mt-5 inline-flex items-center text-sm font-semibold text-primary">{t("section.packages.select")}</div>
              </button>
            ))}
          </div>
        )}

        {step === "form" && selected && (
          <DetailsStep
            pkg={selected}
            method={method}
            onMethodChange={setMethod}
            onBack={() => setStep("pick")}
            loading={loading}
            onSubmit={async (form) => {
              setLoading(true);
              try {
                const res: any = await submit({
                  data: {
                    name: form.name,
                    whatsapp: form.whatsapp,
                    poppo_id: form.poppo_id,
                    package: selected.name,
                    coins: selected.coins,
                    amount: selected.price,
                    utr: form.utr || "",
                    payment_method: method,
                  },
                });
                if (!res?.ok) return;
                setOrderResult({ id: res.id, expected_amount_rupees: res.expected_amount_rupees });

                if (method === "upi") {
                  // Auto-open UPI app with the unique amount (paise-precise match)
                  const upiId = settings.upi_id || "barbieverse@upi";
                  const payee = settings.upi_payee_name || "Barbieverse";
                  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${res.expected_amount_rupees}&cu=INR&tn=${encodeURIComponent("BV-" + (res.id || "").slice(0, 8))}`;
                  setStep("pay");
                  // Slight delay so the new screen mounts before we navigate
                  setTimeout(() => { window.location.href = upiLink; }, 200);
                } else {
                  setStep("pay");
                }
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {step === "pay" && selected && orderResult && (
          <PayStep
            pkg={selected}
            settings={settings}
            method={method}
            orderId={orderResult.id}
            amountRupees={orderResult.expected_amount_rupees}
            onDone={() => setStep("done")}
            onBack={() => setStep("form")}
          />
        )}

        {step === "done" && (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-primary/30 bg-card/60 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-bold">Done! 🎉</h2>
            <p className="mt-3 text-muted-foreground">
              We're verifying your payment now. Coins will be credited within minutes. You'll get a WhatsApp confirmation as soon as it's complete.
            </p>
            <button
              onClick={() => { setStep("pick"); setSelected(null); setOrderResult(null); }}
              className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-pink px-6 text-sm font-bold text-primary-foreground"
            >
              New order
            </button>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function DetailsStep({
  pkg, method, onMethodChange, onBack, onSubmit, loading,
}: {
  pkg: Pkg;
  method: Method;
  onMethodChange: (m: Method) => void;
  onBack: () => void;
  loading: boolean;
  onSubmit: (form: { name: string; whatsapp: string; poppo_id: string; utr?: string }) => void;
}) {
  const [poppoId, setPoppoId] = useState("");
  const poppoTouched = poppoId.length > 0;
  const poppoValid = POPPO_ID_REGEX.test(poppoId.trim());

  const methods: { id: Method; label: string; icon: typeof Smartphone }[] = [
    { id: "upi", label: "UPI (recommended)", icon: Smartphone },
    { id: "usdt", label: "USDT", icon: Bitcoin },
    { id: "netbanking", label: "NetBanking", icon: Building2 },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!poppoValid) return;
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: String(fd.get("name") || ""),
          whatsapp: String(fd.get("whatsapp") || ""),
          poppo_id: poppoId.trim(),
        });
      }}
      className="mx-auto mt-10 max-w-xl space-y-5 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md"
    >
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Change package
      </button>

      <div className="rounded-xl bg-secondary/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Package</span>
          <span className="font-semibold">{pkg.name} ({pkg.coins} coins)</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-display text-xl font-bold text-gradient-pink">₹{pkg.price}</span>
        </div>
      </div>

      <FormField name="name" label="Your Name" required />
      <div>
        <FormField name="whatsapp" label="WhatsApp Number" placeholder="+91 98765 43210" required />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Required — we'll send your coin purchase receipt and delivery confirmation on WhatsApp.
        </p>
      </div>



      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Poppo Live ID <span className="text-primary">*</span></label>
        <input
          value={poppoId}
          onChange={(e) => setPoppoId(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
          required
          inputMode="numeric"
          pattern="\d{8,10}"
          placeholder="e.g. 18592742"
          className={`h-11 w-full rounded-lg border bg-input/50 px-3 text-sm focus:outline-none ${
            poppoTouched && !poppoValid ? "border-destructive" : "border-input focus:border-primary"
          }`}
        />
        {poppoTouched && !poppoValid ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> Poppo ID must be 8–10 digits (numbers only).
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Find it on your Poppo profile as <span className="font-mono">ID: XXXXXXXX</span>. This is permanent.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Payment method</label>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-card/40 p-1.5">
          {methods.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onMethodChange(m.id)}
                className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all sm:text-sm ${active ? "bg-gradient-pink text-primary-foreground glow-pink" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{m.label}</span><span className="sm:hidden">{m.id.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !poppoValid}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : method === "upi" ? "Continue & Open UPI App →" : "Continue →"}
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="mr-1 inline h-3 w-3 text-primary" />
        UPI payments are auto-verified by amount. Don't change the amount in your UPI app.
      </p>
      <p className="text-center text-[11px] text-muted-foreground">
        By placing this order, you agree to our{" "}
        <a href="/recharge-policy" target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">
          Recharge Policy
        </a>
        .
      </p>
    </form>
  );
}

function PayStep({
  pkg, settings, method, orderId, amountRupees, onBack, onDone,
}: {
  pkg: Pkg;
  settings: Record<string, string>;
  method: Method;
  orderId: string;
  amountRupees: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const upiId = settings.upi_id || "barbieverse@upi";
  const payeeName = settings.upi_payee_name || "Barbieverse";
  const usdtAddress = settings.usdt_wallet_address || "";
  const usdtNetwork = settings.usdt_network || "TRC20";
  const usdtRate = Number(settings.usdt_inr_rate || "90") || 90;
  const usdtAmount = (pkg.price / usdtRate).toFixed(2);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent("BV-" + orderId.slice(0, 8))}`;
  const qrData = method === "upi" ? upiLink : method === "usdt" ? usdtAddress : `${settings.bank_account_name || ""} ${settings.bank_account_number || ""} ${settings.bank_ifsc || ""}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData || "barbieverse")}`;

  const [copied, setCopied] = useState<string | null>(null);
  const copy = (v: string, k: string) => { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="mx-auto mt-10 max-w-xl space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {method === "upi" && (
        <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 backdrop-blur-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pay via UPI</div>
          <div className="mt-3 rounded-xl bg-secondary/40 p-4 text-center">
            <div className="text-xs text-muted-foreground">Pay exactly this amount</div>
            <div className="mt-1 font-display text-4xl font-bold text-gradient-pink">₹{amountRupees}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Unique amount — used to auto-verify your payment</div>
          </div>

          <a
            href={upiLink}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground glow-pink"
          >
            Open UPI App
          </a>

          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Or scan QR</div>
            <img src={qrSrc} alt="UPI QR" className="h-44 w-44 rounded-lg bg-white p-2" />
            <div className="w-full space-y-2">
              <CopyRow label="UPI ID" value={upiId} k="upi" copied={copied} onCopy={copy} />
              <CopyRow label="Amount" value={`₹${amountRupees}`} k="amt" copied={copied} onCopy={copy} />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            After paying, your payment is auto-detected. Coins will be sent within minutes — you'll get a WhatsApp confirmation.
          </div>

          <button onClick={onDone} className="mt-5 h-11 w-full rounded-full border border-border bg-card text-sm font-semibold hover:border-primary">
            I've paid — track on WhatsApp
          </button>
        </div>
      )}

      {method === "usdt" && (
        <UsdtPay
          usdtAddress={usdtAddress} usdtNetwork={usdtNetwork} usdtAmount={usdtAmount}
          qrSrc={qrSrc} copied={copied} copy={copy} orderId={orderId} onDone={onDone}
        />
      )}
      {method === "netbanking" && (
        <NetBankingPay settings={settings} pkg={pkg} copied={copied} copy={copy} orderId={orderId} onDone={onDone} />
      )}
    </div>
  );
}

function UsdtPay({ usdtAddress, usdtNetwork, usdtAmount, qrSrc, copied, copy, orderId, onDone }: any) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pay via USDT ({usdtNetwork})</div>
      <div className="mt-5 flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/50 p-5">
        {usdtAddress ? <img src={qrSrc} alt="USDT QR" className="h-60 w-60 rounded-lg bg-white p-2" /> : <div className="flex h-60 w-60 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">USDT wallet not configured.</div>}
        <div className="w-full space-y-2">
          <CopyRow label="Network" value={usdtNetwork} k="net" copied={copied} onCopy={copy} />
          <CopyRow label="Wallet" value={usdtAddress || "—"} k="addr" copied={copied} onCopy={copy} />
          <CopyRow label="Amount" value={`${usdtAmount} USDT`} k="usdt-amt" copied={copied} onCopy={copy} />
        </div>
      </div>
      <button onClick={onDone} className="mt-5 h-11 w-full rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">I've paid</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">USDT payments are manually verified by our team.</p>
    </div>
  );
}

function NetBankingPay({ settings, pkg, copied, copy, orderId, onDone }: any) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md">
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pay via Net Banking</div>
      <div className="mt-5 space-y-2 rounded-xl border border-border/60 bg-background/50 p-5">
        <CopyRow label="Account Name" value={settings.bank_account_name || "—"} k="bn" copied={copied} onCopy={copy} />
        <CopyRow label="Account Number" value={settings.bank_account_number || "—"} k="ba" copied={copied} onCopy={copy} />
        <CopyRow label="IFSC" value={settings.bank_ifsc || "—"} k="bi" copied={copied} onCopy={copy} />
        <CopyRow label="Bank" value={`${settings.bank_name || "—"}${settings.bank_branch ? " · " + settings.bank_branch : ""}`} k="bk" copied={copied} onCopy={copy} />
        <CopyRow label="Amount" value={`₹${pkg.price}`} k="nb-amt" copied={copied} onCopy={copy} />
      </div>
      <button onClick={onDone} className="mt-5 h-11 w-full rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">I've paid</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Net Banking payments are manually verified by our team.</p>
    </div>
  );
}

function CopyRow({ label, value, k, copied, onCopy }: { label: string; value: string; k: string; copied: string | null; onCopy: (v: string, k: string) => void; }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
      <div className="text-xs"><div className="text-muted-foreground">{label}</div><div className="font-mono font-semibold break-all">{value}</div></div>
      <button type="button" onClick={() => onCopy(value, k)} className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:border-primary">
        {copied === k ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === k ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function FormField({ name, label, required, placeholder }: { name: string; label: string; required?: boolean; placeholder?: string; }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}{required && <span className="text-primary"> *</span>}</label>
      <input name={name} required={required} placeholder={placeholder} className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none" />
    </div>
  );
}
