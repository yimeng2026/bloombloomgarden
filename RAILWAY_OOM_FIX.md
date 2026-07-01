# 千界花园 — Railway 部署 OOM 问题解决指南

## 问题诊断

Railway free plan 构建时 exit code 137 = **内存不足（OOM）**。Vite 前端构建需要 >512MB 内存，free plan 不够。

## 解决方案（推荐方案2）

### 方案1：升级 Railway Plan（付费）

Railway Hobby plan（$5/月）提供 1GB 内存，足够构建。

### 方案2：前端预构建 + Railway 只跑后端（推荐）

**原理**：本地/GitHub Actions 构建好前端 dist 目录，push 到仓库，Railway Dockerfile 跳过前端构建阶段，直接 serve。

**步骤：**

```bash
# 1. 本地构建前端
cd C:\Users\一梦\bloombloomgarden\frontend
npm install
npm run build
# 生成 frontend/dist/ 目录

# 2. 确保 dist 在 git 中（修改 .gitignore）
# 打开 .gitignore，删除或注释掉这行：
# dist/

# 3. push dist 到 GitHub
cd C:\Users\一梦\bloombloomgarden
git add frontend/dist/
git commit -m "Add prebuilt frontend dist"
git push origin main
```

**修改 Dockerfile**（跳过前端构建）：

```dockerfile
# 千界花园 — Railway 优化版 Dockerfile（前端预构建）
# 前端已在本地/Github Actions 构建好，此 Dockerfile 只构建后端 + serve 静态文件

# Stage 1: 构建后端
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts --legacy-peer-deps
COPY backend/ ./
RUN npm run build

# Stage 2: 运行（Alpine 更省内存）
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
```

### 方案3：换 Render.com（免费额度更高）

Render.com free plan 提供 512MB 内存，且构建时间限制更宽松。

项目已包含 `render.yaml`，直接导入 Render Dashboard 即可。

### 方案4：GitHub Actions 构建 + Railway 只部署

配置 `.github/workflows/build-and-push.yml`：

```yaml
name: Build and Push to Railway

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 构建前端
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

      # 提交 dist 到仓库（自动提交）
      - name: Commit dist
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add frontend/dist/
          git diff --cached --quiet || git commit -m "Update frontend dist"
          git push
```

## 立即行动建议

**最快修复（方案2简化版）：**

```powershell
# 1. 在前端目录构建（你的电脑内存够）
cd C:\Users\一梦\bloombloomgarden\frontend
npm install
npm run build

# 2. 把 dist 加入 git
cd C:\Users\一梦\bloombloomgarden
git add frontend/dist/
git commit -m "Add prebuilt frontend for Railway"

# 3. 修改 Dockerfile（删除前端构建 stage，直接从 COPY frontend/dist）
# 用文本编辑器打开 Dockerfile，把 Stage 1（frontend-builder）删除，
# 把 "COPY --from=frontend-builder" 改成 "COPY frontend/dist"

# 4. push
git add Dockerfile
git commit -m "Optimize Dockerfile for Railway memory"
git push origin main
```

Push 后 Railway 构建时间会大幅缩短，内存占用减少 60% 以上。
