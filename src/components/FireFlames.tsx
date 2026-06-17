import { useEffect, useRef } from "react";

/**
 * Realistic fire flame effect using canvas.
 * Renders animated flames along the bottom and side edges of a container.
 */
export function FireFlames({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const flames: Flame[] = [];
    const W = canvas.width;
    const H = canvas.height;

    interface Flame {
      x: number;
      y: number;
      baseY: number;
      size: number;
      speed: number;
      life: number;
      maxLife: number;
      hue: number;
      drift: number;
      edge: "bottom" | "left" | "right";
    }

    function spawnFlame() {
      // 70% bottom, 15% left, 15% right
      const r = Math.random();
      let edge: Flame["edge"] = "bottom";
      let x = Math.random() * W;
      let baseY = H;

      if (r > 0.7 && r <= 0.85) {
        edge = "left";
        x = 0;
        baseY = H * 0.3 + Math.random() * H * 0.6;
      } else if (r > 0.85) {
        edge = "right";
        x = W;
        baseY = H * 0.3 + Math.random() * H * 0.6;
      } else {
        // bottom flames concentrated near edges for fire-frame look
        const side = Math.random() > 0.5 ? 1 : 0;
        x = side ? W * 0.7 + Math.random() * W * 0.3 : Math.random() * W * 0.3;
      }

      flames.push({
        x,
        y: baseY,
        baseY,
        size: 4 + Math.random() * 10,
        speed: 0.8 + Math.random() * 1.5,
        life: 0,
        maxLife: 20 + Math.random() * 30,
        hue: 10 + Math.random() * 40, // orange to yellow
        drift: (Math.random() - 0.5) * 1.2,
        edge,
      });
    }

    function drawFlame(f: Flame) {
      const progress = f.life / f.maxLife;
      const fade = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      const s = f.size * (0.5 + progress * 0.5);

      ctx!.save();
      ctx!.globalAlpha = fade * 0.85;

      // Flame body — teardrop shape
      const gradient = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, s * 2);
      gradient.addColorStop(0, `hsla(${f.hue}, 100%, 85%, 1)`);
      gradient.addColorStop(0.3, `hsla(${f.hue - 5}, 100%, 65%, 0.9)`);
      gradient.addColorStop(0.6, `hsla(${f.hue - 15}, 95%, 45%, 0.6)`);
      gradient.addColorStop(1, `hsla(${f.hue - 25}, 90%, 25%, 0)`);

      ctx!.fillStyle = gradient;
      ctx!.beginPath();
      ctx!.moveTo(f.x, f.y);

      // Flame tip rises upward
      const tipY = f.y - s * (1.5 + progress);
      const cp1x = f.x - s * 0.6;
      const cp1y = f.y - s * 0.8;
      const cp2x = f.x + s * 0.6;
      const cp2y = f.y - s * 0.8;

      ctx!.bezierCurveTo(cp1x, cp1y, f.x - s * 0.3 + f.drift * progress * 3, tipY, f.x + f.drift * progress * 2, tipY);
      ctx!.bezierCurveTo(f.x + s * 0.3 + f.drift * progress * 3, tipY, cp2x, cp2y, f.x, f.y);
      ctx!.fill();

      // Bright core
      ctx!.globalAlpha = fade * 0.5;
      const coreGrad = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y - s * 0.3, s * 0.6);
      coreGrad.addColorStop(0, `hsla(45, 100%, 95%, 1)`);
      coreGrad.addColorStop(0.5, `hsla(35, 100%, 75%, 0.6)`);
      coreGrad.addColorStop(1, `hsla(25, 100%, 50%, 0)`);
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(f.x, f.y - s * 0.2, s * 0.5, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.restore();
    }

    function animate() {
      ctx!.clearRect(0, 0, W, H);

      // Spawn new flames
      for (let i = 0; i < 3; i++) spawnFlame();

      // Update and draw
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.life++;
        f.y -= f.speed;
        f.x += f.drift;

        if (f.life >= f.maxLife) {
          flames.splice(i, 1);
          continue;
        }

        drawFlame(f);
      }

      animId = requestAnimationFrame(animate);
    }

    // Set canvas size
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width + 20;
        canvas.height = rect.height + 20;
      }
    };
    resize();

    animate();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute -inset-2 z-0 ${className}`}
      style={{ filter: "blur(1px)" }}
    />
  );
}
