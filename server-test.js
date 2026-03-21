import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;

if (!JWT_SECRET || !DEFAULT_PASSWORD) {
  console.error('FATAL ERROR: JWT_SECRET or DEFAULT_PASSWORD are not defined in .env file');
  process.exit(1);
}

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

const server = createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    }));
    return;
  }
  
  // API Auth endpoint
  if (req.url === '/api/auth' && req.method === 'POST') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { action, login, senha } = JSON.parse(body);
          
          if (action === 'login') {
            console.log(`Login attempt: ${login}`);
            
            const user = await prisma.usuario.findFirst({
              where: {
                OR: [
                  { email: login },
                  { nome: login }
                ]
              }
            });
            
            if (!user) {
              console.log('User not found');
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado' }));
              return;
            }
            
            const passwordValid = await bcrypt.compare(senha, user.senha);
            if (!passwordValid) {
              console.log('Invalid password');
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Senha incorreta' }));
              return;
            }
            
            const token = generateToken(user.id, user.email);
            console.log(`Login successful: ${user.nome}`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Login successful',
              user: { id: user.id, nome: user.nome, email: user.email },
              token: token
            }));
          }
        } catch (error) {
          console.error('Auth error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Erro interno: ' + error.message }));
        }
      });
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Erro ao processar requisição' }));
    }
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Endpoint não encontrado' }));
});

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Check if user exists
    const userCount = await prisma.usuario.count();
    console.log(`📊 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found. Creating default user...');
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await prisma.usuario.create({
        data: {
          nome: 'marcelo',
          email: 'marcelo',
          senha: hashedPassword
        }
      });
      console.log('✅ Default user created');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Test endpoints:`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   POST http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
