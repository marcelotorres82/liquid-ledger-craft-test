import 'dotenv/config';
import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

async function testConnection() {
  try {
    console.log('Testando conexão Prisma com Vercel Postgres...');
    const user = await prisma.usuario.findFirst({
      where: { email: 'marcelo' }
    });
    
    console.log('Resultado da query:', user ? 'Encontrado' : 'Não Encontrado (mas conectado com sucesso)');
    
    if (user) {
        console.log('Comparando senhas dummy...');
        const valid = await bcrypt.compare('123', user.senha);
        console.log('Bcrypt OK:', valid);
    }
  } catch (error) {
    console.error('ERRO CRÍTICO PRISMA:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
