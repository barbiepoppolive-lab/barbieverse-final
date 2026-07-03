import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { StepProgress } from "@/components/ui/StepProgress";
import { SmartPaymentVerification } from "@/components/SmartPaymentVerification";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { submitOrder } from "@/lib/api/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Coins, CheckCircle2, Copy, ShieldCheck, ArrowLeft, Smartphone, Bitcoin, Building2, Loader2, AlertCircle, Lock, MessageCircle, IndianRupee, Package, Sparkles, Banknote, User, Phone, Gamepad2, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

type Method = "upi" | "usdt" | "netbanking";
const POPPO_ID_REGEX = /^\d{8,10}$/;

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/coins")({
  head: () => ({
    meta: [
      { title: "Recharge Poppo/Vone Live Coins — UPI Auto-Verify | Barbieverse" },
      { name: "description", content: "Recharge Poppo/Vone Live coins safely via UPI. Auto-verified payments, coins delivered in minutes." },
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
            <h1 className="mt-4 font-display text-2xl font-bold">⏸️ Coin Sales Paused</h1>
            <p className="mt-3 text-muted-foreground">
              Coin recharge is currently paused. Please check back later or contact support on WhatsApp. 💬
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
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<Method>("upi");
  const [orderResult, setOrderResult] = useState<{ id: string; expected_amount_rupees: string; name: string; whatsapp: string; poppo_id: string } | null>(null);
  const submit = useServerFn(submitOrder);
  const [loading, setLoading] = useState(false);

  const selectPackage = (p: Pkg) => {
    setSelected(p);
    setQuantity(1);
    setStep("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 pt-6 pb-12 lg:pt-10 lg:pb-16 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[120px] max-w-2xl rounded-full bg-primary/10 blur-[120px]" />

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            🪙 {t("coins.recharge")} <span className="text-gradient-pink">{t("coins.poppo")}</span> {t("section.packages.coins")} 🪙
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            🚀 {t("coins.page.sub")}
          </p>
        </div>

        {step !== "done" && (
          <StepProgress
            className="mt-5"
            steps={[
              { label: "📦 Pick Package" },
              { label: "📝 Details" },
              { label: "💳 Payment" },
              { label: "✅ Done" },
            ]}
            current={step === "pick" ? 0 : step === "form" ? 1 : step === "pay" ? 2 : 3}
          />
        )}

        {step === "pick" && (
          <div className="mx-auto mt-5 grid max-w-3xl grid-cols-4 gap-1.5 sm:grid-cols-4 lg:gap-2.5 stagger-grid">
            {packages.map((p, i) => (
              <PackageCard
                key={i}
                pkg={p}
                index={i}
                onSelect={() => selectPackage(p)}
                isPopular={i === 1}
                savingsPercent={i === 0 ? 0 : Math.round((1 - (p.price / p.coins) / (packages[0].price / packages[0].coins)) * 100)}
              />
            ))}
          </div>
        )}

        {/* Trust bar — inline below packages */}
        {step === "pick" && (
          <div className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              🔒 UID only — no password needed
            </span>
            <span className="inline-flex items-center gap-1">
              💬 WhatsApp support
            </span>
            <span className="inline-flex items-center gap-1">
              🇮🇳 UPI — zero extra charges
            </span>
            <span className="inline-flex items-center gap-1">
              📦 Select
            </span>
            <span className="inline-flex items-center gap-1">
              📱 Pay via UPI
            </span>
            <span className="inline-flex items-center gap-1">
              ✨ Coins delivered
            </span>
          </div>
        )}

        {step === "form" && selected && (
          <DetailsStep
            pkg={selected}
            quantity={quantity}
            onQuantityChange={setQuantity}
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
                    coins: selected.coins * quantity,
                    amount: selected.price * quantity,
                    quantity,
                    utr: form.utr || "",
                    payment_method: method,
                  },
                });
                if (!res?.ok) return;
                setOrderResult({ id: res.id, expected_amount_rupees: res.expected_amount_rupees, name: form.name, whatsapp: form.whatsapp, poppo_id: form.poppo_id });

                if (method === "upi") {
                  setStep("pay");
                } else {
                  setStep("pay");
                }
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {step === "pay" && selected && orderResult && method === "upi" && (
          <SmartPaymentVerification
            upiId="thestrongwingsofficial@okaxis"
            payeeName="Barbie"
            amountRupees={orderResult.expected_amount_rupees}
            orderId={orderResult.id}
            orderShortId={orderResult.id.slice(0, 8)}
            customerName={orderResult.name}
            customerWhatsapp={orderResult.whatsapp}
            poppoId={orderResult.poppo_id}
            packageName={selected.name}
            quantity={quantity}
            totalCoins={selected.coins * quantity}
            whatsappNumber={settings.admin_whatsapp || "919000966360"}
            onBack={() => setStep("form")}
            onDone={() => setStep("done")}
          />
        )}

        {step === "pay" && selected && orderResult && method !== "upi" && (
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
          <GlassCard className="mx-auto mt-12 max-w-md p-8 text-center" glow="pink">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-pink shadow-glow" style={{ animation: "bounce-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">🎉 Payment Submitted! 🎉</h2>
            <p className="mt-3 text-muted-foreground">
              We're verifying your payment now. Coins will be credited within minutes. You'll get a WhatsApp confirmation as soon as it's complete. 🪙✨
            </p>
            <PremiumButton onClick={() => { setStep("pick"); setSelected(null); setOrderResult(null); }} className="mt-6" variant="primary">
              🛒 New order <ArrowRight className="h-4 w-4" />
            </PremiumButton>
          </GlassCard>
        )}

        {/* FAQ Section */}
        {step === "pick" && (
          <div className="mx-auto mt-16 max-w-2xl">
            <h2 className="text-center font-display text-2xl font-bold">❓ Frequently Asked Questions</h2>
            <FaqAccordion
              className="mt-8"
              items={[
                { q: "🛡️ Is it safe to recharge here?", a: "Yes! We only need your Poppo/Vone User ID. We never ask for your password or login credentials. Your account stays 100% secure." },
                { q: "⚡ How long does delivery take?", a: "Within 30 minutes of payment verification during business hours. Most orders are completed within 10 minutes!" },
                { q: "⚠️ What if I enter the wrong Poppo/Vone ID?", a: "Double-check your ID before submitting. We cannot reverse transactions with incorrect IDs, so please verify carefully!" },
                { q: "💳 What payment methods are accepted?", a: "UPI only — scan our QR code or use our UPI ID directly. Zero extra charges on your payment!" },
                { q: "📱 How do I find my Poppo/Vone User ID?", a: "Open Poppo/Vone app → tap My → your numeric ID is below your profile photo. It looks like: ID: XXXXXXXX" },
              ]}
            />
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function PackageCard({ pkg, index, onSelect, isPopular, savingsPercent }: { pkg: Pkg; index: number; onSelect: () => void; isPopular: boolean; savingsPercent: number }) {
  const { t } = useLang();

  const TIER_CONFIG = [
    { emoji: "🪙", gradient: "from-amber-500/20 to-yellow-600/10", accent: "text-amber-400", badge: "" },
    { emoji: "💎", gradient: "from-primary/20 to-pink-600/10", accent: "text-primary", badge: t("coins.mostpopular") },
    { emoji: "👑", gradient: "from-purple-500/20 to-violet-600/10", accent: "text-purple-400", badge: "Best Value" },
    { emoji: "⭐", gradient: "from-gold/20 to-amber-500/10", accent: "text-gold", badge: "VIP" },
  ];
  const tier = TIER_CONFIG[index % TIER_CONFIG.length];
  const coinRate = (pkg.price / pkg.coins).toFixed(2);

  return (
    <div
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl border bg-card/40 p-2 text-center backdrop-blur-md transition-all duration-300 hover-lift cursor-pointer sm:p-3.5 sm:text-left ${
        isPopular
          ? "border-primary/50 shadow-[0_0_25px_oklch(0.72_0.25_350/0.1)]"
          : "border-border/60 hover:border-gold/40"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

      {isPopular && (
        <div className="absolute -right-6 top-1.5 rotate-45 bg-gradient-pink px-6 py-0.5 text-[7px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg sm:-right-7 sm:top-2 sm:px-8 sm:text-[8px]">
          {tier.badge}
        </div>
      )}

      {savingsPercent > 0 && (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-gradient-gold px-1.5 py-0.5 text-[7px] font-bold text-black shadow-lg sm:left-2 sm:top-2 sm:px-2 sm:text-[8px]">
          Save {savingsPercent}%
        </div>
      )}

      <div className="relative text-center text-2xl sm:text-3xl">{tier.emoji}</div>

      <div className="relative mt-0.5 text-center text-[7px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mt-1 sm:text-[9px] sm:tracking-[0.16em]">
        {pkg.name}
      </div>

      <div className="relative mt-1.5 text-center sm:mt-2">
        <span className={`font-display text-lg font-bold leading-none sm:text-2xl ${tier.accent}`}>{pkg.coins.toLocaleString()}</span>
        <span className="ml-0.5 text-[8px] text-muted-foreground sm:text-[10px]">{t("coins.coins")}</span>
      </div>

      <div className="relative mt-1 text-center font-display text-sm font-bold text-foreground sm:text-base">
        ₹{pkg.price.toLocaleString()}
      </div>
      <div className="relative text-center text-[8px] text-muted-foreground sm:text-[9px]">
        <span className={savingsPercent > 0 ? "text-green-400 font-semibold" : ""}>₹{coinRate}</span>{t("coins.percoin")}
        {savingsPercent > 0 && (
          <span className="ml-0.5 text-green-400 font-semibold">(−{savingsPercent}%)</span>
        )}
      </div>

      <div className="relative my-2 border-t border-border/40 sm:my-3" />

      <div className="relative inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-pink px-3 py-1.5 text-[10px] font-bold text-primary-foreground transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_0_40px_oklch(0.72_0.25_350/0.4)] sm:gap-1 sm:px-4 sm:py-2 sm:text-[11px]">
        {t("section.packages.select")} <ArrowRight className="h-3 w-3" />
      </div>
    </div>
  );
}

function DetailsStep({
  pkg, quantity, onQuantityChange, method, onMethodChange, onBack, onSubmit, loading,
}: {
  pkg: Pkg;
  quantity: number;
  onQuantityChange: (q: number) => void;
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
    <GlassCard className="mx-auto mt-10 max-w-xl p-6">
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
        className="space-y-5"
      >
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 🔄 Change package
        </button>

        <div className="rounded-xl bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              📦 Package
            </span>
            <span className="font-semibold">{pkg.name} ({pkg.coins} coins)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quantity</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-lg font-bold hover:border-primary">−</button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button type="button" onClick={() => onQuantityChange(Math.min(10, quantity + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-lg font-bold hover:border-primary">+</button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-display text-xl font-bold text-gradient-pink">₹{pkg.price * quantity}</span>
          </div>
          <div className="mt-1 text-right text-xs text-muted-foreground">
            for {pkg.coins * quantity} coins
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            👤 Your Name <span className="text-primary">*</span>
          </label>
          <input name="name" required placeholder="e.g. Priya Sharma" className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none focus-glow" />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            📱 WhatsApp Number <span className="text-primary">*</span>
          </label>
          <input name="whatsapp" required placeholder="+91 98765 43210" className="h-11 w-full rounded-lg border border-input bg-input/50 px-3 text-sm focus:border-primary focus:outline-none focus-glow" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            📩 We'll send your coin purchase receipt and delivery confirmation on WhatsApp.
          </p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            🎮 Poppo/Vone Live ID <span className="text-primary">*</span>
          </label>
          <input
            value={poppoId}
            onChange={(e) => setPoppoId(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
            required inputMode="numeric" pattern="\d{8,10}"
            placeholder="e.g. 18592742"
            className={`h-11 w-full rounded-lg border bg-input/50 px-3 text-sm focus:outline-none ${
              poppoTouched && !poppoValid ? "border-destructive" : "border-input focus:border-primary"
            }`}
          />
          {poppoTouched && !poppoValid ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> Poppo/Vone ID must be 8–10 digits (numbers only).
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Find it on your Poppo/Vone profile as <span className="font-mono">ID: XXXXXXXX</span>. This is permanent.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            💳 Payment method
          </label>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-card/40 p-1.5">
            {methods.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button key={m.id} type="button" onClick={() => onMethodChange(m.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all sm:text-sm ${active ? "bg-gradient-pink text-primary-foreground glow-pink" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{m.label}</span><span className="sm:hidden">{m.id.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <PremiumButton type="submit" disabled={loading || !poppoValid} className="w-full" size="lg" iconRight={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
          {loading ? "⏳ Processing..." : method === "upi" ? "🚀 Continue & Open UPI App" : "🚀 Continue"}
        </PremiumButton>

        <p className="text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3 w-3 text-primary" />
          🔒 UPI payments are auto-verified by amount. Don't change the amount in your UPI app.
        </p>
        <p className="text-center text-[11px] text-muted-foreground">
          By placing this order, you agree to our{" "}
          <a href="/recharge-policy" target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">Recharge Policy</a>.
        </p>
      </form>
    </GlassCard>
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
  const usdtAddress = settings.usdt_wallet_address || "";
  const usdtNetwork = settings.usdt_network || "TRC20";
  const usdtRate = Number(settings.usdt_inr_rate || "90") || 90;
  const usdtAmount = (pkg.price / usdtRate).toFixed(2);

  const qrData = method === "usdt" ? usdtAddress : `${settings.bank_account_name || ""} ${settings.bank_account_number || ""} ${settings.bank_ifsc || ""}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData || "barbieverse")}`;

  const [copied, setCopied] = useState<string | null>(null);
  const copy = (v: string, k: string) => { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="mx-auto mt-10 max-w-xl space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

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


