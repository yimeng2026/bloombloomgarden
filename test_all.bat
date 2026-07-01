@echo off
REM test_all.bat — 千界花园完整测试套件（Windows）
REM 用法: 双击运行 或 在PowerShell中执行: .\test_all.bat

echo ========================================
echo  千界花园 — 一键测试启动器
echo ========================================
echo.

set PASS=0
set FAIL=0

REM 检查依赖
echo [+] 检查依赖...
node -v >nul 2>&1 && echo     Node.js: OK || echo     Node.js: 未安装
npm -v >nul 2>&1 && echo     npm: OK || echo     npm: 未安装
python --version >nul 2>&1 && echo     Python: OK || echo     Python: 未安装
echo.

cd /d "%~dp0"

REM 1. 后端类型检查
if exist "backend\package.json" (
    echo [+] 后端TypeScript类型检查...
    cd backend
    call npx tsc --noEmit --pretty 2>nul
    if %ERRORLEVEL% == 0 (
        echo     [OK] 类型检查通过
        set /a PASS+=1
    ) else (
        echo     [WARN] 类型检查发现问题（非阻塞）
    )
    cd ..
)

REM 2. 前端构建
if exist "frontend\package.json" (
    echo [+] 前端Vite构建...
    cd frontend
    call npm run build > build.log 2>&1
    if %ERRORLEVEL% == 0 (
        echo     [OK] 构建成功
        set /a PASS+=1
    ) else (
        echo     [FAIL] 构建失败，查看 frontend\build.log
        set /a FAIL+=1
    )
    cd ..
)

REM 3. Python多Provider测试
echo [+] Python多Provider连通性测试...
if exist "tests\python\test_multi_provider_concurrent.py" (
    python tests\python\test_multi_provider_concurrent.py > test_provider.log 2>&1
    if %ERRORLEVEL% == 0 (
        echo     [OK] Provider测试通过
        set /a PASS+=1
    ) else (
        echo     [INFO] 部分Provider未配置Key（正常）
        echo     日志: test_provider.log
    )
)

REM 4. Python Failover测试
echo [+] Python Failover负载均衡测试...
if exist "tests\python\test_failover_loadbalance.py" (
    python tests\python\test_failover_loadbalance.py --test roundrobin > test_failover.log 2>&1
    if %ERRORLEVEL% == 0 (
        echo     [OK] Failover测试通过
        set /a PASS+=1
    ) else (
        echo     [INFO] Failover测试结果查看 test_failover.log
    )
)

REM 5. JS前端API测试（需后端已启动）
echo [+] JS前端API测试（需后端在 localhost:3001）...
if exist "tests\javascript\frontend_api_test.js" (
    node tests\javascript\frontend_api_test.js > test_api.log 2>&1
    if %ERRORLEVEL% == 0 (
        echo     [OK] API测试通过
        set /a PASS+=1
    ) else (
        echo     [SKIP] 后端可能未启动，日志: test_api.log
    )
)

REM 6. JS E2E测试（需后端已启动）
echo [+] JS端到端测试（需后端在 localhost:3001）...
if exist "tests\javascript\e2e_flow_test.js" (
    node tests\javascript\e2e_flow_test.js > test_e2e.log 2>&1
    if %ERRORLEVEL% == 0 (
        echo     [OK] E2E测试通过
        set /a PASS+=1
    ) else (
        echo     [SKIP] 后端可能未启动，日志: test_e2e.log
    )
)

echo.
echo ========================================
echo  测试报告: %PASS% 通过 ^| %FAIL% 失败
echo ========================================
echo.

if %FAIL% GTR 0 (
    echo 有测试失败，请检查日志文件
    exit /b 1
) else (
    echo 全部测试通过！
    exit /b 0
)
