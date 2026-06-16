import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight, X, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { submitCreatorLead } from "@/lib/api/creator-leads.functions";
import { platformReferralUrl, platformLabel } from "@/lib/creator-config";
import { useLang } from "@/lib/i18n";

type Slide = { headline: string; description: string; button: string; emoji: string };

function useSlides(): Slide[] {
  const { t } = useLang();
  return [
    { headline: t("carousel.slide1.title"), description: t("carousel.slide1.desc"), button: t("carousel.slide1.cta"), emoji: "💎" },
    { headline: t("carousel.slide2.title"), description: t("carousel.slide2.desc"), button: t("carousel.slide2.cta"), emoji: "👑" },
    { headline: t("carousel.slide3.title"), description: t("carousel.slide3.desc"), button: t("carousel.slide3.cta"), emoji: "🎁" },
    { headline: t("carousel.slide4.title"), description: t("carousel.slide4.desc"), button: t("carousel.slide4.cta"), emoji: "🌸" },
  ];
}

export function CreatorAcquisitionSection() {
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const SLIDES = useSlides();

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla]);

  return (
    <section className="relative border-b border-gold/15 bg-gradient-to-b from-background via-card/20 to-background">
      <div className="pointer-events-none absolute -top-10 right-0 -z-10 h-[320px] w-[320px] rounded-full bg-primary/15 blur-[120px] drift" />
      <div className="container mx-auto px-4 py-14 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("creator.eyebrow")}</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("creator.title.start")} <span className="italic text-gradient-pink">{t("creator.title.journey")}</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {t("creator.tagline")}
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {SLIDES.map((s, i) => (
                <div key={i} className="min-w-0 shrink-0 grow-0 basis-full px-2 sm:basis-[85%] sm:px-3 lg:basis-[60%]">
                  <SlideCard slide={s} onJoin={() => setOpen(true)} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              aria-label="Previous slide"
              onClick={() => embla?.scrollPrev()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 backdrop-blur-md hover:border-gold/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => embla?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-gradient-pink" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>
            <button
              aria-label="Next slide"
              onClick={() => embla?.scrollNext()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 backdrop-blur-md hover:border-gold/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/track-application" className="text-xs font-medium text-gold hover:underline">
              {t("creator.track")}
            </Link>
          </div>
        </div>
      </div>

      {open && <JoinModal onClose={() => setOpen(false)} />}
    </section>
  );
}

function SlideCard({ slide, onJoin }: { slide: Slide; onJoin: () => void }) {
  const { t } = useLang();
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-card/80 via-card/40 to-card/20 p-7 backdrop-blur-xl shadow-luxe sm:p-9">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("carousel.brand")}</div>
          <h3 className="mt-3 font-display text-2xl font-medium leading-tight sm:text-3xl lg:text-4xl">
            {slide.headline}
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {slide.description}
          </p>
          <button
            type="button"
            onClick={onJoin}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-pink px-6 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink transition-transform hover:scale-[1.03]"
          >
            {slide.button} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-pink/15 text-5xl sm:h-40 sm:w-40 lg:h-48 lg:w-48 lg:text-7xl">
          <span>{slide.emoji}</span>
          <Sparkles className="absolute right-3 top-3 h-4 w-4 text-gold" />
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose }: { onClose: () => void }) {
  const submit = useServerFn(submitCreatorLead);
  const { t } = useLang();
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [upi, setUpi] = useState("");
  const [platform, setPlatform] = useState<"poppo" | "vone">("poppo");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [result, setResult] = useState<{ application_id: string; platform: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mobile.trim() || !upi.trim()) {
      setError(t("modal.join.error.mobile"));
      return;
    }
    if (!agreed) {
      setError(t("modal.join.error.policy"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          mobile_number: mobile.trim(),
          whatsapp_number: whatsapp.trim() || undefined,
          upi_id: upi.trim(),
          platform,
          intent: "reward_only",
          lead_source: "homepage_carousel",
          landing_page: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
      });
      if (!res.ok) {
        setError(res.message || t("modal.join.error.submit"));
      } else {
        setResult({ application_id: res.application_id, platform: res.platform });
      }
    } catch (err: any) {
      setError(err?.message || t("modal.join.error.wrong"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-gold/30 bg-card shadow-luxe sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/80 backdrop-blur hover:border-primary"
        >
          <X className="h-4 w-4" />
        </button>

        {result ? (
          <SuccessScreen applicationId={result.application_id} platform={result.platform} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("modal.join.heading")}</div>
            <h3 className="mt-2 font-display text-2xl font-medium">{t("modal.join.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("modal.join.subtitle")}
            </p>

            <div className="mt-5 space-y-4">
              <Field label={t("modal.join.mobile")} required>
                <input
                  value={mobile} onChange={(e) => setMobile(e.target.value)}
                  type="tel" inputMode="tel" autoComplete="tel" required
                  placeholder={t("modal.join.mobile.placeholder")}
                  className="h-11 w-full rounded-lg border border-input bg-input/40 px-3 text-sm"
                />
              </Field>
              <Field label={t("modal.join.whatsapp")}>
                <input
                  value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  type="tel" inputMode="tel"
                  placeholder={t("modal.join.whatsapp.placeholder")}
                  className="h-11 w-full rounded-lg border border-input bg-input/40 px-3 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{t("modal.join.whatsapp.help")}</p>
              </Field>
              <Field label={t("modal.join.upi")} required>
                <input
                  value={upi} onChange={(e) => setUpi(e.target.value)}
                  type="text" autoComplete="off" required
                  placeholder={t("modal.join.upi.placeholder")}
                  className="h-11 w-full rounded-lg border border-input bg-input/40 px-3 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{t("modal.join.upi.help")}</p>
              </Field>
              <Field label={t("modal.join.platform")} required>
                <div className="grid grid-cols-2 gap-2">
                  {(["poppo", "vone"] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`h-11 rounded-lg border text-sm font-semibold capitalize transition-colors ${
                        platform === p
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-input bg-input/40 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {platformLabel(p)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gold/30 bg-gradient-pink/5 p-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                {t("modal.join.policy.agree")}{" "}
                <Link to="/creator-reward-policy" target="_blank" className="font-semibold text-gold hover:underline">
                  {t("modal.join.policy.link")}
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agreed}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-pink text-sm font-semibold uppercase tracking-wider text-primary-foreground glow-pink disabled:opacity-60"
            >
              {submitting ? t("modal.join.submitting") : t("modal.join.submit")} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const STEPS = ["step.submitted", "step.pending", "step.verification", "step.bonus", "step.paid"] as const;

function SuccessScreen({ applicationId, platform, onClose }: { applicationId: string; platform: string; onClose: () => void }) {
  const referralUrl = platformReferralUrl(platform);
  const { t } = useLang();
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold">
        <CheckCircle2 className="h-4 w-4" /> {t("modal.success.title")}
      </div>
      <div className="mt-4 rounded-2xl border border-gold/30 bg-gradient-pink/10 p-5 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("modal.success.id")}</div>
        <div className="mt-1 font-display text-3xl font-bold text-gradient-pink">{applicationId}</div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Your <span className="font-semibold text-foreground">{t("modal.success.bonus")}</span> {t("modal.success.reserved")}
      </p>

      <ol className="mt-5 space-y-2.5">
        {STEPS.map((key, i) => (
          <li key={key} className="flex items-center gap-2.5 text-sm">
            {i === 0 ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{t(key)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <a
          href={referralUrl}
          target="_blank" rel="noreferrer"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-pink text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink"
        >
          {t("modal.success.continue")} {platformLabel(platform)} <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <Link
          to="/track-application"
          search={{ id: applicationId }}
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card/60 text-xs font-semibold uppercase tracking-wider hover:border-gold/60"
        >
          {t("modal.success.track")}
        </Link>
      </div>
    </div>
  );
}
