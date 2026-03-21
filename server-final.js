import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your .env file');
  process.exit(1);
}

// Utility functions
function generateToken(userId, email) {
  return jwt.sign(
    { id: userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 500) {
  sendJSON(res, { success: false, message }, status);
}

// Authentication middleware
async function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    return null;
  }
}

// API Routes
async function handleAuth(req, res, method, body) {
  if (method !== 'POST') {
    return sendError(res, 'Método não permitido', 405);
  }

  const { action, login, senha, email, nome } = body;

  if (action === 'login') {
    try {
      const user = await prisma.usuario.findFirst({
        where: {
          OR: [
            { email: login },
            { nome: login }
          ]
        }
      });

      if (!user) {
        return sendError(res, 'Usuário não encontrado', 401);
      }

      const passwordValid = await bcrypt.compare(senha, user.senha);
      if (!passwordValid) {
        return sendError(res, 'Senha incorreta', 401);
      }

      const token = generateToken(user.id, user.email);
      
      sendJSON(res, {
        success: true,
        message: 'Login successful',
        user: { id: user.id, nome: user.nome, email: user.email },
        token: token
      });
    } catch (error) {
      sendError(res, 'Erro no login: ' + error.message);
    }
  } else {
    sendError(res, 'Ação não reconhecida', 400);
  }
}

async function handleDashboard(req, res, method, userId) {
  if (method !== 'GET') {
    return sendError(res, 'Método não permitido', 405);
  }

  if (!userId) {
    return sendError(res, 'Não autorizado', 401);
  }

  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Buscar receitas do mês
    const receitas = await prisma.receita.findMany({
      where: {
        usuarioId: userId,
        dataRegistro: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    // Buscar despesas do mês
    const despesas = await prisma.despesa.findMany({
      where: {
        usuarioId: userId,
        dataInicio: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    // Calcular totais
    const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + d.valorParcela, 0);
    const saldo = totalReceitas - totalDespesas;

    sendJSON(res, {
      success: true,
      data: {
        mes: currentMonth,
        ano: currentYear,
        totalReceitas,
        totalDespesas,
        saldo,
        receitas,
        despesas
      }
    });
  } catch (error) {
    sendError(res, 'Erro ao buscar dados: ' + error.message);
  }
}

async function handleReceitas(req, res, method, userId, body) {
  if (!userId) {
    return sendError(res, 'Não autorizado', 401);
  }

  try {
    if (method === 'GET') {
      const receitas = await prisma.receita.findMany({
        where: { usuarioId: userId },
        orderBy: { dataRegistro: 'desc' }
      });
      sendJSON(res, { success: true, data: receitas });
    } else if (method === 'POST') {
      const { descricao, valor, tipo, data_registro } = body;
      
      const receita = await prisma.receita.create({
        data: {
          usuarioId: userId,
          descricao,
          valor: parseFloat(valor),
          tipo,
          dataRegistro: new Date(data_registro)
        }
      });
      
      sendJSON(res, { success: true, data: receita });
    } else {
      sendError(res, 'Método não permitido', 405);
    }
  } catch (error) {
    sendError(res, 'Erro nas receitas: ' + error.message);
  }
}

async function handleDespesas(req, res, method, userId, body) {
  if (!userId) {
    return sendError(res, 'Não autorizado', 401);
  }

  try {
    if (method === 'GET') {
      const despesas = await prisma.despesa.findMany({
        where: { usuarioId: userId },
        orderBy: { dataInicio: 'desc' }
      });
      sendJSON(res, { success: true, data: despesas });
    } else if (method === 'POST') {
      const { descricao, valorParcela, tipo, data_inicio, parcelasTotal } = body;
      
      const despesa = await prisma.despesa.create({
        data: {
          usuarioId: userId,
          descricao,
          valorParcela: parseFloat(valorParcela),
          tipo,
          dataInicio: new Date(data_inicio),
          parcelasTotal: parseInt(parcelasTotal)
        }
      });
      
      sendJSON(res, { success: true, data: despesa });
    } else {
      sendError(res, 'Método não permitido', 405);
    }
  } catch (error) {
    sendError(res, 'Erro nas despesas: ' + error.message);
  }
}

// Serve static files
function serveStaticFile(res, filePath) {
  try {
    const content = readFileSync(filePath);
    const ext = filePath.split('.').pop();
    const contentTypes = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('File not found');
  }
}

// Main server
const server = createServer(async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse body for POST requests
  let body = {};
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    await new Promise(resolve => req.on('end', resolve));
    const bodyStr = Buffer.concat(chunks).toString();
    try {
      body = JSON.parse(bodyStr);
    } catch (e) {
      body = {};
    }
  }
  
  // Route handling
  const url = req.url;
  
  // Serve main login page - DEVE VIR ANTES do health check
  if (url === '/' || url === '/index.html') {
    serveStaticFile(res, join(__dirname, 'public', 'index.html'));
    return;
  }
  
  // Health check
  if (url === '/health' || url === '/api/health') {
    sendJSON(res, { 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      message: 'App Financeiro API v1.0'
    });
    return;
  }
  
  // API routes
  if (url.startsWith('/api/')) {
    const userId = await verifyToken(req);
    const route = url.substring(5);
    
    if (route === 'auth') {
      await handleAuth(req, res, req.method, body);
    } else if (route === 'dashboard') {
      await handleDashboard(req, res, req.method, userId);
    } else if (route === 'receitas') {
      await handleReceitas(req, res, req.method, userId, body);
    } else if (route === 'despesas') {
      await handleDespesas(req, res, req.method, userId, body);
    } else {
      sendError(res, 'Endpoint não encontrado', 404);
    }
    return;
  }
  
  // Static files - /app/ route
  if (url === '/app' || url === '/app/' || url.startsWith('/app/')) {
    let filePath;
    if (url === '/app' || url === '/app/') {
      filePath = join(__dirname, 'public', 'app', 'index.html');
    } else {
      filePath = join(__dirname, 'public', url.substring(1));
    }
    serveStaticFile(res, filePath);
    return;
  }
  
  // Serve main login page
  if (url === '/') {
    serveStaticFile(res, join(__dirname, 'public', 'index.html'));
    return;
  }
  
  // Serve dashboard simples
  if (url === '/dashboard-simple.html') {
    serveStaticFile(res, join(__dirname, 'public', 'dashboard-simple.html'));
    return;
  }
  
  // Serve other static files
  if (url.startsWith('/assets/')) {
    const filePath = join(__dirname, 'public', url.substring(1));
    serveStaticFile(res, filePath);
    return;
  }
  
  // Serve HTML files
  if (url.endsWith('.html')) {
    const filePath = join(__dirname, 'public', url.substring(1));
    serveStaticFile(res, filePath);
    return;
  }
  
  // 404
  sendError(res, 'Página não encontrada', 404);
});

// Start server
async function startServer() {
  try {
    console.log('🔧 Iniciando servidor App Financeiro...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Banco de dados conectado');
    
    // Check database
    const userCount = await prisma.usuario.count();
    console.log(`📊 Usuários no banco: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  Nenhum usuário encontrado. Execute o seed:');
      console.log('   DATABASE_URL="file:./dev.db" node seed-final.js');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📝 Endpoints disponíveis:`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   POST http://localhost:${PORT}/api/auth`);
      console.log(`   GET  http://localhost:${PORT}/api/dashboard`);
      console.log(`   GET  http://localhost:${PORT}/api/receitas`);
      console.log(`   POST http://localhost:${PORT}/api/receitas`);
      console.log(`   GET  http://localhost:${PORT}/api/despesas`);
      console.log(`   POST http://localhost:${PORT}/api/despesas`);
      console.log(`📱 Páginas:`);
      console.log(`   http://localhost:${PORT}/ (Login)`);
      console.log(`   http://localhost:${PORT}/app (App React)`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
