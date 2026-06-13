// src/components/FloatingOrbs.tsx
// Pure CSS animated glass orbs for hero backgrounds.
// Disabled on reduced-motion / low-power.

import { usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";

interface Orb {
  size: string;
  top: string;
  left: string;
  delay: string;
  duration: string;
  hue: string;
  blur: string;
  opacity: string;
}

const ORBS: Orb[] = [
  { size: "320px", top: "8%",  left: "72%", delay: "0s",    duration: "14s", hue: "330", blur: "60px", opacity: "0.18" },
  { size: "180px", top: "55%", left: "8%",  delay: "3s",    duration: "18s", hue: "280", blur: "40px", opacity: "0.14" },
  { size: "240px", top: "20%", left: "30%", delay: "6s",    duration: "22s", hue: "350", blur: "50px", opacity: "0.10" },
  { size: "120px", top: "75%", left: "65%", delay: "1.5s",  duration: "16s", hue: "300", blur: "30px", opacity: "0.16" },
  { size: "90px",  top: "40%", left: "90%", delay: "4.5s",  duration: "12s", hue: "340", blur: "24px", opacity: "0.20" },
];

export function FloatingOrbs({ count = 5 }: { count?: number }) {
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();
  if (reduced || lowPower) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {ORBS.slice(0, count).map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: `radial-gradient(circle at 35% 35%, hsla(${orb.hue},90%,80%,0.25), hsla(${orb.hue},70%,50%,0.05))`,
            border: `1px solid hsla(${orb.hue},80%,80%,0.12)`,
            backdropFilter: "blur(1px)",
            boxShadow: `0 0 ${orb.blur} hsla(${orb.hue},90%,70%,0.15) inset, 0 0 ${orb.blur} hsla(${orb.hue},90%,70%,0.08)`,
            opacity: orb.opacity,
            animation: `floatOrb ${orb.duration} ease-in-out ${orb.delay} infinite alternate`,
            willChange: "transform",
          }}
        />
      ))}

      <style>{`
        @keyframes floatOrb {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(12px, -18px) scale(1.04); }
        }
        @keyframes floatOrb2 {
          from { transform: translate(0, 0) rotate(0deg); }
          to   { transform: translate(-10px, 14px) rotate(8deg); }
        }
      `}</style>
    </div>
  );
}

// Sparkle dots — static SVG, very cheap
export function Sparkles({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {[
        { x: "15%", y: "20%", s: 6, d: "0s" },
        { x: "82%", y: "12%", s: 4, d: "1.5s" },
        { x: "55%", y: "70%", s: 5, d: "3s" },
        { x: "28%", y: "88%", s: 3, d: "0.8s" },
        { x: "90%", y: "55%", s: 7, d: "2.2s" },
        { x: "6%",  y: "60%", s: 4, d: "4s" },
        { x: "70%", y: "35%", s: 3, d: "1s" },
        { x: "42%", y: "15%", s: 5, d: "2.8s" },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.s,
            height: dot.s,
            opacity: 0,
            animation: `sparkleIn 3.5s ease-in-out ${dot.d} infinite`,
            boxShadow: `0 0 ${dot.s * 2}px 1px oklch(0.72 0.25 350 / 0.5)`,
          }}
        />
      ))}
      <style>{`
        @keyframes sparkleIn {
          0%,100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.85; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
