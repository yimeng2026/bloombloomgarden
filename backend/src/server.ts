import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import express from 'express';
import app from './app';
import { PrismaService } from './services/PrismaService';


import { syncProvidersToDatabase } from './services/InitService';


// ─── 全局错误处理（防止进程崩溃） ──────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  // 不退出进程，只记录错误
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  // 不退出进程，只记录错误
});

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001', 10);

async function initDatabase() {
  // 找到 prisma 目录
  const possiblePrismaPaths = [
    path.join(process.cwd(), 'prisma/schema.prisma'),
    path.join(process.cwd(), 'backend/prisma/schema.prisma'),
    path.join(__dirname, '../prisma/schema.prisma'),
    path.join(__dirname, '../../prisma/schema.prisma'),
  ];
  let prismaDir: string | undefined;
  for (const p of possiblePrismaPaths) {
    if (fs.existsSync(p)) {
      prismaDir = path.dirname(p);
      break;
    }
  }
  
  if (!prismaDir) {
    console.error('[DB] ERROR: prisma/schema.prisma not found in any of:', possiblePrismaPaths);
    return;
  }
  
  console.error('[DB] Found prisma dir:', prismaDir);
  const cwd = path.dirname(prismaDir);
  const prismaBin = path.join(cwd, 'node_modules/.bin/prisma');
  const npxBin = path.join(cwd, 'node_modules/.bin/npx');
  const prismaCmd = fs.existsSync(prismaBin) ? prismaBin : 'npx prisma';
  const npxCmd = fs.existsSync(npxBin) ? npxBin : 'npx';
  
  console.error('[DB] Checking database tables...');
  try {
    await PrismaService.client.$queryRaw`SELECT 1 FROM Agent LIMIT 1`;
    console.error('[DB] Tables already exist, skipping init');
  } catch {
    console.error('[DB] Tables not found, running migrations from', cwd);
    try {
      execSync(`${prismaCmd} migrate deploy`, { cwd, stdio: 'inherit' });
      console.error('[DB] Migrations complete');
    } catch (e) {
      console.error('[DB] migrate deploy failed, trying db push...', e);
      try {
        execSync(`${prismaCmd} db push`, { cwd, stdio: 'inherit' });
        console.error('[DB] DB push complete');
      } catch (e2) {
        console.error('[DB] DB push also failed:', e2);
      }
    }
    try {
      execSync(`${npxCmd} prisma db seed`, { cwd, stdio: 'inherit' });
      console.error('[DB] Seed complete');
    } catch (e) {
      console.error('[DB] Seed failed:', e);
    }
  }
}

async function main() {
  // 连接数据库
  await PrismaService.connect();
  await initDatabase();

  // 从 providers.json 同步 Framework 和 Engine 到数据库
  try {
    const syncStats = await syncProvidersToDatabase();
    console.log(`[Init] Provider sync: ${syncStats.frameworks.created} frameworks created, ${syncStats.frameworks.updated} updated; ${syncStats.engines.created} engines created, ${syncStats.engines.updated} updated`);
  } catch (err) {
    console.error('[Init] Provider sync failed:', err);
  }

  const host = process.env.HOST || '127.0.0.1';
  app.listen(PORT, host, () => {
    console.log(`🌸 Headless Garden backend listening on http://${host}:${PORT}`);
    console.log(`📋 Health: http://${host}:${PORT}/api/health`);
    console.log('🔌 Database: SQLite (Prisma); frontend serving removed');
  });
}

main().catch(async (err) => {
  console.error('Failed to start server:', err);
  await PrismaService.disconnect();
  process.exit(1);
});
