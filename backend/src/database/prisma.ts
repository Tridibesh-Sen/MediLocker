import '../config/env';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const LIVE_SUPABASE_DB = 'postgresql://postgres:qLBHDWUwaMod4Cd0@db.mmgyamemhbecpytpibrr.supabase.co:5432/postgres';

const resolveDatabaseUrl = () => {
  const current = process.env.DATABASE_URL;
  if (!current || current.includes('pnqubhvcvocytudlwbog') || current.includes('ep-sample-neon')) {
    return LIVE_SUPABASE_DB;
  }
  return current;
};

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Connected to PostgreSQL database.');
    return true;
  } catch (error) {
    logger.warn('PostgreSQL database connection pending or offline. Running in resilient mode.');
    return false;
  }
}
