import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Coins, ArrowRight, Smartphone, Building2, Bitcoin, Minus, Plus } from "lucide-react";

export type Pkg = { name: string; coins: number; price: number };

export function RechargePackages({ packages }: { packages: Pkg[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});

  const getQty = (name: string) => qty[name] ?? 1;
  const setQ = (name: string, v: number) =>
    setQty((q) => ({ ...q, [name]: Math.max(1, Math.min(99, v)) }));

  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Coin Recharge</div>
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

      <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => {
          const q = getQty(p.name);
          const total = p.price * q;
          const totalCoins = p.coins * q;
          return (
            <div
              key={p.name}
              className="relative rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-md transition-all hover:border-gold/40"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <Coins className="h-4 w-4 text-gold" />
                <span className="font-display text-2xl font-medium">{p.coins.toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">₹{p.price} / pack</div>

              <div className="mt-3 flex items-center justify-between rounded-full border border-border/60 bg-background/40 px-2 py-1">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => setQ(p.name, q - 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-primary/15"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-semibold">× {q}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() => setQ(p.name, q + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-primary/15"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="font-display text-lg font-semibold text-primary">₹{total.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{totalCoins.toLocaleString()} coins</div>

              <Link
                to="/coins"
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full bg-gradient-pink text-[11px] font-bold uppercase tracking-wider text-primary-foreground"
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
