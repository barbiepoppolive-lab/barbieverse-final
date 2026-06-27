import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface ChecklistItem {
  icon: string;
  label: string;
}

export function LessonChecklist({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<boolean[]>(new Array(items.length).fill(false));

  const toggle = (i: number) => {
    setChecked((prev) => {
      const n = [...prev];
      n[i] = !n[i];
      return n;
    });
  };

  return (
    <div>
      <div className="mt-6 space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all ${
              checked[i]
                ? "border-primary/40 bg-primary/10"
                : "border-border/40 bg-card/30 hover:border-primary/20"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={checked[i] ? "line-through text-muted-foreground" : ""}>
              {item.label}
            </span>
            {checked[i] && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {checked.filter(Boolean).length}/{items.length} completed
      </div>
    </div>
  );
}
