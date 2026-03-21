import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import GlassCard from '@/components/GlassCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import TransactionItem from '@/components/TransactionItem';
import AiInsightsCard from '@/components/AiInsightsCard';
import { parseExpenseDescription } from '@/lib/expenseMeta';
import { useFinanceStore } from '@/store/financeStore';
import { formatCurrency, formatDate, getMonthName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getExpenseIcon, getIncomeIcon } from '@/lib/transactionIcons';
import { sparkleTransition } from '@/lib/motion';

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

  const handlePersistName = () => {
    const nextName = nameDraft.trim() || fallbackName;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(userScopedKey, nextName);
      window.localStorage.setItem(userScopedOnboardKey, '1');
    }

    setDisplayName(nextName);
    setNameDraft(nextName);
    setEditorOpen(false);
  };

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
      <GlassCard className="mb-4 overflow-hidden relative glass-neutral" delay={0.1}>
        <p className="text-caption text-muted-foreground uppercase tracking-[0.14em] mb-1">Saldo do mês</p>
        <div className="text-large-title text-foreground leading-tight">
          <AnimatedNumber value={balance} prefix="R$ " />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <GlassCard delay={0.15} className="glass-neutral">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl gradient-income flex items-center justify-center shadow-sm shadow-income/30">
              <ArrowUpRight className="w-4 h-4 text-income-foreground" />
            </div>
            <span className="text-caption text-muted-foreground">Receitas</span>
          </div>
          <div className="text-title-3 text-foreground">
            <AnimatedNumber value={totalIncome} prefix="R$ " />
          </div>
        </GlassCard>

        <GlassCard delay={0.2} className="glass-neutral">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl gradient-expense flex items-center justify-center shadow-sm shadow-expense/30">
              <ArrowDownRight className="w-4 h-4 text-expense-foreground" />
            </div>
            <span className="text-caption text-muted-foreground">A pagar</span>
          </div>
          <div className="text-title-3 text-foreground">
            <AnimatedNumber value={dashboard?.despesas.contas_a_pagar ?? totalExpenses} prefix="R$ " />
          </div>
          {(dashboard?.despesas.pagas ?? 0) > 0 && (
            <p className="text-caption text-muted-foreground mt-0.5">
              Pago: {formatCurrency(dashboard?.despesas.pagas ?? 0)}
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard delay={0.25} className="mb-4 glass-neutral">
        <div className="flex min-w-0 items-start gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-accent flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-subhead font-semibold text-foreground">
              {savingsRate >= 0 ? `Você poupou ${savingsRate}% da renda` : `Déficit de ${Math.abs(savingsRate)}% da renda`}
            </p>
            <p className="text-caption text-muted-foreground mt-0.5">
              {savingsRate >= 30
                ? 'Ótimo desempenho. Mantenha o ritmo.'
                : 'Se possível, reduza gastos variáveis para aumentar a sobra.'}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.28} className="mb-4 glass-neutral">
        <div className="flex min-w-0 items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground uppercase tracking-[0.14em] mb-1">Agenda de vencimentos</p>
            <p className="text-headline text-foreground">Lembretes de contas</p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-caption text-muted-foreground">Pendente</p>
            <p className="text-subhead font-semibold text-expense">{formatCurrency(pendingTotal)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-secondary/50 border border-border/60 p-2">
            <p className="text-caption text-muted-foreground">Atrasadas</p>
            <p className="text-headline text-expense">{overdueCount}</p>
          </div>
          <div className="rounded-xl bg-secondary/50 border border-border/60 p-2">
            <p className="text-caption text-muted-foreground">Até 3 dias</p>
            <p className="text-headline text-foreground">{dueInThreeDaysCount}</p>
          </div>
          <div className="rounded-xl bg-secondary/50 border border-border/60 p-2">
            <p className="text-caption text-muted-foreground">Até 7 dias</p>
            <p className="text-headline text-foreground">{dueInWeekCount}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {visibleDueReminders.length === 0 && (
            <p className="text-subhead text-muted-foreground">
              Nenhuma conta pendente para lembrete neste período.
            </p>
          )}

          {visibleDueReminders.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-secondary/85 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
                {entry.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-subhead font-medium text-foreground truncate">{entry.title}</p>
                <p
                  className={cn(
                    'text-caption',
                    entry.daysUntil < 0 ? 'text-expense' : entry.daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'
                  )}
                >
                  {dueLabel(entry.daysUntil)} · {formatDate(entry.dueDateISO)}
                </p>
              </div>
              <p className="text-caption font-semibold text-expense whitespace-nowrap">{formatCurrency(entry.amount)}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.3} className="mb-4 glass-neutral">
        <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground uppercase tracking-[0.14em] mb-1">Projeção de saldo</p>
            <p className="text-subhead text-muted-foreground">30, 60 e 90 dias com base no fluxo recorrente</p>
          </div>
          <div className="min-w-0 max-w-full sm:max-w-[42%] sm:text-right">
            <p className="text-caption text-muted-foreground break-words">{recurringNetLabel}</p>
            <p
              className={cn(
                'text-subhead font-semibold break-words',
                recurringMonthlyNet >= 0 ? 'text-income' : 'text-expense'
              )}
            >
              {formatCurrency(recurringMonthlyNet)}/mês
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {projectedBalances.map((projection) => (
            <div key={`projection-${projection.days}`} className="rounded-xl bg-secondary/50 border border-border/60 p-2">
              <p className="text-caption text-muted-foreground">{projection.days} dias</p>
              <p
                className={cn(
                  'font-semibold leading-tight break-words text-[clamp(0.8rem,3.4vw,0.95rem)]',
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

      <AiInsightsCard
        lines={insights}
        hint={insightHint}
        isLoading={isLoadingInsights}
        source={insightSource}
        model={insightModel}
        onRefresh={regenerateInsights}
        className="w-full"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sparkleTransition, delay: 0.35 }}>
        <h2 className="text-title-3 text-foreground text-center mb-3">Movimentações recentes</h2>

        <GlassCard delay={0.4} className="divide-y divide-border glass-neutral w-full">
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
          transition={sparkleTransition}
          className="fixed inset-0 z-[70] bg-foreground/24 backdrop-blur-sm"
          onClick={() => setEditorOpen(false)}
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={sparkleTransition}
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
                className="w-full mt-4 py-3 rounded-2xl text-headline gradient-savings text-savings-foreground tap-highlight-none active:scale-[0.98]"
              >
                Salvar nome
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
