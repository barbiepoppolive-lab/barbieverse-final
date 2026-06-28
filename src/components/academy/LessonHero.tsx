import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, BookOpen, Star } from "lucide-react";

interface LessonHeroProps {
  lessonNumber: number;
  title: string;
  subtitle: string;
  readTime: string;
  difficulty: string;
  breadcrumb?: string;
}

export function LessonHero({
  lessonNumber,
  title,
  subtitle,
  readTime,
  difficulty,
  breadcrumb = "Academy",
}: LessonHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1e] via-[#0d0d1a] to-[#0a0a14]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[180px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute top-1/4 left-[15%] text-2xl opacity-20" style={{ animation: "credentialsFloat 4s ease-in-out infinite" }}>💎</div>
        <div className="absolute top-1/3 right-[10%] text-xl opacity-15" style={{ animation: "credentialsFloat 5s ease-in-out infinite 1s" }}>✨</div>
        <div className="absolute bottom-1/4 left-[25%] text-lg opacity-10" style={{ animation: "credentialsFloat 6s ease-in-out infinite 2s" }}>👑</div>
      </div>
      <div className="container relative mx-auto px-4 py-16 sm:py-24 lg:py-32">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/academy" className="hover:text-primary">{breadcrumb}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Lesson {lessonNumber}</span>
        </nav>

        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 backdrop-blur-sm">
              <BookOpen className="h-3 w-3 text-primary" /> Lesson {lessonNumber} of 20
            </span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {readTime}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {difficulty}</span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient-pink">{title}</span>
          </h1>
          <p className="mt-4 font-display text-lg italic text-muted-foreground sm:text-xl">
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
