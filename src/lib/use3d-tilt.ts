import { useRef, useCallback, useEffect } from "react";

type TiltOptions = {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  mobileDisabled?: boolean;
};

export function use3dTilt<T extends HTMLElement>(opts: TiltOptions = {}) {
  const {
    maxTilt = 8,
    perspective = 800,
    scale = 1.02,
    speed = 400,
    glare = false,
    mobileDisabled = true,
  } = opts;

  const ref = useRef<T>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const isMobile = useRef(false);

  useEffect(() => {
    isMobile.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (mobileDisabled && isMobile.current) return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);

      const tiltX = -deltaY * maxTilt;
      const tiltY = deltaX * maxTilt;

      el.style.setProperty("--tilt-x", `${tiltX}deg`);
      el.style.setProperty("--tilt-y", `${tiltY}deg`);
      el.style.setProperty("--tilt-scale", String(scale));
      el.style.setProperty("--tilt-perspective", `${perspective}px`);
      el.style.transform = `perspective(var(--tilt-perspective)) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale3d(var(--tilt-scale),var(--tilt-scale),var(--tilt-scale))`;
      el.style.transition = `transform ${speed}ms cubic-bezier(.22,1,.36,1)`;

      if (glare && glareRef.current) {
        const glareX = ((e.clientX - rect.left) / rect.width) * 100;
        const glareY = ((e.clientY - rect.top) / rect.height) * 100;
        glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, oklch(1 0.2 350 / 0.12), transparent 70%)`;
      }
    },
    [maxTilt, scale, speed, perspective, glare, mobileDisabled]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(var(--tilt-perspective, 800px)) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)`;
    el.style.transition = `transform ${speed * 1.5}ms cubic-bezier(.22,1,.36,1)`;
    if (glare && glareRef.current) {
      glareRef.current.style.background = "transparent";
    }
  }, [speed, glare]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return { ref, glareRef };
}
