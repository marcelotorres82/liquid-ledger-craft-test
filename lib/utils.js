export const DateUtils = {
  /**
   * Retorna o período de referência (mês e ano) para fins de controle financeiro.
   * Geralmente aponta para o próximo mês a partir do atual.
   */
  getReferencePeriod() {
    const now = new Date();
    const reference = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      mes: reference.getMonth() + 1,
      ano: reference.getFullYear(),
    };
  },

  /**
   * Formata uma data para o formato ISO (YYYY-MM-DD).
   */
  formatDate(dateValue) {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  },

  /**
   * Faz o parse de uma string de data ISO para um objeto Date.
   */
  parseISODate(dateValue) {
    if (!dateValue) return null;
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  },

  /**
   * Retorna a data de hoje (meia-noite).
   */
  getTodayDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
};

export const NumberUtils = {
  /**
   * Converte um valor para número, retornando 0 se inválido.
   */
  toNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  /**
   * Converte um valor para número positivo, retornando null se inválido.
   */
  toPositiveNumber(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  },

  /**
   * Arredonda um valor para 2 casas decimais.
   */
  roundMoney(value) {
    return Math.round(this.toNumber(value) * 100) / 100;
  }
};
