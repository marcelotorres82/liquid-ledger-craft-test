import PageContainer from '@/components/PageContainer';
import GlassCard from '@/components/GlassCard';
import GlassProgressBar from '@/components/GlassProgressBar';
import AnimatedNumber from '@/components/AnimatedNumber';
import { getShortMonthName } from '@/lib/format';
import { useFinanceStore } from '@/store/financeStore';

interface SavingsProps {
  onLogout: () => void;
}

const emojiByCategory: Record<string, string> = {
  Casa: '🏠',
  Carro: '🚗',
  Reserva: '🛟',
  'Férias': '🏖️',
  Ferias: '🏖️',
  Lazer: '🎉',
};

const Savings = ({ onLogout }: SavingsProps) => {
  const dashboard = useFinanceStore((state) => state.dashboard);
  const totalSaved = Number(dashboard?.caixinhas?.total_acumulado || 0);
  const goals = dashboard?.caixinhas?.categorias || [];
  const cycleStart = dashboard?.caixinhas?.inicio_ciclo;

  const periodLabel =
    cycleStart && dashboard?.caixinhas?.meses_considerados
      ? `${getShortMonthName(cycleStart.mes)}/${cycleStart.ano} • ${dashboard.caixinhas.meses_considerados} meses`
      : 'Ciclo atual';

  return (
    <PageContainer title="Caixinhas" subtitle="Metas inteligentes de economia" onLogout={onLogout}>
      <GlassCard delay={0.1} className="mb-6 text-center oppo-card glass-refractive py-8">
        <p className="text-caption text-muted-foreground uppercase tracking-[0.2em] mb-2">Total acumulado</p>
        <div className="text-large-title text-savings oppo-glow-text">
          <AnimatedNumber value={totalSaved} prefix="R$ " />
        </div>
        <p className="text-caption text-muted-foreground mt-2 opacity-80">{periodLabel}</p>
      </GlassCard>

      <div className="space-y-3">
        {goals.length === 0 && (
          <GlassCard className="oppo-card glass-refractive">
            <p className="text-subhead text-muted-foreground">Sem dados de caixinhas para o período selecionado.</p>
          </GlassCard>
        )}

        {goals.map((goal, index) => {
          const percentMeta = Number(goal.progresso_meta || 0);
          const percentPlus = Number(goal.progresso_plus || 0);
          const hasMeta = Number(goal.meta || 0) > 0;
          const hasPlus = Number(goal.meta_plus || 0) > 0;

          return (
            <GlassCard key={goal.categoria} delay={0.15 + index * 0.06} className="relative overflow-hidden oppo-card glass-refractive">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass-sm flex items-center justify-center text-2xl drop-shadow-lg border border-white/5">
                  {emojiByCategory[goal.categoria] || '💰'}
                </div>
                <div className="flex-1">
                  <p className="text-headline font-bold text-foreground">{goal.categoria}</p>
                  <p className="text-caption font-bold text-muted-foreground/80 tracking-tight">
                    R$ {Number(goal.valor_acumulado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {hasMeta
                      ? ` de R$ ${Number(goal.meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : ''}
                  </p>
                </div>
                {hasMeta && (
                  <div className="text-right">
                    <span className="text-subhead font-black text-foreground block">{Math.round(percentMeta)}%</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">Concluído</span>
                  </div>
                )}
              </div>

              {hasMeta ? (
                <div className="space-y-3">
                  <GlassProgressBar
                    value={Number(goal.valor_acumulado || 0)}
                    max={Number(goal.meta || 1)}
                    variant="savings"
                  />
                  <p className="text-caption font-bold text-muted-foreground/70 tracking-tight">
                    {Number(goal.faltante_meta || 0) > 0
                      ? `Faltam R$ ${Number(goal.faltante_meta || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })} para a meta`
                      : '✅ Meta principal batida!'}
                  </p>
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-white/5 border border-white/5">
                   <p className="text-caption font-medium italic text-muted-foreground/60 text-center">Defina uma meta para acompanhar o progresso</p>
                </div>
              )}

              {hasPlus && (
                <div className="mt-5 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Meta Plus</p>
                    <p className="text-caption font-black text-income">{Math.round(percentPlus)}%</p>
                  </div>
                  <GlassProgressBar
                    value={Number(goal.valor_acumulado || 0)}
                    max={Number(goal.meta_plus || 1)}
                    variant="income"
                  />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default Savings;
