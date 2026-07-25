// ProofSection — verifiable evidence behind the "highest worldwide" claim.
//
// The homepage credentials card asserts Wealth Level 154 / HIGHEST WORLDWIDE
// with nothing backing it. A first-time visitor arriving from a cold DM has
// no reason to believe that, and "is this a scam" is the single biggest
// objection this page has to clear. These are real Poppo leaderboard
// screenshots with the agency and host IDs on show, so the claim becomes
// checkable rather than asserted.
//
// Two deliberate choices worth keeping if this gets edited later:
//
//  1. Competitors are blurred. Those rows are other hosts' faces, countries
//     and earnings — not ours to publish on a permanent, indexed page. It
//     also focuses the eye on the one sharp gold row, which reads better.
//
//  2. The earnings ladder ends with Barbie's figure rather than opening with
//     it. Most visitors here have been pitched by an agency before. Leading
//     with a lakhs-per-month number triggers the scam reflex; showing the
//     honest entry rung first is what makes the top number believable.

import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { Trophy, ShieldCheck, ArrowRight } from "lucide-react";

// Hard-coded for now — see /proof for the full working.
// 144,124,572 coins × 70% host share ÷ 10,000 coins-per-USD × ₹96.5
export const PROOF_STATS = {
  monthlyInr: "₹9.7 L",
  monthlyLabel: "earned in July 2026",
  rank: "#1",
  rankLabel: "World Rank — Poppo 5th Anniversary",
  agencyId: "2517496",
  hostId: "2697095",
} as const;

const LADDER = [
  { when: "Your first week", amount: "₹1,150", note: "guaranteed — paid even with zero gifts" },
  { when: "Your first month", amount: "₹4,000 – ₹15,000", note: "typical for a new host" },
  { when: "Once you're consistent", amount: "₹15,000 – ₹80,000", note: "per month" },
  { when: "At the very top", amount: PROOF_STATS.monthlyInr, note: "where Barbie is", highlight: true },
];

export function ProofSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28" id="proof">
      {/* ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, oklch(0.5 0.25 345 / 0.18), transparent 55%), radial-gradient(ellipse at 85% 100%, oklch(0.82 0.13 75 / 0.10), transparent 55%)",
        }}
      />

      <div className="container relative mx-auto px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/60 px-4 py-1.5 backdrop-blur-xl">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Verified Results
            </span>
          </div>
          <h2 className="font-display text-3xl leading-tight sm:text-5xl">
            Proof, not promises
          </h2>
          <p className="mt-4 text-balance text-sm text-muted-foreground sm:text-base">
            Most agencies show you a screenshot of someone else&apos;s earnings.
            Here&apos;s ours — and you can check the ID.
          </p>
        </Reveal>

        {/* ── Headline stats ───────────────────────────── */}
        <Reveal delay={80} className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              value={PROOF_STATS.monthlyInr}
              label={PROOF_STATS.monthlyLabel}
              accent="pink"
            />
            <StatCard
              value={PROOF_STATS.rank}
              label={PROOF_STATS.rankLabel}
              accent="gold"
              icon
            />
          </div>

          {/* IDs — two of them, and that's the point */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <IdChip label="Agency ID" value={PROOF_STATS.agencyId} hint="Barbieverse" />
            <IdChip label="Host ID" value={PROOF_STATS.hostId} hint="Barbie — World #1" />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            She runs the agency <span className="text-gold">and</span> streams at the top of it.
            Look either ID up inside Poppo.
          </p>
        </Reveal>

        {/* ── Screenshot strip ─────────────────────────── */}
        <Reveal delay={140} className="mx-auto mt-14 max-w-4xl">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {[
              { src: "anniversary-rank1-peak", alt: "Poppo 5th Anniversary leaderboard showing Barbie ranked No.1 worldwide with 144,124,572 points" },
              { src: "anniversary-rank1", alt: "Poppo 5th Anniversary leaderboard showing Barbie ranked No.1 with a 60,000,000 coin award" },
              { src: "july15-rank1", alt: "Poppo event leaderboard 15 July 2026 showing Barbie in first place" },
            ].map((img, i) => (
              <figure
                key={img.src}
                className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card shadow-luxe transition-transform duration-500 hover:-translate-y-1"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <picture>
                  <source srcSet={`/proof/${img.src}.webp`} type="image/webp" />
                  <img
                    src={`/proof/${img.src}.jpg`}
                    alt={img.alt}
                    width={591}
                    height={1280}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[591/1280] w-full object-cover object-top"
                  />
                </picture>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              </figure>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Competing hosts are blurred — their results aren&apos;t ours to publish.
          </p>
        </Reveal>

        {/* ── Earnings ladder ──────────────────────────── */}
        <Reveal delay={200} className="mx-auto mt-16 max-w-2xl">
          <h3 className="text-center font-display text-2xl sm:text-3xl">
            What this means for you
          </h3>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Barbie isn&apos;t a recruiter who read a guide. She&apos;s the highest-ranked
            host on the platform — and she trains our girls herself.
          </p>

          <ul className="mt-8 space-y-2.5">
            {LADDER.map((row) => (
              <li
                key={row.when}
                className={[
                  "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border px-5 py-4 backdrop-blur-xl transition-colors",
                  row.highlight
                    ? "border-gold/45 bg-gradient-to-r from-gold/12 via-primary/8 to-transparent"
                    : "border-border/60 bg-card/40",
                ].join(" ")}
              >
                <span className="text-sm text-muted-foreground">{row.when}</span>
                <span className="flex items-baseline gap-2">
                  <span
                    className={[
                      "font-display text-lg sm:text-xl",
                      row.highlight ? "wealth-shimmer text-gold" : "text-foreground",
                    ].join(" ")}
                  >
                    {row.amount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{row.note}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* The most important sentence on the page. Naming the ceiling as
              unreachable is what stops the whole section reading as a scam. */}
          <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
            You will not earn {PROOF_STATS.monthlyInr} in month one.{" "}
            <span className="text-foreground">Nobody does.</span>
            <br />
            But nobody else in India can show you the ceiling{" "}
            <span className="text-gold">and</span> introduce you to the woman standing on it.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/join"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-gold px-7 py-3.5 font-semibold text-primary-foreground shadow-luxe transition-transform hover:scale-[1.02] sm:w-auto"
            >
              Start earning this week
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/proof"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/30 px-7 py-3.5 text-sm font-medium text-foreground/90 backdrop-blur-xl transition-colors hover:border-gold/60 hover:text-gold sm:w-auto"
            >
              See all the receipts
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  accent,
  icon,
}: {
  value: string;
  label: string;
  accent: "gold" | "pink";
  icon?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border p-7 text-center backdrop-blur-xl",
        accent === "gold"
          ? "border-gold/35 bg-gradient-to-br from-gold/12 via-card/60 to-transparent"
          : "border-primary/35 bg-gradient-to-br from-primary/14 via-card/60 to-transparent",
      ].join(" ")}
    >
      {icon && (
        <Trophy className="mx-auto mb-2 h-6 w-6 text-gold drop-shadow-[0_0_10px_oklch(0.82_0.13_75/0.6)]" />
      )}
      <div
        className={[
          "font-display text-4xl leading-none sm:text-6xl",
          accent === "gold" ? "wealth-shimmer text-gold" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function IdChip({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 px-5 py-3 backdrop-blur-xl">
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">{label}</div>
        <div className="font-mono text-base font-bold tracking-wider text-foreground">{value}</div>
      </div>
      <div className="text-right text-[10px] leading-tight text-muted-foreground">{hint}</div>
    </div>
  );
}
