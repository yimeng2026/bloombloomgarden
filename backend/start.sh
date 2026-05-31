#!/bin/sh
# 千界花园后端启动脚本 — 自动初始化数据库

set -e

echo "🌸 千界花园后端启动中..."

# 数据库迁移
echo "📦 运行数据库迁移..."
npx prisma migrate deploy || true

# 数据库 seed
echo "🌱 运行数据库 seed..."
npx prisma db seed || true

# 启动后端
echo "🚀 启动后端服务..."
exec node dist/server.js
