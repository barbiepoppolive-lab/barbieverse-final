import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

export function FaqAccordion({ items, className = "" }: FaqAccordionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, i) => (
        <FaqRow key={i} item={item} index={i} />
      ))}
    </div>
  );
}

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="glass-card rounded-2xl overflow-hidden transition-all duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <span>{item.q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.a}
        </div>
      </div>
    </div>
  );
}
