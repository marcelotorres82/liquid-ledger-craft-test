#!/bin/bash

# Carrega variáveis de ambiente do .env
if [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀 Iniciando ambiente simplificado..."

# Parar processos anteriores
pkill -f "vercel dev" || true
pkill -f "npm run dev" || true

# Limpar arquivos
rm -f dev.db server.log frontend.log

# Criar schema simplificado
cat > schema-simple.prisma << 'EOF'
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Usuario {
  id        Int      @id @default(autoincrement())
  nome      String
  email     String   @unique
  senha     String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}
EOF

# Gerar client
echo "📦 Gerando Prisma client..."
npx prisma generate --schema schema-simple.prisma

# Criar banco
echo "💾 Criando banco de dados..."
npx prisma db push --schema schema-simple.prisma

# Criar usuário
echo "👤 Criando usuário padrão..."
node -e "
require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!defaultPassword) {
    console.error('ERRO: A variável de ambiente DEFAULT_PASSWORD não está definida.');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  await prisma.usuario.upsert({
    where: { email: 'marcelo' },
    update: {},
    create: {
      nome: 'marcelo',
      email: 'marcelo', 
      senha: hashedPassword
    }
  });
  console.log('✅ Usuário marcelo criado');
  await prisma.\$disconnect();
}

main().catch(console.error);
"

# Iniciar backend
echo "🌐 Iniciando backend na porta 3001..."
PORT=3001 npx vercel dev > server.log 2>&1 &

BACKEND_PID=$!
echo "📋 Backend PID: $BACKEND_PID"

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

echo "📱 Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Ambiente iniciado!"
echo "🌐 Backend: http://localhost:3001"
echo "🎨 Frontend: http://localhost:5173/app/#/"
echo ""
echo "📋 Logs disponíveis em:"
echo "  Backend: tail -f server.log"
echo "  Frontend: tail -f frontend.log"

wait
