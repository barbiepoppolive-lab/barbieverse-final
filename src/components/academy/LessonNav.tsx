import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface LessonNavProps {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

export function LessonNav({ prev, next }: LessonNavProps) {
  return (
    <div className="my-16 grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          to={prev.slug as any}
          className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card/40 hover:shadow-[0_0_30px_oklch(0.72_0.25_350/0.08)] hover-lift"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-2 group-hover:text-primary" />
          <div>
            <span className="text-xs text-muted-foreground">Previous Lesson</span>
            <h3 className="font-display text-sm font-bold group-hover:text-primary sm:text-base">
              {prev.title}
            </h3>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={next.slug as any}
          className="group flex items-center justify-end gap-3 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md transition-all duration-200 hover:border-gold/40 hover:bg-card/40 hover:shadow-[0_0_30px_oklch(0.82_0.13_75/0.08)] hover-lift"
        >
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Next Lesson</span>
            <h3 className="font-display text-sm font-bold group-hover:text-primary sm:text-base">
              {next.title}
            </h3>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-2 group-hover:text-gold" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
