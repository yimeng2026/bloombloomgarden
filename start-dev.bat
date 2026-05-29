@echo off
chcp 65001 >nul
REM 千界花园 — Windows 一键启动脚本
REM 自动启动后端 + 前端（开发模式）

echo ========================================
echo   千界花园 — 快速启动
echo ========================================

REM 检查 Node.js
echo [1/4] 检查 Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [ERROR] 未安装 Node.js，请前往 https://nodejs.org 下载安装
  pause
  exit /b 1
)
echo       Node.js 版本: 
node --version

REM 检查后端依赖
echo [2/4] 检查后端依赖...
if not exist "backend\node_modules" (
  echo       安装后端依赖...
  cd backend && npm install && cd ..
)

REM 检查前端依赖
echo [3/4] 检查前端依赖...
if not exist "frontend\node_modules" (
  echo       安装前端依赖...
  cd frontend && npm install && cd ..
)

REM 启动后端
echo [4/4] 启动服务...
echo       后端: http://localhost:3001
echo       前端: http://localhost:5173
echo.
echo 按 Ctrl+C 两次停止所有服务
echo ========================================

start "TRG-Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 >nul
start "TRG-Frontend" cmd /k "cd frontend && npm run dev"

pause
