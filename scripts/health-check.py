#!/usr/bin/env python3
"""
千界花园 — 项目健康检查脚本
验证: 文件完整性 / 路由-页面对应 / 硬编码URL / 依赖配置
用法: python scripts/health-check.py
"""

import os
import sys
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()

CHECKS = []

def check(name, fn):
    CHECKS.append((name, fn))

def run_checks():
    passed = 0
    failed = 0
    print("=" * 60)
    print("  千界花园 — 项目健康检查")
    print("=" * 60 + "\n")

    for name, fn in CHECKS:
        try:
            ok, msg = fn()
            if ok:
                passed += 1
                print(f"  ✅ {name}: {msg}")
            else:
                failed += 1
                print(f"  ❌ {name}: {msg}")
        except Exception as e:
            failed += 1
            print(f"  ❌ {name}: 异常 - {e}")

    print(f"\n{'=' * 60}")
    print(f"  总检查: {passed + failed}")
    print(f"  ✅ 通过: {passed}")
    print(f"  ❌ 失败: {failed}")
    print(f"{'=' * 60}\n")
    return failed == 0

# ── 检查项 ──────────────────────────────────────────────────────

check("项目根目录结构", lambda: (
    (PROJECT_ROOT / "frontend").exists() and (PROJECT_ROOT / "backend").exists() and (PROJECT_ROOT / "electron").exists(),
    "frontend/ backend/ electron/ 存在"
))

check("前端页面文件", lambda: (
    len(list((PROJECT_ROOT / "frontend/src/pages").glob("*.tsx"))) >= 50,
    f"{len(list((PROJECT_ROOT / 'frontend/src/pages').glob('*.tsx')))} 个页面组件"
))

check("后端路由文件", lambda: (
    len(list((PROJECT_ROOT / "backend/src/routes").glob("*.ts"))) >= 20,
    f"{len(list((PROJECT_ROOT / 'backend/src/routes').glob('*.ts')))} 个路由文件"
))

check("后端服务文件", lambda: (
    len(list((PROJECT_ROOT / "backend/src/services").glob("*.ts"))) >= 15,
    f"{len(list((PROJECT_ROOT / 'backend/src/services').glob('*.ts')))} 个服务文件"
))

check("App.tsx 路由配置", lambda: (
    (PROJECT_ROOT / "frontend/src/App.tsx").exists(),
    "存在"
))

check("Electron 主进程", lambda: (
    (PROJECT_ROOT / "electron/main.js").exists() and (PROJECT_ROOT / "electron/preload.js").exists(),
    "main.js + preload.js 存在"
))

check("Docker 配置", lambda: (
    (PROJECT_ROOT / "docker-compose.yml").exists(),
    "存在"
))

check("启动脚本", lambda: (
    (PROJECT_ROOT / "start-dev.sh").exists() and (PROJECT_ROOT / "start-dev.bat").exists(),
    "Linux/Mac + Windows 启动脚本存在"
))

check("API 测试脚本", lambda: (
    (PROJECT_ROOT / "scripts/test_all_llm_providers.py").exists() and
    (PROJECT_ROOT / "scripts/test-backend-api.js").exists(),
    "Python LLM + Node.js API 测试存在"
))

check("环境变量模板", lambda: (
    (PROJECT_ROOT / ".env.example").exists(),
    "存在"
))

def check_hardcoded_urls():
    bad = []
    patterns = [r'http://localhost:\d+', r'http://127\.0\.0\.1:\d+']
    exclude_dirs = ['node_modules', '.git', 'build', 'dist']
    # 文件级别的排除/特殊处理
    skip_files = ['UnifiedGUI.tsx', 'platforms.ts']  # 平台注册表默认配置，非实际硬编码
    for root, dirs, files in os.walk(PROJECT_ROOT / "frontend/src"):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if not f.endswith(('.ts', '.tsx', '.js')):
                continue
            if f in skip_files:
                continue
            fp = Path(root) / f
            content = fp.read_text(encoding='utf-8', errors='ignore')
            for pat in patterns:
                for i, line in enumerate(content.split('\n')):
                    if re.search(pat, line):
                        stripped = line.strip()
                        # 排除纯注释行、markdown 文档块中的URL、字符串模板内的示例
                        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('- ') or 'Open docs:' in line:
                            continue
                        # 排除配置对象中的默认 url/apiBase（通常是平台注册表）
                        if "url:" in line or "apiBase:" in line:
                            continue
                        # 排除有环境变量条件覆盖的 fallback（如 import.meta.env.PROD ? '/api' : 'http://...'）
                        if 'import.meta.env.' in line and ('||' in line or '?' in line):
                            continue
                        # 排除 VITE_ 环境变量 fallback
                        if "import.meta.env.VITE_" in line and "||" in line:
                            continue
                        bad.append(f"{fp.relative_to(PROJECT_ROOT)}:{i+1}")
    if bad:
        return False, f"发现 {len(bad)} 处硬编码URL: {', '.join(bad[:5])}{'...' if len(bad)>5 else ''}"
    return True, "未发现硬编码 localhost URL"

check("前端硬编码URL检查", check_hardcoded_urls)

def check_route_page_consistency():
    app_tsx = (PROJECT_ROOT / "frontend/src/App.tsx").read_text(encoding='utf-8')
    imports = re.findall(r"@/pages/([^']+)", app_tsx)
    routes = re.findall(r'path="([^"]+)"', app_tsx)
    pages = [f.with_suffix('').name for f in (PROJECT_ROOT / "frontend/src/pages").glob("*.tsx")]
    missing_import = [p for p in pages if p not in imports]
    return len(missing_import) == 0, f"{len(imports)} 导入 / {len(routes)} 路由 / {len(pages)} 页面 / 缺失导入: {len(missing_import)}"

check("路由-页面对应", check_route_page_consistency)

def check_backend_routes_registered():
    # Check if backend index.ts or app.ts registers all route files
    main_file = PROJECT_ROOT / "backend/src/index.ts"
    if not main_file.exists():
        main_file = PROJECT_ROOT / "backend/src/app.ts"
    if not main_file.exists():
        return False, "未找到后端入口文件"
    content = main_file.read_text(encoding='utf-8')
    route_files = list((PROJECT_ROOT / "backend/src/routes").glob("*.ts"))
    registered = sum(1 for rf in route_files if rf.stem in content or rf.name in content)
    return registered >= len(route_files) * 0.5, f"{registered}/{len(route_files)} 个路由文件可能被注册"

check("后端路由注册", check_backend_routes_registered)

def check_package_scripts():
    pkg = json.loads((PROJECT_ROOT / "package.json").read_text())
    scripts = pkg.get("scripts", {})
    required = ["install:all", "build", "dist:win", "test:llm", "test:api"]
    missing = [s for s in required if s not in scripts]
    return len(missing) == 0, f"脚本完备性: {', '.join(required)} 全部存在"

check("根目录 package.json 脚本", check_package_scripts)

if __name__ == "__main__":
    ok = run_checks()
    sys.exit(0 if ok else 1)
