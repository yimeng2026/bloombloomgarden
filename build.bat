@echo off
chcp 65001 >nul
title 千界花园 — 一键打包
color 0A

echo ==========================================
echo    🌸 千界花园 — 一键打包 .exe
echo ==========================================
echo.

REM 切换到 bat 文件所在目录（项目根目录）
cd /d "%~dp0"

REM 1. 检查 Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 2. 编译后端
echo 🔧 [1/4] 编译后端...
cd backend
npx tsc --noEmitOnError false
if errorlevel 1 (
    echo ⚠️ 后端编译有错误，但会继续尝试...
)
cd ..

REM 3. 安装根目录依赖（electron-builder）
echo 📦 [2/4] 安装打包工具...
npm install --save-dev electron electron-builder

REM 4. 打包 .exe（便携版）
echo 🎁 [3/4] 打包便携版 .exe...
npx electron-builder --win portable

REM 5. 检查结果
if exist "dist\千界花园 *.exe" (
    echo.
    echo ✅ 打包成功！
    echo    文件位置：dist\千界花园 1.0.0.exe
    echo    双击即可运行
    explorer "dist"
) else (
    echo.
    echo ❌ 打包失败，请检查上面的错误信息
)

pause
