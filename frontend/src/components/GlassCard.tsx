import { LiquidGlass } from "./LiquidGlass";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  variant?: 'default' | 'sm';
}

const GlassCard = ({ children, className, delay = 0, onClick, variant = 'default' }: GlassCardProps) => (
  <LiquidGlass
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    whileTap={onClick ? { scale: 0.97 } : undefined}
    onClick={onClick}
    className={cn(onClick && "cursor-pointer", className)}
    variant={variant}
  >
    {children}
  </LiquidGlass>
);

export default GlassCard;

