import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

interface LiquidGlassProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'sm';
  tint?: string; // ex: 'rgba(99,102,241,0.08)' para roxo
  onClick?: () => void;
}

export function LiquidGlass({
  children,
  className,
  variant = 'default',
  tint,
  onClick,
  ...motionProps
}: LiquidGlassProps) {
  return (
    <motion.div
      className={cn(
        variant === 'sm' ? 'liquid-glass-sm' : 'liquid-glass',
        'relative',
        className
      )}
      style={tint ? { background: tint } : undefined}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      {...motionProps}
    >
      {/* Subtle top highlights for premium feel */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.1 }}
        whileHover={{ opacity: 0.4 }}
        className="pointer-events-none absolute inset-x-8 top-0 h-px transition-opacity duration-700"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.3) 80%, transparent)',
        }}
      />
      
      {/* Camada interna para garantir que o conteúdo fique acima do blur de refração */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}
