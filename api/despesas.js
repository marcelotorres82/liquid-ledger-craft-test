import prisma from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';

const TIPOS_DESPESA = new Set(['fixa', 'parcelada', 'avulsa']);

function formatDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPositiveNumber(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseISODate(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getValorParcelaMes(despesa, parcelaAtual) {
  const valorRegular = toNumber(despesa.valorParcela);
  const valorPrimeira =
    despesa.valorPrimeiraParcela == null ? null : toPositiveNumber(despesa.valorPrimeiraParcela);

  if (parcelaAtual === 1 && valorPrimeira != null) {
    return valorPrimeira;
  }

  return valorRegular;
}

function mapDespesaToFrontend(despesa) {
  let isPaga = Boolean(despesa.paga);
  let dtPagamento = despesa.dataPagamento ? formatDate(despesa.dataPagamento) : null;

  if ((despesa.tipo === 'fixa' || despesa.tipo === 'parcelada') && despesa.pagamentos) {
    if (despesa.pagamentos.length > 0) {
      isPaga = true;
      dtPagamento = formatDate(despesa.pagamentos[0].dataPagamento);
    } else {
      isPaga = false;
      dtPagamento = null;
    }
  }

  return {
    id: despesa.id,
    descricao: despesa.descricao,
    valor_parcela: toNumber(despesa.valorParcela),
    valor_primeira_parcela:
      despesa.valorPrimeiraParcela == null ? null : toNumber(despesa.valorPrimeiraParcela),
    tipo: despesa.tipo,
    data_inicio: formatDate(despesa.dataInicio),
    paga: isPaga,
    data_pagamento: dtPagamento,
    parcelas_total: Number(despesa.parcelasTotal) || 1,
  };
}

function getReferencePeriod() {
  const now = new Date();
  const reference = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    mes: reference.getMonth() + 1,
    ano: reference.getFullYear(),
  };
}

function validateDespesaPayload(payload) {
  const {
    descricao,
    valor_parcela,
    valor_primeira_parcela,
    tipo,
    data_inicio,
    paga,
    data_pagamento,
    parcelas_total = 1,
    mes_referencia,
    ano_referencia,
  } = payload ?? {};

  const descricaoLimpa = String(descricao || '').trim();
  if (!descricaoLimpa) {
    return { error: 'Descrição é obrigatória' };
  }

  if (!TIPOS_DESPESA.has(tipo)) {
    return { error: 'Tipo de despesa inválido' };
  }

  const valorParcela = toPositiveNumber(valor_parcela);
  if (valorParcela == null) {
    return { error: 'Valor da despesa inválido' };
  }

  const dataInicio = parseISODate(data_inicio);
  if (!dataInicio) {
    return { error: 'Data de início inválida' };
  }

  let parcelasTotal = 1;
  let valorPrimeiraParcela = null;
  const pagaNormalizada = Boolean(paga);
  let dataPagamento = null;

  if (tipo === 'parcelada') {
    parcelasTotal = Number.parseInt(parcelas_total, 10);
    if (!Number.isInteger(parcelasTotal) || parcelasTotal < 2 || parcelasTotal > 60) {
      return { error: 'Número de parcelas deve estar entre 2 e 60' };
    }

    if (
      valor_primeira_parcela !== undefined &&
      valor_primeira_parcela !== null &&
      valor_primeira_parcela !== ''
    ) {
      valorPrimeiraParcela = toPositiveNumber(valor_primeira_parcela);
      if (valorPrimeiraParcela == null) {
        return { error: 'Valor da primeira parcela inválido' };
      }
    }
  }

  if (pagaNormalizada) {
    if (data_pagamento !== undefined && data_pagamento !== null && data_pagamento !== '') {
      dataPagamento = parseISODate(data_pagamento);
      if (!dataPagamento) {
        return { error: 'Data de pagamento inválida' };
      }
    } else {
      dataPagamento = getTodayDate();
    }
  }

  return {
    data: {
      descricao: descricaoLimpa,
      valorParcela,
      valorPrimeiraParcela,
      tipo,
      dataInicio,
      paga: pagaNormalizada,
      dataPagamento,
      parcelasTotal,
    },
    contexto: {
      mes: mes_referencia ? Number(mes_referencia) : null,
      ano: ano_referencia ? Number(ano_referencia) : null,
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await verifyToken(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }

  // GET - Listar despesas
  if (req.method === 'GET') {
    const reference = getReferencePeriod();
    const mes = parseInt(req.query.mes, 10) || reference.mes;
    const ano = parseInt(req.query.ano, 10) || reference.ano;

    try {
      const inicioMes = new Date(ano, mes - 1, 1);
      const inicioMesSeguinte = new Date(ano, mes, 1);

      const [fixas, avulsas, parceladas] = await Promise.all([
        prisma.despesa.findMany({
          where: {
            usuarioId: userId,
            tipo: 'fixa',
          },
          include: { pagamentos: { where: { mes, ano } } },
          orderBy: { dataInicio: 'desc' },
        }),
        prisma.despesa.findMany({
          where: {
            usuarioId: userId,
            tipo: 'avulsa',
            dataInicio: {
              gte: inicioMes,
              lt: inicioMesSeguinte,
            },
          },
          orderBy: { dataInicio: 'desc' },
        }),
        prisma.despesa.findMany({
          where: {
            usuarioId: userId,
            tipo: 'parcelada',
          },
          include: { pagamentos: { where: { mes, ano } } },
          orderBy: { dataInicio: 'desc' },
        }),
      ]);

      const despesasFixas = fixas.map(mapDespesaToFrontend);
      const despesasAvulsas = avulsas.map(mapDespesaToFrontend);

      // Calcular parcelas ativas no mês consultado
      const despesasParceladas = parceladas
        .map((d) => {
          const dataInicio = new Date(d.dataInicio);
          if (Number.isNaN(dataInicio.getTime())) {
            return null;
          }

          const mesInicio = dataInicio.getMonth() + 1;
          const anoInicio = dataInicio.getFullYear();
          const parcelasTotal = Number(d.parcelasTotal) || 1;

          const mesesDecorridos = (ano - anoInicio) * 12 + (mes - mesInicio);

          if (mesesDecorridos >= 0 && mesesDecorridos < parcelasTotal) {
            const parcelaAtual = mesesDecorridos + 1;
            const valorParcelaMes = getValorParcelaMes(d, parcelaAtual);

            return {
              ...mapDespesaToFrontend(d),
              valor_parcela_mes: valorParcelaMes,
              valor_parcela_regular: toNumber(d.valorParcela),
              parcela_atual: parcelaAtual,
              progresso: Math.round((parcelaAtual / parcelasTotal) * 100),
            };
          }
          return null;
        })
        .filter(Boolean);

      const totalFixas = despesasFixas.reduce((sum, d) => sum + d.valor_parcela, 0);
      const totalAvulsas = despesasAvulsas.reduce((sum, d) => sum + d.valor_parcela, 0);
      const totalParceladas = despesasParceladas.reduce((sum, d) => sum + d.valor_parcela_mes, 0);

      return res.status(200).json({
        success: true,
        despesas_fixas: despesasFixas,
        despesas_avulsas: despesasAvulsas,
        despesas_parceladas: despesasParceladas,
        total_fixas: totalFixas,
        total_avulsas: totalAvulsas,
        total_parceladas: totalParceladas,
        total_geral: totalFixas + totalAvulsas + totalParceladas,
      });
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  }

  // POST - Criar despesa
  if (req.method === 'POST') {
    try {
      const parsed = validateDespesaPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const despesa = await prisma.despesa.create({
        data: {
          usuarioId: userId,
          ...parsed.data,
        },
      });
      
      const isRecurring = despesa.tipo === 'fixa' || despesa.tipo === 'parcelada';
      if (isRecurring && parsed.contexto.mes && parsed.contexto.ano && despesa.paga) {
        await prisma.pagamentoDespesa.create({
          data: {
             despesaId: despesa.id,
             mes: parsed.contexto.mes,
             ano: parsed.contexto.ano,
             valorPago: despesa.valorParcela,
             dataPagamento: despesa.dataPagamento || new Date()
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Despesa adicionada',
        id: despesa.id,
      });
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  }

  // PUT - Atualizar despesa
  if (req.method === 'PUT') {
    const id = Number.parseInt(req.query.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID da despesa inválido' });
    }

    try {
      const parsed = validateDespesaPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const existing = await prisma.despesa.findFirst({
        where: { id, usuarioId: userId },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada',
        });
      }

      await prisma.despesa.update({
        where: { id },
        data: parsed.data,
      });

      const isRecurring = existing.tipo === 'fixa' || existing.tipo === 'parcelada';
      
      if (isRecurring && parsed.contexto.mes && parsed.contexto.ano) {
         if (parsed.data.paga) {
           await prisma.pagamentoDespesa.upsert({
             where: {
               despesaId_mes_ano: { despesaId: id, mes: parsed.contexto.mes, ano: parsed.contexto.ano }
             },
             create: {
               despesaId: id,
               mes: parsed.contexto.mes,
               ano: parsed.contexto.ano,
               valorPago: parsed.data.valorParcela,
               dataPagamento: parsed.data.dataPagamento || new Date()
             },
             update: {
               valorPago: parsed.data.valorParcela,
               dataPagamento: parsed.data.dataPagamento || new Date()
             }
           });
         } else {
           await prisma.pagamentoDespesa.deleteMany({
             where: { despesaId: id, mes: parsed.contexto.mes, ano: parsed.contexto.ano }
           });
         }
      }

      return res.status(200).json({
        success: true,
        message: 'Despesa atualizada',
      });
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  }

  // DELETE - Remover despesa
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);

    try {
      const deleted = await prisma.despesa.deleteMany({
        where: {
          id,
          usuarioId: userId,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Despesa removida',
      });
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método não permitido' });
}
