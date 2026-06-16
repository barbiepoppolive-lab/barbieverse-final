import type { CarouselSlide } from "@/lib/api/carousel.functions";
import { Sparkles } from "lucide-react";

export function FeatureCardsCarousel({ slides }: { slides: CarouselSlide[] }) {
  if (!slides.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {slides.map((s) => (
        <div
          key={s.id}
          className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-md card-lift card-glow"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="mt-4 font-display text-lg font-medium leading-snug">{s.title}</h3>
            {s.description && (
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
