import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyToken } from '../lib/auth.js';
import { queryRaw as query } from '../lib/prisma.js';
import { setCorsHeaders } from '../lib/cors.js';
import { handleApiError } from '../lib/errorHandler.js';

const BASE_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.0-pro',
  'gemini-pro'
].filter(Boolean);

let cachedModelName = process.env.GEMINI_MODEL || null;

function normalizeModelName(modelName) {
  return String(modelName).replace(/^models\//, '').trim();
}

function isModelNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return error?.status === 404 || msg.includes('not found') || msg.includes('is not supported');
}

function getPreferredModelName() {
  const fromCache = normalizeModelName(cachedModelName || '');
  if (fromCache) return fromCache;

  const fallback = BASE_MODEL_CANDIDATES.find(Boolean);
  return fallback ? normalizeModelName(fallback) : '';
}

async function generateWithModelFallback(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const candidates = [];

  const addCandidate = (name) => {
    if (!name) return;
    const normalized = normalizeModelName(name);
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  addCandidate(cachedModelName);
  BASE_MODEL_CANDIDATES.forEach(addCandidate);

  let lastError;
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      const text = response?.response?.text()?.trim();
      if (!text) {
        lastError = new Error(`Resposta vazia do modelo ${modelName}`);
        continue;
      }
      cachedModelName = modelName;
      return { text, modelName };
    } catch (error) {
      lastError = error;
      if (isModelNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Nenhum modelo Gemini disponível para generateContent.');
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInstallmentAmount(row, parcelaAtual) {
  const valorRegular = toNumber(row.valor_parcela);
  const valorPrimeira =
    row.valor_primeira_parcela == null ? null : toNumber(row.valor_primeira_parcela);

  if (parcelaAtual === 1 && valorPrimeira != null && valorPrimeira > 0) {
    return valorPrimeira;
  }

  return valorRegular;
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function getMonthYearFromDate(dateValue) {
  if (dateValue instanceof Date) {
    return {
      month: dateValue.getUTCMonth() + 1,
      year: dateValue.getUTCFullYear()
    };
  }

  const text = String(dateValue ?? '');
  const [yearText, monthText] = text.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  return {
    month: Number.isInteger(month) ? month : 1,
    year: Number.isInteger(year) ? year : 1970
  };
}

async function loadFinancialSnapshot(userId, mes, ano) {
  const [receitasFixasResult, receitasVariaveisResult, despesasFixasResult, despesasAvulsasResult] =
    await Promise.all([
      query(
        `
        SELECT COALESCE(SUM(valor), 0) AS total
        FROM receitas
        WHERE usuario_id = $1 AND tipo = 'fixa'
        `,
        [userId]
      ),
      query(
        `
        SELECT COALESCE(SUM(valor), 0) AS total
        FROM receitas
        WHERE usuario_id = $1
          AND tipo = 'variavel'
          AND EXTRACT(MONTH FROM data_registro) = $2
          AND EXTRACT(YEAR FROM data_registro) = $3
        `,
        [userId, mes, ano]
      ),
      query(
        `
        SELECT COALESCE(SUM(valor_parcela), 0) AS total
        FROM despesas
        WHERE usuario_id = $1 AND tipo = 'fixa'
        `,
        [userId]
      ),
      query(
        `
        SELECT COALESCE(SUM(valor_parcela), 0) AS total
        FROM despesas
        WHERE usuario_id = $1
          AND tipo = 'avulsa'
          AND EXTRACT(MONTH FROM data_inicio) = $2
          AND EXTRACT(YEAR FROM data_inicio) = $3
        `,
        [userId, mes, ano]
      )
    ]);

  let parceladasRows = [];
  try {
    const parceladasResult = await query(
      `
      SELECT valor_parcela, valor_primeira_parcela, data_inicio, parcelas_total
      FROM despesas
      WHERE usuario_id = $1 AND tipo = 'parcelada'
      `,
      [userId]
    );
    parceladasRows = parceladasResult.rows;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (!message.includes('valor_primeira_parcela')) {
      throw error;
    }

    // Compatibilidade com bancos sem a coluna nova
    const fallbackResult = await query(
      `
      SELECT valor_parcela, data_inicio, parcelas_total
      FROM despesas
      WHERE usuario_id = $1 AND tipo = 'parcelada'
      `,
      [userId]
    );
    parceladasRows = fallbackResult.rows;
  }

  const receitasFixas = toNumber(receitasFixasResult.rows[0]?.total);
  const receitasVariaveis = toNumber(receitasVariaveisResult.rows[0]?.total);
  const despesasFixas = toNumber(despesasFixasResult.rows[0]?.total);
  const despesasAvulsas = toNumber(despesasAvulsasResult.rows[0]?.total);

  let despesasParceladas = 0;
  for (const row of parceladasRows) {
    const { month: mesInicio, year: anoInicio } = getMonthYearFromDate(row.data_inicio);
    const parcelasTotal = Number.parseInt(row.parcelas_total, 10) || 1;
    const mesesDecorridos = (ano - anoInicio) * 12 + (mes - mesInicio);

    if (mesesDecorridos >= 0 && mesesDecorridos < parcelasTotal) {
      const parcelaAtual = mesesDecorridos + 1;
      despesasParceladas += getInstallmentAmount(row, parcelaAtual);
    }
  }

  const totalReceitas = receitasFixas + receitasVariaveis;
  const totalDespesas = despesasFixas + despesasAvulsas + despesasParceladas;

  return {
    receitasFixas,
    receitasVariaveis,
    despesasFixas,
    despesasAvulsas,
    despesasParceladas,
    totalReceitas,
    totalDespesas,
    balanco: totalReceitas - totalDespesas
  };
}

function buildPrompt(snapshot, mes, ano) {
  return [
    'Você é um consultor financeiro pessoal.',
    `Analise os dados do mês ${mes}/${ano} e gere 3 insights acionáveis em português.`,
    'Regras: seja objetivo, máximo 120 palavras no total, use bullets com o símbolo "•".',
    `Receitas Fixas: ${formatBRL(snapshot.receitasFixas)}`,
    `Receitas Variáveis: ${formatBRL(snapshot.receitasVariaveis)}`,
    `Despesas Fixas: ${formatBRL(snapshot.despesasFixas)}`,
    `Despesas Avulsas: ${formatBRL(snapshot.despesasAvulsas)}`,
    `Despesas Parceladas: ${formatBRL(snapshot.despesasParceladas)}`,
    `Saldo do mês: ${formatBRL(snapshot.balanco)}`
  ].join('\n');
}

function formatPercent(value) {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function buildFallbackInsights(snapshot, mes, ano) {
  const insights = [];
  const receitas = toNumber(snapshot.totalReceitas);
  const despesas = toNumber(snapshot.totalDespesas);
  const balanco = toNumber(snapshot.balanco);
  const despesasComprometidas = toNumber(snapshot.despesasFixas) + toNumber(snapshot.despesasParceladas);

  if (receitas === 0 && despesas === 0) {
    return [
      `• Sem movimentações registradas em ${mes}/${ano}.`,
      '• Cadastre receitas e despesas para receber análises detalhadas.',
      '• Comece pelas despesas fixas para obter um planejamento mais realista.'
    ].join('\n');
  }

  if (balanco > 0) {
    const percentualSobra = receitas > 0 ? (balanco / receitas) * 100 : 0;
    insights.push(
      `Saldo positivo de ${formatBRL(balanco)} (${formatPercent(percentualSobra)} das receitas). Reserve parte desse valor antes de aumentar gastos.`
    );
  } else if (balanco < 0) {
    const deficit = Math.abs(balanco);
    insights.push(
      `Saldo negativo de ${formatBRL(deficit)}. Ajuste despesas avulsas e parceladas para voltar ao positivo no próximo mês.`
    );
  } else {
    insights.push('Saldo zerado no mês. Qualquer gasto extra já coloca o orçamento no negativo.');
  }

  if (receitas > 0) {
    const percentualComprometido = (despesasComprometidas / receitas) * 100;
    if (percentualComprometido > 70) {
      insights.push(
        `Despesas fixas + parceladas consomem ${formatPercent(percentualComprometido)} da renda. Tente reduzir esse bloco para ganhar margem.`
      );
    } else {
      insights.push(
        `Despesas fixas + parceladas estão em ${formatPercent(percentualComprometido)} da renda. Mantenha abaixo de 70% para maior segurança.`
      );
    }
  } else {
    insights.push('Sem receitas no período. Priorize registrar entradas para equilibrar o planejamento.');
  }

  if (toNumber(snapshot.despesasParceladas) > 0) {
    insights.push(
      `Parceladas ativas somam ${formatBRL(snapshot.despesasParceladas)} no mês. Evite novas parcelas até aliviar esse compromisso.`
    );
  } else if (balanco > 0) {
    const reserva = balanco * 0.2;
    insights.push(
      `Com o saldo atual, separar ${formatBRL(reserva)} para reserva pode acelerar sua segurança financeira.`
    );
  } else {
    insights.push('Defina um teto de gastos semanais para recuperar o controle com mais previsibilidade.');
  }

  return insights.slice(0, 3).map((line) => `• ${line}`).join('\n');
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
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await verifyToken(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }

  const reference = getReferencePeriod();
  const mes = Number.parseInt(req.query?.mes ?? req.body?.mes, 10) || reference.mes;
  const ano = Number.parseInt(req.query?.ano ?? req.body?.ano, 10) || reference.ano;

  try {
    if (req.method === 'GET') {
      const result = await query(
        `
        SELECT conteudo, updated_at
        FROM insights
        WHERE usuario_id = $1 AND mes = $2 AND ano = $3
        LIMIT 1
        `,
        [userId, mes, ano]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: false,
          message: 'Nenhum insight disponível. Gere um novo insight.'
        });
      }

      return res.status(200).json({
        success: true,
        insight: result.rows[0].conteudo,
        updated_at: result.rows[0].updated_at,
        source: process.env.GEMINI_API_KEY ? 'gemini' : 'fallback',
        model: process.env.GEMINI_API_KEY ? getPreferredModelName() : 'local-rules-v1'
      });
    }

    if (req.method === 'POST') {
      const snapshot = await loadFinancialSnapshot(userId, mes, ano);
      let insightText = '';
      let modelName = null;
      let source = 'fallback';
      let message = '';

      if (!process.env.GEMINI_API_KEY) {
        insightText = buildFallbackInsights(snapshot, mes, ano);
        message = 'GEMINI_API_KEY não configurada. Insight local gerado sem IA.';
        modelName = 'local-rules-v1';
      } else {
        const prompt = buildPrompt(snapshot, mes, ano);
        try {
          const generated = await generateWithModelFallback(process.env.GEMINI_API_KEY, prompt);
          insightText = generated.text;
          modelName = generated.modelName;
          source = 'gemini';
        } catch (generationError) {
          console.error('Gemini generation error. Using local fallback:', generationError);
          insightText = buildFallbackInsights(snapshot, mes, ano);
          message = 'IA indisponível no momento. Insight local gerado com base nos seus dados.';
          modelName = 'local-rules-v1';
        }
      }

      if (!insightText) {
        insightText = buildFallbackInsights(snapshot, mes, ano);
        source = 'fallback';
        modelName = 'local-rules-v1';
        if (!message) {
          message = 'Não foi possível usar a IA. Insight local gerado com regras internas.';
        }
      }

      let warning;
      try {
        await query(
          `
          INSERT INTO insights (usuario_id, mes, ano, conteudo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (usuario_id, mes, ano)
          DO UPDATE SET conteudo = EXCLUDED.conteudo, updated_at = CURRENT_TIMESTAMP
          `,
          [userId, mes, ano, insightText]
        );
      } catch (persistError) {
        console.error('Insight generated but failed to persist:', persistError);
        warning = 'Insight gerado, mas não foi salvo no histórico.';
      }

      return res.status(200).json({
        success: true,
        insight: insightText,
        source,
        model: modelName,
        message,
        warning
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    return handleApiError(error, res);
  }
}
