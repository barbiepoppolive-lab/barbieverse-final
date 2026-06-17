import { Link } from "@tanstack/react-router";
import { Crown, X, Home, Coins, UserPlus, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();

  const links = [
    { to: "/",     label: t("nav.home"), icon: Home },
    { to: "/join", label: t("nav.join"), icon: UserPlus },
    { to: "/coins",label: t("nav.coins"), icon: Coins },
    { to: "/blog", label: t("nav.blog"), icon: BookOpen },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border/50 bg-background/85 shadow-[0_4px_24px_-8px_oklch(0_0_0/0.4)] backdrop-blur-2xl"
            : "border-b border-border/40 bg-background/70 backdrop-blur-xl"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
            <span className="font-display text-xl tracking-wide">
              <span className="italic text-gradient-pink">Barbie</span>verse
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" role="navigation">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group relative text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-pink transition-all duration-300 group-hover:w-full group-[.active]:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              to="/join"
              className="hidden h-9 items-center rounded-full bg-gradient-pink px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink transition-all hover:scale-[1.02] sm:inline-flex"
            >
              {t("cta.get500short")}
            </Link>
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 transition-all duration-200 hover:border-primary/40 hover:bg-card md:hidden"
            >
              {open
                ? <X className="h-4 w-4" />
                : (
                  <div className="space-y-1">
                    <span className="block h-px w-4 bg-foreground" />
                    <span className="block h-px w-4 bg-foreground" />
                    <span className="block h-px w-3 bg-foreground" />
                  </div>
                )
              }
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
            open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={!open}
        >
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl">
            <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-card/60 hover:text-foreground hover:pl-4"
                  activeProps={{ className: "bg-card/60 text-foreground pl-4" }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/join"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-gradient-pink px-5 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink"
              >
                {t("cta.get500")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around py-2">
          {links.map((l) => {
            const Icon = l.icon;
            const isCoins = l.to === "/coins";
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isCoins
                    ? "text-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                activeProps={{ className: "text-primary" }}
              >
                {isCoins ? (
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-gold/15 blur-md" />
                    <Icon className="relative h-5 w-5" />
                  </div>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className={`text-[10px] font-medium ${isCoins ? "text-gold" : ""}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
