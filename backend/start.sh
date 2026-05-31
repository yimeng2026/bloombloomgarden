#!/bin/sh
# 千界花园后端启动脚本 — 自动初始化数据库

echo "🌸 千界花园后端启动中..."
echo "PWD: $(pwd)"
echo "LS: $(ls -la)"

# 找到 prisma 目录
PRISMA_DIR=""
for d in "prisma" "backend/prisma" "../prisma"; do
  if [ -f "$d/schema.prisma" ]; then
    PRISMA_DIR="$d"
    break
  fi
done

if [ -z "$PRISMA_DIR" ]; then
  echo "❌ 错误: 找不到 prisma/schema.prisma"
  echo "当前目录: $(pwd)"
  echo "目录内容: $(ls -la)"
  exit 1
fi

echo "✅ 找到 prisma 目录: $PRISMA_DIR"

# 数据库迁移
echo "📦 运行数据库迁移..."
if [ -f "node_modules/.bin/prisma" ]; then
  echo "使用本地 prisma CLI"
  node_modules/.bin/prisma migrate deploy --schema="$PRISMA_DIR/schema.prisma" || true
elif [ -f "../node_modules/.bin/prisma" ]; then
  echo "使用上级目录 prisma CLI"
  ../node_modules/.bin/prisma migrate deploy --schema="$PRISMA_DIR/schema.prisma" || true
else
  echo "尝试 npx prisma"
  npx prisma migrate deploy --schema="$PRISMA_DIR/schema.prisma" || true
fi

# 数据库 seed
echo "🌱 运行数据库 seed..."
if [ -f "node_modules/.bin/prisma" ]; then
  node_modules/.bin/prisma db seed --schema="$PRISMA_DIR/schema.prisma" || true
elif [ -f "../node_modules/.bin/prisma" ]; then
  ../node_modules/.bin/prisma db seed --schema="$PRISMA_DIR/schema.prisma" || true
else
  npx prisma db seed --schema="$PRISMA_DIR/schema.prisma" || true
fi

# 启动后端
echo "🚀 启动后端服务..."
exec node dist/server.js
