import { Check } from "lucide-react";

interface Step {
  label: string;
  icon?: React.ReactNode;
}

interface StepProgressProps {
  steps: Step[];
  current: number;
  className?: string;
}

export function StepProgress({ steps, current, className = "" }: StepProgressProps) {
  return (
    <div className={`mx-auto max-w-xl ${className}`}>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500 ${
                    done
                      ? "border-primary bg-gradient-pink text-primary-foreground glow-sm scale-100"
                      : active
                        ? "border-primary bg-primary/20 text-primary glow-sm scale-110 animate-pulse"
                        : "border-border bg-card/40 text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : step.icon || i + 1}
                </div>
                <span
                  className={`mt-2 text-[10px] font-medium uppercase tracking-wider transition-colors duration-300 ${
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-2 mb-6 h-0.5 flex-1 overflow-hidden rounded-full bg-border/60">
                  <div
                    className={`h-full rounded-full bg-gradient-pink transition-all duration-700 ${
                      done ? "w-full" : active ? "w-1/2" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
