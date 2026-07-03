import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { ArrowRight, Crown, ChevronDown, Gem } from "lucide-react";
import { getPublicSettings, localizedSetting } from "@/lib/api/settings.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import founderPortrait from "@/assets/founder-portrait.jpg.asset.json";
import { AutoCarousel } from "@/components/carousel/AutoCarousel";
import { LiveCreatorCounter } from "@/components/LiveCreatorCounter";
import { ParticleCanvas } from "@/components/ParticleCanvas";
import { FireFlames } from "@/components/FireFlames";
import { Reveal } from "@/components/Reveal";
import { usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";
import { useState } from "react";
import { useLang, type Lang } from "@/lib/i18n";

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbieverse — India's Highest Wealth-Level Poppo/Vone Creator Agency" },
      { name: "description", content: "Join the creator ecosystem built by Barbie, India's highest wealth-level Poppo/Vone Live creator. Onboarding, growth, rewards and premium support for new streamers." },
      { property: "og:title", content: "Barbieverse — Creator Ecosystem by India's Top Poppo/Vone Creator" },
      { property: "og:description", content: "Start, grow and earn from home with the BarbieVerse creator agency." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQO),
    ]),
  component: HomePage,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
});

type Badge = { icon: string; label: string };

function safeParse<T>(v: string | undefined, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

function HeroSection({ settings }: { settings: Record<string, string> }) {
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();
  const { lang, t } = useLang();

  const heroPhoto = settings.hero_photo_url?.trim() || founderPortrait.url;
  const heroEyebrow = localizedSetting(settings, "hero_eyebrow", lang) || t("hero.eyebrow");
  const heroName = localizedSetting(settings, "hero_name", lang) || t("hero.name");
  const heroTitle = localizedSetting(settings, "hero_title", lang) || t("hero.title");
  const heroSubtitle = localizedSetting(settings, "hero_subtitle", lang) || t("hero.subtitle");
  const heroIntro = localizedSetting(settings, "hero_intro", lang) || t("hero.intro");
  const heroSignature = localizedSetting(settings, "hero_signature", lang) || t("hero.signature");
  const ctaPrimaryText = localizedSetting(settings, "hero_cta_primary_text", lang) || t("hero.cta.primary");
  const ctaPrimaryLink = settings.hero_cta_primary_link || "/join";
  const ctaSecondaryText = localizedSetting(settings, "hero_cta_secondary_text", lang) || t("hero.cta.secondary");
  const ctaSecondaryLink = settings.hero_cta_secondary_link || "/join";

  const badges: Badge[] = lang !== "en"
    ? [
        { icon: "🏆", label: t("hero.badge.wealth") },
        { icon: "💎", label: t("hero.badge.agency") },
        { icon: "⚡", label: t("hero.badge.recharge") },
        { icon: "🌸", label: t("hero.badge.community") },
      ]
    : safeParse(settings.hero_trust_badges, [
        { icon: "🏆", label: t("hero.badge.wealth") },
        { icon: "💎", label: t("hero.badge.agency") },
        { icon: "⚡", label: t("hero.badge.recharge") },
        { icon: "🌸", label: t("hero.badge.community") },
      ]);

  return (
    <section className="relative overflow-hidden" aria-label="Hero">
      {!reduced && !lowPower && (
        <div className="pointer-events-none absolute inset-0 -z-10">
          <ParticleCanvas count={30} />
        </div>
      )}

      <div className="pointer-events-none absolute -top-20 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[100px]" />

      <div className="container mx-auto grid gap-10 px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
        <div className="order-2 flex flex-col justify-center lg:order-1">
          <Reveal variant="fade-up" delay={0}>
            <div className="inline-flex w-fit items-center gap-2 rounded-full hairline-gold bg-card/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur-md">
              <Crown className="h-3 w-3" /> {heroEyebrow}
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={80}>
            <h1 className="mt-5 font-display text-[2.4rem] font-medium leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.8rem]">
              {heroTitle}
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
            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <PremiumButton
                variant="primary"
                size="lg"
                iconRight={<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              >
                {ctaPrimaryText}
              </PremiumButton>
              <PremiumButton
                variant="secondary"
                size="lg"
              >
                {ctaSecondaryText}
              </PremiumButton>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={440}>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:max-w-lg stagger-grid">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-300 hover:border-primary/40 hover:bg-card/50 hover:shadow-[0_0_20px_oklch(0.72_0.25_350/0.08)]"
                >
                  <span className="text-base">{b.icon}</span>
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{b.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal variant="fade-left" delay={100}>
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="neon-pulse absolute -inset-1 rounded-[2rem] z-0" />

              <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-primary/30 bg-card shadow-luxe z-10">
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
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-gold/25 bg-background/70 px-4 py-3 backdrop-blur-xl glass z-20">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gold">{heroEyebrow}</div>
                    <div className="font-display text-lg leading-tight">{heroName}</div>
                  </div>
                </div>
              </div>

              {/* Floating Credentials Card — Bottom Right */}
              <div className="credentials-float absolute -bottom-4 -right-2 z-30 sm:-right-6 lg:-right-8">
                <div className="relative rounded-2xl bg-gradient-to-br from-background/95 via-card/95 to-background/95 px-4 py-3 backdrop-blur-xl">
                  <FireFlames />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-lg ring-1 ring-gold/30">
                        👑
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">Poppo/Vone ID</div>
                        <div className="font-mono text-sm font-bold text-foreground">2517496</div>
                      </div>
                    </div>
                      <div className="mt-2.5 border-t border-gold/20 pt-2.5">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">Wealth Level</div>
                      <div className="flex items-center gap-2">
                        <span className="wealth-shimmer font-display text-2xl font-bold">154</span>
                        <span className="diamond-sparkle inline-block"><Gem className="h-4 w-4 fill-sky-400 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" /></span>
                        <span className="text-[10px] font-semibold text-gold leading-tight">HIGHEST<br/>WORLDWIDE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="divider-glow" />
      </div>
    </section>
  );
}

function HomePage() {
  const { data: settings } = useSuspenseQuery(settingsQO);
  const { t } = useLang();

  const announcement = settings.homepage_announcement?.trim();

  const whySlides = [
    { title: t("carousel.slide1.title"), description: t("carousel.slide1.desc"), button_text: t("carousel.slide1.cta"), button_link: "/join" },
    { title: t("carousel.slide2.title"), description: t("carousel.slide2.desc"), button_text: t("carousel.slide2.cta"), button_link: "/join" },
    { title: t("carousel.slide3.title"), description: t("carousel.slide3.desc"), button_text: t("carousel.slide3.cta"), button_link: "/join" },
    { title: t("carousel.slide4.title"), description: t("carousel.slide4.desc"), button_text: t("carousel.slide4.cta"), button_link: "/join" },
  ];

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
  ];

  return (
    <SiteLayout>
      {announcement && (
        <div className="border-b border-gold/20 bg-gradient-pink/10 backdrop-blur-md">
          <div className="container mx-auto px-4 py-2 text-center text-xs font-medium text-gold">
            {announcement}
          </div>
        </div>
      )}

      <HeroSection settings={settings} />

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

      <section className="relative border-y border-border/40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-noir opacity-80" />
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.how.eyebrow")}</div>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              {t("section.how.heading")}
            </h2>
          </Reveal>
          <Reveal variant="fade-up" delay={120}>
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3 stagger-grid">
              {[
                { step: "1", icon: "📱", title: t("section.how.step1.title"), desc: t("section.how.step1.desc") },
                { step: "2", icon: "💳", title: t("section.how.step2.title"), desc: t("section.how.step2.desc") },
                { step: "3", icon: "🪙", title: t("section.how.step3.title"), desc: t("section.how.step3.desc") },
              ].map((s) => (
                <GlassCard key={s.step} hover="lift" className="relative p-6 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div className="mt-4 text-4xl">{s.icon}</div>
                  <h3 className="mt-4 font-display text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </GlassCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("earnings.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("earnings.heading1")} <span className="italic text-gradient-pink">{t("earnings.heading2")}</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3 stagger-grid">
            <GlassCard hover="glow" glow="pink" className="p-6 text-center">
              <div className="text-4xl">🎯</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">{t("earnings.week.title")}</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">{t("earnings.week.female")}</div>
              <div className="font-display text-lg font-bold text-foreground/80">{t("earnings.week.male")}</div>
              <p className="mt-3 text-xs text-muted-foreground">{t("earnings.week.desc")}</p>
            </GlassCard>
            <GlassCard hover="glow" glow="gold" className="p-6 text-center">
              <div className="text-4xl">📈</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">{t("earnings.month.title")}</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">{t("earnings.month.range")}</div>
              <p className="mt-3 text-xs text-muted-foreground">{t("earnings.month.desc")}</p>
            </GlassCard>
            <GlassCard hover="glow" className="p-6 text-center">
              <div className="text-4xl">💎</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">{t("earnings.consistent.title")}</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">{t("earnings.consistent.range")}</div>
              <p className="mt-3 text-xs text-muted-foreground">{t("earnings.consistent.desc")}</p>
            </GlassCard>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("earnings.footer")}
          </p>
        </Reveal>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.faq.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("section.faq.heading")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <FaqAccordion items={faqs} className="mx-auto max-w-2xl" />
        </Reveal>
      </section>

      <section className="border-t border-border/40 bg-gradient-noir">
        <div className="container mx-auto px-4 py-14 text-center sm:py-20">
          <Reveal variant="fade-up">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">
              {t("cta.ready")} <span className="italic text-gradient-pink">{t("cta.earning")}</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{t("cta.join")}</p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <PremiumButton
                variant="primary"
                size="lg"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                {t("hero.cta.primary")}
              </PremiumButton>
              <PremiumButton
                variant="secondary"
                size="lg"
              >
                {t("hero.cta.secondary")}
              </PremiumButton>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
}
