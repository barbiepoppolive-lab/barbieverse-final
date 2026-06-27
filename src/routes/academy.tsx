import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { BookOpen, Lock, ArrowRight, Crown, Sparkles, Users, TrendingUp, Gift, Swords, Wallet, Shield } from "lucide-react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://barbieverse.org";
const CANONICAL_URL = `${BASE_URL}/academy`;

const LESSONS = [
  {
    num: 1,
    title: "What Is Poppo Live?",
    slug: "/academy/what-is-poppo-live",
    desc: "The simple guide to understanding Poppo/Vone Live — who made it, how it works, and why India uses Vone.",
    icon: Sparkles,
    status: "published" as const,
  },
  {
    num: 2,
    title: "Coins, Points & Gifts — How the Money Works",
    slug: "/academy/coins-points-gifts-explained",
    desc: "Understand the exact conversion from coins to points to rupees — the 70% rule, withdrawal math, and real earning numbers.",
    icon: Gift,
    status: "published" as const,
  },
  {
    num: 3,
    title: "Vone App India Guide",
    slug: "/academy/vone-app-india",
    desc: "Why India uses Vone instead of Poppo, how to download it, and what's exactly the same — feature-by-feature.",
    icon: TrendingUp,
    status: "published" as const,
  },
  {
    num: 4,
    title: "How to Become a Poppo Host",
    slug: "/academy/how-to-become-poppo-host",
    desc: "Exact steps from zero to your first live stream — face authentication tips, category selection, and first stream script.",
    icon: Users,
    status: "published" as const,
  },
  {
    num: 5,
    title: "How Much Can You Earn — Honest India Numbers",
    slug: "/academy/poppo-live-earning-india",
    desc: "Real earning numbers for Indian hosts — Week 1 to Month 6, task income, gift income, and salary tiers.",
    icon: TrendingUp,
    status: "published" as const,
  },
  {
    num: 6,
    title: "The Poppo Task System",
    slug: "/academy/poppo-daily-tasks",
    desc: "Earn ₹166/day without any viewers — every task type, exact points, daily reset time, and the #1 mistake hosts make.",
    icon: Crown,
    status: "published" as const,
  },
  {
    num: 7,
    title: "PK Battles Explained",
    slug: "/academy/pk-battle-guide",
    desc: "Rules, timing strategy, the final-minute multiplier, and how to win PK battles without overspending.",
    icon: Swords,
    status: "published" as const,
  },
  {
    num: 8,
    title: "How to Withdraw Money",
    slug: "/academy/poppo-withdrawal-guide",
    desc: "The Sunday system, every payment method with fees, the Pcoins + Points formula, and why first withdrawals fail.",
    icon: Wallet,
    status: "published" as const,
  },
  {
    num: 9,
    title: "Solo vs Agency — Which Path?",
    slug: "#",
    desc: "Honest comparison of going solo vs joining an agency — commission structures, support differences, and earning impact.",
    icon: Users,
    status: "coming-soon" as const,
  },
  {
    num: 10,
    title: "The Poppo Agency System",
    slug: "#",
    desc: "How agencies work on Poppo/Vone — commission tiers, agent roles, and what to look for in a good agency.",
    icon: Crown,
    status: "coming-soon" as const,
  },
  {
    num: 11,
    title: "Poppo VIP Explained",
    slug: "#",
    desc: "VIP levels, what they unlock, how to build VIP status, and the real benefits for Indian hosts.",
    icon: Sparkles,
    status: "coming-soon" as const,
  },
  {
    num: 12,
    title: "How to Recharge Coins Safely in India",
    slug: "#",
    desc: "Authorized resellers, in-app vs third-party recharge, UPI payment methods, and avoiding scams.",
    icon: Gift,
    status: "coming-soon" as const,
  },
  {
    num: 13,
    title: "The Poppo Level System",
    slug: "#",
    desc: "Account levels, XP requirements, what each level unlocks, and the fastest path to Level 5.",
    icon: TrendingUp,
    status: "coming-soon" as const,
  },
  {
    num: 14,
    title: "Party Rooms vs 1v1 Matches",
    slug: "#",
    desc: "When to use party rooms vs private matches, earning rates for each, and strategy for both formats.",
    icon: Users,
    status: "coming-soon" as const,
  },
  {
    num: 15,
    title: "Gift Strategy for Viewers",
    slug: "#",
    desc: "How viewers can maximise their impact — VIP building, strategic gifting, and understanding gift ROI.",
    icon: Gift,
    status: "coming-soon" as const,
  },
  {
    num: 16,
    title: "How to Grow Your Poppo Audience",
    slug: "#",
    desc: "Audience building strategies — consistent scheduling, engagement tactics, and algorithm optimisation.",
    icon: TrendingUp,
    status: "coming-soon" as const,
  },
  {
    num: 17,
    title: "Face Authentication Guide",
    slug: "#",
    desc: "Step-by-step face verification — common failures, lighting tips, and manual ID verification fallback.",
    icon: Shield,
    status: "coming-soon" as const,
  },
  {
    num: 18,
    title: "The Poppo Ranking System",
    slug: "#",
    desc: "Host rankings, how they're calculated, what they unlock, and how to climb the ranks as a new host.",
    icon: Crown,
    status: "coming-soon" as const,
  },
  {
    num: 19,
    title: "Building a Poppo Agency in India",
    slug: "#",
    desc: "How to start your own agency — requirements, commission structures, and scaling strategies.",
    icon: Users,
    status: "coming-soon" as const,
  },
  {
    num: 20,
    title: "Poppo Safety Rules — What Gets You Banned",
    slug: "#",
    desc: "Platform rules, banned activities, appeal processes, and how to stay safe on Vone/Poppo.",
    icon: Shield,
    status: "coming-soon" as const,
  },
];

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "BarbieVerse Academy — Master Poppo Live from Zero to Earner | Barbieverse" },
      { name: "description", content: "Free lessons on Poppo/Vone Live — understand coins, points, PK battles, withdrawals, and earning strategies. Built for Indian creators." },
      { name: "keywords", content: "poppo live academy, vone live guide, poppo live tutorial, poppo live india, poppo live lessons, poppo live beginner guide" },
      { property: "og:title", content: "BarbieVerse Academy — Master Poppo Live" },
      { property: "og:description", content: "Free lessons on Poppo/Vone Live for Indian creators. From zero to consistent earner." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
      { rel: "canonical", href: CANONICAL_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name: "BarbieVerse Academy — Poppo Live Mastery",
          description: "Free comprehensive lessons on Poppo/Vone Live for Indian creators. Learn about coins, points, PK battles, withdrawals, and earning strategies.",
          provider: { "@type": "Organization", name: "BarbieVerse", url: BASE_URL },
          isAccessibleForFree: true,
          inLanguage: "en-IN",
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT20H",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Academy", item: CANONICAL_URL },
          ],
        }),
      },
    ],
  }),
  component: AcademyIndex,
});

function AcademyIndex() {
  const published = LESSONS.filter((l) => l.status === "published");
  const comingSoon = LESSONS.filter((l) => l.status === "coming-soon");

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1e] via-[#0d0d1a] to-[#0a0a14]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[180px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[140px]" />
        </div>
        <div className="container relative mx-auto px-4 py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold">
              <BookOpen className="h-3 w-3" /> 20 Lessons · Free Forever
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-pink">BarbieVerse</span> Academy
            </h1>
            <p className="mt-4 font-display text-lg italic text-muted-foreground sm:text-xl">
              Master Poppo Live — From Zero to Consistent Earner
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
              The complete learning path for Indian creators on Poppo/Vone Live. Every lesson contains verified, specific information — no hype, no guesswork.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="#lessons"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-pink px-6 text-sm font-bold text-primary-foreground glow-pink"
              >
                Start Learning <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/join"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-semibold backdrop-blur-md hover:border-gold/60"
              >
                Join Agency
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section id="lessons" className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Complete <span className="text-gradient-pink">Curriculum</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            8 lessons published · 12 more coming soon
          </p>

          {/* Published Lessons */}
          <div className="mt-10 space-y-4">
            {published.map((lesson) => {
              const Icon = lesson.icon;
              return (
                <Link
                  key={lesson.num}
                  to={lesson.slug as any}
                  className="group flex items-start gap-5 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-card/50 sm:p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-sm font-bold text-primary-foreground">
                    {lesson.num}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-lg font-bold group-hover:text-primary">
                        {lesson.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{lesson.desc}</p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>

          {/* Coming Soon */}
          <div className="mt-16">
            <h3 className="font-display text-2xl font-bold">
              Coming <span className="text-gradient-gold">Soon</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              These lessons are in development. Want early access?
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {comingSoon.map((lesson) => {
                const Icon = lesson.icon;
                return (
                  <div
                    key={lesson.num}
                    className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/20 p-4 opacity-60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/40 text-xs font-bold text-muted-foreground">
                      {lesson.num}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{lesson.title}</h4>
                    </div>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-8 text-center backdrop-blur-md sm:p-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to <span className="text-gradient-pink">Start Earning</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Join BarbieVerse and get Hindi + English support, earning strategies from Day 1, and coordinated PK battles.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/join"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-8 text-sm font-bold text-primary-foreground glow-pink"
              >
                Join BarbieVerse — Free
              </Link>
              <Link
                to="/coins"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-8 text-sm font-semibold backdrop-blur-md hover:border-gold/60"
              >
                Buy Coins
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
