import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

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
        nome: 'Marcelo Torres',
        email: 'marcelo',
        senha: hashedPassword,
      },
    });

    console.log('✅ Usuário padrão criado:', admin.email);

    // Criar receitas de exemplo
    await prisma.receita.createMany({
      data: [
        {
          usuarioId: admin.id,
          descricao: 'Salário',
          valor: 5000.00,
          tipo: 'fixa',
          dataRegistro: new Date('2026-03-01'),
        },
        {
          usuarioId: admin.id,
          descricao: 'Freelance',
          valor: 1500.00,
          tipo: 'variavel',
          dataRegistro: new Date('2026-03-10'),
        },
        {
          usuarioId: admin.id,
          descricao: 'Investimentos',
          valor: 300.00,
          tipo: 'variavel',
          dataRegistro: new Date('2026-03-15'),
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Receitas de exemplo criadas');

    // Criar despesas de exemplo
    await prisma.despesa.createMany({
      data: [
        {
          usuarioId: admin.id,
          descricao: 'Aluguel',
          valorParcela: 1200.00,
          tipo: 'fixa',
          dataInicio: new Date('2026-03-01'),
          parcelasTotal: 1,
        },
        {
          usuarioId: admin.id,
          descricao: 'Internet',
          valorParcela: 99.90,
          tipo: 'fixa',
          dataInicio: new Date('2026-03-05'),
          parcelasTotal: 1,
        },
        {
          usuarioId: admin.id,
          descricao: 'Netflix',
          valorParcela: 39.90,
          tipo: 'fixa',
          dataInicio: new Date('2026-03-08'),
          parcelasTotal: 1,
        },
        {
          usuarioId: admin.id,
          descricao: 'Notebook Dell',
          valorParcela: 450.00,
          valorPrimeiraParcela: 320.00,
          tipo: 'parcelada',
          dataInicio: new Date('2026-02-15'),
          parcelasTotal: 12,
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Despesas de exemplo criadas');

    // Criar insights de exemplo
    await prisma.insight.createMany({
      data: [
        {
          usuarioId: admin.id,
          mes: 3,
          ano: 2026,
          conteudo: 'Suas economias este mês estão ótimas! Continue mantendo o controle das despesas fixas.',
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Insights de exemplo criados');
    console.log('🎉 Seed concluído com sucesso!');
    
    // Mostrar estatísticas
    const userCount = await prisma.usuario.count();
    const receitaCount = await prisma.receita.count();
    const despesaCount = await prisma.despesa.count();
    
    console.log(`📊 Estatísticas:`);
    console.log(`   Usuários: ${userCount}`);
    console.log(`   Receitas: ${receitaCount}`);
    console.log(`   Despesas: ${despesaCount}`);
    
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
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
