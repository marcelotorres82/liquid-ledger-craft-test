import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
});

async function main() {
  console.log('🌱 Criando banco de dados SQLite...');

  // Criar usuário padrão
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!defaultPassword) {
    console.error('ERRO: A variável de ambiente DEFAULT_PASSWORD não está definida.');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  try {
    const admin = await prisma.usuario.upsert({
      where: { email: 'marcelo' },
      update: {},
      create: {
        nome: 'marcelo',
        email: 'marcelo',
        senha: hashedPassword,
      },
    });

    console.log('✅ Usuário padrão criado:', admin.email);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
  }

  await prisma.$disconnect();
  console.log('✅ Banco de dados inicializado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  });
