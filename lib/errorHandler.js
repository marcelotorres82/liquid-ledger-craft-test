export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function handleApiError(error, res) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  // Log estruturado para monitoramento
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: error.message || String(error),
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  }));

  const message = process.env.NODE_ENV === 'development' 
    ? (error.message || 'Erro interno do servidor')
    : 'Erro interno do servidor';

  return res.status(500).json({
    success: false,
    message,
    code: 'INTERNAL_ERROR',
  });
}
