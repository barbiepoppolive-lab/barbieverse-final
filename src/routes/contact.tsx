import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { CONTACT_DEFAULTS } from "@/lib/policy-defaults";
import { Sparkles, MessageCircle, UserPlus, ShoppingBag, Briefcase, Clock } from "lucide-react";

const qo = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact BarbieVerse — Creator, Recharge & Business Support" },
      { name: "description", content: "Reach BarbieVerse for creator onboarding, recharge support and business enquiries. We typically respond within 24 hours." },
      { property: "og:title", content: "Contact BarbieVerse" },
      { property: "og:description", content: "Creator, recharge and business support — answered within 24 hours." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function val(s: Record<string, string>, key: keyof typeof CONTACT_DEFAULTS) {
  return (s[key] && s[key].trim()) || CONTACT_DEFAULTS[key];
}

function Page() {
  const { data: s } = useSuspenseQuery(qo);

  const cards = [
    { icon: MessageCircle, label: val(s, "contact_general_label"), value: val(s, "contact_general_value"), tag: "General" },
    { icon: UserPlus, label: val(s, "contact_creator_label"), value: val(s, "contact_creator_value"), tag: "Creators" },
    { icon: ShoppingBag, label: val(s, "contact_recharge_label"), value: val(s, "contact_recharge_value"), tag: "Recharge" },
    { icon: Briefcase, label: val(s, "contact_business_label"), value: val(s, "contact_business_value"), tag: "Business" },
  ];

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 pt-16 pb-10 sm:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-card/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-gold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> We're Here To Help
            </div>
            <h1 className="mt-5 font-display text-4xl font-medium leading-tight sm:text-5xl lg:text-6xl">
              Contact <span className="text-gradient-pink">BarbieVerse</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Pick the team that matches what you need. Each desk is staffed by humans who actually use our platform.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.tag}
                  className="group rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:bg-card/60 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-pink/15">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{c.tag}</div>
                  </div>
                  <div className="mt-5 font-display text-xl font-medium">{c.label}</div>
                  <p className="mt-2 break-words text-sm text-muted-foreground">{c.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-10 flex max-w-5xl items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-5 text-xs text-muted-foreground sm:text-sm">
            <Clock className="h-4 w-4 shrink-0 text-gold" />
            <span>{val(s, "contact_response_time")}</span>
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-border/60 bg-card/40 p-5 text-xs text-muted-foreground">
            By contacting BarbieVerse, you agree to our{" "}
            <Link to="/privacy-policy" className="font-semibold text-gold hover:underline">Privacy Policy</Link>{" "}
            and{" "}
            <Link to="/terms-and-conditions" className="font-semibold text-gold hover:underline">Terms & Conditions</Link>.
          </div>
        </section>
    </SiteLayout>
  );
}
