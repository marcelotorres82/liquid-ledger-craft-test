export function formatCurrency(value: number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return formatCurrency(0);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue);
}

export function formatDate(value: string): string {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }

  return date.toLocaleDateString('pt-BR');
}

export function getMonthName(month: number): string {
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return monthNames[Math.min(11, Math.max(0, month - 1))];
}

export function getShortMonthName(month: number): string {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return monthNames[Math.min(11, Math.max(0, month - 1))];
}

export function getReferencePeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function toISODate(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
