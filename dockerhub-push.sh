#!/bin/bash
# dockerhub-push.sh — 手动推送 Docker 镜像到 DockerHub
# 用法: ./dockerhub-push.sh [tag]
# 默认 tag: latest

set -e

IMAGE_NAME="zmx72/thousand-realms-garden"
TAG="${1:-latest}"

echo "=== 千界花园 Docker 镜像构建与推送 ==="
echo "镜像: ${IMAGE_NAME}:${TAG}"
echo ""

# 检查 Docker
docker --version > /dev/null 2>&1 || { echo "❌ Docker 未安装"; exit 1; }

# 登录 DockerHub
echo "🔐 登录 DockerHub（用户名: zmx72）..."
docker login -u zmx72 || { echo "❌ DockerHub 登录失败"; exit 1; }

# 构建
echo "🔨 构建镜像..."
docker build -t "${IMAGE_NAME}:${TAG}" .

# 打版本标签
if [ "$TAG" = "latest" ]; then
  VERSION=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
  docker tag "${IMAGE_NAME}:latest" "${IMAGE_NAME}:${VERSION}"
  echo "🏷️ 额外标签: ${IMAGE_NAME}:${VERSION}"
fi

# 推送
echo "🚀 推送到 DockerHub..."
docker push "${IMAGE_NAME}:${TAG}"
if [ "$TAG" = "latest" ]; then
  docker push "${IMAGE_NAME}:${VERSION}"
fi

echo ""
echo "✅ 推送完成！"
echo "拉取命令: docker pull ${IMAGE_NAME}:${TAG}"
