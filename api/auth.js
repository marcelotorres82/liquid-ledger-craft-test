import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { generateToken, createTokenCookie, clearTokenCookie, verifyToken } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const { action, email, login, senha } = req.body ?? {};

  // LOGIN
  if (action === 'login') {
    try {
      const identificador = String(login ?? email ?? '').trim();
      if (!identificador) {
        return res.status(400).json({ success: false, message: 'Login é obrigatório' });
      }

      const user = await prisma.usuario.findFirst({
        where: {
          OR: [
            {
              email: {
                equals: identificador,
                mode: 'insensitive',
              },
            },
            {
              nome: {
                equals: identificador,
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
      }

      const validPassword = await bcrypt.compare(senha, user.senha);

      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Senha incorreta' });
      }

      const token = generateToken(user.id, user.email);
      res.setHeader('Set-Cookie', createTokenCookie(token));

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('==== LOGIN ERROR DUMP ====');
      console.error(error);
      if (error.message) console.error('Message:', error.message);
      if (error.stack) console.error('Stack:', error.stack);
      console.error('===========================');
      return res.status(500).json({ success: false, message: 'Erro no servidor: ' + String(error.message || error) });
    }
  }

  // LOGOUT
  if (action === 'logout') {
    res.setHeader('Set-Cookie', clearTokenCookie());
    return res.status(200).json({ success: true, message: 'Logout realizado' });
  }

  // CHECK AUTH
  if (action === 'check') {
    const userId = await verifyToken(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nome: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  }

  return res.status(400).json({ success: false, message: 'Ação inválida' });
}
