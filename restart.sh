#!/bin/bash

# Carrega variáveis de ambiente do .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🛑 Parando servidor antigo..."
pkill -f "vercel dev" 2>/dev/null
pkill -f "node server" 2>/dev/null
pkill -f "node.*3001" 2>/dev/null
sleep 2

echo "🗑️  Limpando banco antigo..."
rm -f dev.db
rm -f diagnostic.log

echo "🔧 Criando banco de dados..."
npx prisma db push --schema lib/prisma/schema.prisma --force-reset

echo "👤 Criando usuário..."
node seed-final.js

echo "🚀 Iniciando servidor..."
node server-final.js &

echo "⏳ Aguardando servidor iniciar..."
sleep 3

echo ""
echo "✅ SERVIDOR INICIADO!"
echo "📱 Acesse: http://localhost:3001"
echo ""
