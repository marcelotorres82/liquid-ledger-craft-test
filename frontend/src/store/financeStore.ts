import { create } from 'zustand';
import {
  createDespesa,
  createReceita,
  deleteDespesa,
  deleteReceita,
  generateInsights,
  getDashboard,
  getDespesas,
  getInsights,
  getReceitas,
  updateDespesa,
  updateReceita,
} from '@/services/api';
import { getReferencePeriod } from '@/lib/format';
import type { DashboardResponse, Despesa, Receita, User } from '@/types/finance';

interface FinanceStore {
  currentMonth: number;
  currentYear: number;
  user: User | null;
  dashboard: DashboardResponse | null;
  receitasFixas: Receita[];
  receitasVariaveis: Receita[];
  despesasFixas: Despesa[];
  despesasAvulsas: Despesa[];
  despesasParceladas: Despesa[];
  insight: string;
  insightHint: string;
  insightSource: string;
  insightModel: string;
  isLoadingData: boolean;
  isLoadingInsights: boolean;
  isMutating: boolean;
  hasInitialized: boolean;
  error: string;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  refreshData: () => Promise<void>;
  changeMonth: (direction: number) => Promise<void>;
  setPeriod: (month: number, year: number) => Promise<void>;
  refreshInsights: () => Promise<void>;
  regenerateInsights: () => Promise<void>;
  addReceita: (payload: {
    descricao: string;
    valor: number;
    tipo: 'fixa' | 'variavel';
    data_registro: string;
  }) => Promise<void>;
  editReceita: (
    id: number,
    payload: {
      descricao: string;
      valor: number;
      tipo: 'fixa' | 'variavel';
      data_registro: string;
    }
  ) => Promise<void>;
  removeReceita: (id: number) => Promise<void>;
  addDespesa: (payload: {
    descricao: string;
    valor_parcela: number;
    tipo: 'fixa' | 'avulsa' | 'parcelada';
    data_inicio: string;
    paga?: boolean;
    data_pagamento?: string | null;
    parcelas_total?: number;
    valor_primeira_parcela?: number;
    mes_referencia?: number;
    ano_referencia?: number;
  }) => Promise<void>;
  editDespesa: (
    id: number,
    payload: {
      descricao: string;
      valor_parcela: number;
      tipo: 'fixa' | 'avulsa' | 'parcelada';
      data_inicio: string;
      paga?: boolean;
      data_pagamento?: string | null;
      parcelas_total?: number;
      valor_primeira_parcela?: number;
      mes_referencia?: number;
      ano_referencia?: number;
    }
  ) => Promise<void>;
  removeDespesa: (id: number) => Promise<void>;
}

const referencePeriod = getReferencePeriod();

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Erro inesperado ao carregar dados';
}

async function loadCoreData(month: number, year: number) {
  const [dashboard, receitas, despesas] = await Promise.all([
    getDashboard(month, year),
    getReceitas(month, year),
    getDespesas(month, year),
  ]);

  return {
    dashboard,
    receitasFixas: receitas.receitas_fixas,
    receitasVariaveis: receitas.receitas_variaveis,
    despesasFixas: despesas.despesas_fixas,
    despesasAvulsas: despesas.despesas_avulsas,
    despesasParceladas: despesas.despesas_parceladas,
  };
}

async function loadInsight(month: number, year: number) {
  const data = await getInsights(month, year);

  if (data.success && data.insight) {
    return {
      insight: data.insight,
      insightHint: data.warning || data.message || '',
      insightSource: data.source || '',
      insightModel: data.model || '',
    };
  }

  return {
    insight: '',
    insightHint: data.message || 'Clique em Atualizar para gerar os insights.',
    insightSource: data.source || '',
    insightModel: data.model || '',
  };
}

function shiftMonth(month: number, year: number, direction: number) {
  let nextMonth = month + direction;
  let nextYear = year;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  } else if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  }

  return { month: nextMonth, year: nextYear };
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  currentMonth: referencePeriod.month,
  currentYear: referencePeriod.year,
  user: null,
  dashboard: null,
  receitasFixas: [],
  receitasVariaveis: [],
  despesasFixas: [],
  despesasAvulsas: [],
  despesasParceladas: [],
  insight: '',
  insightHint: '',
  insightSource: '',
  insightModel: '',
  isLoadingData: false,
  isLoadingInsights: false,
  isMutating: false,
  hasInitialized: false,
  error: '',

  setUser: (user) => set({ user }),

  initialize: async () => {
    const { hasInitialized, isLoadingData } = get();
    if (hasInitialized || isLoadingData) {
      return;
    }

    await get().refreshData();
    await get().refreshInsights();
    set({ hasInitialized: true });
  },

  refreshData: async () => {
    const { currentMonth, currentYear } = get();

    set({ isLoadingData: true, error: '' });

    try {
      const data = await loadCoreData(currentMonth, currentYear);
      set({
        ...data,
        error: '',
      });
    } catch (error) {
      set({ error: extractErrorMessage(error) });
    } finally {
      set({ isLoadingData: false });
    }
  },

  changeMonth: async (direction) => {
    const { currentMonth, currentYear } = get();
    const nextPeriod = shiftMonth(currentMonth, currentYear, direction);

    set({ currentMonth: nextPeriod.month, currentYear: nextPeriod.year });
    await get().refreshData();
    await get().refreshInsights();
  },

  setPeriod: async (month, year) => {
    const normalizedMonth = Math.min(12, Math.max(1, Number.parseInt(String(month), 10) || 1));
    const normalizedYear = Number.parseInt(String(year), 10) || get().currentYear;

    set({ currentMonth: normalizedMonth, currentYear: normalizedYear });
    await get().refreshData();
    await get().refreshInsights();
  },

  refreshInsights: async () => {
    const { currentMonth, currentYear } = get();

    set({ isLoadingInsights: true });

    try {
      const insightData = await loadInsight(currentMonth, currentYear);
      set(insightData);
    } catch (error) {
      set({
        insight: '',
        insightHint: extractErrorMessage(error),
        insightSource: '',
        insightModel: '',
      });
    } finally {
      set({ isLoadingInsights: false });
    }
  },

  regenerateInsights: async () => {
    const { currentMonth, currentYear } = get();

    set({ isLoadingInsights: true });

    try {
      const data = await generateInsights(currentMonth, currentYear);
      set({
        insight: data.insight || '',
        insightHint: data.warning || data.message || '',
        insightSource: data.source || '',
        insightModel: data.model || '',
      });
    } catch (error) {
      set({
        insight: '',
        insightHint: extractErrorMessage(error),
        insightSource: '',
        insightModel: '',
      });
    } finally {
      set({ isLoadingInsights: false });
    }
  },

  addReceita: async (payload) => {
    set({ isMutating: true, error: '' });

    try {
      await createReceita(payload);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  editReceita: async (id, payload) => {
    set({ isMutating: true, error: '' });

    try {
      await updateReceita(id, payload);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  removeReceita: async (id) => {
    set({ isMutating: true, error: '' });

    try {
      await deleteReceita(id);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  addDespesa: async (payload) => {
    set({ isMutating: true, error: '' });

    try {
      await createDespesa(payload);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  editDespesa: async (id, payload) => {
    set({ isMutating: true, error: '' });

    try {
      await updateDespesa(id, payload);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  removeDespesa: async (id) => {
    set({ isMutating: true, error: '' });

    try {
      await deleteDespesa(id);
      await get().refreshData();
    } catch (error) {
      set({ error: extractErrorMessage(error) });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },
}));
