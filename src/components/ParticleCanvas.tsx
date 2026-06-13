// src/components/ParticleCanvas.tsx
// Lightweight canvas particle system. Pure browser APIs, zero deps.
// Auto-disabled on low-power devices and prefers-reduced-motion.

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion, useIsLowPower } from "@/hooks/use-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  da: number; // delta alpha (fade speed)
  hue: number; // 330–280 range (pink to purple)
}

interface Props {
  count?: number;
  className?: string;
}

export function ParticleCanvas({ count = 55, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const lowPower = useIsLowPower();

  useEffect(() => {
    if (reduced || lowPower) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0, H = 0;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const actualCount = Math.min(count, 35); // cap for perf
    const particles: Particle[] = Array.from({ length: actualCount }, () => makeParticle(W, H));

    function makeParticle(w: number, h: number): Particle {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25 - 0.15, // slight upward drift
        r: 1 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.5,
        da: (Math.random() > 0.5 ? 1 : -1) * 0.002,
        hue: 290 + Math.random() * 60, // purple→pink
      };
    }

    let lastTime = 0;
    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (ts - lastTime < 32) return; // ~30fps cap
      lastTime = ts;

      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.da;
        if (p.alpha > 0.7 || p.alpha < 0.1) p.da *= -1;

        // Wrap edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Glow dot
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 75%, ${p.alpha})`);
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 65%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced, lowPower, count]);

  if (reduced || lowPower) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
