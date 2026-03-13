import prisma from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';

const DISTRIBUTION_RULES = [
  { categoria: 'Casa', percentual: 50 },
  { categoria: 'Carro', percentual: 20 },
  { categoria: 'Reserva', percentual: 15 },
  { categoria: 'Férias', percentual: 10 },
  { categoria: 'Lazer', percentual: 5 },
];

const CAIXINHA_GOALS = {
  casa: { meta: 45000, plus: 50000 },
  carro: { meta: 15000, plus: 20000 },
  reserva: { meta: 10000, plus: null },
  ferias: { meta: 8000, plus: 10000 },
  lazer: { meta: null, plus: null },
};

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizeCategoryName(categoria) {
  const text = String(categoria || '').toLowerCase();
  if (text.includes('casa')) return 'casa';
  if (text.includes('carro')) return 'carro';
  if (text.includes('reserva') || text.includes('despesa')) return 'reserva';
  if (text.includes('férias') || text.includes('ferias')) return 'ferias';
  if (text.includes('lazer')) return 'lazer';
  return 'default';
}

function resolvePlusTarget(meta, plus) {
  const numericMeta = toNumber(meta);
  const numericPlus = toNumber(plus);

  if (numericMeta <= 0 || numericPlus <= 0) {
    return null;
  }

  return numericPlus > numericMeta ? numericPlus : numericMeta + numericPlus;
}

function getMonthYearKey(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

function getMonthKeyFromDate(dateValue) {
  const date = new Date(dateValue);
  return getMonthYearKey(date.getFullYear(), date.getMonth() + 1);
}

function getValorParcelaMes(despesa, parcelaAtual) {
  const valorRegular = toNumber(despesa.valorParcela);
  const valorPrimeira =
    despesa.valorPrimeiraParcela == null ? null : toNumber(despesa.valorPrimeiraParcela);

  if (parcelaAtual === 1 && valorPrimeira != null && valorPrimeira > 0) {
    return valorPrimeira;
  }

  return valorRegular;
}

function evaluateInstallmentForMonth(despesa, mes, ano) {
  const dataInicio = new Date(despesa.dataInicio);
  const mesInicio = dataInicio.getMonth() + 1;
  const anoInicio = dataInicio.getFullYear();
  const parcelasTotal = Number(despesa.parcelasTotal) || 1;
  const mesesDecorridos = (ano - anoInicio) * 12 + (mes - mesInicio);

  if (mesesDecorridos < 0 || mesesDecorridos >= parcelasTotal) {
    return null;
  }

  const parcelaAtual = mesesDecorridos + 1;
  return {
    parcelaAtual,
    parcelasTotal,
    valorParcelaMes: getValorParcelaMes(despesa, parcelaAtual),
  };
}

function getCycleStart(mes, ano) {
  if (mes >= 3) {
    return { mes: 3, ano };
  }
  return { mes: 3, ano: ano - 1 };
}

function listMonthsInRange(startMes, startAno, endMes, endAno) {
  const months = [];
  let mesCursor = startMes;
  let anoCursor = startAno;

  while (anoCursor < endAno || (anoCursor === endAno && mesCursor <= endMes)) {
    months.push({
      mes: mesCursor,
      ano: anoCursor,
      key: getMonthYearKey(anoCursor, mesCursor),
    });

    mesCursor += 1;
    if (mesCursor > 12) {
      mesCursor = 1;
      anoCursor += 1;
    }
  }

  return months;
}

function mapTotalsByMonth(rows, dateField, valueField) {
  const totals = new Map();

  rows.forEach((row) => {
    const key = getMonthKeyFromDate(row[dateField]);
    const current = totals.get(key) || 0;
    totals.set(key, current + toNumber(row[valueField]));
  });

  return totals;
}

function calculateDistribution(saldoDistribuivel) {
  const saldoCentavos = Math.round(Math.max(0, saldoDistribuivel) * 100);
  let alocadoCentavos = 0;

  return DISTRIBUTION_RULES.map((regra, index) => {
    let valorCentavos;

    if (index === DISTRIBUTION_RULES.length - 1) {
      valorCentavos = Math.max(0, saldoCentavos - alocadoCentavos);
    } else {
      valorCentavos = Math.floor((saldoCentavos * regra.percentual) / 100);
      alocadoCentavos += valorCentavos;
    }

    return {
      categoria: regra.categoria,
      percentual: regra.percentual,
      valor: valorCentavos / 100,
    };
  });
}

function getReferencePeriod() {
  const now = new Date();
  const reference = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    mes: reference.getMonth() + 1,
    ano: reference.getFullYear(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const userId = await verifyToken(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }

  const reference = getReferencePeriod();
  const mes = parseInt(req.query.mes, 10) || reference.mes;
  const ano = parseInt(req.query.ano, 10) || reference.ano;

  try {
    const inicioMes = new Date(ano, mes - 1, 1);
    const inicioMesSeguinte = new Date(ano, mes, 1);
    const ciclo = getCycleStart(mes, ano);
    const inicioCiclo = new Date(ciclo.ano, ciclo.mes - 1, 1);
    const mesesNoCiclo = listMonthsInRange(ciclo.mes, ciclo.ano, mes, ano);

    const [
      receitasFixas,
      receitasVariaveis,
      despesasFixas,
      despesasAvulsas,
      parceladas,
      receitasVariaveisCiclo,
      despesasAvulsasCiclo,
      despesasFixasIndividuais,
      despesasAvulsasIndividuais,
    ] = await Promise.all([
      prisma.receita.aggregate({
        where: { usuarioId: userId, tipo: 'fixa' },
        _sum: { valor: true },
      }),
      prisma.receita.aggregate({
        where: {
          usuarioId: userId,
          tipo: 'variavel',
          dataRegistro: {
            gte: inicioMes,
            lt: inicioMesSeguinte,
          },
        },
        _sum: { valor: true },
      }),
      prisma.despesa.aggregate({
        where: { usuarioId: userId, tipo: 'fixa' },
        _sum: { valorParcela: true },
      }),
      prisma.despesa.aggregate({
        where: {
          usuarioId: userId,
          tipo: 'avulsa',
          dataInicio: {
            gte: inicioMes,
            lt: inicioMesSeguinte,
          },
        },
        _sum: { valorParcela: true },
      }),
      prisma.despesa.findMany({
        where: { usuarioId: userId, tipo: 'parcelada' },
      }),
      prisma.receita.findMany({
        where: {
          usuarioId: userId,
          tipo: 'variavel',
          dataRegistro: {
            gte: inicioCiclo,
            lt: inicioMesSeguinte,
          },
        },
        select: {
          valor: true,
          dataRegistro: true,
        },
      }),
      prisma.despesa.findMany({
        where: {
          usuarioId: userId,
          tipo: 'avulsa',
          dataInicio: {
            gte: inicioCiclo,
            lt: inicioMesSeguinte,
          },
        },
        select: {
          valorParcela: true,
          dataInicio: true,
        },
      }),
      // Buscar despesas fixas individuais para verificar status de pagamento
      prisma.despesa.findMany({
        where: { usuarioId: userId, tipo: 'fixa' },
        select: { valorParcela: true, pagamentos: { where: { mes, ano } } },
      }),
      // Buscar despesas avulsas individuais para verificar status de pagamento
      prisma.despesa.findMany({
        where: {
          usuarioId: userId,
          tipo: 'avulsa',
          dataInicio: {
            gte: inicioMes,
            lt: inicioMesSeguinte,
          },
        },
        select: { valorParcela: true, paga: true },
      }),
    ]);

    let despesasParceladas = 0;
    let despesasParceladasPagas = 0;
    const parcelamentosAtivos = [];
    parceladas.forEach((despesa) => {
      const installment = evaluateInstallmentForMonth(despesa, mes, ano);
      if (!installment) {
        return;
      }

      despesasParceladas += installment.valorParcelaMes;
      if (despesa.paga) {
        despesasParceladasPagas += installment.valorParcelaMes;
      }
      parcelamentosAtivos.push({
        id: despesa.id,
        descricao: despesa.descricao,
        valor_parcela: installment.valorParcelaMes,
        valor_parcela_regular: toNumber(despesa.valorParcela),
        valor_primeira_parcela:
          despesa.valorPrimeiraParcela == null ? null : toNumber(despesa.valorPrimeiraParcela),
        parcela_atual: installment.parcelaAtual,
        parcelas_total: installment.parcelasTotal,
        progresso: Math.round((installment.parcelaAtual / installment.parcelasTotal) * 100),
      });
    });

    const receitasFixasTotal = toNumber(receitasFixas._sum.valor);
    const receitasVariaveisTotal = toNumber(receitasVariaveis._sum.valor);
    const despesasFixasTotal = toNumber(despesasFixas._sum.valorParcela);
    const despesasAvulsasTotal = toNumber(despesasAvulsas._sum.valorParcela);

    // Calcular total de despesas pagas
    const despesasFixasPagas = despesasFixasIndividuais
      .filter((d) => d.pagamentos && d.pagamentos.length > 0)
      .reduce((sum, d) => sum + toNumber(d.valorParcela), 0);
    const despesasAvulsasPagas = despesasAvulsasIndividuais
      .filter((d) => d.paga)
      .reduce((sum, d) => sum + toNumber(d.valorParcela), 0);

    const totalReceitas = receitasFixasTotal + receitasVariaveisTotal;
    const totalDespesas =
      despesasFixasTotal +
      despesasAvulsasTotal +
      despesasParceladas;
    const totalDespesasPagas = despesasFixasPagas + despesasAvulsasPagas + despesasParceladasPagas;
    const contasAPagar = roundMoney(totalDespesas - totalDespesasPagas);
    const balanco = totalReceitas - totalDespesas;
    const saldoDistribuivel = Math.max(0, balanco);
    const distribuicaoSaldo = calculateDistribution(saldoDistribuivel);

    const gastosBase = [
      { categoria: 'Fixas', chave: 'fixas', valor: despesasFixasTotal },
      { categoria: 'Avulsas', chave: 'avulsas', valor: despesasAvulsasTotal },
      { categoria: 'Parceladas', chave: 'parceladas', valor: despesasParceladas },
    ];
    const gastosDistribuicao = gastosBase.map((item) => ({
      ...item,
      percentual: totalDespesas > 0 ? roundMoney((item.valor / totalDespesas) * 100) : 0,
    }));

    const receitasVariaveisPorMes = mapTotalsByMonth(receitasVariaveisCiclo, 'dataRegistro', 'valor');
    const despesasAvulsasPorMes = mapTotalsByMonth(despesasAvulsasCiclo, 'dataInicio', 'valorParcela');
    const acumuladoPorCategoria = {};
    DISTRIBUTION_RULES.forEach((regra) => {
      acumuladoPorCategoria[normalizeCategoryName(regra.categoria)] = 0;
    });

    const historicoCiclo = mesesNoCiclo.map(({ mes: mesRef, ano: anoRef, key }) => {
      const receitasVariaveisMes = toNumber(receitasVariaveisPorMes.get(key));
      const despesasAvulsasMes = toNumber(despesasAvulsasPorMes.get(key));

      let despesasParceladasMes = 0;
      parceladas.forEach((despesa) => {
        const installment = evaluateInstallmentForMonth(despesa, mesRef, anoRef);
        if (installment) {
          despesasParceladasMes += installment.valorParcelaMes;
        }
      });

      const totalReceitasMes = receitasFixasTotal + receitasVariaveisMes;
      const totalDespesasMes = despesasFixasTotal + despesasAvulsasMes + despesasParceladasMes;
      const saldoDistribuivelMes = Math.max(0, totalReceitasMes - totalDespesasMes);
      const distribuicaoMes = calculateDistribution(saldoDistribuivelMes);

      distribuicaoMes.forEach((item) => {
        const categoryKey = normalizeCategoryName(item.categoria);
        acumuladoPorCategoria[categoryKey] =
          toNumber(acumuladoPorCategoria[categoryKey]) + toNumber(item.valor);
      });

      return {
        mes: mesRef,
        ano: anoRef,
        receitas: roundMoney(totalReceitasMes),
        despesas: roundMoney(totalDespesasMes),
        saldo_distribuivel: roundMoney(saldoDistribuivelMes),
      };
    });

    const caixinhasCategorias = DISTRIBUTION_RULES.map((regra) => {
      const categoryKey = normalizeCategoryName(regra.categoria);
      const goals = CAIXINHA_GOALS[categoryKey] || {};
      const meta = Number.isFinite(goals.meta) ? toNumber(goals.meta) : null;
      const plus = Number.isFinite(goals.plus) ? toNumber(goals.plus) : null;
      const metaPlus = resolvePlusTarget(meta, plus);
      const valorAcumulado = roundMoney(acumuladoPorCategoria[categoryKey] || 0);
      const progressoMeta = meta && meta > 0 ? Math.min(100, roundMoney((valorAcumulado / meta) * 100)) : null;
      const progressoPlus =
        metaPlus && metaPlus > 0 ? Math.min(100, roundMoney((valorAcumulado / metaPlus) * 100)) : null;

      return {
        categoria: regra.categoria,
        percentual: regra.percentual,
        valor_acumulado: valorAcumulado,
        meta,
        plus,
        meta_plus: metaPlus,
        faltante_meta: meta && meta > 0 ? roundMoney(Math.max(0, meta - valorAcumulado)) : null,
        faltante_plus: metaPlus && metaPlus > 0 ? roundMoney(Math.max(0, metaPlus - valorAcumulado)) : null,
        progresso_meta: progressoMeta,
        progresso_plus: progressoPlus,
      };
    });

    const totalCaixinhas = roundMoney(
      caixinhasCategorias.reduce((acc, item) => acc + toNumber(item.valor_acumulado), 0)
    );

    return res.status(200).json({
      success: true,
      mes,
      ano,
      receitas: {
        fixas: receitasFixasTotal,
        variaveis: receitasVariaveisTotal,
        total: totalReceitas,
      },
      despesas: {
        fixas: despesasFixasTotal,
        avulsas: despesasAvulsasTotal,
        parceladas: despesasParceladas,
        total: totalDespesas,
        pagas: roundMoney(totalDespesasPagas),
        contas_a_pagar: contasAPagar,
      },
      balanco,
      saldo_distribuivel: saldoDistribuivel,
      distribuicao_saldo: distribuicaoSaldo,
      gastos_distribuicao: gastosDistribuicao,
      caixinhas: {
        inicio_ciclo: {
          mes: ciclo.mes,
          ano: ciclo.ano,
        },
        meses_considerados: mesesNoCiclo.length,
        total_acumulado: totalCaixinhas,
        categorias: caixinhasCategorias,
        historico: historicoCiclo,
      },
      parcelamentos_ativos: parcelamentosAtivos,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
}
