import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X, Plus } from 'lucide-react';
import type { Despesa } from '@/types/finance';
import {
  encodeExpenseDescription,
  EXPENSE_CATEGORIES,
  getComprasMesLabel,
  parseExpenseDescription,
  getExpenseCategoryMeta,
  getCategoryLabel,
  type ExpenseCategoryMeta,
} from '@/lib/expenseMeta';
import { cn } from '@/lib/utils';
import { setSheetOpenState } from '@/lib/sheetState';

interface ExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  initialDate: string;
  referenceMonth: number;
  editing: Despesa | null;
  onSave: (payload: {
    descricao: string;
    valor_parcela: number;
    tipo: 'fixa' | 'avulsa' | 'parcelada';
    data_inicio: string;
    paga?: boolean;
    data_pagamento?: string | null;
    parcelas_total?: number;
    valor_primeira_parcela?: number;
  }) => Promise<void>;
  onDelete?: () => Promise<void> | void;
}

const EXPENSE_DRAFT_KEY = 'app-financeiro-expense-draft-v1';

function isMobileContext() {
  if (typeof window === 'undefined') return false;
  const byViewport = window.matchMedia('(max-width: 900px)').matches;
  const byAgent = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  return byViewport || byAgent;
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ExpenseSheet = ({ open, onClose, onSave, initialDate, referenceMonth, editing, onDelete }: ExpenseSheetProps) => {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>('contas_fixas');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [valorParcela, setValorParcela] = useState('');
  const [tipo, setTipo] = useState<'fixa' | 'avulsa' | 'parcelada'>('fixa');
  const [dataInicio, setDataInicio] = useState(initialDate);
  const [mesInicio, setMesInicio] = useState<number>(referenceMonth);
  const [anoInicio, setAnoInicio] = useState<number>(new Date().getFullYear());
  const [mesFim, setMesFim] = useState<number | null>(null);
  const [anoFim, setAnoFim] = useState<number | null>(null);
  const [temDataFim, setTemDataFim] = useState(false);
  const [paga, setPaga] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [parcelasTotal, setParcelasTotal] = useState('12');
  const [valorPrimeiraParcela, setValorPrimeiraParcela] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allCategoriesKeys = React.useMemo(() => {
    const defaultKeys = EXPENSE_CATEGORIES.map(c => c.key);
    return [...new Set([...defaultKeys, ...customCategories, categoria])];
  }, [customCategories, categoria]);

  const handleAddCategory = () => {
    const label = window.prompt('Nome da nova categoria:');
    if (label && label.trim()) {
      setCustomCategories(prev => [...prev, label.trim()]);
      setCategoria(label.trim());
    }
  };

  useEffect(() => {
    if (!open) return;

    if (editing) {
      const parsed = parseExpenseDescription(editing.descricao, editing.tipo);
      setDescricao(parsed.description);
      setCategoria(parsed.category);
      setTipo(editing.tipo);
      setDataInicio(editing.data_inicio);
      setPaga(Boolean(editing.paga));
      setDataPagamento(editing.data_pagamento || '');

      const valorRegular = Number(
        editing.valor_parcela_regular ?? editing.valor_parcela_mes ?? editing.valor_parcela ?? 0
      );
      setValorParcela(String(valorRegular));
      setParcelasTotal(String(editing.parcelas_total || 1));

      if (editing.valor_primeira_parcela != null) {
        setValorPrimeiraParcela(String(editing.valor_primeira_parcela));
      } else {
        setValorPrimeiraParcela('');
      }

      setError('');
      return;
    }

    if (isMobileContext() && typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(EXPENSE_DRAFT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<{
            descricao: string;
            categoria: string;
            valorParcela: string;
            tipo: 'fixa' | 'avulsa' | 'parcelada';
            dataInicio: string;
            paga: boolean;
            dataPagamento: string;
            parcelasTotal: string;
            valorPrimeiraParcela: string;
            customCats: string[];
          }>;

          if (parsed.customCats) {
             setCustomCategories(parsed.customCats);
          }
          setDescricao(parsed.descricao || '');
          setCategoria(parsed.categoria || 'contas_fixas');
          setValorParcela(parsed.valorParcela || '');
          setTipo(
            parsed.tipo === 'parcelada' || parsed.tipo === 'avulsa' ? parsed.tipo : 'fixa'
          );
          setDataInicio(parsed.dataInicio || initialDate);
          setPaga(Boolean(parsed.paga));
          setDataPagamento(parsed.dataPagamento || '');
          setParcelasTotal(parsed.parcelasTotal || '12');
          setValorPrimeiraParcela(parsed.valorPrimeiraParcela || '');
          setError('');
          return;
        } catch {
          // segue defaults
        }
      }
    }

    setDescricao('');
    setCategoria('contas_fixas');
    setValorParcela('');
    setTipo('fixa');
    setDataInicio(initialDate);
    setPaga(false);
    setDataPagamento('');
    setParcelasTotal('12');
    setValorPrimeiraParcela('');
    setError('');
  }, [open, initialDate, editing]);

  useEffect(() => {
    if (!open || editing || !isMobileContext()) return;
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      EXPENSE_DRAFT_KEY,
      JSON.stringify({
        descricao,
        categoria,
        valorParcela,
        tipo,
        dataInicio,
        paga,
        dataPagamento,
        parcelasTotal,
        valorPrimeiraParcela,
        customCats: customCategories,
      })
    );
  }, [
    open,
    editing,
    descricao,
    categoria,
    valorParcela,
    tipo,
    dataInicio,
    paga,
    dataPagamento,
    parcelasTotal,
    valorPrimeiraParcela,
  ]);

  useEffect(() => {
    if (!open) return;
    setSheetOpenState(true);
    return () => {
      setSheetOpenState(false);
    };
  }, [open]);

  const isParcelada = tipo === 'parcelada';

  useEffect(() => {
    if (tipo !== 'parcelada') return;

    const parsed = Number.parseInt(parcelasTotal, 10);
    if (!Number.isInteger(parsed) || parsed < 2) {
      setParcelasTotal('12');
    }
  }, [tipo, parcelasTotal]);

  const handleSubmit = async () => {
    const parsedValor = Number.parseFloat(valorParcela);
    const parsedParcelas = Number.parseInt(parcelasTotal, 10);
    const parsedPrimeira = Number.parseFloat(valorPrimeiraParcela);

    if (!descricao.trim()) {
      setError('Informe a descrição da despesa.');
      return;
    }

    if (!Number.isFinite(parsedValor) || parsedValor <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    if (!dataInicio) {
      setError('Informe uma data de início.');
      return;
    }

    if (paga && !dataPagamento) {
      setError('Informe a data de pagamento.');
      return;
    }

    if (isParcelada && (!Number.isInteger(parsedParcelas) || parsedParcelas < 2 || parsedParcelas > 60)) {
      setError('Parcelas devem estar entre 2 e 60.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        descricao: encodeExpenseDescription(descricao.trim(), categoria),
        valor_parcela: parsedValor,
        tipo,
        data_inicio: dataInicio,
        paga,
        data_pagamento: paga ? dataPagamento : null,
        parcelas_total: isParcelada ? parsedParcelas : 1,
        valor_primeira_parcela:
          isParcelada && Number.isFinite(parsedPrimeira) && parsedPrimeira > 0
            ? parsedPrimeira
            : undefined,
      });
      if (!editing && typeof window !== 'undefined') {
        window.localStorage.removeItem(EXPENSE_DRAFT_KEY);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar despesa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) {
      return;
    }

    if (!window.confirm('Deseja remover esta despesa?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onDelete();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao remover despesa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div className="glass rounded-t-3xl p-6 pb-10">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-6 gap-2">
                <h2 className="text-title-2 text-foreground">{editing ? 'Editar despesa' : 'Nova despesa'}</h2>
                <div className="flex items-center gap-2">
                  {editing && onDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-9 h-9 rounded-full bg-destructive/12 border border-destructive/30 flex items-center justify-center tap-highlight-none active:scale-95 transition-transform"
                      aria-label="Excluir despesa"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center tap-highlight-none"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Descrição"
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />

                <input
                  value={valorParcela}
                  onChange={(event) => setValorParcela(event.target.value)}
                  placeholder={isParcelada ? 'Valor das demais parcelas (R$)' : 'Valor (R$)'}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />

                <div className="w-full">
                  <p className="text-caption text-muted-foreground mb-2">Categoria</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {allCategoriesKeys.map((catKey) => {
                      const isSelected = categoria === catKey;
                      const label = getCategoryLabel(catKey, referenceMonth);
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setCategoria(catKey)}
                          className={cn(
                            'whitespace-nowrap px-4 py-2 rounded-2xl text-subhead font-medium transition-colors tap-highlight-none snap-start',
                            isSelected 
                              ? 'gradient-expense text-expense-foreground' 
                              : 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                       type="button"
                       onClick={handleAddCategory}
                       className="whitespace-nowrap px-4 py-2 rounded-2xl text-subhead font-medium bg-secondary text-primary border border-primary/30 tap-highlight-none snap-start flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Nova
                    </button>
                  </div>
                </div>

                <select
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value as 'fixa' | 'avulsa' | 'parcelada')}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
                >
                  <option value="fixa">Tipo de cobrança: Fixa</option>
                  <option value="avulsa">Tipo de cobrança: Variável</option>
                  <option value="parcelada">Tipo de cobrança: Parcelada</option>
                </select>

                <input
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                  type="date"
                  className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />

                <div className="glass-subtle rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-subhead font-medium text-foreground">Status do pagamento</p>
                      <p className="text-caption text-muted-foreground">
                        {paga ? 'Conta paga' : 'Conta não paga'}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setPaga((current) => {
                            const next = !current;
                            if (next && !dataPagamento) {
                              setDataPagamento(getTodayISODate());
                            }
                            return next;
                          });
                        }}
                        className={cn(
                          'payment-switch tap-highlight-none',
                          paga ? 'payment-switch-off' : 'payment-switch-on'
                        )}
                        aria-label={paga ? 'Marcar como não paga' : 'Marcar como paga'}
                      >
                        <span className="payment-switch-knob" />
                      </button>
                    </div>
                  </div>
                </div>

                {paga && (
                  <input
                    value={dataPagamento}
                    onChange={(event) => setDataPagamento(event.target.value)}
                    type="date"
                    className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                )}

                {isParcelada && (
                  <>
                    <input
                      value={parcelasTotal}
                      onChange={(event) => setParcelasTotal(event.target.value)}
                      placeholder="Número de parcelas"
                      type="number"
                      min="2"
                      max="60"
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />

                    <input
                      value={valorPrimeiraParcela}
                      onChange={(event) => setValorPrimeiraParcela(event.target.value)}
                      placeholder="Valor da 1ª parcela (opcional)"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-foreground text-subhead placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </>
                )}
              </div>

              {error && <p className="text-caption text-destructive mt-3">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full mt-5 py-3.5 rounded-2xl text-headline text-center transition-all tap-highlight-none active:scale-[0.97] gradient-expense text-expense-foreground shadow-lg shadow-expense/20 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar despesa'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExpenseSheet;
