#!/bin/bash

# Carrega variáveis de ambiente do .env
if [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀 Iniciando backend na porta 3001..."

# Limpar banco anterior
rm -f dev.db

# Iniciar backend
PORT=3001 npx vercel dev --port 3001
