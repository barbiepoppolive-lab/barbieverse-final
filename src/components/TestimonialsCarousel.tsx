import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Quote, Star, BadgeCheck } from "lucide-react";

export type Testimonial = {
  name: string;
  photo?: string;
  platform?: string;
  earnings?: string;
  quote: string;
};

const DEFAULTS: Testimonial[] = [
  {
    name: "Priya S.",
    platform: "Poppo/Vone Live",
    earnings: "₹12,000/mo",
    quote:
      "BarbieVerse ne mujhe ghar baithe earning ka mauka diya. Support team hamesha available rehti hai!",
  },
  {
    name: "Ananya R.",
    platform: "Poppo/Vone Live",
    earnings: "₹8,500/mo",
    quote:
      "60 din me top creator level reach kiya. Onboarding aur guidance dono perfect tha.",
  },
  {
    name: "Sneha M.",
    platform: "Poppo/Vone Live",
    earnings: "₹18,000/mo",
    quote:
      "First week me ₹1,150 guaranteed mila. Genuine agency hai — fully recommended.",
  },
];

export function TestimonialsCarousel({ items }: { items?: Testimonial[] }) {
  const slides = items && items.length ? items : DEFAULTS;
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!embla) return;
    const on = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", on);
    on();
    return () => {
      embla.off("select", on);
    };
  }, [embla]);

  return (
    <section className="border-y border-border/40 bg-gradient-noir">
      <div className="container mx-auto px-4 py-14 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Real Creators · Real Earnings</div>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Loved by <span className="italic text-gradient-pink">BarbieVerse creators</span>
          </h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {slides.map((s, i) => (
              <div key={i} className="min-w-0 shrink-0 grow-0 basis-full px-2 sm:basis-[60%] sm:px-3 lg:basis-[40%]">
                <article className="relative h-full rounded-3xl border border-gold/20 bg-card/60 p-6 backdrop-blur-xl shadow-luxe card-lift sm:p-8">
                  <Quote className="h-6 w-6 text-gold/60" />
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
                    "{s.quote}"
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    {s.photo ? (
                      <img src={s.photo} alt={s.name} className="h-11 w-11 rounded-full border border-gold/30 object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-gradient-pink/30 font-display text-base font-semibold">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        {s.name}
                        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.platform}
                        {s.earnings && (
                          <span className="ml-1 font-semibold text-gold">· {s.earnings}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-gold">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-8 bg-gradient-pink" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Earnings vary based on streaming hours, audience engagement and platform activity.
        </p>
      </div>
    </section>
  );
}
