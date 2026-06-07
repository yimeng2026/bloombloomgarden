<<<<<<< HEAD
<<<<<<< HEAD
# 千界花园后端 — Dockerfile
# 多阶段构建，最小化镜像体积

# ─── 阶段 1: 依赖安装 ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# 安装 prisma 需要的 openssl
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ─── 阶段 2: 构建 ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── 阶段 3: 运行 ─────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# 仅安装运行所需的最小依赖
RUN apk add --no-cache openssl

# 复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 创建数据目录
RUN mkdir -p /app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3001

CMD ["node", "dist/server.js"]
=======
=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package.json ./
RUN npm install --production

# 复制服务代码
COPY services/ ./services/
COPY deployments/ ./deployments/

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "services/platformProxy.js"]
<<<<<<< HEAD
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
