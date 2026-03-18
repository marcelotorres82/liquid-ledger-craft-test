const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://app.financeiro.v2.vercel.app', // Placeholder para URL real se soubermos
].filter(Boolean);

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Se for ambiente de desenvolvimento (localhost), permitir
  const isLocal = origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'));
  
  if (isLocal || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback seguro se a origem não for permitida, ou se não houver cabeçalho de origem (ex: requisição direta)
    // No caso de requisições diretas do servidor, Allow-Origin pode ser omitido ou definido como a primeira origem permitida
    if (ALLOWED_ORIGINS.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
