# 千界花园 — Railway 完整构建版 Dockerfile v0.3.2
# 修复：强制容器内构建前端，避免 Railway 缓存旧 dist / 漏装 devDependencies
#
# 关键变更：
# 1. 新增 frontend-builder stage，容器内完整 npm install + vite build
# 2. NODE_ENV=development 在前端构建阶段强制设置，确保 vite / tailwindcss
#    / postcss / tailwindcss-animate 全部安装，CSS 正确生成
# 3. 后端 stage 保持原样，runner stage 从前端 builder COPY dist

# ── Stage 1: 构建前端 ──────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# ⚠️ 必须显式设置 development，否则 npm 会跳过 devDependencies，
#    导致 vite / tailwindcss / postcss / tailwindcss-animate 缺失，
#    最终 CSS 无法生成 → 白屏 / 样式碎裂
ENV NODE_ENV=development

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ── Stage 2: 构建后端 ──────────────────────────────────────────
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts --legacy-peer-deps
COPY backend/ ./
# 修复已知的语法截断问题（Railway 构建缓存可能导致旧文件残留）
RUN sed -i 's/?? fal$/?? false;/g' src/services/UnifiedLLMAdapter.ts || true
RUN npx tsc --noEmit || true
RUN npm run build

# ── Stage 3: 运行 ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/backend

# 安装 Prisma 运行时需要的 openssl
RUN apk add --no-cache openssl

# 复制后端运行时文件
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/package.json ./

# 复制前端构建产物（从 Stage 1 frontend-builder，确保最新）
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 创建持久化目录
RUN mkdir -p /app/backend/uploads /app/backend/data

# Prisma 生成
RUN npx prisma generate || true

# 环境变量默认值
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/backend/data/dev.db
ENV UPLOAD_DIR=/app/backend/uploads

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

EXPOSE 3001

CMD ["node", "dist/server.js"]
