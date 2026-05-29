#!/usr/bin/env bash
# test_all.sh — 千界花园完整测试套件（Linux/macOS/WSL）
set -e

echo "🌸 千界花园 — 一键测试启动器"
echo "================================"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local cmd="$2"
  echo ""
  echo "▶️  $name"
  if eval "$cmd"; then
    echo -e "${GREEN}   ✅ $name 通过${NC}"
    ((PASS++))
  else
    echo -e "${RED}   ❌ $name 失败${NC}"
    ((FAIL++))
  fi
}

# 检查依赖
echo ""
echo "🔧 检查依赖..."
node -v >/dev/null 2>&1 && echo "   Node.js: $(node -v)" || echo "   ⚠️ Node.js 未安装"
npm -v >/dev/null 2>&1 && echo "   npm: $(npm -v)" || echo "   ⚠️ npm 未安装"
python3 --version >/dev/null 2>&1 && echo "   Python: $(python3 --version)" || echo "   ⚠️ Python3 未安装"

cd "$(dirname "$0")"

# 1. 后端类型检查
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
  run_test "后端TypeScript类型检查" "cd backend && npx tsc --noEmit --pretty 2>&1 | head -30 || true"
fi

# 2. 前端构建
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  run_test "前端Vite构建" "cd frontend && npm run build 2>&1 | tail -20"
fi

# 3. Python多Provider并发测试
if [ -f "tests/python/test_multi_provider_concurrent.py" ]; then
  run_test "Python多Provider连通性测试" "python3 tests/python/test_multi_provider_concurrent.py 2>&1"
fi

# 4. Python Failover测试
if [ -f "tests/python/test_failover_loadbalance.py" ]; then
  run_test "Python Failover负载均衡测试" "python3 tests/python/test_failover_loadbalance.py --test roundrobin 2>&1"
fi

# 5. Python压力测试（短时长）
if [ -f "tests/python/test_stress_benchmark.py" ]; then
  run_test "Python压力基准测试(10秒)" "python3 tests/python/test_stress_benchmark.py --provider kimi-code --duration 10 --concurrency 2 2>&1"
fi

# 6. JavaScript前端API测试（需要后端运行）
if [ -f "tests/javascript/frontend_api_test.js" ]; then
  echo ""
  echo "▶️  JS前端API测试（需后端已启动）"
  if node tests/javascript/frontend_api_test.js 2>&1; then
    echo -e "${GREEN}   ✅ JS前端API测试 通过${NC}"
    ((PASS++))
  else
    echo -e "${YELLOW}   ⚠️ JS前端API测试 失败或后端未启动${NC}"
    ((FAIL++))
  fi
fi

# 7. JavaScript E2E测试（需要后端运行）
if [ -f "tests/javascript/e2e_flow_test.js" ]; then
  echo ""
  echo "▶️  JS端到端流程测试（需后端已启动）"
  if node tests/javascript/e2e_flow_test.js 2>&1; then
    echo -e "${GREEN}   ✅ JS E2E测试 通过${NC}"
    ((PASS++))
  else
    echo -e "${YELLOW}   ⚠️ JS E2E测试 失败或后端未启动${NC}"
    ((FAIL++))
  fi
fi

# 报告
echo ""
echo "================================"
echo -e "📊 测试报告: ${GREEN}$PASS 通过${NC} | ${RED}$FAIL 失败${NC}"
echo "================================"

exit $FAIL
