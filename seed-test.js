import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed simplificado...');

  const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;
  if (!DEFAULT_PASSWORD) {
    console.error('ERRO: A variável de ambiente DEFAULT_PASSWORD não está definida.');
    process.exit(1);
  }

  try {
    // Criar usuário padrão
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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
    console.log('🎉 Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
