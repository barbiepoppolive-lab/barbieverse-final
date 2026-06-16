import { Link } from "@tanstack/react-router";
import { Crown, ArrowRight } from "lucide-react";

type Tier = { icon: string; name: string };

export function VipStrip({
  tiers,
  supportText,
  ctaText,
}: {
  tiers: Tier[];
  supportText: string;
  ctaText: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-gold/15 bg-gradient-noir">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[200px] max-w-2xl rounded-full bg-gold/10 blur-[120px] drift" />
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full hairline-gold bg-card/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-gold backdrop-blur-md">
            <Crown className="h-3 w-3" /> VIP Ecosystem
          </div>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight sm:text-4xl">
            <span className="italic text-gradient-pink">Five tiers.</span> One luxury circle.
          </h2>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-card/50 px-4 py-2 text-xs font-medium backdrop-blur-md sm:text-sm"
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.name}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
            {supportText}
          </p>

          <Link
            to="/join"
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-gold px-7 text-xs font-bold uppercase tracking-wider text-background transition-transform hover:scale-[1.03]"
          >
            {ctaText} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
