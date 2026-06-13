import type { CarouselSlide } from "@/lib/api/carousel.functions";
import { Check } from "lucide-react";

export function TimelineCarousel({ slides }: { slides: CarouselSlide[] }) {
  if (!slides.length) return null;
  return (
    <div className="relative">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="relative min-w-[260px] shrink-0 snap-start rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-md sm:min-w-[300px]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold font-display text-sm font-bold text-background">
                {String(i + 1).padStart(2, "0")}
              </div>
              {i < slides.length - 1 && (
                <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
              )}
            </div>
            <h3 className="mt-5 font-display text-xl font-medium leading-tight">{s.title}</h3>
            {s.description && (
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            )}
            <Check className="absolute right-5 top-5 h-4 w-4 text-gold/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
