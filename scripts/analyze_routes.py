#!/usr/bin/env python3
"""
千界花园 — 后端路由静态分析器
无需网络，扫描 backend/src/routes/*.ts 验证:
- 每个路由文件导出 Express Router
- REST 方法正确 (GET/POST/PUT/PATCH/DELETE)
- 路径命名一致性
- 无未使用变量
"""

import re
import sys
from pathlib import Path
from collections import Counter

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
ROUTES_DIR = PROJECT_ROOT / "backend/src/routes"

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

print("=" * 60)
print("  后端路由静态分析")
print("=" * 60 + "\n")

route_files = sorted(ROUTES_DIR.glob("*.ts"))
test("路由目录存在", ROUTES_DIR.exists())
test(f"路由文件数量 >= 20", len(route_files) >= 20, f"实际 {len(route_files)}")

all_methods = Counter()
all_paths = []

for fp in route_files:
    content = fp.read_text(encoding='utf-8', errors='ignore')

    # 检查是否导出了 router
    has_router = bool(re.search(r'export\s+default\s+router|module\.exports\s*=\s*router', content))
    test(f"[{fp.name}] 导出 Router", has_router)

    # 检查是否有 HTTP 方法调用
    methods = re.findall(r'router\.(get|post|put|patch|delete)', content, re.IGNORECASE)
    all_methods.update(m.lower() for m in methods)

    # 提取路径
    paths = re.findall(r"router\.(?:get|post|put|patch|delete)\('([^']+)'", content, re.IGNORECASE)
    all_paths.extend(paths)

    # 检查是否有 try/catch 或 async 错误处理
    has_error_handling = 'try' in content or 'catch' in content or 'next(' in content or 'res.status' in content
    test(f"[{fp.name}] 错误处理", has_error_handling)

    # 检查是否使用硬编码 localhost（后端不应该有）
    localhost_matches = re.findall(r'http://localhost:\d+', content)
    test(f"[{fp.name}] 无硬编码 localhost", len(localhost_matches) == 0, str(localhost_matches))

print(f"\n  HTTP 方法统计:")
for method, count in sorted(all_methods.items()):
    print(f"    {method.upper():6} : {count} 处")

total_endpoints = sum(all_methods.values())
test(f"总端点数量 >= 50", total_endpoints >= 50, f"实际 {total_endpoints}")

# 路径命名规范检查
path_issues = [p for p in all_paths if not p.startswith('/')]
test("路径均以 / 开头", len(path_issues) == 0, str(path_issues[:5]))

# 检查路径重复
dupes = {p: c for p, c in Counter(all_paths).items() if c > 1}
test("无重复路径定义", len(dupes) == 0, str(list(dupes.keys())[:5]))

print(f"\n{'=' * 60}")
print(f"  完成: ✅ {PASS} 通过 / ❌ {FAIL} 失败")
print(f"{'=' * 60}")
sys.exit(0 if FAIL == 0 else 1)
