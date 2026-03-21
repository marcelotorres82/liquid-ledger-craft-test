const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
});

async function main() {
  console.log('🌱 Criando banco SQLite...');
  
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!defaultPassword) {
    console.error('ERRO: A variável de ambiente DEFAULT_PASSWORD não está definida.');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'marcelo' },
    update: {},
    create: {
      nome: 'marcelo',
      email: 'marcelo',
      senha: hashedPassword,
    },
  });
  
  console.log('✅ Usuário criado:', admin.email);
  await prisma.$disconnect();
  console.log('✅ Banco pronto!');
}

main().catch(console.error);
