// src/components/SiteHeader.tsx
// UPDATED: Premium nav with active indicator, smooth mobile menu, micro-interactions.
// All links and routes unchanged.

import { Link } from "@tanstack/react-router";
import { Crown, X, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();

  const links = [
    { to: "/",     label: t("nav.home") },
    { to: "/join", label: t("nav.join") },
    { to: "/coins",label: t("nav.coins") },
    { to: "/blog", label: t("nav.blog") },
  ];

  // Enhance backdrop when scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/50 bg-background/85 shadow-[0_4px_24px_-8px_oklch(0_0_0/0.4)] backdrop-blur-2xl"
          : "border-b border-border/40 bg-background/70 backdrop-blur-xl"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <Crown
            className="h-5 w-5 text-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
          />
          <span className="font-display text-xl tracking-wide">
            <span className="italic text-gradient-pink">Barbie</span>verse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" role="navigation">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group relative text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
              {/* Active underline */}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-pink transition-all duration-300 group-hover:w-full group-[.active]:w-full" />
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />

          <Link
            to="/join"
            className="hidden h-9 items-center rounded-full bg-gradient-pink px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-pink btn-magnetic transition-all sm:inline-flex"
          >
            {t("cta.get500short")}
          </Link>

          {/* Mobile hamburger */}
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
                  <span className="block h-px w-4 bg-foreground transition-all" />
                  <span className="block h-px w-4 bg-foreground transition-all" />
                  <span className="block h-px w-3 bg-foreground transition-all" />
                </div>
              )
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
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
  );
}
