import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Sparkles, X, PiggyBank, BarChart3, ChevronRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import GlassCard from '@/components/GlassCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import TransactionItem from '@/components/TransactionItem';
import AiInsightsCard from '@/components/AiInsightsCard';
import { parseExpenseDescription } from '@/lib/expenseMeta';
import { useFinanceStore } from '@/store/financeStore';
import { formatCurrency, formatDate, getMonthName } from '@/lib/format';
import { cn, debounce } from '@/lib/utils';
import { getExpenseIcon, getIncomeIcon } from '@/lib/transactionIcons';

interface DashboardProps {
  onLogout: () => void;
}

interface RecentTransaction {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  amount: number;
  type: 'income' | 'expense';
  sortDate: number;
}

interface DueReminder {
  id: string;
  icon: ReactNode;
  title: string;
  amount: number;
  dueDateISO: string;
  dueDateMs: number;
  daysUntil: number;
}

function parseInsightLines(content: string): string[] {
  return String(content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

function parseISODate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysDiff(fromDate: Date, toDate: Date): number {
  const diffMs = normalizeStartOfDay(toDate).getTime() - normalizeStartOfDay(fromDate).getTime();
  return Math.round(diffMs / 86400000);
}

function buildRecurringDueDate(isoDate: string, month: number, year: number): Date | null {
  const base = parseISODate(isoDate);
  if (!base) return null;
  const day = base.getDate();
  const monthLastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, monthLastDay));
}

function dueLabel(daysUntil: number): string {
  if (daysUntil < 0) {
    const abs = Math.abs(daysUntil);
    return `${abs} ${abs === 1 ? 'dia de atraso' : 'dias de atraso'}`;
  }
  if (daysUntil === 0) return 'Vence hoje';
  if (daysUntil === 1) return 'Vence amanhã';
  return `Vence em ${daysUntil} dias`;
}

const NAME_STORAGE_PREFIX = 'app-financeiro-display-name-v1';
const NAME_ONBOARD_PREFIX = 'app-financeiro-display-name-onboard-v1';

function isMobileContext() {
  if (typeof window === 'undefined') return false;
  const byViewport = window.matchMedia('(max-width: 900px)').matches;
  const byAgent = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  return byViewport || byAgent;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const navigate = useNavigate();
  const user = useFinanceStore((state) => state.user);
  const dashboard = useFinanceStore((state) => state.dashboard);
  const receitasFixas = useFinanceStore((state) => state.receitasFixas);
  const receitasVariaveis = useFinanceStore((state) => state.receitasVariaveis);
  const despesasFixas = useFinanceStore((state) => state.despesasFixas);
  const despesasAvulsas = useFinanceStore((state) => state.despesasAvulsas);
  const despesasParceladas = useFinanceStore((state) => state.despesasParceladas);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isLoadingData = useFinanceStore((state) => state.isLoadingData);
  const isLoadingInsights = useFinanceStore((state) => state.isLoadingInsights);
  const regenerateInsights = useFinanceStore((state) => state.regenerateInsights);
  const insight = useFinanceStore((state) => state.insight);
  const insightHint = useFinanceStore((state) => state.insightHint);
  const insightSource = useFinanceStore((state) => state.insightSource);
  const insightModel = useFinanceStore((state) => state.insightModel);
  const error = useFinanceStore((state) => state.error);

  const totalIncome = dashboard?.receitas.total || 0;
  const totalExpenses = dashboard?.despesas.total || 0;
  const balance = dashboard?.balanco || 0;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const recurringIncome = receitasFixas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const recurringExpenses =
    despesasFixas.reduce((sum, item) => sum + Number(item.valor_parcela || 0), 0) +
    despesasParceladas.reduce((sum, item) => sum + Number(item.valor_parcela_mes ?? item.valor_parcela), 0);
  const recurringMonthlyNet = recurringIncome - recurringExpenses;
  const projectedBalances = [30, 60, 90].map((days) => ({
    days,
    value: balance + recurringMonthlyNet * (days / 30),
  }));
  const recurringNetLabel = recurringMonthlyNet >= 0 ? 'Tendência positiva' : 'Tendência de déficit';

  const recentTransactions: RecentTransaction[] = [
    ...receitasFixas.map((item) => ({
      id: `rf-${item.id}`,
      icon: getIncomeIcon(item.descricao),
      title: item.descricao,
      subtitle: `Receita fixa · ${formatDate(item.data_registro)}`,
      amount: item.valor,
      type: 'income' as const,
      sortDate: new Date(`${item.data_registro}T00:00:00`).getTime(),
    })),
    ...receitasVariaveis.map((item) => ({
      id: `rv-${item.id}`,
      icon: getIncomeIcon(item.descricao),
      title: item.descricao,
      subtitle: `Receita variável · ${formatDate(item.data_registro)}`,
      amount: item.valor,
      type: 'income' as const,
      sortDate: new Date(`${item.data_registro}T00:00:00`).getTime(),
    })),
    ...despesasFixas.map((item) => ({
      id: `df-${item.id}`,
      icon: getExpenseIcon(item.descricao, item.tipo),
      title: parseExpenseDescription(item.descricao, item.tipo).description,
      subtitle: `Despesa fixa · ${formatDate(item.data_inicio)}`,
      amount: item.valor_parcela,
      type: 'expense' as const,
      sortDate: new Date(`${item.data_inicio}T00:00:00`).getTime(),
    })),
    ...despesasAvulsas.map((item) => ({
      id: `da-${item.id}`,
      icon: getExpenseIcon(item.descricao, item.tipo),
      title: parseExpenseDescription(item.descricao, item.tipo).description,
      subtitle: `Despesa avulsa · ${formatDate(item.data_inicio)}`,
      amount: item.valor_parcela,
      type: 'expense' as const,
      sortDate: new Date(`${item.data_inicio}T00:00:00`).getTime(),
    })),
    ...despesasParceladas.map((item) => ({
      id: `dp-${item.id}`,
      icon: getExpenseIcon(item.descricao, item.tipo),
      title: parseExpenseDescription(item.descricao, item.tipo).description,
      subtitle: `Parcelada ${item.parcela_atual || 1}/${item.parcelas_total || 1} · ${formatDate(item.data_inicio)}`,
      amount: Number(item.valor_parcela_mes ?? item.valor_parcela),
      type: 'expense' as const,
      sortDate: new Date(`${item.data_inicio}T00:00:00`).getTime(),
    })),
  ]
    .sort((a, b) => b.sortDate - a.sortDate);

  const insights = parseInsightLines(insight);
  const now = new Date();
  const isCurrentPeriod = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();
  const reminderReferenceDate = isCurrentPeriod
    ? normalizeStartOfDay(now)
    : new Date(currentYear, currentMonth - 1, 1);
  const dueReminders = useMemo<DueReminder[]>(() => {
    const reminders: DueReminder[] = [
      ...despesasFixas
        .filter((item) => !item.paga)
        .map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          const dueDate = buildRecurringDueDate(item.data_inicio, currentMonth, currentYear);
          if (!dueDate) return null;
          return {
            id: `fixa-${item.id}`,
            icon: getExpenseIcon(item.descricao, item.tipo),
            title: parsed.description,
            amount: Number(item.valor_parcela || 0),
            dueDateISO: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(
              dueDate.getDate()
            ).padStart(2, '0')}`,
            dueDateMs: dueDate.getTime(),
            daysUntil: getDaysDiff(reminderReferenceDate, dueDate),
          };
        })
        .filter(Boolean) as DueReminder[],
      ...despesasAvulsas
        .filter((item) => !item.paga)
        .map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          const dueDate = parseISODate(item.data_inicio);
          if (!dueDate) return null;
          return {
            id: `avulsa-${item.id}`,
            icon: getExpenseIcon(item.descricao, item.tipo),
            title: parsed.description,
            amount: Number(item.valor_parcela || 0),
            dueDateISO: item.data_inicio,
            dueDateMs: dueDate.getTime(),
            daysUntil: getDaysDiff(reminderReferenceDate, dueDate),
          };
        })
        .filter(Boolean) as DueReminder[],
      ...despesasParceladas
        .filter((item) => !item.paga)
        .map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          const dueDate = buildRecurringDueDate(item.data_inicio, currentMonth, currentYear);
          if (!dueDate) return null;
          return {
            id: `parcelada-${item.id}-${item.parcela_atual || 1}`,
            icon: getExpenseIcon(item.descricao, item.tipo),
            title: `${parsed.description} (${item.parcela_atual || 1}/${item.parcelas_total || 1})`,
            amount: Number(item.valor_parcela_mes ?? item.valor_parcela),
            dueDateISO: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(
              dueDate.getDate()
            ).padStart(2, '0')}`,
            dueDateMs: dueDate.getTime(),
            daysUntil: getDaysDiff(reminderReferenceDate, dueDate),
          };
        })
        .filter(Boolean) as DueReminder[],
    ];

    const weight = (days: number) => {
      if (days < 0) return 0;
      if (days === 0) return 1;
      if (days <= 3) return 2;
      if (days <= 7) return 3;
      return 4;
    };

    return reminders.sort((a, b) => {
      const statusWeight = weight(a.daysUntil) - weight(b.daysUntil);
      if (statusWeight !== 0) return statusWeight;
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.dueDateMs - b.dueDateMs;
    });
  }, [
    currentMonth,
    currentYear,
    despesasAvulsas,
    despesasFixas,
    despesasParceladas,
    reminderReferenceDate,
  ]);
  const overdueCount = dueReminders.filter((item) => item.daysUntil < 0).length;
  const dueInThreeDaysCount = dueReminders.filter((item) => item.daysUntil >= 0 && item.daysUntil <= 3).length;
  const dueInWeekCount = dueReminders.filter((item) => item.daysUntil > 3 && item.daysUntil <= 7).length;
  const pendingTotal = dueReminders.reduce((sum, item) => sum + item.amount, 0);
  const visibleDueReminders = dueReminders.slice(0, 5);

  const firstName = user?.nome?.split(' ')[0] || '';
  const normalizedFirstName = firstName
    ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`
    : '';
  const fallbackName =
    normalizedFirstName && normalizedFirstName.toLowerCase() !== 'admin'
      ? normalizedFirstName
      : 'Marcelo';
  const userScopedKey = `${NAME_STORAGE_PREFIX}:${user?.id ?? 'anon'}`;
  const userScopedOnboardKey = `${NAME_ONBOARD_PREFIX}:${user?.id ?? 'anon'}`;
  const [displayName, setDisplayName] = useState(fallbackName);
  const [editorOpen, setEditorOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(fallbackName);
	const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(userScopedKey)?.trim();
    if (stored) {
      setDisplayName(stored);
      setNameDraft(stored);
      return;
    }

    setDisplayName(fallbackName);
    setNameDraft(fallbackName);

    // If no name is stored, always show the first-access prompt on mobile contexts.
    if (isMobileContext()) {
      setEditorOpen(true);
      window.localStorage.setItem(userScopedOnboardKey, '1');
    }
  }, [fallbackName, userScopedKey, userScopedOnboardKey]);

  useEffect(() => {
    if (!editorOpen || !isMobileContext()) return;
    if (typeof window === 'undefined') return;

    const nextName = nameDraft.trim();
    if (!nextName) return;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(userScopedKey, nextName);
      setDisplayName(nextName);
    }, 260);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [editorOpen, nameDraft, userScopedKey]);

  const handlePersistName = useMemo(
    () =>
      debounce(() => {
        const nextName = nameDraft.trim() || fallbackName;
        setIsSavingName(true);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(userScopedKey, nextName);
          window.localStorage.setItem(userScopedOnboardKey, '1');
        }

        setDisplayName(nextName);
        setNameDraft(nextName);

        setTimeout(() => {
          setIsSavingName(false);
          setEditorOpen(false);
        }, 400);
      }, 300),
    [nameDraft, fallbackName, userScopedKey, userScopedOnboardKey]
  );

  const titleNode = useMemo(
    () => (
      <button
        type="button"
        onClick={() => {
          setNameDraft(displayName);
          setEditorOpen(true);
        }}
        className={cn(
          'group inline-flex items-center gap-2 rounded-2xl tap-highlight-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
        )}
        aria-label="Editar nome"
      >
        <h1 className="text-large-title text-foreground">Olá, {displayName}</h1>
        <span className="w-7 h-7 rounded-full bg-secondary/70 border border-border/60 flex items-center justify-center">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </span>
      </button>
    ),
    [displayName]
  );

  return (
    <PageContainer titleNode={titleNode} subtitle="Resumo financeiro inteligente do mês" onLogout={onLogout}>
      <GlassCard className="mb-6 relative oppo-card border-none" delay={0.1}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <p className="text-caption text-muted-foreground uppercase tracking-[0.2em] mb-2 opacity-70">Saldo do mês</p>
        <div className="text-[42px] font-bold text-foreground leading-none tracking-tight oppo-glow-text">
          <AnimatedNumber value={balance} prefix="R$ " />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="px-3 py-1 rounded-full bg-success/10 border border-success/20 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-success" />
            <span className="text-[12px] font-semibold text-success">+{savingsRate}% este mês</span>
          </div>
        </div>
      </GlassCard>

      <div className="mb-8">
        <AiInsightsCard
          lines={insights}
          hint={insightHint}
          isLoading={isLoadingInsights}
          source={insightSource}
          model={insightModel}
          onRefresh={regenerateInsights}
        />
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-headline text-muted-foreground uppercase tracking-widest text-[11px]">Categorias</h3>
          <span className="text-caption text-primary font-medium flex items-center gap-1">Ver tudo <ChevronRight className="w-3 h-3" /></span>
        </div>
        
        <div className="horizontal-scroller hide-scrollbar">
          {/* Receitas Card */}
          <div className="snap-scroller-item w-[280px]">
            <GlassCard 
              onClick={() => navigate('/income')}
              className="h-[180px] flex flex-col justify-between p-6 oppo-card group active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl gradient-income flex items-center justify-center shadow-lg shadow-success/20 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-caption text-muted-foreground mb-1 uppercase tracking-wider">Receitas</p>
                <div className="text-2xl font-bold text-foreground">
                  <AnimatedNumber value={totalIncome} prefix="R$ " />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Despesas Card */}
          <div className="snap-scroller-item w-[280px]">
            <GlassCard 
              onClick={() => navigate('/expenses')}
              className="h-[180px] flex flex-col justify-between p-6 oppo-card group active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl gradient-expense flex items-center justify-center shadow-lg shadow-destructive/20 group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-caption text-muted-foreground mb-1 uppercase tracking-wider">Despesas</p>
                <div className="text-2xl font-bold text-foreground">
                  <AnimatedNumber value={totalExpenses} prefix="R$ " />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Caixinhas Card */}
          <div className="snap-scroller-item w-[280px]">
            <GlassCard 
              onClick={() => navigate('/savings')}
              className="h-[180px] flex flex-col justify-between p-6 oppo-card group active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl gradient-savings flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-caption text-muted-foreground mb-1 uppercase tracking-wider">Caixinhas</p>
                <div className="text-2xl font-bold text-foreground">
                   Poupança ativa
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Análise Card */}
          <div className="snap-scroller-item w-[280px]">
            <GlassCard 
              onClick={() => navigate('/analytics')}
              className="h-[180px] flex flex-col justify-between p-6 oppo-card group active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-caption text-muted-foreground mb-1 uppercase tracking-wider">Análise</p>
                <div className="text-2xl font-bold text-foreground">
                  Insights detalhados
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Other components preserved but styled or rearranged if needed */}
      <div className="space-y-4 mb-8">
        <GlassCard delay={0.28} className="oppo-card">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-[0.14em] mb-1">Agenda</p>
              <p className="text-[20px] font-bold text-foreground">Contas à pagar</p>
            </div>
            <div className="text-right">
              <p className="text-caption text-muted-foreground">Total pendente</p>
              <p className="text-headline font-bold text-expense">{formatCurrency(pendingTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="liquid-glass-sm p-3 flex flex-col items-center text-center bg-secondary/30 border-none">
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mb-1">Atrasadas</p>
              <p className="text-headline font-bold text-expense">{overdueCount}</p>
            </div>
            <div className="liquid-glass-sm p-3 flex flex-col items-center text-center bg-secondary/30 border-none">
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mb-1">Próximas</p>
              <p className="text-headline font-bold text-foreground">{dueInThreeDaysCount}</p>
            </div>
            <div className="liquid-glass-sm p-3 flex flex-col items-center text-center bg-secondary/30 border-none">
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mb-1">Na semana</p>
              <p className="text-headline font-bold text-foreground">{dueInWeekCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            {visibleDueReminders.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-secondary transition-colors">
                  {entry.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{entry.title}</p>
                  <p className={cn(
                    'text-[12px]',
                    entry.daysUntil < 0 ? 'text-expense font-medium' : 'text-muted-foreground'
                  )}>
                    {dueLabel(entry.daysUntil)}
                  </p>
                </div>
                <p className="text-[14px] font-bold text-foreground">{formatCurrency(entry.amount)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.3} className="mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-caption text-muted-foreground uppercase tracking-[0.14em] mb-1">Projeção de saldo</p>
            <p className="text-subhead text-muted-foreground">30, 60 e 90 dias com base no fluxo recorrente</p>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-foreground">{recurringNetLabel}</p>
            <p className={cn('text-subhead font-semibold', recurringMonthlyNet >= 0 ? 'text-income' : 'text-expense')}>
              {formatCurrency(recurringMonthlyNet)}/mês
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {projectedBalances.map((projection) => (
            <div key={`projection-${projection.days}`} className="liquid-glass-sm p-3 flex flex-col items-center text-center">
              <p className="text-caption text-muted-foreground mb-1">{projection.days} dias</p>
              <p
                className={cn(
                  'font-semibold leading-tight text-[15px]',
                  projection.value >= 0 ? 'text-foreground' : 'text-expense'
                )}
              >
                {formatCurrency(projection.value)}
              </p>
            </div>
          ))}
        </div>

        <p className="text-caption text-muted-foreground mt-3">
          Receita fixa: {formatCurrency(recurringIncome)} · Despesas recorrentes: {formatCurrency(recurringExpenses)} ·
          Referência: {getMonthName(currentMonth)} {currentYear}
        </p>
      </GlassCard>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <h2 className="text-title-3 text-foreground text-center mb-6">Movimentações recentes</h2>

        <GlassCard delay={0.4} className="divide-y divide-border/40">
          <div className="max-h-[330px] overflow-y-auto pr-1 scrollbar-hide">
            {isLoadingData && recentTransactions.length === 0 && (
              <p className="text-subhead text-muted-foreground py-3">Carregando movimentações...</p>
            )}

            {!isLoadingData && recentTransactions.length === 0 && (
              <p className="text-subhead text-muted-foreground py-3">Sem movimentações no período.</p>
            )}

            {recentTransactions.map((entry, index) => (
              <TransactionItem
                key={entry.id}
                icon={entry.icon}
                title={entry.title}
                subtitle={entry.subtitle}
                amount={entry.amount}
                type={entry.type}
                delay={0.45 + index * 0.04}
              />
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {error && <p className="text-caption text-destructive mt-4">{error}</p>}

      {editorOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-foreground/24 backdrop-blur-sm"
          onClick={() => setEditorOpen(false)}
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-sm w-[calc(100%-2rem)] mx-auto mt-24"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-title-3 text-foreground">Seu nome no app</h3>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary/75 border border-border/60 flex items-center justify-center tap-highlight-none"
                  aria-label="Fechar editor de nome"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Digite seu nome"
                className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />

              <p className="text-caption text-muted-foreground mt-2">
                {isMobileContext()
                  ? 'Autosave mobile ativo enquanto você digita.'
                  : 'Você pode alterar este nome quando quiser.'}
              </p>

              <button
                type="button"
                onClick={handlePersistName}
								disabled={isSavingName}
                className="w-full mt-4 py-3 rounded-2xl text-headline gradient-savings text-savings-foreground tap-highlight-none active:scale-[0.98] transition-opacity disabled:opacity-60"
              >
                {isSavingName ? 'Salvando...' : 'Salvar nome'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
