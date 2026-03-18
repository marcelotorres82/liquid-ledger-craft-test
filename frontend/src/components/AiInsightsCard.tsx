import { motion, useScroll, useTransform } from 'framer-motion';
import { Bot, BrainCircuit, Cpu, Sparkles, WandSparkles, Home, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react';
import { LiquidGlass } from './LiquidGlass';
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from 'react-router-dom';

interface AiInsightsCardProps {
  lines: string[];
  hint: string;
  isLoading: boolean;
  source: string;
  model: string;
  onRefresh: () => void;
}

function renderBoldSegments(text: string) {
  return String(text || '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const matched = part.match(/^\*\*(.+)\*\*$/);
      if (matched) {
        return (
          <strong key={`bold-${index}`} className="font-semibold text-foreground">
            {matched[1]}
          </strong>
        );
      }

      return <span key={`plain-${index}`}>{part}</span>;
    });
}

const AiInsightsCard = ({ lines, hint, isLoading, source, model, onRefresh }: AiInsightsCardProps) => {
  const providerLabel =
    source === 'gemini'
      ? 'Google Gemini'
      : source === 'fallback'
        ? 'Motor local'
        : source
          ? source
          : 'IA não informada';
  const modelLabel = model || 'Modelo não informado';

  return (
    <LiquidGlass
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="oppo-card glass-refractive mb-6 group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5 opacity-40 pointer-events-none" />
      <div className="ai-glow" aria-hidden="true" />

      <header className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.7, 0.4] 
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="ai-orb-pulse absolute inset-0 bg-primary/20 rounded-full blur-md" 
              aria-hidden="true" 
            />
            <motion.div 
              animate={{ 
                rotate: 360 
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="ai-orb relative z-10 flex items-center justify-center" 
              aria-hidden="true"
            >
              <Sparkles className="w-5 h-5 text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </div>
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-[0.16em] text-muted-foreground">IA em uso</p>
            <h2 className="text-title-3 text-foreground leading-tight">Insights de IA</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="ai-refresh-btn"
        >
          {isLoading ? 'Gerando...' : 'Atualizar'}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4 relative z-10">
        <span className="ai-meta-chip">
          <Cpu className="w-3.5 h-3.5" />
          {providerLabel}
        </span>
        <span className="ai-meta-chip">
          <Bot className="w-3.5 h-3.5" />
          {modelLabel}
        </span>
        <span className="ai-brain-widget">
          <BrainCircuit className="w-3.5 h-3.5 text-foreground" />
          <span className="text-caption text-foreground">Leitura contextual ativa</span>
        </span>
      </div>

      <div className="space-y-2.5 relative z-10">
        {isLoading && lines.length === 0 ? (
          <div className="space-y-2">
            <div className="ai-skeleton h-11" />
            <div className="ai-skeleton h-11" />
            <div className="ai-skeleton h-11" />
          </div>
        ) : lines.length > 0 ? (
          lines.map((line, index) => (
            <motion.article
              key={`${line}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.08 * index }}
              className="liquid-glass-sm p-4 flex items-start gap-3"
            >
              <div className="ai-insight-badge">{index + 1}</div>
              <p className="text-subhead text-foreground flex-1">{renderBoldSegments(line)}</p>
            </motion.article>
          ))
        ) : (
          <div className="ai-insight-item">
            <div className="ai-insight-badge">AI</div>
            <p className="text-subhead text-muted-foreground flex-1">
              Nenhum insight disponível no momento. Toque em Atualizar para gerar uma nova leitura.
            </p>
          </div>
        )}
      </div>

      {hint && (
        <div className="ai-footnote mt-4 relative z-10">
          <WandSparkles className="w-3.5 h-3.5 shrink-0" />
          <p>{hint}</p>
        </div>
      )}
    </LiquidGlass>
  );
};

export default AiInsightsCard;
