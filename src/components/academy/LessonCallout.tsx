import { AlertCircle, Lightbulb, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

type CalloutVariant = "tip" | "warning" | "info" | "danger";

const VARIANT_STYLES: Record<CalloutVariant, string> = {
  tip: "border-primary/20 bg-primary/5",
  warning: "border-gold/20 bg-gold/5",
  info: "border-accent/20 bg-accent/5",
  danger: "border-destructive/20 bg-destructive/5",
};

const VARIANT_ICONS: Record<CalloutVariant, ReactNode> = {
  tip: <Lightbulb className="h-4 w-4 text-primary" />,
  warning: <ShieldAlert className="h-4 w-4 text-gold" />,
  info: <AlertCircle className="h-4 w-4 text-accent" />,
  danger: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const VARIANT_LABELS: Record<CalloutVariant, string> = {
  tip: "Pro Tip",
  warning: "Important",
  info: "Note",
  danger: "Warning",
};

export function LessonCallout({
  variant = "tip",
  label,
  children,
}: {
  variant?: CalloutVariant;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 ${VARIANT_STYLES[variant]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {VARIANT_ICONS[variant]}
        <span className="text-foreground">{label || VARIANT_LABELS[variant]}</span>
      </div>
      <div className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {children}
      </div>
    </div>
  );
}
