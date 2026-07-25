// /proof — the full evidence page.
//
// Exists because the homepage claim ("highest worldwide") is worth nothing
// unless a sceptic can check it. This page shows every screenshot, names the
// event and date for each, and shows the arithmetic behind the rupee figure
// rather than asking anyone to take it on faith.
//
// It deliberately includes the one leaderboard where Barbie placed SECOND.
// Removing it would make the set look curated, and a visitor who senses
// cherry-picking discounts everything else on the page. A real leaderboard
// where she isn't always first is what makes the three where she is first
// credible.

import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { PROOF_STATS } from "@/components/ProofSection";
import { ArrowRight, ShieldCheck, Calculator } from "lucide-react";

export const Route = createFileRoute("/proof")({
  component: ProofPage,
  head: () => ({
    meta: [
      { title: "Proof of Earnings — Barbieverse | India's #1 Ranked Poppo Host" },
      {
        name: "description",
        content:
          "Verified Poppo Live leaderboard results for Barbieverse founder Barbie — World Rank #1 in the Poppo 5th Anniversary event, ₹9.7 lakh earned in July 2026. Real screenshots, real IDs, full working shown.",
      },
      { property: "og:title", content: "Proof of Earnings — Barbieverse" },
      {
        property: "og:description",
        content:
          "World Rank #1 on Poppo Live. Real leaderboard screenshots and the full earnings calculation.",
      },
      { property: "og:image", content: "/proof/anniversary-rank1-peak.jpg" },
    ],
  }),
});

interface Shot {
  src: string;
  event: string;
  dates: string;
  rank: string;
  score: string;
  award: string;
  note?: string;
  rankTone: "gold" | "silver";
}

const SHOTS: Shot[] = [
  {
    src: "anniversary-rank1-peak",
    event: "Poppo 5th Anniversary",
    dates: "July 2026",
    rank: "No. 1 Worldwide",
    score: "144,124,572",
    award: "60,000,000",
    note: "Peak result — ahead of agencies from the Philippines, UAE and Kuwait.",
    rankTone: "gold",
  },
  {
    src: "anniversary-rank1",
    event: "Poppo 5th Anniversary",
    dates: "15–21 July 2026",
    rank: "No. 1 Worldwide",
    score: "60,721,227",
    award: "60,000,000",
    note: "Top award for the day — “You win the biggest award today.”",
    rankTone: "gold",
  },
  {
    src: "july15-rank1",
    event: "Daily Ranking Event",
    dates: "15 July 2026",
    rank: "No. 1",
    score: "60,721,547",
    award: "4,000,000",
    rankTone: "gold",
  },
  {
    src: "july17-19-rank2",
    event: "Weekend Ranking Event",
    dates: "17–19 July 2026",
    rank: "No. 2",
    score: "109,861,116",
    award: "4,500,000",
    note: "Not every board is a win — included so you know the rest aren't cherry-picked.",
    rankTone: "silver",
  },
];

function ProofPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, oklch(0.5 0.25 345 / 0.22), transparent 60%)",
        }}
      />

      <div className="container relative mx-auto px-4 py-16 sm:py-24">
        {/* ── Hero ─────────────────────────────────────── */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/60 px-4 py-1.5 backdrop-blur-xl">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Receipts
            </span>
          </div>
          <h1 className="font-display text-4xl leading-tight sm:text-6xl">
            The receipts
          </h1>
          <p className="mt-5 text-balance text-sm text-muted-foreground sm:text-base">
            Every screenshot below is from the Poppo app, taken in July 2026.
            The host ID on them is <span className="font-mono text-gold">{PROOF_STATS.hostId}</span> —
            look it up yourself.
          </p>
        </Reveal>

        {/* ── Headline ─────────────────────────────────── */}
        <Reveal delay={80} className="mx-auto mt-12 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/14 via-card/60 to-transparent p-8 text-center backdrop-blur-xl">
              <div className="font-display text-5xl leading-none text-foreground sm:text-6xl">
                {PROOF_STATS.monthlyInr}
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {PROOF_STATS.monthlyLabel}
              </div>
            </div>
            <div className="rounded-3xl border border-gold/35 bg-gradient-to-br from-gold/12 via-card/60 to-transparent p-8 text-center backdrop-blur-xl">
              <div className="wealth-shimmer font-display text-5xl leading-none text-gold sm:text-6xl">
                {PROOF_STATS.rank}
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {PROOF_STATS.rankLabel}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Screenshots ──────────────────────────────── */}
        <div className="mx-auto mt-16 max-w-5xl space-y-10">
          {SHOTS.map((shot, i) => (
            <Reveal key={shot.src} delay={i * 60}>
              <article className="grid items-center gap-7 rounded-3xl border border-border/60 bg-card/30 p-5 backdrop-blur-xl sm:grid-cols-[minmax(0,220px)_1fr] sm:p-7">
                <figure className="overflow-hidden rounded-2xl border border-gold/20 shadow-luxe">
                  <picture>
                    <source srcSet={`/proof/${shot.src}.webp`} type="image/webp" />
                    <img
                      src={`/proof/${shot.src}.jpg`}
                      alt={`${shot.event}, ${shot.dates} — Barbie ranked ${shot.rank} with ${shot.score} points`}
                      width={591}
                      height={1280}
                      loading="lazy"
                      decoding="async"
                      className="w-full"
                    />
                  </picture>
                </figure>

                <div>
                  <span
                    className={[
                      "inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                      shot.rankTone === "gold"
                        ? "bg-gold/15 text-gold ring-1 ring-gold/30"
                        : "bg-muted/40 text-muted-foreground ring-1 ring-border",
                    ].join(" ")}
                  >
                    {shot.rank}
                  </span>

                  <h2 className="mt-3 font-display text-2xl sm:text-3xl">{shot.event}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {shot.dates}
                  </p>

                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                      <dt className="text-[9px] uppercase tracking-[0.2em] text-gold/80">
                        Points earned
                      </dt>
                      <dd className="font-mono text-sm font-bold">{shot.score}</dd>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                      <dt className="text-[9px] uppercase tracking-[0.2em] text-gold/80">
                        Award
                      </dt>
                      <dd className="font-mono text-sm font-bold">{shot.award}</dd>
                    </div>
                  </dl>

                  {shot.note && (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {shot.note}
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* ── The maths ────────────────────────────────── */}
        <Reveal className="mx-auto mt-20 max-w-2xl">
          <div className="rounded-3xl border border-gold/25 bg-card/40 p-7 backdrop-blur-xl sm:p-9">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gold" />
              <h2 className="font-display text-xl sm:text-2xl">How {PROOF_STATS.monthlyInr} is calculated</h2>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing here is rounded up. Poppo runs a fixed conversion and takes a
              platform cut before anything reaches the host:
            </p>

            <ol className="mt-6 space-y-3 text-sm">
              {[
                ["Peak event total", "144,124,572 coins"],
                ["Host share (Poppo keeps 30%)", "× 0.70 = 100,887,200"],
                ["Poppo rate: 10,000 = $1", "÷ 10,000 = $10,088"],
                ["Converted at ₹96.5 / $1", "≈ ₹9,73,500"],
              ].map(([label, val], i) => (
                <li
                  key={label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/50 pb-3 last:border-0"
                >
                  <span className="text-muted-foreground">
                    <span className="mr-2 text-gold/70">{i + 1}.</span>
                    {label}
                  </span>
                  <span className="font-mono text-foreground">{val}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              This counts the single largest verified event of the month, so the true
              July total is <span className="text-foreground">higher</span>, not lower.
              Poppo runs several leaderboards at once and the same gifts appear on more
              than one, so we don&apos;t add them together — that would inflate the figure.
            </p>
          </div>
        </Reveal>

        {/* ── Honest ladder + CTA ──────────────────────── */}
        <Reveal className="mx-auto mt-16 max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl">
            What you should actually expect
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            You will not earn {PROOF_STATS.monthlyInr} in your first month.{" "}
            <span className="text-foreground">Nobody does.</span> New hosts get{" "}
            <span className="text-gold">₹1,150 guaranteed</span> for their first week —
            paid whether or not a single gift arrives — and typically{" "}
            <span className="text-foreground">₹4,000–₹15,000</span> in month one.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            What&apos;s different here isn&apos;t the app. Anyone can download the app.
            It&apos;s that the person training you is ranked{" "}
            <span className="text-gold">first in the world</span> on it.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/join"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-gold px-8 py-4 font-semibold text-primary-foreground shadow-luxe transition-transform hover:scale-[1.02] sm:w-auto"
            >
              Start earning this week
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center rounded-full border border-gold/30 px-8 py-4 text-sm font-medium text-foreground/90 backdrop-blur-xl transition-colors hover:border-gold/60 hover:text-gold sm:w-auto"
            >
              Back to home
            </Link>
          </div>

          <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
            Competing hosts in these screenshots are blurred — their results aren&apos;t
            ours to publish. Earnings vary by hours streamed, audience and consistency;
            the figures above describe our own hosts and are not a promise of income.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
