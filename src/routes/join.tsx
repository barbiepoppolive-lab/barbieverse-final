import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { LeadForm } from "@/components/LeadForm";
import { Gift, Zap, IndianRupee } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Poppo Live — Earn ₹500 Instantly | Barbieverse" },
      {
        name: "description",
        content:
          "India's fastest growing live streaming app. Sign up via Barbieverse and earn ₹500 joining bonus instantly. Apply in 60 seconds.",
      },
      { property: "og:title", content: "Join Poppo Live — Earn ₹500 Instantly" },
      {
        property: "og:description",
        content: "India's fastest growing live streaming app. Earn ₹500 bonus.",
      },
    ],
  }),
  component: () => <JoinPage source="direct" />,
});

export function JoinPage({
  source,
  headline,
  sub,
}: {
  source: "direct" | "wobb";
  headline?: string;
  sub?: string;
}) {
  const { t } = useLang();
  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Gift className="h-3.5 w-3.5" /> {t("join.page.badge")}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              {(headline || t("join.page.title")).split("₹500").map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <span className="text-gradient-pink">₹500</span>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{sub || t("join.page.sub")}</p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: IndianRupee, title: t("join.benefit1.title"), desc: t("join.benefit1.desc") },
                { icon: Zap, title: t("join.benefit2.title"), desc: t("join.benefit2.desc") },
                { icon: Gift, title: t("join.benefit3.title"), desc: t("join.benefit3.desc") },
              ].map((b) => (
                <li key={b.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-pink glow-pink">
                    <b.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-sm text-muted-foreground">{b.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <LeadForm source={source} />
        </div>
      </section>
    </SiteLayout>
  );
}
