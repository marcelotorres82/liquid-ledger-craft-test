import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const logFile = 'diagnostic.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
}

// Limpar log anterior
try {
  fs.unlinkSync(logFile);
} catch (e) {}

log('=== INICIANDO DIAGNÓSTICO ===');

try {
  log('1. Testando Prisma...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./dev.db'
      }
    }
  });
  
  log('2. Conectando ao banco...');
  await prisma.$connect();
  log('✅ Conexão OK');
  
  log('3. Verificando tabelas...');
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
  log(`Tabelas encontradas: ${JSON.stringify(tables)}`);
  
  log('4. Verificando usuários...');
  const users = await prisma.usuario.findMany();
  log(`Usuários: ${users.length}`);
  
  if (users.length > 0) {
    log(`Primeiro usuário: ${users[0].email}`);
  }
  
  log('5. Testando query de autenticação...');
  const testUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { email: 'marcelo' },
        { nome: 'marcelo' }
      ]
    }
  });
  
  if (testUser) {
    log(`✅ Usuário de teste encontrado: ${testUser.email}`);
  } else {
    log('⚠️ Nenhum usuário encontrado - criando...');
    
    // Criar usuário de teste
    const bcrypt = await import('bcryptjs');
    const dotenv = await import('dotenv');
    dotenv.config();

    const defaultPassword = process.env.DEFAULT_PASSWORD;
    if (!defaultPassword) {
      log('ERRO: A variável de ambiente DEFAULT_PASSWORD não está definida.');
      throw new Error('DEFAULT_PASSWORD not set');
    }
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const newUser = await prisma.usuario.create({
      data: {
        nome: 'Marcelo Torres',
        email: 'marcelo',
        senha: hashedPassword
      }
    });
    
    log(`✅ Usuário criado: ${newUser.email}`);
  }
  
  await prisma.$disconnect();
  log('✅ Diagnóstico concluído com sucesso');
  
} catch (error) {
  log(`❌ ERRO: ${error.message}`);
  log(`Stack: ${error.stack}`);
}

log('=== FIM DO DIAGNÓSTICO ===');
