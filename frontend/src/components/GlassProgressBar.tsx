import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassProgressBarProps {
  value: number;
  max: number;
  variant?: "income" | "expense" | "savings";
  className?: string;
}

const glowMap = {
  income: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
  expense: "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
  savings: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
};

const gradientMap = {
  income: "gradient-income",
  expense: "gradient-expense",
  savings: "gradient-savings",
};

const GlassProgressBar = ({ value, max, variant = "savings", className }: GlassProgressBarProps) => {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("h-1.5 rounded-full bg-secondary/30 overflow-hidden", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className={cn("h-full rounded-full", gradientMap[variant], glowMap[variant])}
      />
    </div>
  );
};

export default GlassProgressBar;
