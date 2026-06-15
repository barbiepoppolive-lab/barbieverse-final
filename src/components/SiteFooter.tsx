import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLang();
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
            {t("footer.desc")}
          </p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{t("footer.agency")}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/join" className="hover:text-foreground">{t("footer.join")}</Link></li>
            <li><Link to="/coins" className="hover:text-foreground">{t("footer.recharge")}</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">{t("footer.journal")}</Link></li>
            <li><Link to="/track-application" className="hover:text-foreground">{t("footer.track")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{t("footer.legal")}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground">{t("footer.privacy")}</Link></li>
            <li><Link to="/terms-and-conditions" className="hover:text-foreground">{t("footer.terms")}</Link></li>
            <li><Link to="/creator-reward-policy" className="hover:text-foreground">{t("footer.creatorpolicy")}</Link></li>
            <li><Link to="/recharge-policy" className="hover:text-foreground">{t("footer.rechargepolicy")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{t("footer.contact")}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/contact" className="hover:text-foreground">{t("footer.contactus")}</Link></li>
            <li className="text-xs">hello@barbieverse.org</li>
            <li className="text-xs">barbieverse.org</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
      </div>
    </footer>
  );
}
