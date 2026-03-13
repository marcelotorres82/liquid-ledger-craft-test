import type { DespesaTipo } from '@/types/finance';

export interface ExpenseCategoryMeta {
  key: string;
  label: string;
  color: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { key: 'contas_fixas', label: 'Contas fixas', color: '#3B82F6', icon: '🏠' },
  { key: 'contas_variaveis', label: 'Contas variáveis', color: '#8B5CF6', icon: '📄' },
  { key: 'alimentacao', label: 'Alimentação', color: '#F59E0B', icon: '🍽️' },
  { key: 'compras', label: 'Compras', color: '#EC4899', icon: '🛍️' },
  { key: 'entretenimento', label: 'Entretenimento', color: '#14B8A6', icon: '🎬' },
];

const CATEGORY_PREFIX_REGEX = /^\[cat:([^\]]+)\]\s*/i;

function normalizeCategoria(raw?: string | null): string | null {
  if (!raw) return null;
  return String(raw).trim();
}

function fallbackCategoryByTipo(tipo: DespesaTipo): string {
  if (tipo === 'fixa') return 'contas_fixas';
  if (tipo === 'parcelada') return 'compras';
  return 'contas_variaveis';
}

export function stripExpenseCategoryPrefix(rawDescription: string): string {
  return String(rawDescription || '').replace(CATEGORY_PREFIX_REGEX, '').trim();
}

export function parseExpenseDescription(
  rawDescription: string,
  tipoFallback: DespesaTipo = 'avulsa'
): { description: string; category: string } {
  const text = String(rawDescription || '').trim();
  const matched = text.match(CATEGORY_PREFIX_REGEX);
  const explicitCategory = normalizeCategoria(matched?.[1]);
  const description = stripExpenseCategoryPrefix(text);

  return {
    description: description || 'Sem descrição',
    category: explicitCategory || fallbackCategoryByTipo(tipoFallback),
  };
}

export function encodeExpenseDescription(description: string, category: string): string {
  const cleanDescription = stripExpenseCategoryPrefix(description);
  return `[cat:${category}] ${cleanDescription}`.trim();
}

function generateColorFromText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
}

export function getExpenseCategoryMeta(categoryKey: string): ExpenseCategoryMeta {
  const standard = EXPENSE_CATEGORIES.find((item) => item.key === categoryKey);
  if (standard) {
    return standard;
  }

  return {
    key: categoryKey,
    label: categoryKey,
    color: generateColorFromText(categoryKey),
    icon: '✨', 
  };
}

export function getComprasMesLabel(month: number): string {
  const mesStr = String(month).padStart(2, '0');
  return `Compras do mês ${mesStr}`;
}

export function getCategoryLabel(categoryKey: string, month?: number): string {
  if (categoryKey === 'compras' && month != null) {
    return getComprasMesLabel(month);
  }
  return getExpenseCategoryMeta(categoryKey).label;
}
