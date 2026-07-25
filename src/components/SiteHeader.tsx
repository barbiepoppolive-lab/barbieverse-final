import { Link } from "@tanstack/react-router";
import { Crown, Home, Coins, UserPlus, BookOpen, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";

// Mobile note: navigation lives in the fixed bottom tab bar below (not a
// hamburger menu) — on small screens there's already a persistent nav with
// icons for every link, so a duplicate slide-down menu with the same links
// was just extra chrome. The header on mobile only needs the logo + language
// toggle; "Join" is reachable via the bottom bar's own icon.

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();

  const links = [
    { to: "/",      label: t("nav.home"), icon: Home },
    { to: "/earnings", label: "Earnings", icon: TrendingUp },
    { to: "/academy", label: t("nav.academy"), icon: BookOpen },
    { to: "/join",  label: t("nav.join"), icon: UserPlus },
    { to: "/coins", label: t("nav.coins"), icon: Coins },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
            <Crown className="h-5 w-5 text-gold transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:drop-shadow-[0_0_8px_oklch(0.82_0.13_75/0.6)]" />
            <span className="font-display text-xl tracking-wide">
              <span className="italic text-gradient-pink">Barbie</span>verse
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" role="navigation">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group relative text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-px"
                activeProps={{ className: "text-foreground" }}
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-pink transition-all duration-300 group-hover:w-full group-[.active]:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              to="/join"
              className="inline-flex h-9 items-center rounded-full bg-gradient-pink px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_oklch(0.72_0.25_350/0.4)]"
            >
              {t("cta.get500short")}
            </Link>
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
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 active:scale-90 ${
                  isCoins
                    ? "text-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                activeProps={{ className: "text-primary" }}
              >
                {isCoins ? (
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-gold/15 blur-md animate-pulse" />
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
