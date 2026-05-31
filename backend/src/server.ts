import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import express from 'express';
import app from './app';
import { PrismaService } from './services/PrismaService';

const PORT = process.env.PORT || 3001;

async function initDatabase() {
  try {
    // 检查表是否存在
    await PrismaService.client.$queryRaw`SELECT 1 FROM Agent LIMIT 1`;
    console.log('[DB] Tables already exist, skipping init');
  } catch {
    console.log('[DB] Tables not found, running migrations...');
    const cwd = process.cwd();
    try {
      execSync('npx prisma migrate deploy', { cwd, stdio: 'inherit' });
      console.log('[DB] Migrations complete');
    } catch (e) {
      console.log('[DB] migrate deploy failed, trying db push...');
      try {
        execSync('npx prisma db push', { cwd, stdio: 'inherit' });
        console.log('[DB] DB push complete');
      } catch (e2) {
        console.error('[DB] DB push also failed:', e2);
      }
    }
    try {
      execSync('npx prisma db seed', { cwd, stdio: 'inherit' });
      console.log('[DB] Seed complete');
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
