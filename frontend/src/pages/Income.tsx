import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import GlassCard from '@/components/GlassCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import TransactionItem from '@/components/TransactionItem';
import IncomeSheet from '@/components/IncomeSheet';
import { formatDate, toISODate } from '@/lib/format';
import { getIncomeIcon } from '@/lib/transactionIcons';
import { useFinanceStore } from '@/store/financeStore';
import type { Receita } from '@/types/finance';

interface IncomeProps {
  onLogout: () => void;
}

const Income = ({ onLogout }: IncomeProps) => {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const receitasFixas = useFinanceStore((state) => state.receitasFixas);
  const receitasVariaveis = useFinanceStore((state) => state.receitasVariaveis);
  const addReceita = useFinanceStore((state) => state.addReceita);
  const editReceita = useFinanceStore((state) => state.editReceita);
  const removeReceita = useFinanceStore((state) => state.removeReceita);
  const isMutating = useFinanceStore((state) => state.isMutating);
  const error = useFinanceStore((state) => state.error);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Receita | null>(null);

  const entries = useMemo(
    () =>
      [...receitasFixas, ...receitasVariaveis]
        .sort(
          (a, b) =>
            new Date(`${b.data_registro}T00:00:00`).getTime() -
            new Date(`${a.data_registro}T00:00:00`).getTime()
        ),
    [receitasFixas, receitasVariaveis]
  );

  const total = entries.reduce((sum, entry) => sum + Number(entry.valor || 0), 0);

  const handleSave = async (payload: {
    descricao: string;
    valor: number;
    tipo: 'fixa' | 'variavel';
    data_registro: string;
  }) => {
    if (editing) {
      await editReceita(editing.id, payload);
      setEditing(null);
      return;
    }

    await addReceita(payload);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja remover esta receita?')) {
      return;
    }

    await removeReceita(id);
  };

  return (
    <PageContainer title="Receitas" subtitle="Entradas de renda do período" onLogout={onLogout}>
      <GlassCard delay={0.1} className="mb-6 text-center oppo-card glass-refractive py-8">
        <p className="text-caption text-muted-foreground uppercase tracking-[0.2em] mb-2">Total do mês</p>
        <div className="text-large-title text-income oppo-glow-text">
          <AnimatedNumber value={total} prefix="R$ " />
        </div>
        <p className="text-caption text-muted-foreground mt-2 opacity-80">{entries.length} lançamentos</p>
      </GlassCard>

      <GlassCard delay={0.2} className="mb-4">
        <div className="divide-y divide-border/40">
          <AnimatePresence>
            {entries.length === 0 && <p className="text-subhead text-muted-foreground py-3">Nenhuma receita cadastrada.</p>}

            {entries.map((entry, index) => (
              <TransactionItem
                key={entry.id}
                icon={getIncomeIcon(entry.descricao)}
                title={entry.descricao}
                subtitle={`${entry.tipo === 'fixa' ? 'Receita fixa' : 'Receita variável'} · ${formatDate(entry.data_registro)}`}
                amount={entry.valor}
                type="income"
                delay={0.22 + index * 0.04}
                onEdit={() => {
                  setEditing(entry);
                  setSheetOpen(true);
                }}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

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
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full gradient-income flex items-center justify-center shadow-lg shadow-income/30 tap-highlight-none z-40"
      >
        <Plus className="w-6 h-6 text-income-foreground" />
      </motion.button>

      <IncomeSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initialDate={toISODate(currentMonth, currentYear)}
        editing={editing}
      />

      {isMutating && (
        <p className="fixed bottom-20 left-1/2 -translate-x-1/2 text-caption text-muted-foreground bg-card/80 px-3 py-1.5 rounded-xl border border-border">
          Salvando alterações...
        </p>
      )}
    </PageContainer>
  );
};

export default Income;
