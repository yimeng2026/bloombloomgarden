@echo off
REM dockerhub-push.bat — Windows 手动推送 Docker 镜像到 DockerHub
REM 用法: dockerhub-push.bat [tag]
REM 默认 tag: latest

set IMAGE_NAME=zmx72/thousand-realms-garden
if "%~1"=="" (
  set TAG=latest
) else (
  set TAG=%~1
)

echo === 千界花园 Docker 镜像构建与推送 ===
echo 镜像: %IMAGE_NAME%:%TAG%
echo.

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
  echo ❌ Docker 未安装
  exit /b 1
)

REM 登录 DockerHub
echo 🔐 登录 DockerHub（用户名: zmx72）...
docker login -u zmx72
if errorlevel 1 (
  echo ❌ DockerHub 登录失败
  exit /b 1
)

REM 构建
echo 🔨 构建镜像...
docker build -t "%IMAGE_NAME%:%TAG%" .

REM 推送
echo 🚀 推送到 DockerHub...
docker push "%IMAGE_NAME%:%TAG%"

echo.
echo ✅ 推送完成！
echo 拉取命令: docker pull %IMAGE_NAME%:%TAG%
pause
