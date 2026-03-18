import { describe, it, expect } from 'vitest';
import {
  parseExpenseDescription,
  encodeExpenseDescription,
  stripExpenseCategoryPrefix,
  getCategoryLabel,
} from './expenseMeta';

describe('expenseMeta utility', () => {
  describe('stripExpenseCategoryPrefix', () => {
    it('removes the category prefix from a description', () => {
      expect(stripExpenseCategoryPrefix('[cat:alimentacao] Supermercado')).toBe('Supermercado');
      expect(stripExpenseCategoryPrefix('[cat:contas_fixas]    Luz ')).toBe('Luz');
    });

    it('returns the same string if no prefix is present', () => {
      expect(stripExpenseCategoryPrefix('Supermercado')).toBe('Supermercado');
    });
  });

  describe('parseExpenseDescription', () => {
    it('parses explicit category correctly', () => {
      const result = parseExpenseDescription('[cat:alimentacao] Jantar');
      expect(result.description).toBe('Jantar');
      expect(result.category).toBe('alimentacao');
    });

    it('falls back to default category based on type if no prefix', () => {
      const resultFixa = parseExpenseDescription('Internet', 'fixa');
      expect(resultFixa.description).toBe('Internet');
      expect(resultFixa.category).toBe('contas_fixas');

      const resultParcelada = parseExpenseDescription('Geladeira', 'parcelada');
      expect(resultParcelada.description).toBe('Geladeira');
      expect(resultParcelada.category).toBe('compras');
    });
  });

  describe('encodeExpenseDescription', () => {
    it('adds the category prefix properly', () => {
      expect(encodeExpenseDescription('Aluguel', 'contas_fixas')).toBe('[cat:contas_fixas] Aluguel');
    });

    it('replaces existing prefix with the new one', () => {
      expect(encodeExpenseDescription('[cat:lazer] Cinema', 'entretenimento')).toBe('[cat:entretenimento] Cinema');
    });
  });

  describe('getCategoryLabel', () => {
    it('returns standard label for predefined category', () => {
      expect(getCategoryLabel('alimentacao')).toBe('Alimentação');
    });

    it('formats "compras do mês" correctly if month is provided', () => {
      expect(getCategoryLabel('compras', 3)).toBe('Compras do mês 03');
    });

    it('returns the key itself if category is unknown', () => {
      expect(getCategoryLabel('outros')).toBe('outros');
    });
  });
});
