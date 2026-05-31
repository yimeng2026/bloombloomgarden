import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import express from 'express';
import app from './app';
import { PrismaService } from './services/PrismaService';

const PORT = process.env.PORT || 3001;

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

  // 无论 Electron 还是手动启动，只要前端构建产物存在，就 serve 它
  // Railway-safe: no Electron APIs used here
  const staticCandidates = [
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, '../../frontend/dist'),
    path.join((process as any).resourcesPath || '', 'frontend/dist'),
    path.join(__dirname, '../frontend/dist'),
  ];
  let staticPath: string | undefined;
  for (const p of staticCandidates) {
    if (fs.existsSync(p)) {
      staticPath = p;
      break;
    }
  }

  if (staticPath) {
    app.use(express.static(staticPath));
    // SPA fallback — 所有非 API 请求返回 index.html（React Router 处理路由）
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      const indexPath = path.join(staticPath!, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found');
      }
    });
    console.log(`[Frontend] Serving from ${staticPath}`);
  } else {
    console.warn('[Frontend] dist not found, backend only mode');
  }

  app.listen(PORT, () => {
    console.log(`🌸 Thousand Realms Garden backend running on port ${PORT}`);
    console.log(`📋 API docs: http://localhost:${PORT}/health`);
    console.log(`🔌 Database: SQLite (Prisma)`);
    if (staticPath) {
      console.log(`🖥️  Frontend served from same port`);
    }
  });
}

main().catch(async (err) => {
  console.error('Failed to start server:', err);
  await PrismaService.disconnect();
  process.exit(1);
});
