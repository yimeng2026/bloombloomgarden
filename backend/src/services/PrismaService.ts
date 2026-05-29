import { PrismaClient } from '@prisma/client';

// ─── Prisma 单例 ────────────────────────────────────────

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

export { prisma };

// ─── PrismaService 封装 ──────────────────────────────

export class PrismaService {
  static get client(): PrismaClient {
    return prisma;
  }

  static async connect(): Promise<void> {
    await prisma.$connect();
    console.log('[Prisma] Database connected');
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
    console.log('[Prisma] Database disconnected');
  }

  static async transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => fn(tx as unknown as PrismaClient));
  }

  static async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: -1 };
    }
  }
}

// ─── 生命周期钩子 ──────────────────────────────────────

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
