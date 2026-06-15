import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { LeadForm } from "@/components/LeadForm";
import { BadgeCheck, Zap, Users } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Poppo Live — Earn ₹1,150+ In Your First Week | Barbieverse" },
      {
        name: "description",
        content:
          "Join India's top Poppo creator agency. Earn ₹1,150 guaranteed in your first week by streaming 2 hours daily.",
      },
      { property: "og:title", content: "Join Poppo Live — Earn ₹1,150+ In Your First Week" },
      {
        property: "og:description",
        content: "India's top Poppo creator agency. Earn ₹1,150+ in week one.",
      },
    ],
  }),
  component: () => <JoinPage source="direct" />,
});

export function JoinPage({
  source,
  headline,
  sub,
  badge,
  successMsg,
}: {
  source: "direct" | "wobb";
  headline?: string;
  sub?: string;
  badge?: string;
  successMsg?: string;
}) {
  const { t } = useLang();
  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              <BadgeCheck className="h-3.5 w-3.5" /> {badge || "Official Poppo Agency"}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              {headline || "Join Poppo Live — Earn ₹1,150+ In Your First Week"}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {sub || "India's top Poppo creator agency. Start earning from day one with our guidance."}
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-pink glow-pink">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">Earn ₹1,150 guaranteed in week one</div>
                  <div className="text-sm text-muted-foreground">Stream just 2 hrs/day for 7 days — Poppo pays you directly</div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-pink glow-pink">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">No audience needed</div>
                  <div className="text-sm text-muted-foreground">Poppo pays you from day one — we guide you every step</div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-pink glow-pink">
                  <BadgeCheck className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">Dedicated WhatsApp support in Hindi & English</div>
                  <div className="text-sm text-muted-foreground">Our team helps you with onboarding, streaming tips and payouts</div>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <LeadForm source={source} successMsg={successMsg} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Female creators earn ₹1,150 in week 1. Male creators earn ₹575. Both earn ongoing daily from streaming.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
