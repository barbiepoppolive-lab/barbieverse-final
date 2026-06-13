import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { PolicyShell } from "@/components/PolicyShell";
import { DEFAULT_POLICY_CONTENT, POLICY_META } from "@/lib/policy-defaults";
import { CheckCircle2, Clock, Loader2, Sparkles, XCircle } from "lucide-react";

const qo = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });
const meta = POLICY_META.policy_recharge;

export const Route = createFileRoute("/recharge-policy")({
  head: () => ({
    meta: [
      { title: `${meta.title} — BarbieVerse` },
      { name: "description", content: meta.subtitle },
      { property: "og:title", content: `${meta.title} — BarbieVerse` },
      { property: "og:description", content: meta.subtitle },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const STATUSES = [
  { label: "Payment Submitted", icon: Sparkles, tone: "text-foreground" },
  { label: "Payment Verified", icon: CheckCircle2, tone: "text-primary" },
  { label: "Processing", icon: Loader2, tone: "text-gold" },
  { label: "Completed", icon: CheckCircle2, tone: "text-emerald-400" },
  { label: "Rejected", icon: XCircle, tone: "text-destructive" },
];

function Page() {
  const { data } = useSuspenseQuery(qo);
  const content = data.policy_recharge || DEFAULT_POLICY_CONTENT.policy_recharge;
  return (
    <>
      <PolicyShell
        eyebrow={meta.eyebrow}
        title={meta.title}
        subtitle={meta.subtitle}
        content={content}
      />
      {/* Status timeline appended below the article via a portal-like extra section */}
      <section className="container mx-auto -mt-16 px-4 pb-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gold/20 bg-gradient-to-br from-card/80 via-card/40 to-card/10 p-6 backdrop-blur-xl shadow-luxe sm:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Order Status Timeline</div>
          <h3 className="mt-2 font-display text-2xl font-medium">
            How your <span className="text-gradient-pink">recharge order</span> moves
          </h3>
          <ol className="mt-6 grid gap-3 sm:grid-cols-5">
            {STATUSES.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.label}
                  className="relative rounded-2xl border border-border/60 bg-background/40 p-4 text-center backdrop-blur"
                >
                  <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gradient-pink/10">
                    <Icon className={`h-4 w-4 ${s.tone}`} />
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <div className="mt-1 text-xs font-semibold sm:text-sm">{s.label}</div>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-gold" />
            Most UPI orders auto-verify within minutes. USDT &amp; NetBanking are manually verified.
          </p>
        </div>
      </section>
    </>
  );
}
