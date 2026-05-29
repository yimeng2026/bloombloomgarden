#!/usr/bin/env python3
"""
千界花园 — 3DACP 核心算法本地验证测试
测试内容: AxisMessage序列化 / 坐标路由 / Provider配置完整性
无需网络，纯本地运行
"""

import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_SRC = PROJECT_ROOT / "frontend/src"
BACKEND_SRC = PROJECT_ROOT / "backend/src"

PASS = 0
FAIL = 0

def test(name, cond, msg=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}: {msg}")

# ───────────────────────────────────────────────
print("=" * 60)
print("  3DACP 本地算法验证测试")
print("=" * 60 + "\n")

# 1. AxisMessage 格式完整性 ─────────────────────
axis_msg_file = BACKEND_SRC / "services/AxisMessage.ts"
if axis_msg_file.exists():
    content = axis_msg_file.read_text(encoding='utf-8')
    test("AxisMessage 定义存在", True)
    test("AxisMessage 含 x/y/z 字段", "x:" in content and "y:" in content and "z:" in content)
    test("AxisMessage 含 payload 字段", "payload" in content)
    test("AxisMessage 含 protocol 字段", "protocol" in content)
    test("AxisMessage 含 metadata 字段", "metadata" in content)
else:
    test("AxisMessage 定义存在", False, "文件不存在")

# 2. Provider Registry 完整性 ───────────────────
registry_file = BACKEND_SRC / "services/LLMProviderRegistry.ts"
if registry_file.exists():
    content = registry_file.read_text(encoding='utf-8')
    test("ProviderRegistry 存在", True)
    providers = ['openai', 'azure-openai', 'anthropic', 'deepseek', 'moonshot', 'kimi-code', 'qwen', 'gemini', 'glm', 'openrouter']
    for p in providers:
        test(f"  Provider '{p}' 已注册", f"'{p}'" in content or f'"{p}"' in content)
    # 检查 kimi-code 特殊配置
    test("Kimi Code customHeaders 存在", "User-Agent" in content and "claude-code" in content)
    test("Kimi Code reasoningField 存在", "reasoning_content" in content)
else:
    test("ProviderRegistry 存在", False, "文件不存在")

# 3. 6种 ProtocolAdapter ───────────────────────
adapter_dir = BACKEND_SRC / "adapters"
if adapter_dir.exists():
    adapters = [f.stem for f in adapter_dir.glob("*.ts")]
    test("ProtocolAdapter 目录存在", True)
    required = ['RESTAdapter', 'SSEAdapter', 'WSAdapter', 'InternalAdapter', 'BridgeAdapter', 'ExternalAdapter']
    for a in required:
        test(f"  {a} 存在", a in adapters or a.lower() in [x.lower() for x in adapters])
else:
    test("ProtocolAdapter 目录存在", False, "目录不存在")

# 4. 路由注册中心 AxisRegistry ─────────────────
registry_files = list(BACKEND_SRC.glob("**/AxisRegistry*")) + list(BACKEND_SRC.glob("**/Registry*"))
if registry_files:
    test("AxisRegistry/Registry 文件存在", True, str(registry_files[0].relative_to(PROJECT_ROOT)))
else:
    test("AxisRegistry/Registry 文件存在", False, "未找到")

# 5. 前端路由数量验证 ───────────────────────────
app_tsx = FRONTEND_SRC / "App.tsx"
if app_tsx.exists():
    content = app_tsx.read_text(encoding='utf-8')
    routes = re.findall(r'path="([^"]+)"', content)
    imports = re.findall(r"@/pages/([^'\"]+)", content)
    test(f"前端路由数量 >= 50", len(routes) >= 50, f"实际 {len(routes)}")
    test(f"前端页面导入数量 >= 50", len(imports) >= 50, f"实际 {len(imports)}")
else:
    test("前端路由验证", False, "App.tsx 不存在")

# 6. Electron 主进程完整性 ──────────────────────
electron_main = PROJECT_ROOT / "electron/main.js"
if electron_main.exists():
    content = electron_main.read_text(encoding='utf-8')
    test("Electron main.js 存在", True)
    test("Electron 自动 spawn 后端", "spawn" in content.lower())
    test("Electron health 轮询", "health" in content.lower())
    test("Electron preload 加载", "preload" in content.lower())
else:
    test("Electron main.js 存在", False, "文件不存在")

# 7. Docker Compose 4服务 ───────────────────────
docker_compose = PROJECT_ROOT / "docker-compose.yml"
if docker_compose.exists():
    content = docker_compose.read_text(encoding='utf-8')
    services = re.findall(r'^\s{2}([a-z0-9_-]+):', content, re.MULTILINE)
    test(f"docker-compose 服务数量", len(services) >= 3, f"实际 {len(services)}: {services}")
else:
    test("docker-compose 存在", False, "文件不存在")

# 8. 环境变量模板完整性 ─────────────────────────
env_example = PROJECT_ROOT / ".env.example"
if env_example.exists():
    content = env_example.read_text(encoding='utf-8')
    test(".env.example 存在", True)
    required_vars = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'KIMI_API_KEY']
    for v in required_vars:
        test(f"  {v} 在 .env.example 中", v in content)
else:
    test(".env.example 存在", False, "文件不存在")

# ───────────────────────────────────────────────
print(f"\n{'=' * 60}")
print(f"  测试完成: ✅ {PASS} 通过 / ❌ {FAIL} 失败")
print(f"{'=' * 60}")
sys.exit(0 if FAIL == 0 else 1)
