"use client";

import { useEffect, useRef } from "react";

export function FireFlames({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 300;
    let H = 200;

    interface FlameData {
      x: number;
      y: number;
      size: number;
      speed: number;
      life: number;
      maxLife: number;
      hue: number;
      drift: number;
      edge: string;
    }

    const flames: FlameData[] = [];

    function spawnFlame() {
      const r = Math.random();
      let edge = "bottom";
      let x = Math.random() * W;
      let baseY = H;

      if (r > 0.5 && r <= 0.75) {
        edge = "left";
        x = -2;
        baseY = Math.random() * H;
      } else if (r > 0.75) {
        edge = "right";
        x = W + 2;
        baseY = Math.random() * H;
      } else {
        edge = "bottom";
        x = Math.random() * W;
        baseY = H - 2;
      }

      flames.push({
        x: x,
        y: baseY,
        size: 3 + Math.random() * 8,
        speed: 0.6 + Math.random() * 1.2,
        life: 0,
        maxLife: 15 + Math.random() * 25,
        hue: 10 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 1.5,
        edge: edge,
      });
    }

    function drawFlame(f: FlameData) {
      const progress = f.life / f.maxLife;
      const fade = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      const s = f.size * (0.5 + progress * 0.5);

      ctx.save();
      ctx.globalAlpha = fade * 0.85;

      const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, s * 2);
      gradient.addColorStop(0, "hsla(" + f.hue + ", 100%, 85%, 1)");
      gradient.addColorStop(0.3, "hsla(" + (f.hue - 5) + ", 100%, 65%, 0.9)");
      gradient.addColorStop(0.6, "hsla(" + (f.hue - 15) + ", 95%, 45%, 0.6)");
      gradient.addColorStop(1, "hsla(" + (f.hue - 25) + ", 90%, 25%, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);

      const tipY = f.y - s * (1.5 + progress);
      const cp1x = f.x - s * 0.6;
      const cp1y = f.y - s * 0.8;
      const cp2x = f.x + s * 0.6;
      const cp2y = f.y - s * 0.8;

      ctx.bezierCurveTo(cp1x, cp1y, f.x - s * 0.3 + f.drift * progress * 3, tipY, f.x + f.drift * progress * 2, tipY);
      ctx.bezierCurveTo(f.x + s * 0.3 + f.drift * progress * 3, tipY, cp2x, cp2y, f.x, f.y);
      ctx.fill();

      ctx.globalAlpha = fade * 0.5;
      const coreGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y - s * 0.3, s * 0.6);
      coreGrad.addColorStop(0, "hsla(45, 100%, 95%, 1)");
      coreGrad.addColorStop(0.5, "hsla(35, 100%, 75%, 0.6)");
      coreGrad.addColorStop(1, "hsla(25, 100%, 50%, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(f.x, f.y - s * 0.2, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < 4; i++) spawnFlame();

      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.life++;

        if (f.edge === "bottom") {
          f.y -= f.speed;
          f.x += f.drift;
        } else if (f.edge === "left") {
          f.x -= f.speed * 0.7;
          f.y -= f.speed * 0.5;
        } else if (f.edge === "right") {
          f.x += f.speed * 0.7;
          f.y -= f.speed * 0.5;
        }

        if (f.life >= f.maxLife) {
          flames.splice(i, 1);
          continue;
        }

        drawFlame(f);
      }

      while (flames.length > 150) flames.shift();

      animId = requestAnimationFrame(animate);
    }

    const resize = () => {
      const rect = canvas.parentElement;
      if (rect) {
        W = rect.offsetWidth + 20;
        H = rect.offsetHeight + 20;
        canvas.width = W;
        canvas.height = H;
      }
    };
    resize();

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={"pointer-events-none absolute -inset-2 z-0 " + className}
      style={{ filter: "blur(1px)" }}
    />
  );
}
