#!/usr/bin/env bash
# 千界花园 — Linux/macOS 一键启动脚本
# 用法: chmod +x start-dev.sh && ./start-dev.sh

set -e

echo "========================================"
echo "  千界花园 — 快速启动"
echo "========================================"

# 检查 Node.js
echo "[1/4] 检查 Node.js..."
if ! command -v node &> /dev/null; then
  echo "[ERROR] 未安装 Node.js，请前往 https://nodejs.org 下载安装"
  exit 1
fi
echo "       Node.js 版本: $(node --version)"

# 检查后端依赖
echo "[2/4] 检查后端依赖..."
if [ ! -d "backend/node_modules" ]; then
  echo "       安装后端依赖..."
  (cd backend && npm install)
fi

# 检查前端依赖
echo "[3/4] 检查前端依赖..."
if [ ! -d "frontend/node_modules" ]; then
  echo "       安装前端依赖..."
  (cd frontend && npm install)
fi

# 启动
echo "[4/4] 启动服务..."
echo "       后端: http://localhost:3001"
echo "       前端: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "========================================"

# 使用 trap 清理
cleanup() {
  echo ""
  echo "正在停止服务..."
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

# 后台启动后端
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

# 后台启动前端
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# 等待
wait $BACKEND_PID $FRONTEND_PID
