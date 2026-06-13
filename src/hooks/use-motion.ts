// src/hooks/use-motion.ts
// Lightweight motion primitives. Zero dependencies beyond React.
// Respects prefers-reduced-motion at every level.

import { useEffect, useRef, useState, useCallback } from "react";

/** True when user has requested reduced motion */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/** Detect low-powered device (mobile + low memory or slow CPU) */
export function useIsLowPower(): boolean {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const nav = navigator as any;
    const isLowMem = nav.deviceMemory !== undefined && nav.deviceMemory < 4;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const slowCPU = nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4;
    setLow(isMobile && (isLowMem || slowCPU));
  }, []);
  return low;
}

/** Observe when element enters viewport. Returns [ref, isVisible] */
export function useScrollReveal<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect(); // fire once
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px", ...options },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible] as const;
}

/** Mouse-parallax: returns {x, y} normalized -1..1 relative to element center */
export function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        setPos({
          x: Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2))),
          y: Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2))),
        });
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() =>
        setPos({ x: 0, y: 0 }),
      );
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frameRef.current);
    };
  }, [reduced]);

  return [ref, pos] as const;
}

/** Global mouse position normalized 0..1 for hero parallax layers */
export function useGlobalMouse() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() =>
        setPos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }),
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, [reduced]);

  return pos;
}
