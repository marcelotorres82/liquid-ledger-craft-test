import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, getMonthName, getShortMonthName, toISODate } from './format';

describe('format utility', () => {
  describe('formatCurrency', () => {
    it('formats a valid positive number to BRL currency', () => {
      const result = formatCurrency(1234.56);
      // The exact string representation might vary slightly by environment, 
      // but it should contain the numbers and a comma.
      expect(result).toContain('R$');
      expect(result).toContain('1.234,56');
    });

    it('formats zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toContain('R$');
      expect(result).toContain('0,00');
    });

    it('handles negative numbers', () => {
      const result = formatCurrency(-50.25);
      expect(result).toContain('R$');
      expect(result).toContain('-50,25'); // or '-\xa0R$\xa050,25'
    });
  });

  describe('formatDate', () => {
    it('formats YYYY-MM-DD correctly', () => {
      const result = formatDate('2026-03-15');
      expect(result).toBe('15/03/2026');
    });

    it('handles invalid dates gracefully', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Data inválida');
    });
  });

  describe('getMonthName', () => {
    it('returns the correct month name', () => {
      expect(getMonthName(1)).toBe('Janeiro');
      expect(getMonthName(12)).toBe('Dezembro');
    });

    it('clamps values correctly', () => {
      expect(getMonthName(0)).toBe('Janeiro');
      expect(getMonthName(13)).toBe('Dezembro');
    });
  });

  describe('getShortMonthName', () => {
    it('returns the correct short month', () => {
      expect(getShortMonthName(3)).toBe('Mar');
      expect(getShortMonthName(8)).toBe('Ago');
    });
  });

  describe('toISODate', () => {
    it('converts month/year to ISO start of month', () => {
      expect(toISODate(3, 2026)).toBe('2026-03-01');
      expect(toISODate(12, 2025)).toBe('2025-12-01');
    });
  });
});
