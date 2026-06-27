import { Link } from "@tanstack/react-router";

export function LessonCTA() {
  return (
    <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-8 text-center backdrop-blur-md sm:p-12">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        Start Your <span className="text-gradient-pink">Creator Journey</span>
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
        Join BarbieVerse and get beginner-friendly guidance on setup, verification, and your first livestream.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/join"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-pink px-8 text-sm font-bold text-primary-foreground glow-pink"
        >
          Join BarbieVerse — Free
        </Link>
        <Link
          to="/coins"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-8 text-sm font-semibold backdrop-blur-md hover:border-gold/60"
        >
          Buy Coins
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Free to join · No hidden fees · Hindi + English support
      </p>
    </section>
  );
}
