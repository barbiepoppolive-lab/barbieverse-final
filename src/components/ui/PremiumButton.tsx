import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "gold" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function PremiumButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className = "",
  ...props
}: PremiumButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-300 tap-feedback";

  const sizes = {
    sm: "h-10 px-5 text-xs",
    md: "h-12 px-6 text-sm",
    lg: "h-14 px-8 text-sm",
  };

  const variants = {
    primary:
      "bg-gradient-pink text-primary-foreground glow-pink hover:scale-[1.03] hover:shadow-[0_0_40px_oklch(0.72_0.25_350/0.4)]",
    secondary:
      "border border-border bg-card/40 text-foreground backdrop-blur-md hover:border-gold/60 hover:bg-card/70 hover:shadow-[0_0_30px_oklch(0.82_0.13_75/0.15)]",
    gold: "bg-gradient-gold text-black font-bold hover:scale-[1.03] hover:shadow-[0_0_40px_oklch(0.82_0.13_75/0.4)]",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-card/40",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
