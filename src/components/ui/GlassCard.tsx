import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: "lift" | "glow" | "scale" | "none";
  glow?: "pink" | "gold" | "none";
  as?: "div" | "section" | "article";
}

export function GlassCard({
  children,
  className = "",
  hover = "glow",
  glow = "none",
  as: Tag = "div",
}: GlassCardProps) {
  const hoverClass =
    hover === "lift"
      ? "card-lift"
      : hover === "glow"
        ? "card-glow"
        : hover === "scale"
          ? "hover-scale-sm"
          : "";
  const glowClass =
    glow === "pink" ? "glow-sm" : glow === "gold" ? "glow-gold-sm" : "";

  return (
    <Tag
      className={`glass-card rounded-2xl ${hoverClass} ${glowClass} ${className}`}
    >
      {children}
    </Tag>
  );
}
