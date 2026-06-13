import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-gold/20 bg-gradient-noir">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold" />
            <div className="font-display text-xl">
              <span className="italic text-gradient-pink">Barbie</span>verse
            </div>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A luxury home for India's Poppo Live creators. Hosted with heart, paid on time, treated like talent.
          </p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Agency</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/join" className="hover:text-foreground">Join as Streamer</Link></li>
            <li><Link to="/coins" className="hover:text-foreground">Recharge Coins</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">Journal</Link></li>
            <li><Link to="/track-application" className="hover:text-foreground">Track Application</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Legal</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className="hover:text-foreground">Terms &amp; Conditions</Link></li>
            <li><Link to="/creator-reward-policy" className="hover:text-foreground">Creator Reward Policy</Link></li>
            <li><Link to="/recharge-policy" className="hover:text-foreground">Recharge Policy</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Contact</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
            <li className="text-xs">hello@barbieverse.org</li>
            <li className="text-xs">barbieverse.org</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        © {new Date().getFullYear()} Barbieverse · Crafted with love
      </div>
    </footer>
  );
}
