# 千界花园 — 部署运维文档

## 一、环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Docker | 20+ | 容器运行时 |
| Docker Compose | 2+ | 编排工具 |
| Node.js | 20+ | 本地开发 |

## 二、Docker 部署

### 2.1 快速启动

```bash
cd thousand-realms-garden
docker-compose up -d
```

### 2.2 服务架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Nginx     │────▶│   Garden     │────▶│   SQLite    │
│  (80/443)   │     │  Backend     │     │   (dev.db)  │
└─────────────┘     │  (3001)      │     └─────────────┘
                    └──────────────┘
                           │
                    ┌──────┴──────┐
                    │   Redis     │
                    │  (可选)     │
                    └─────────────┘
```

### 2.3 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | production | 运行环境 |
| `PORT` | 3001 | 服务端口 |
| `DATABASE_URL` | file:/app/data/dev.db | SQLite 路径 |

### 2.4 数据持久化

```bash
# 备份
docker exec garden-backend cp /app/data/dev.db /app/data/dev.db.bak

# 恢复
docker exec garden-backend cp /app/data/dev.db.bak /app/data/dev.db
```

## 三、本地部署

### 3.1 依赖安装

```bash
cd backend
npm install
```

### 3.2 数据库初始化

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3.3 启动

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

## 四、CI/CD

### 4.1 GitHub Actions 工作流

- **触发条件**: push 到 main/develop 分支
- **测试阶段**: lint → build → E2E 测试
- **构建阶段**: Docker 镜像构建并推送到 Docker Hub
- **部署阶段**: SSH 到测试服务器执行 docker-compose 更新

### 4.2 所需 Secrets

| Secret | 说明 |
|--------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 |
| `DOCKER_PASSWORD` | Docker Hub 密码/Token |
| `SSH_HOST` | 部署服务器地址 |
| `SSH_USER` | SSH 用户名 |
| `SSH_KEY` | SSH 私钥 |

## 五、监控与日志

### 5.1 健康检查

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"2026-05-26T..."}
```

### 5.2 日志查看

```bash
# Docker
docker logs -f garden-backend

# 本地
npm run dev  # 日志输出到控制台
```

### 5.3 Prisma Studio

```bash
npx prisma studio
# 访问 http://localhost:5555
```

## 六、常见问题

### Q1: 端口冲突

```bash
# 修改 docker-compose.yml 端口映射
ports:
  - "3002:3001"  # 主机 3002 → 容器 3001
```

### Q2: 数据库权限

```bash
# 确保数据目录有写权限
chmod 777 ./data
```

### Q3: Kimi API 限流

KimiAdapter 配置了 5 个 API 密钥自动轮询，单个密钥触发 429 时会自动切换到下一个。

## 七、更新流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重建并重启
docker-compose down
docker-compose up -d --build

# 3. 验证
curl http://localhost:3001/health
```
