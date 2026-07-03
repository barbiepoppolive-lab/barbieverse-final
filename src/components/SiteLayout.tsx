import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { BarbieAssistant } from "./BarbieAssistant";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MobileFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40 backdrop-blur-md py-6 px-4 md:hidden">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Crown className="h-4 w-4 text-gold" />
        <span className="font-display text-sm font-bold text-gradient-pink">Barbieverse</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <Link to="/join" className="rounded-lg bg-card/40 px-3 py-2 text-center hover:text-foreground transition-colors">Join Agency</Link>
        <Link to="/coins" className="rounded-lg bg-card/40 px-3 py-2 text-center hover:text-foreground transition-colors">Recharge</Link>
        <Link to="/academy" className="rounded-lg bg-card/40 px-3 py-2 text-center hover:text-foreground transition-colors">Academy</Link>
        <Link to="/contact" className="rounded-lg bg-card/40 px-3 py-2 text-center hover:text-foreground transition-colors">Contact</Link>
      </div>
      <div className="mt-3 text-center text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} Barbieverse. All rights reserved.
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileFooter />

      <a
        href="https://wa.me/919000966360"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[5.5rem] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_oklch(0.5_0.25_145/0.3)] active:scale-95 md:bottom-6 md:right-6 md:h-14 md:w-14 animate-ambient-float"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="h-6 w-6 text-white md:h-7 md:w-7" />
      </a>

      <BarbieAssistant />
    </div>
  );
}
