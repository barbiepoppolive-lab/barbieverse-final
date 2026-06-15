// src/routes/index.tsx
// UPDATED: Premium 3D experience — same data, same routes, same logic.
// Only visual layer changed. All business logic untouched.

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ArrowRight, Crown, Sparkles, Heart } from "lucide-react";
import { listPosts } from "@/lib/api/posts.functions";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { getCarouselSlides } from "@/lib/api/carousel.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import founderPortrait from "@/assets/founder-portrait.jpg.asset.json";
import { AutoCarousel } from "@/components/carousel/AutoCarousel";
import { TimelineCarousel } from "@/components/carousel/TimelineCarousel";
import { FeatureCardsCarousel } from "@/components/carousel/FeatureCardsCarousel";
import { VipStrip } from "@/components/VipStrip";
import { RechargePackages, type Pkg } from "@/components/RechargePackages";
import { CreatorAcquisitionSection } from "@/components/CreatorAcquisitionSection";
import { TestimonialsCarousel, type Testimonial } from "@/components/TestimonialsCarousel";
import { LiveCreatorCounter } from "@/components/LiveCreatorCounter";
import { ParticleCanvas } from "@/components/ParticleCanvas";
import { FloatingOrbs, Sparkles as SparklesDots } from "@/components/FloatingOrbs";
import { Reveal } from "@/components/Reveal";
import { TiltCard } from "@/components/TiltCard";
import { useGlobalMouse, usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

// ── Data query options (unchanged) ───────────────────────────────────────────
const postsQO   = queryOptions({ queryKey: ["posts", "home"],             queryFn: () => listPosts({ data: {} }) });
const settingsQO = queryOptions({ queryKey: ["public-settings"],          queryFn: () => getPublicSettings() });
const whyQO     = queryOptions({ queryKey: ["carousel", "why_barbieverse"], queryFn: () => getCarouselSlides({ data: { type: "why_barbieverse" } }) });
const howQO     = queryOptions({ queryKey: ["carousel", "how_success"],   queryFn: () => getCarouselSlides({ data: { type: "how_success" } }) });
const chooseQO  = queryOptions({ queryKey: ["carousel", "why_choose"],    queryFn: () => getCarouselSlides({ data: { type: "why_choose" } }) });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbieverse — India's Highest Wealth-Level Poppo Creator Agency" },
      { name: "description", content: "Join the creator ecosystem built by Barbie, India's highest wealth-level Poppo Live creator. Onboarding, growth, rewards and premium support for new streamers." },
      { property: "og:title", content: "Barbieverse — Creator Ecosystem by India's Top Poppo Creator" },
      { property: "og:description", content: "Start, grow and earn from home with the BarbieVerse creator agency." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(postsQO),
      context.queryClient.ensureQueryData(settingsQO),
      context.queryClient.ensureQueryData(whyQO),
      context.queryClient.ensureQueryData(howQO),
      context.queryClient.ensureQueryData(chooseQO),
    ]),
  component: HomePage,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
});

type Badge = { icon: string; label: string };
type Tier  = { icon: string; name: string };

function safeParse<T>(v: string | undefined, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}
function parsePkg(v: string | undefined, fallback: Pkg): Pkg {
  return safeParse<Pkg>(v, fallback);
}

// ── Scroll progress bar ───────────────────────────────────────────────────────
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const onScroll = () => {
      const prog = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      bar.style.transform = `scaleX(${Math.min(prog, 1)})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div ref={barRef} id="scroll-progress" aria-hidden="true" />;
}

// ── Hero section ──────────────────────────────────────────────────────────────
function HeroSection({ settings }: { settings: Record<string, string> }) {
  const mouse = useGlobalMouse();
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();
  const { t } = useLang();

  const heroPhoto     = settings.hero_photo_url?.trim() || founderPortrait.url;
  const heroEyebrow   = settings.hero_eyebrow   || t("hero.eyebrow");
  const heroName      = settings.hero_name      || t("hero.name");
  const heroTitle     = settings.hero_title     || t("hero.title");
  const heroSubtitle  = settings.hero_subtitle  || t("hero.subtitle");
  const heroIntro     = settings.hero_intro     || t("hero.intro");
  const heroSignature = settings.hero_signature || t("hero.signature");
  const ctaPrimaryText   = settings.hero_cta_primary_text   || t("hero.cta.primary");
  const ctaPrimaryLink   = settings.hero_cta_primary_link   || "/join";
  const ctaSecondaryText = settings.hero_cta_secondary_text || t("hero.cta.secondary");
  const ctaSecondaryLink = settings.hero_cta_secondary_link || "/join";

  const badges: Badge[] = safeParse(settings.hero_trust_badges, [
    { icon: "🏆", label: t("hero.badge.wealth") },
    { icon: "💎", label: t("hero.badge.agency") },
    { icon: "⚡", label: t("hero.badge.recharge") },
    { icon: "🌸", label: t("hero.badge.community") },
  ]);

  // Parallax translate values — disabled for reduced-motion / low-power
  const px = reduced || lowPower ? 0 : (mouse.x - 0.5) * 22;
  const py = reduced || lowPower ? 0 : (mouse.y - 0.5) * 14;
  const pxSlow = reduced || lowPower ? 0 : (mouse.x - 0.5) * 10;
  const pySlow = reduced || lowPower ? 0 : (mouse.y - 0.5) * 8;

  return (
    <section className="relative overflow-hidden" aria-label="Hero">
      {/* ── Particle canvas layer ── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <ParticleCanvas count={50} />
      </div>

      {/* ── Floating orbs ── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <FloatingOrbs count={5} />
      </div>

      {/* ── Static glow blobs (always visible) ── */}
      <div
        className="pointer-events-none absolute -top-20 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]"
        style={reduced || lowPower ? {} : { transform: `translate(${px * 0.6}px, ${py * 0.4}px)`, transition: "transform 0.8s cubic-bezier(.22,1,.36,1)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[380px] w-[380px] rounded-full bg-accent/15 blur-[120px]"
        style={reduced || lowPower ? {} : { transform: `translate(${-px * 0.4}px, ${-py * 0.3}px)`, transition: "transform 0.9s cubic-bezier(.22,1,.36,1)" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/3 -z-10 h-[280px] w-[280px] rounded-full bg-primary/10 blur-[100px]"
        style={reduced || lowPower ? {} : { transform: `translate(${px * 0.3}px, ${py * 0.5}px)`, transition: "transform 1s cubic-bezier(.22,1,.36,1)" }}
      />

      {/* ── Sparkle dots ── */}
      <SparklesDots />

      <div className="container mx-auto grid gap-10 px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">

        {/* ── Left column ── */}
        <div className="order-2 flex flex-col justify-center lg:order-1">

          <Reveal variant="fade-up" delay={0}>
            <div className="inline-flex w-fit items-center gap-2 rounded-full hairline-gold bg-card/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur-md">
              <Crown className="h-3 w-3" /> {heroEyebrow}
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={80}>
            <h1 className="mt-5 font-display text-[2.4rem] font-medium leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.8rem]">
              <span className="text-shimmer">{heroTitle}</span>
            </h1>
          </Reveal>

          <Reveal variant="fade-up" delay={160}>
            <p className="mt-4 font-display text-lg italic text-gradient-pink sm:text-xl">
              {heroSubtitle}
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={240}>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {heroIntro}
            </p>
            <div className="mt-2 font-display text-base italic text-gold/90">{heroSignature}</div>
          </Reveal>

          <Reveal variant="fade-up" delay={300}>
            <div className="mt-5"><LiveCreatorCounter /></div>
          </Reveal>

          <Reveal variant="fade-up" delay={360}>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={ctaPrimaryLink}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-7 text-sm font-semibold tracking-wide text-primary-foreground glow-pink btn-magnetic transition-all"
              >
                {ctaPrimaryText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to={ctaSecondaryLink}
                className="inline-flex h-14 items-center justify-center rounded-full border border-border bg-card/40 px-7 text-sm font-semibold backdrop-blur-md btn-magnetic transition-all hover:border-gold/60 hover:bg-card/70 hover:glow-gold-sm"
              >
                {ctaSecondaryText}
              </Link>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={440}>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:max-w-lg sm:grid-cols-2 stagger-children">
              {badges.map((b) => (
                <TiltCard
                  key={b.label}
                  intensity={4}
                  glare={false}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2.5 backdrop-blur-md card-lift cursor-default"
                >
                  <span className="text-base">{b.icon}</span>
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{b.label}</span>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── Right column — portrait ── */}
        <div className="order-1 lg:order-2">
          <Reveal variant="fade-left" delay={100}>
            <div
              className="relative mx-auto max-w-md lg:max-w-none"
              style={reduced || lowPower ? {} : {
                transform: `translate(${-pxSlow}px, ${-pySlow}px)`,
                transition: "transform 0.7s cubic-bezier(.22,1,.36,1)",
              }}
            >
              {/* Halo glow */}
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-gold opacity-35 blur-3xl float-slow" />

              <TiltCard intensity={6} glare className="relative overflow-hidden rounded-[1.75rem] border border-gold/30 bg-card shadow-luxe shadow-depth">
                <img
                  src={heroPhoto}
                  alt={`${heroName}, founder of Barbieverse`}
                  width={896}
                  height={1152}
                  className="aspect-[4/5] w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-gold/25 bg-background/70 px-4 py-3 backdrop-blur-xl glass">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gold">{heroEyebrow}</div>
                    <div className="font-display text-lg leading-tight">{heroName}</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-semibold text-gold glow-gold-sm">
                    <Sparkles className="h-3 w-3" /> {t("hero.portrait.badge")}
                  </div>
                </div>
              </TiltCard>

              {/* Floating quote card */}
              <div
                className="absolute -left-4 top-6 hidden rotate-[-4deg] rounded-2xl border border-border/60 bg-card/85 px-4 py-3 backdrop-blur-xl shadow-luxe sm:block lg:-left-10 float-medium glass"
                style={reduced || lowPower ? {} : {
                  transform: `rotate(-4deg) translate(${px * 0.2}px, ${py * 0.15}px)`,
                  transition: "transform 0.6s cubic-bezier(.22,1,.36,1)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-primary text-primary" />
                  <div className="font-display text-sm italic">"{t("hero.quote")}"</div>
                </div>
              </div>

              {/* Floating stat badge */}
              <div
                className="absolute -right-3 top-1/3 hidden rounded-2xl border border-primary/20 bg-card/80 px-3 py-2.5 backdrop-blur-xl shadow-depth sm:block glass"
                style={reduced || lowPower ? {} : {
                  transform: `translate(${px * 0.25}px, ${py * 0.2}px)`,
                  transition: "transform 0.65s cubic-bezier(.22,1,.36,1)",
                }}
              >
                <div className="text-center">
                  <div className="text-gradient-pink font-display text-xl font-medium">₹500</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("hero.stat.reward")}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Gradient divider */}
      <div className="container mx-auto px-4">
        <div className="divider-glow" />
      </div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function HomePage() {
  const { data: posts }       = useSuspenseQuery(postsQO);
  const { data: settings }    = useSuspenseQuery(settingsQO);
  const { data: whySlides }   = useSuspenseQuery(whyQO);
  const { data: howSlides }   = useSuspenseQuery(howQO);
  const { data: chooseSlides } = useSuspenseQuery(chooseQO);
  const { t } = useLang();

  const vipTiers: Tier[] = safeParse(settings.vip_tiers, [
    { icon: "🌸", name: t("section.vip.tier1") },
    { icon: "✨", name: t("section.vip.tier2") },
    { icon: "💎", name: t("section.vip.tier3") },
    { icon: "👑", name: t("section.vip.tier4") },
    { icon: "🌌", name: t("section.vip.tier5") },
  ]);
  const vipSupportText = settings.vip_support_text || t("section.vip.support");
  const vipCtaText     = settings.vip_cta_text     || t("section.vip.cta");

  const packages: Pkg[] = [
    parsePkg(settings.coin_package_1, { name: t("section.packages.starter"), coins: 100,  price: 99 }),
    parsePkg(settings.coin_package_2, { name: t("section.packages.popular"), coins: 500,  price: 449 }),
    parsePkg(settings.coin_package_3, { name: t("section.packages.value"),   coins: 1000, price: 849 }),
    parsePkg(settings.coin_package_4, { name: t("section.packages.mega"),    coins: 5000, price: 3999 }),
  ];

  const testimonials = safeParse<Testimonial[]>(settings.testimonials_json, []);
  const announcement = settings.homepage_announcement?.trim();

  return (
    <SiteLayout>
      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Announcement banner */}
      {announcement && (
        <div className="border-b border-gold/20 bg-gradient-pink/10 backdrop-blur-md">
          <div className="container mx-auto px-4 py-2 text-center text-xs font-medium text-gold">
            {announcement}
          </div>
        </div>
      )}

      {/* ═══════════════ HERO ═══════════════ */}
      <HeroSection settings={settings} />

      {/* ═══════════════ CREATOR ACQUISITION ═══════════════ */}
      <Reveal variant="fade-up" delay={0} className="w-full">
        <CreatorAcquisitionSection />
      </Reveal>

      {/* ═══════════════ WHY BARBIEVERSE ═══════════════ */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.why.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("section.why.heading")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <AutoCarousel slides={whySlides} />
        </Reveal>
      </section>

      {/* ═══════════════ HOW SUCCESS HAPPENS ═══════════════ */}
      <section className="relative border-y border-border/40 overflow-hidden">
        {/* Subtle mesh bg */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-noir opacity-80" />
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/8 blur-[80px]" />
          <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full bg-accent/8 blur-[80px]" />
        </div>
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.journey.eyebrow")}</div>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              {t("section.journey.heading")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{t("section.journey.sub")}</p>
          </Reveal>
          <Reveal variant="fade-up" delay={120}>
            <TimelineCarousel slides={howSlides} />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ WHAT YOU ACTUALLY EARN ═══════════════ */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">What You Actually Earn</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Real numbers. <span className="italic text-gradient-pink">No hype.</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {/* Week 1 */}
            <div className="rounded-2xl border border-primary/20 bg-card/40 p-6 text-center backdrop-blur-xl">
              <div className="text-4xl">🎯</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">First Week Guaranteed</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">₹1,150 <span className="text-sm text-muted-foreground">(female)</span></div>
              <div className="font-display text-lg font-bold text-foreground/80">₹575 <span className="text-xs text-muted-foreground">(male)</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Stream 2 hours daily for 7 days. Poppo pays you directly. No audience needed.</p>
            </div>
            {/* Month 1 */}
            <div className="rounded-2xl border border-gold/20 bg-card/40 p-6 text-center backdrop-blur-xl">
              <div className="text-4xl">📈</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">Month One Realistic</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">₹4,000 – ₹15,000</div>
              <p className="mt-3 text-xs text-muted-foreground">Daily task rewards + viewer gifts + PK battles. Results vary by activity.</p>
            </div>
            {/* Ongoing */}
            <div className="rounded-2xl border border-accent/20 bg-card/40 p-6 text-center backdrop-blur-xl">
              <div className="text-4xl">💎</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">Consistent Streamers</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">₹15,000 – ₹80,000/mo</div>
              <p className="mt-3 text-xs text-muted-foreground">Top creators with daily 4-6 hour streams and strong audiences.</p>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            All earnings paid directly by Poppo Live to your bank account. BarbieVerse provides agency support and guidance.
          </p>
        </Reveal>
      </section>

      {/* ═══════════════ WHY STREAMERS CHOOSE ═══════════════ */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.why2.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("section.why2.heading")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <FeatureCardsCarousel slides={chooseSlides} />
        </Reveal>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <Reveal variant="fade-up" className="w-full">
        <TestimonialsCarousel items={testimonials} />
      </Reveal>

      {/* ═══════════════ VIP STRIP ═══════════════ */}
      <Reveal variant="fade-up" className="w-full">
        <VipStrip tiers={vipTiers} supportText={vipSupportText} ctaText={vipCtaText} />
      </Reveal>

      {/* ═══════════════ RECHARGE PACKAGES ═══════════════ */}
      <Reveal variant="fade-up" className="w-full">
        <RechargePackages packages={packages} />
      </Reveal>

      {/* ═══════════════ JOURNAL ═══════════════ */}
      {posts.length > 0 && (
        <section className="container mx-auto px-4 py-14 sm:py-20">
          <Reveal variant="fade-up" className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.blog.eyebrow")}</div>
              <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
                {t("section.blog.heading")}
              </h2>
            </div>
            <Link to="/blog" className="hidden text-sm font-medium text-gold hover:underline sm:inline-flex">
              {t("section.blog.viewall")}
            </Link>
          </Reveal>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {posts.slice(0, 3).map((p: any, i: number) => (
              <Reveal key={p.id} variant="scale-up" delay={i * 80}>
                <TiltCard intensity={5} className="h-full">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-md card-lift glass-card"
                  >
                    {p.category && (
                      <span className="inline-block w-fit rounded-full hairline-gold px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gold">
                        {p.category}
                      </span>
                    )}
                    <h3 className="mt-4 font-display text-2xl font-medium leading-tight transition-colors group-hover:text-primary">
                      {p.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
