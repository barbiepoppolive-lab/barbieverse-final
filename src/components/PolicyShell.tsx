import { Link } from "@tanstack/react-router";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { MarkdownContent, extractH2s, slug } from "./MarkdownContent";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  content: string;
  lastUpdated?: string;
};

export function PolicyShell({ eyebrow, title, subtitle, content, lastUpdated }: Props) {
  const sections = extractH2s(content);
  return (
    <SiteLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 -z-10 h-[360px] w-[360px] rounded-full bg-accent/15 blur-[140px]" />

        <section className="container mx-auto px-4 pt-16 pb-10 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-card/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-gold backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" /> {eyebrow}
            </div>
            <h1 className="mt-5 font-display text-4xl font-medium leading-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-pink">{title}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {subtitle}
            </p>
            {lastUpdated && (
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Last updated · {lastUpdated}
              </div>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[260px_1fr]">
            {sections.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-gold/20 bg-card/40 p-5 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-gold">On This Page</div>
                  <nav className="mt-3 space-y-1.5">
                    {sections.map((s) => (
                      <a
                        key={s}
                        href={`#${slug(s)}`}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                      >
                        <ChevronRight className="h-3 w-3 text-gold/60 transition-transform group-hover:translate-x-0.5" />
                        <span>{s}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            <article className="rounded-3xl border border-gold/20 bg-gradient-to-br from-card/80 via-card/40 to-card/20 p-6 backdrop-blur-xl shadow-luxe sm:p-10">
              <MarkdownContent source={content} />

              <div className="mt-12 rounded-2xl border border-border/60 bg-background/30 p-5 text-xs text-muted-foreground">
                Questions about this policy? Reach our team via the{" "}
                <Link to="/contact" className="font-semibold text-gold hover:underline">
                  Contact page
                </Link>
                .
              </div>
            </article>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
