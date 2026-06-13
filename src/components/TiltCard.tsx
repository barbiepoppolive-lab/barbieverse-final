// src/components/TiltCard.tsx
// CSS-transform tilt on hover. Pure React, no library.
// Gracefully degrades on touch / reduced-motion.

import { useRef, ReactNode, MouseEvent } from "react";
import { usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";

interface Props {
  children: ReactNode;
  className?: string;
  intensity?: number; // max tilt degrees (default 8)
  glare?: boolean;
}

export function TiltCard({ children, className = "", intensity = 8, glare = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();
  const frameRef = useRef<number>(0);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || lowPower) return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
      const ny = (e.clientY - r.top) / r.height - 0.5;
      const rotX = (-ny * intensity * 2).toFixed(2);
      const rotY = (nx * intensity * 2).toFixed(2);
      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.025,1.025,1.025)`;
      if (glare && glareRef.current) {
        const angle = Math.atan2(ny, nx) * (180 / Math.PI);
        const dist = Math.sqrt(nx * nx + ny * ny);
        glareRef.current.style.opacity = String(Math.min(dist * 0.6, 0.2));
        glareRef.current.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.3) 0%, transparent 60%)`;
      }
    });
  };

  const onLeave = () => {
    if (reduced || lowPower) return;
    cancelAnimationFrame(frameRef.current);
    const el = ref.current;
    if (el) el.style.transform = "";
    if (glare && glareRef.current) glareRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative ${className}`}
      style={{ transition: "transform 0.45s cubic-bezier(.22,1,.36,1)", transformStyle: "preserve-3d" }}
    >
      {children}
      {glare && !reduced && !lowPower && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
