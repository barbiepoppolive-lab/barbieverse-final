// src/components/Reveal.tsx
// Wraps children in a scroll-triggered reveal animation.
// Uses IntersectionObserver — no external library.
// Respects prefers-reduced-motion.

import { usePrefersReducedMotion, useScrollReveal } from "@/hooks/use-motion";
import type { ReactNode, CSSProperties, JSX } from "react";

type Variant = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale-up";

interface Props {
  children: ReactNode;
  variant?: Variant;
  delay?: number;   // ms
  duration?: number; // ms
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const hidden: Record<Variant, CSSProperties> = {
  "fade-up":    { opacity: 0, transform: "translateY(32px)" },
  "fade-in":    { opacity: 0 },
  "fade-left":  { opacity: 0, transform: "translateX(-28px)" },
  "fade-right": { opacity: 0, transform: "translateX(28px)" },
  "scale-up":   { opacity: 0, transform: "scale(0.93)" },
};

const visible: CSSProperties = { opacity: 1, transform: "none" };

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 600,
  className = "",
  as: Tag = "div",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  const style: CSSProperties = reduced
    ? {}
    : {
        ...(isVisible ? visible : hidden[variant]),
        transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
      };

  return (
    // @ts-ignore — polymorphic Tag
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
