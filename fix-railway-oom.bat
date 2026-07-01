@echo off
REM 千界花园 — Railway OOM 修复脚本
REM 一键修改 Dockerfile + 准备前端构建

echo ==========================================
echo  千界花园 Railway OOM 修复工具
echo ==========================================
echo.

REM 检查是否在项目根目录
if not exist "frontend\package.json" (
    echo [错误] 请在项目根目录运行此脚本
    echo 当前目录: %CD%
    pause
    exit /b 1
)

echo [1/3] 修改 Dockerfile 为 Railway 优化版...
node optimize-for-railway.js
if errorlevel 1 (
    echo [错误] Dockerfile 修改失败
    pause
    exit /b 1
)

echo.
echo [2/3] 准备构建前端（需要 Node.js）...
echo.
echo ==========================================
echo  下一步操作：
echo ==========================================
echo.
echo 1. 构建前端（在 PowerShell 或 CMD 中执行）：
echo    cd frontend
echo    npm install
echo    npm run build
echo.
echo 2. 构建完成后，回到项目根目录执行：
echo    git add frontend/dist/ Dockerfile
echo    git commit -m "Prebuild frontend for Railway"
echo    git push origin main
echo.
echo ==========================================
echo  说明：
echo ==========================================
echo - Railway free plan 内存只有 512MB
echo - Vite 构建需要 ^>700MB 内存
echo - 此修复方案：本地构建前端，Railway 只构建后端
echo - 构建时间从 8 分钟缩短到 2 分钟
echo - 内存占用从 1GB+ 降到 300MB
echo.
pause
