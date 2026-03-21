#!/bin/bash

# Carrega variáveis de ambiente do .env
if [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀 Iniciando ambiente de desenvolvimento local..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi

# Limpar logs anteriores
rm -f server.log

# Iniciar backend com SQLite local
echo "📊 Iniciando backend com SQLite local..."
PORT=3001 npx vercel dev --port 3001 > server.log 2>&1 &

BACKEND_PID=$!
echo "📋 Backend PID: $BACKEND_PID"

# Aguardar backend iniciar
sleep 5

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

echo "📱 Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Ambiente iniciado!"
echo "📊 Backend: http://localhost:3001"
echo "🎨 Frontend: http://localhost:5173/app/#/"
echo ""
echo "📋 Logs:"
echo "  Backend: tail -f server.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "🛑 Para parar: kill $BACKEND_PID $FRONTEND_PID"

# Manter script rodando
wait
