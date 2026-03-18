import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

/**
 * Helper para queries SQL brutas (Raw SQL) para manter compatibilidade
 * com o antigo lib/db.js onde necessário.
 */
export async function queryRaw(sql, params = []) {
  let result;
  if (Array.isArray(params) && params.length > 0) {
    result = await prisma.$queryRawUnsafe(sql, ...params);
  } else {
    result = await prisma.$queryRawUnsafe(sql);
  }
  return { rows: result };
}

export default prisma;

