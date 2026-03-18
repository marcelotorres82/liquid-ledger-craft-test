import prisma from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';
import { setCorsHeaders } from '../lib/cors.js';
import { handleApiError } from '../lib/errorHandler.js';

const TIPOS_RECEITA = new Set(['fixa', 'variavel']);

function formatDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
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

function validateReceitaPayload(payload) {
  const descricao = String(payload?.descricao || '').trim();
  const valor = toPositiveNumber(payload?.valor);
  const tipo = payload?.tipo;
  const dataRegistro = parseISODate(payload?.data_registro);

  if (!descricao) {
    return { error: 'Descrição é obrigatória' };
  }

  if (valor == null) {
    return { error: 'Valor da receita inválido' };
  }

  if (!TIPOS_RECEITA.has(tipo)) {
    return { error: 'Tipo de receita inválido' };
  }

  if (!dataRegistro) {
    return { error: 'Data da receita inválida' };
  }

  return {
    data: {
      descricao,
      valor,
      tipo,
      dataRegistro,
    },
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

function mapReceitaToFrontend(receita) {
  return {
    id: receita.id,
    descricao: receita.descricao,
    valor: Number(receita.valor),
    tipo: receita.tipo,
    data_registro: formatDate(receita.dataRegistro),
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

  // GET - Listar receitas
  if (req.method === 'GET') {
    const reference = getReferencePeriod();
    const mes = parseInt(req.query.mes, 10) || reference.mes;
    const ano = parseInt(req.query.ano, 10) || reference.ano;

    try {
      const fixas = await prisma.receita.findMany({
        where: {
          usuarioId: userId,
          tipo: 'fixa',
        },
        orderBy: { dataRegistro: 'desc' },
      });

      const variaveis = await prisma.receita.findMany({
        where: {
          usuarioId: userId,
          tipo: 'variavel',
          dataRegistro: {
            gte: new Date(ano, mes - 1, 1),
            lt: new Date(ano, mes, 1),
          },
        },
        orderBy: { dataRegistro: 'desc' },
      });

      const receitasFixas = fixas.map(mapReceitaToFrontend);
      const receitasVariaveis = variaveis.map(mapReceitaToFrontend);
      const totalFixas = receitasFixas.reduce((sum, r) => sum + r.valor, 0);
      const totalVariaveis = receitasVariaveis.reduce((sum, r) => sum + r.valor, 0);

      return res.status(200).json({
        success: true,
        receitas_fixas: receitasFixas,
        receitas_variaveis: receitasVariaveis,
        total_fixas: totalFixas,
        total_variaveis: totalVariaveis,
        total_geral: totalFixas + totalVariaveis,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  }

  // POST - Criar receita
  if (req.method === 'POST') {
    try {
      const parsed = validateReceitaPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const receita = await prisma.receita.create({
        data: {
          usuarioId: userId,
          ...parsed.data,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Receita adicionada',
        id: receita.id,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  }

  // PUT - Atualizar receita
  if (req.method === 'PUT') {
    const id = Number.parseInt(req.query.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID da receita inválido' });
    }

    try {
      const parsed = validateReceitaPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const updated = await prisma.receita.updateMany({
        where: {
          id,
          usuarioId: userId,
        },
        data: parsed.data,
      });

      if (updated.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Receita não encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Receita atualizada',
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  }

  // DELETE - Remover receita
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);

    try {
      const deleted = await prisma.receita.deleteMany({
        where: {
          id,
          usuarioId: userId,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Receita não encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Receita removida',
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  }

  return res.status(405).json({ success: false, message: 'Método não permitido' });
}
