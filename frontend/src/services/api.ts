import type {
  DashboardResponse,
  DespesasResponse,
  InsightResponse,
  ReceitasResponse,
  User,
} from '@/types/finance';

const API_BASE = '/api';

interface ApiError {
  success?: boolean;
  message?: string;
}

interface RequestOptions {
  allowFailure?: boolean;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requestOptions: RequestOptions = {}
): Promise<T> {
  const { allowFailure = false } = requestOptions;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!response.ok || (!allowFailure && data?.success === false)) {
    const message = (data as ApiError)?.message || `Erro na requisição (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function checkAuth(): Promise<User> {
  const data = await request<{ success: boolean; user: User; message?: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'check' }),
  });

  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await request<{ success: boolean; message?: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'logout' }),
  });
}

export function getDashboard(month: number, year: number): Promise<DashboardResponse> {
  return request<DashboardResponse>(`/dashboard?mes=${month}&ano=${year}`);
}

export function getReceitas(month: number, year: number): Promise<ReceitasResponse> {
  return request<ReceitasResponse>(`/receitas?mes=${month}&ano=${year}`);
}

export function createReceita(payload: {
  descricao: string;
  valor: number;
  tipo: 'fixa' | 'variavel';
  data_registro: string;
}): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>('/receitas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateReceita(
  id: number,
  payload: {
    descricao: string;
    valor: number;
    tipo: 'fixa' | 'variavel';
    data_registro: string;
  }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/receitas?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteReceita(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/receitas?id=${id}`, {
    method: 'DELETE',
  });
}

export function getDespesas(month: number, year: number): Promise<DespesasResponse> {
  return request<DespesasResponse>(`/despesas?mes=${month}&ano=${year}`);
}

export function createDespesa(payload: {
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
}): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>('/despesas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDespesa(
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
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/despesas?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteDespesa(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/despesas?id=${id}`, {
    method: 'DELETE',
  });
}

export function getInsights(month: number, year: number): Promise<InsightResponse> {
  return request<InsightResponse>(`/insights?mes=${month}&ano=${year}`, {}, { allowFailure: true });
}

export function generateInsights(month: number, year: number): Promise<InsightResponse> {
  return request<InsightResponse>('/insights', {
    method: 'POST',
    body: JSON.stringify({ mes: month, ano: year }),
  });
}
