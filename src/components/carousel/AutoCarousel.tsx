import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CarouselSlide } from "@/lib/api/carousel.functions";

export function AutoCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla]);

  if (!slides.length) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((s) => (
            <div key={s.id} className="min-w-0 shrink-0 grow-0 basis-full px-2 sm:basis-[85%] sm:px-3 lg:basis-[60%]">
              <SlideCard slide={s} />
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          aria-label="Previous slide"
          onClick={() => embla?.scrollPrev()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 backdrop-blur-md transition-colors hover:border-gold/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-8 bg-gradient-pink" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
        <button
          aria-label="Next slide"
          onClick={() => embla?.scrollNext()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 backdrop-blur-md transition-colors hover:border-gold/50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SlideCard({ slide }: { slide: CarouselSlide }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-card/80 via-card/40 to-card/20 p-6 backdrop-blur-xl shadow-luxe sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          {slide.title && (
            <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{slide.title}</div>
          )}
          {slide.subtitle && (
            <h3 className="mt-3 font-display text-2xl font-medium leading-tight sm:text-3xl lg:text-4xl">
              {slide.subtitle}
            </h3>
          )}
          {slide.description && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {slide.description}
            </p>
          )}
          {slide.button_text && slide.button_link && (
            <Link
              to={slide.button_link}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-pink px-6 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink transition-transform hover:scale-[1.03]"
            >
              {slide.button_text} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {slide.image_url && (
          <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-gold/30 sm:h-40 sm:w-40 lg:h-48 lg:w-48">
            <img src={slide.image_url} alt={slide.title || ""} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
