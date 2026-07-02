import { useLang } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-card/40 p-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
      {(["en", "hi", "tl"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            lang === l ? "bg-gradient-pink text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={lang === l}
        >
          {l === "en" ? "EN" : l === "hi" ? "हि" : "TL"}
        </button>
      ))}
    </div>
  );
}
