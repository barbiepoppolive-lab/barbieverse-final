import { useState, useEffect, useRef } from "react";

interface TOCItem {
  id: string;
  label: string;
}

export function LessonTOC({ items }: { items: TOCItem[] }) {
  const [active, setActive] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headings = document.querySelectorAll("h2[id], h3[id]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="mb-12 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Table of Contents
      </h2>
      <nav ref={ref} className="space-y-1">
        {items.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active === t.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
