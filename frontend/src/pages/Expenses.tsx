import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import GlassCard from '@/components/GlassCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import TransactionItem from '@/components/TransactionItem';
import ExpenseSheet from '@/components/ExpenseSheet';
import { getCategoryLabel, parseExpenseDescription } from '@/lib/expenseMeta';
import { formatCurrency, formatDate, toISODate } from '@/lib/format';
import { getExpenseIcon } from '@/lib/transactionIcons';
import { useFinanceStore } from '@/store/financeStore';
import type { Despesa } from '@/types/finance';

interface ExpensesProps {
  onLogout: () => void;
}

interface ExpenseEntry extends Despesa {
  title: string;
  categoryLabel: string;
  valor_exibicao: number;
  detalhe: string;
  tipo_exibicao: string;
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Expenses = ({ onLogout }: ExpensesProps) => {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const despesasFixas = useFinanceStore((state) => state.despesasFixas);
  const despesasAvulsas = useFinanceStore((state) => state.despesasAvulsas);
  const despesasParceladas = useFinanceStore((state) => state.despesasParceladas);
  const addDespesa = useFinanceStore((state) => state.addDespesa);
  const editDespesa = useFinanceStore((state) => state.editDespesa);
  const removeDespesa = useFinanceStore((state) => state.removeDespesa);
  const isMutating = useFinanceStore((state) => state.isMutating);
  const error = useFinanceStore((state) => state.error);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);

  const allExpenses = useMemo<ExpenseEntry[]>(
    () =>
      [
        ...despesasFixas.map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          return {
            ...item,
            title: parsed.description,
            categoryLabel: getCategoryLabel(parsed.category, currentMonth),
            tipo_exibicao: 'Fixa',
            valor_exibicao: Number(item.valor_parcela || 0),
            detalhe: '',
          };
        }),
        ...despesasAvulsas.map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          return {
            ...item,
            title: parsed.description,
            categoryLabel: getCategoryLabel(parsed.category, currentMonth),
            tipo_exibicao: 'Variável',
            valor_exibicao: Number(item.valor_parcela || 0),
            detalhe: '',
          };
        }),
        ...despesasParceladas.map((item) => {
          const parsed = parseExpenseDescription(item.descricao, item.tipo);
          return {
            ...item,
            title: parsed.description,
            categoryLabel: getCategoryLabel(parsed.category, currentMonth),
            tipo_exibicao: 'Parcelada',
            valor_exibicao: Number(item.valor_parcela_mes ?? item.valor_parcela),
            detalhe: `Parcela ${item.parcela_atual || 1}/${item.parcelas_total || 1}`,
          };
        }),
      ].sort(
        (a, b) =>
          new Date(`${b.data_inicio}T00:00:00`).getTime() -
          new Date(`${a.data_inicio}T00:00:00`).getTime()
      ),
    [currentMonth, despesasFixas, despesasAvulsas, despesasParceladas]
  );

  const total = allExpenses.reduce((sum, entry) => sum + Number(entry.valor_exibicao || 0), 0);
  const paidExpenses = allExpenses.filter((entry) => entry.paga);
  const unpaidExpenses = allExpenses.filter((entry) => !entry.paga);
  const paidCount = paidExpenses.length;

  const handleTogglePaid = async (entry: ExpenseEntry) => {
    const nextPaid = !entry.paga;
    await editDespesa(entry.id, {
      descricao: entry.descricao,
      valor_parcela: Number(entry.valor_parcela || 0),
      tipo: entry.tipo,
      data_inicio: entry.data_inicio,
      paga: nextPaid,
      data_pagamento: nextPaid ? getTodayISODate() : null,
      parcelas_total: entry.parcelas_total || 1,
      valor_primeira_parcela: entry.valor_primeira_parcela ?? undefined,
      mes_referencia: currentMonth,
      ano_referencia: currentYear,
    });
  };

  const handleDeleteEditing = async () => {
    if (!editing) return;
    await removeDespesa(editing.id);
    setEditing(null);
  };

  const handleSave = async (payload: {
    descricao: string;
    valor_parcela: number;
    tipo: 'fixa' | 'avulsa' | 'parcelada';
    data_inicio: string;
    paga?: boolean;
    data_pagamento?: string | null;
    parcelas_total?: number;
    valor_primeira_parcela?: number;
  }) => {
    const fullPayload = {
      ...payload,
      mes_referencia: currentMonth,
      ano_referencia: currentYear,
    };

    if (editing) {
      await editDespesa(editing.id, fullPayload);
      setEditing(null);
      return;
    }

    await addDespesa(fullPayload);
  };

  return (
    <PageContainer title="Despesas" subtitle="Para onde vai seu dinheiro" onLogout={onLogout} centerHeading>
      <GlassCard delay={0.1} className="mb-6 text-center oppo-card glass-refractive py-8">
        <p className="text-caption text-muted-foreground uppercase tracking-[0.2em] mb-2">Total do mês</p>
        <div className="text-large-title text-expense oppo-glow-text">
          <AnimatedNumber value={total} prefix="R$ " />
        </div>
        <p className="text-caption text-muted-foreground mt-2 opacity-80">
          {allExpenses.length} {allExpenses.length === 1 ? 'lançamento' : 'lançamentos'}
          {' · '}
          {paidCount} {paidCount === 1 ? 'pago' : 'pagos'}
        </p>
      </GlassCard>

      <GlassCard delay={0.2} className="mb-4 oppo-card glass-refractive">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-headline text-foreground">Não pagas</h3>
          <span className="text-caption text-muted-foreground">{unpaidExpenses.length}</span>
        </div>

        <div className="divide-y divide-border/40">
          <AnimatePresence>
            {unpaidExpenses.length === 0 && (
              <p className="text-subhead text-muted-foreground py-3">Nenhuma conta pendente no período.</p>
            )}

            {unpaidExpenses.map((entry, index) => (
              <TransactionItem
                key={`np-${entry.tipo}-${entry.id}-${entry.parcela_atual || 0}`}
                icon={getExpenseIcon(entry.descricao, entry.tipo)}
                title={entry.title}
                subtitle={`${entry.categoryLabel} · ${entry.tipo_exibicao} · ${formatDate(entry.data_inicio)}${entry.detalhe ? ` · ${entry.detalhe}` : ''}`}
                amount={entry.valor_exibicao}
                type="expense"
                delay={0.25 + index * 0.04}
                onAmountClick={() => {
                  setEditing(entry);
                  setSheetOpen(true);
                }}
                isChecked={false}
                onToggleCheck={() => {
                  void handleTogglePaid(entry);
                }}
                checkLabel="Marcar conta como paga"
                isCheckDisabled={isMutating}
              />
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

      <GlassCard delay={0.24} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-headline text-foreground">Pagas</h3>
          <span className="text-caption text-muted-foreground">{paidExpenses.length}</span>
        </div>

        <div className="divide-y divide-border/40">
          <AnimatePresence>
            {paidExpenses.length === 0 && (
              <p className="text-subhead text-muted-foreground py-3">Nenhuma conta marcada como paga.</p>
            )}

            {paidExpenses.map((entry, index) => (
              <TransactionItem
                key={`p-${entry.tipo}-${entry.id}-${entry.parcela_atual || 0}`}
                icon={getExpenseIcon(entry.descricao, entry.tipo)}
                title={entry.title}
                subtitle={`${entry.categoryLabel} · ${entry.tipo_exibicao} · ${formatDate(entry.data_inicio)}${entry.detalhe ? ` · ${entry.detalhe}` : ''}${entry.data_pagamento ? ` · Pago em ${formatDate(entry.data_pagamento)}` : ''}`}
                amount={entry.valor_exibicao}
                type="expense"
                delay={0.26 + index * 0.04}
                onAmountClick={() => {
                  setEditing(entry);
                  setSheetOpen(true);
                }}
                isStriked
                isChecked
                onToggleCheck={() => {
                  void handleTogglePaid(entry);
                }}
                checkLabel="Marcar conta como não paga"
                isCheckDisabled={isMutating}
              />
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

      {despesasParceladas.length > 0 && (
        <GlassCard delay={0.3} className="mt-4">
          <h3 className="text-headline text-foreground mb-3">Parcelamentos ativos</h3>
          <div className="space-y-4">
            {despesasParceladas.map((item) => {
              const parsed = parseExpenseDescription(item.descricao, item.tipo);
              return (
                <div key={`parcelamento-${item.id}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-subhead font-medium text-foreground">{parsed.description}</p>
                    <p className="text-subhead text-expense font-semibold">
                      {formatCurrency(Number(item.valor_parcela_mes ?? item.valor_parcela))}
                    </p>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Parcela {item.parcela_atual || 1} de {item.parcelas_total || 1}
                  </p>
                  {Number.isFinite(Number(item.progresso)) && (
                    <div className="h-1.5 rounded-full bg-secondary/30 overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-expense shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                        style={{ width: `${Math.max(0, Math.min(100, Number(item.progresso)))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {error && <p className="text-caption text-destructive mt-4">{error}</p>}

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
        className="fixed bottom-32 right-6 w-14 h-14 rounded-full gradient-expense flex items-center justify-center shadow-lg shadow-expense/30 tap-highlight-none z-40"
      >
        <Plus className="w-6 h-6 text-expense-foreground" />
      </motion.button>

      <ExpenseSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        initialDate={toISODate(currentMonth, currentYear)}
        referenceMonth={currentMonth}
        editing={editing}
        onSave={handleSave}
        onDelete={editing ? handleDeleteEditing : undefined}
      />

      {isMutating && (
        <p className="fixed bottom-24 left-1/2 -translate-x-1/2 text-caption text-muted-foreground bg-card/80 px-3 py-1.5 rounded-xl border border-border">
          Salvando alterações...
        </p>
      )}
    </PageContainer>
  );
};

export default Expenses;
