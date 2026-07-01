const fs = require('fs');
const path = require('path');

// 读取原始 Dockerfile
const dockerfilePath = path.join(__dirname, 'Dockerfile');
let content = fs.readFileSync(dockerfilePath, 'utf-8');

// 替换为多阶段构建 + 前端预构建版本
const newDockerfile = `# 千界花园 — Railway 优化版 Dockerfile（前端预构建，避免 OOM）
# 注意：使用此 Dockerfile 前，请先本地构建前端：cd frontend && npm install && npm run build

# Stage 1: 只构建后端
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts --legacy-peer-deps
COPY backend/ ./
RUN npm run build

# Stage 2: 运行
FROM node:20-alpine AS runner
WORKDIR /app/backend

# 安装 openssl（Prisma 需要）
RUN apk add --no-cache openssl

# 复制后端运行时文件
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/package.json ./

# 复制前端预构建产物（从仓库直接复制，不走构建）
COPY frontend/dist /app/frontend/dist

# 创建持久化目录
RUN mkdir -p /app/backend/data /app/backend/uploads

# Prisma 生成
RUN npx prisma generate || true

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/backend/data/dev.db
ENV UPLOAD_DIR=/app/backend/uploads

EXPOSE 3001
CMD ["node", "dist/server.js"]
`;

fs.writeFileSync(dockerfilePath, newDockerfile, 'utf-8');
console.log('✅ Dockerfile 已更新为 Railway 优化版（跳过前端构建，避免 OOM）');
console.log('');
console.log('接下来请执行：');
console.log('  1. cd frontend && npm install && npm run build');
console.log('  2. git add frontend/dist/ Dockerfile');
console.log('  3. git commit -m "Prebuild frontend + optimize Dockerfile for Railway"');
console.log('  4. git push origin main');
