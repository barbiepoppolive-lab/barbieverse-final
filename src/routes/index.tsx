import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ArrowRight, Crown, ChevronDown } from "lucide-react";
import { getPublicSettings } from "@/lib/api/settings.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import founderPortrait from "@/assets/founder-portrait.jpg.asset.json";
import { AutoCarousel } from "@/components/carousel/AutoCarousel";
import { LiveCreatorCounter } from "@/components/LiveCreatorCounter";
import { ParticleCanvas } from "@/components/ParticleCanvas";
import { Reveal } from "@/components/Reveal";
import { usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

const settingsQO = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground">
        {q}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>}
    </div>
  );
}

function HeroSection({ settings }: { settings: Record<string, string> }) {
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();
  const { t } = useLang();

  const heroPhoto = settings.hero_photo_url?.trim() || founderPortrait.url;
  const heroEyebrow = settings.hero_eyebrow || t("hero.eyebrow");
  const heroName = settings.hero_name || t("hero.name");
  const heroTitle = settings.hero_title || t("hero.title");
  const heroSubtitle = settings.hero_subtitle || t("hero.subtitle");
  const heroIntro = settings.hero_intro || t("hero.intro");
  const heroSignature = settings.hero_signature || t("hero.signature");
  const ctaPrimaryText = settings.hero_cta_primary_text || t("hero.cta.primary");
  const ctaPrimaryLink = settings.hero_cta_primary_link || "/join";
  const ctaSecondaryText = settings.hero_cta_secondary_text || t("hero.cta.secondary");
  const ctaSecondaryLink = settings.hero_cta_secondary_link || "/join";

  const badges: Badge[] = safeParse(settings.hero_trust_badges, [
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
            <div className="mt-7">
              <Link
                to={ctaPrimaryLink}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-7 text-sm font-semibold tracking-wide text-primary-foreground glow-pink transition-all hover:scale-[1.02]"
              >
                {ctaPrimaryText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={440}>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:max-w-lg stagger-children">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2.5 backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card/50"
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
              {/* Fire border animation around photo */}
              <div className="fire-border absolute -inset-1 rounded-[2rem] z-0" />

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

              {/* Floating Credentials Card */}
              <div className="credentials-float absolute -right-2 top-8 z-30 sm:-right-6 lg:-right-8">
                <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-background/90 via-card/95 to-background/90 px-4 py-3 backdrop-blur-xl shadow-luxe">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-lg">
                      👑
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">Poppo ID</div>
                      <div className="font-mono text-sm font-bold text-foreground">2517496</div>
                    </div>
                  </div>
                  <div className="mt-2.5 border-t border-gold/20 pt-2.5">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">Wealth Level</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="wealth-shimmer font-display text-2xl font-bold">154</span>
                      <span className="text-[10px] font-semibold text-gold">HIGHEST WORLDWIDE</span>
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
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
              {[
                { step: "1", icon: "📱", title: t("section.how.step1.title"), desc: t("section.how.step1.desc") },
                { step: "2", icon: "💳", title: t("section.how.step2.title"), desc: t("section.how.step2.desc") },
                { step: "3", icon: "🪙", title: t("section.how.step3.title"), desc: t("section.how.step3.desc") },
              ].map((s) => (
                <div key={s.step} className="relative rounded-2xl border border-border/60 bg-card/40 p-6 text-center backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card/60">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-pink text-[11px] font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div className="mt-4 text-4xl">{s.icon}</div>
                  <h3 className="mt-4 font-display text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">What You Actually Earn</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Real numbers. <span className="italic text-gradient-pink">No hype.</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-card/40 p-6 text-center backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:bg-card/60">
              <div className="text-4xl">🎯</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">First Week Guaranteed</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">₹1,150 <span className="text-sm text-muted-foreground">(female)</span></div>
              <div className="font-display text-lg font-bold text-foreground/80">₹575 <span className="text-xs text-muted-foreground">(male)</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Stream 2 hours daily for 7 days. Poppo pays you directly. No audience needed.</p>
            </div>
            <div className="rounded-2xl border border-gold/20 bg-card/40 p-6 text-center backdrop-blur-xl transition-all duration-200 hover:border-gold/40 hover:bg-card/60">
              <div className="text-4xl">📈</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gold">Month One Realistic</div>
              <div className="mt-2 font-display text-2xl font-bold text-gradient-pink">₹4,000 – ₹15,000</div>
              <p className="mt-3 text-xs text-muted-foreground">Daily task rewards + viewer gifts + PK battles. Results vary by activity.</p>
            </div>
            <div className="rounded-2xl border border-accent/20 bg-card/40 p-6 text-center backdrop-blur-xl transition-all duration-200 hover:border-accent/40 hover:bg-card/60">
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

      <section className="container mx-auto px-4 py-14 sm:py-20">
        <Reveal variant="fade-up" className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("section.faq.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("section.faq.heading")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="mx-auto max-w-2xl space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </Reveal>
      </section>

      <section className="border-t border-border/40 bg-gradient-noir">
        <div className="container mx-auto px-4 py-14 text-center sm:py-20">
          <Reveal variant="fade-up">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">
              Ready to start <span className="italic text-gradient-pink">earning?</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">Join hundreds of creators already growing with BarbieVerse.</p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/join"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-8 text-sm font-semibold tracking-wide text-primary-foreground glow-pink transition-all hover:scale-[1.02]"
              >
                {t("hero.cta.primary")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/coins"
                className="inline-flex h-14 items-center justify-center rounded-full border border-border bg-card/40 px-8 text-sm font-semibold backdrop-blur-md transition-all hover:border-gold/60 hover:bg-card/70"
              >
                {t("hero.cta.secondary")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
}
