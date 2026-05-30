# 千界花园 — Railway 部署版 Dockerfile v0.3.3
# 前端在本地预构建（frontend/dist/），Railway 直接 COPY 避免容器内 OOM

# ── Stage 1: 构建后端 ──────────────────────────────────────────
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts --legacy-peer-deps
COPY backend/ ./
# 修复已知的语法截断问题
RUN sed -i 's/?? fal$/?? false;/g' src/services/UnifiedLLMAdapter.ts || true
RUN npx tsc --noEmit || true
RUN npm run build

# ── Stage 2: 运行 ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/backend

# 安装 openssl（Prisma 需要）
RUN apk add --no-cache openssl

# 复制后端运行时文件
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/package.json ./

# 复制前端预构建产物（从本地构建好的 dist 目录）
COPY frontend/dist /app/frontend/dist

# 创建持久化目录
RUN mkdir -p /app/backend/uploads /app/backend/data

# Prisma 生成
RUN npx prisma generate || true

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/backend/data/dev.db
ENV UPLOAD_DIR=/app/backend/uploads

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

EXPOSE 3001
CMD ["node", "dist/server.js"]
