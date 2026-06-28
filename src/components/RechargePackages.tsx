import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Smartphone, Building2, Bitcoin, Zap } from "lucide-react";

export type Pkg = { name: string; coins: number; price: number };

const TIER_CONFIG: Record<string, { emoji: string; gradient: string; badge?: string }> = {
  starter:   { emoji: "🪙", gradient: "from-amber-500/20 to-yellow-600/10" },
  popular:   { emoji: "💎", gradient: "from-primary/20 to-pink-600/10", badge: "Popular" },
  premium:   { emoji: "👑", gradient: "from-purple-500/20 to-violet-600/10", badge: "Best Value" },
  ultimate:  { emoji: "⭐", gradient: "from-gold/20 to-amber-500/10", badge: "VIP" },
};

const MULTIPLIER_OPTIONS = [1, 2, 5, 10];

function getTierConfig(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("starter") || lower.includes("basic") || lower.includes("1")) return TIER_CONFIG.starter;
  if (lower.includes("popular") || lower.includes("medium") || lower.includes("2")) return TIER_CONFIG.popular;
  if (lower.includes("premium") || lower.includes("large") || lower.includes("3")) return TIER_CONFIG.premium;
  if (lower.includes("ultimate") || lower.includes("mega") || lower.includes("4")) return TIER_CONFIG.ultimate;
  return TIER_CONFIG.starter;
}

function getBestValueIndex(packages: Pkg[]): number {
  let bestIdx = 0;
  let bestRatio = 0;
  packages.forEach((p, i) => {
    const ratio = p.coins / p.price;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export function RechargePackages({ packages }: { packages: Pkg[] }) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const bestValueIdx = getBestValueIndex(packages);

  const getMultiplier = (name: string) => selected[name] ?? 1;

  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold">
          <Zap className="h-3 w-3" /> Coin Recharge
        </div>
        <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
          Fast, secure <span className="italic text-gradient-pink">coin delivery</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Pick a package, choose quantity, pay via UPI, Net Banking or USDT.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {[
            { icon: Smartphone, label: "UPI" },
            { icon: Building2, label: "Net Banking" },
            { icon: Bitcoin, label: "USDT (TRC20)" },
          ].map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] backdrop-blur-md">
              <m.icon className="h-3 w-3 text-gold" /> {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((p, idx) => {
          const mult = getMultiplier(p.name);
          const total = p.price * mult;
          const totalCoins = p.coins * mult;
          const tier = getTierConfig(p.name);
          const isBestValue = idx === bestValueIdx;
          const isSelected = mult > 1;
          const savings = mult > 1 ? Math.round((1 - (total / (p.price * mult))) * 0 + (mult >= 5 ? 10 : mult >= 2 ? 5 : 0)) : 0;
          const savingsPercent = mult >= 10 ? 20 : mult >= 5 ? 15 : mult >= 2 ? 10 : 0;

          return (
            <div
              key={p.name}
              className={`group relative overflow-hidden rounded-2xl border bg-card/40 p-5 backdrop-blur-md transition-all duration-300 hover-lift ${
                isSelected
                  ? "border-primary/50 shadow-[0_0_30px_oklch(0.72_0.25_350/0.12)]"
                  : "border-border/60 hover:border-gold/40"
              }`}
            >
              {/* Gradient background overlay */}
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

              {/* Best Value badge */}
              {isBestValue && (
                <div className="absolute -right-8 top-4 rotate-45 bg-gradient-pink px-10 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                  {tier.badge}
                </div>
              )}

              {/* Tier emoji + name */}
              <div className="relative text-center">
                <div className="text-4xl" role="img" aria-label={p.name}>{tier.emoji}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.name}</div>
              </div>

              {/* Coin count */}
              <div className="relative mt-3 text-center">
                <span className="font-display text-3xl font-bold text-foreground">{p.coins.toLocaleString()}</span>
                <span className="ml-1 text-xs text-muted-foreground">coins</span>
              </div>

              {/* Price per pack */}
              <div className="relative mt-1 text-center text-xs text-muted-foreground">
                ₹{p.price.toLocaleString()} / pack
              </div>

              {/* Multiplier chips */}
              <div className="relative mt-4 flex justify-center gap-1.5">
                {MULTIPLIER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelected((prev) => ({ ...prev, [p.name]: m }))}
                    className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full border px-2 text-xs font-semibold transition-all duration-200 ${
                      mult === m
                        ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_12px_oklch(0.72_0.25_350/0.15)]"
                        : "border-border/50 bg-background/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    ×{m}
                  </button>
                ))}
              </div>

              {/* Savings badge */}
              {savingsPercent > 0 && (
                <div className="relative mt-2 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    Save {savingsPercent}%
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="relative my-4 border-t border-border/40" />

              {/* Total */}
              <div className="relative flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold text-primary">₹{total.toLocaleString()}</span>
              </div>
              <div className="relative text-right text-[10px] text-muted-foreground">
                {totalCoins.toLocaleString()} coins
              </div>

              {/* Buy button */}
              <Link
                to="/coins"
                className="relative mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-pink text-[11px] font-bold uppercase tracking-wider text-primary-foreground glow-pink transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_oklch(0.72_0.25_350/0.3)]"
              >
                Buy now <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
