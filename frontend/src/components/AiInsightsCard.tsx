import { motion } from 'framer-motion';
import { Bot, BrainCircuit, Cpu, Sparkles, WandSparkles } from 'lucide-react';
import { sparkleItemAnimate, sparkleItemInitial, sparkleTransition } from '@/lib/motion';

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
          <strong key={`bold-${index}`} className="text-foreground">
            {matched[1]}
          </strong>
        );
      }

      return <span key={`plain-${index}`}>{part}</span>;
    });
}

const AiInsightsCard = ({ lines, hint, isLoading, source, model, onRefresh }: AiInsightsCardProps) => {
  const normalizedSource = String(source || '').trim();
  const normalizedModel = String(model || '').trim();
  const sourceUnavailable = /n[aã]o informad[ao]/i.test(normalizedSource);
  const modelUnavailable = /n[aã]o informad[ao]/i.test(normalizedModel);

  const providerLabel =
    normalizedSource === 'gemini'
      ? 'Google Gemini'
      : normalizedSource === 'fallback'
      ? 'Motor local'
      : normalizedSource;
  const normalizedHint = String(hint || '').trim();
  const hideHint = lines.length === 0 && /nenhum insight/i.test(normalizedHint);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sparkleTransition}
      className="glass-card ai-intelligence-card mb-6 overflow-hidden"
    >
      <div className="ai-glow" aria-hidden="true" />

      <header className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <div className="ai-orb-pulse" aria-hidden="true" />
            <div className="ai-orb" aria-hidden="true">
              <Sparkles className="w-4 h-4 text-foreground" />
            </div>
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
        {providerLabel && !sourceUnavailable && (
          <span className="ai-meta-chip">
            <Cpu className="w-3.5 h-3.5" />
            {providerLabel}
          </span>
        )}
        {normalizedModel && !modelUnavailable && (
          <span className="ai-meta-chip">
            <Bot className="w-3.5 h-3.5" />
            {normalizedModel}
          </span>
        )}
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
              initial={sparkleItemInitial}
              animate={sparkleItemAnimate}
              transition={{ ...sparkleTransition, delay: 0.08 * index }}
              className="ai-insight-item"
            >
              <div className="ai-insight-badge">{index + 1}</div>
              <p className="text-footnote text-foreground flex-1">{renderBoldSegments(line)}</p>
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

      {normalizedHint && !hideHint && (
        <div className="ai-footnote mt-4 relative z-10">
          <WandSparkles className="w-3.5 h-3.5 shrink-0" />
          <p>{normalizedHint}</p>
        </div>
      )}
    </motion.section>
  );
};

export default AiInsightsCard;
