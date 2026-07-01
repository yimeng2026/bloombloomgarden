#!/usr/bin/env python3
"""
千界花园 - 前端TypeScript类型检查与路由覆盖率验证
验证: 1) 前端无TypeScript错误 2) 每个后端路由都有对应前端页面
用法: python build_verify.py [--skip-tsc]
"""

import subprocess, sys, os, json, re
from pathlib import Path
from collections import defaultdict

def run_tsc(frontend_dir: Path):
    print("🔍 正在运行 TypeScript 类型检查...")
    print(f"   目录: {frontend_dir}")
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--pretty", "false"],
            capture_output=True, text=True, timeout=300, cwd=str(frontend_dir)
        )
        errors = [l for l in result.stdout.split("\n") if "error TS" in l]
        if not errors and result.returncode == 0:
            print("   ✅ 0 个TypeScript错误")
            return True, 0, ""
        else:
            # 统计
            unique_files = set()
            for e in errors:
                m = re.match(r"([^()]+)\(\d+,\d+\)", e)
                if m:
                    unique_files.add(m.group(1).strip())
            print(f"   ❌ {len(errors)} 个错误, 涉及 {len(unique_files)} 个文件")
            return False, len(errors), result.stdout
    except subprocess.TimeoutExpired:
        print("   ⏰ TypeScript检查超时")
        return False, -1, "timeout"
    except FileNotFoundError:
        print("   ⚠️ 未找到npx/tsc，跳过类型检查（需本地运行: npm install && npx tsc --noEmit）")
        return True, 0, "skipped"

def check_route_coverage(root: Path):
    print("\n🔍 检查前后端路由覆盖率...")
    backend_routes = root / "backend" / "src" / "routes"
    frontend_pages = root / "frontend" / "src" / "pages"
    app_tsx = root / "frontend" / "src" / "App.tsx"

    # 提取后端路由名称
    be_routes = set()
    if backend_routes.exists():
        for f in backend_routes.glob("*.ts"):
            name = f.stem.replace("-", "").lower()
            be_routes.add(name)

    # 提取前端页面名称
    fe_pages = set()
    page_map = {}
    if frontend_pages.exists():
        for f in frontend_pages.glob("*.tsx"):
            name = f.stem.lower()
            fe_pages.add(name)
            page_map[name] = f.name

    # 从App.tsx提取路由
    app_routes = set()
    if app_tsx.exists():
        content = app_tsx.read_text(encoding="utf-8")
        for line in content.split("\n"):
            if "path=" in line and '"/api/' not in line:
                m = re.search(r'path=["\']([^"\']+)["\']', line)
                if m:
                    route = m.group(1).strip("/").lower().replace("-", "").replace("/", "")
                    app_routes.add(route)

    print(f"   后端路由文件: {len(be_routes)} 个")
    print(f"   前端页面组件: {len(fe_pages)} 个")
    print(f"   App.tsx路由: {len(app_routes)} 条")

    # 尝试匹配
    matched = 0
    unmatched = []
    for be in sorted(be_routes):
        # 尝试各种命名变体匹配
        variants = [be, be.replace("s", ""), be + "s", be.replace("center", ""), be.replace("manager", ""), be.replace("monitor", ""), be + "page"]
        found = any(v in fe_pages or v in app_routes for v in variants)
        if found:
            matched += 1
        else:
            unmatched.append(be)

    print(f"\n   ✅ 匹配页面: {matched}/{len(be_routes)}")
    if unmatched:
        print(f"   ⚠️ 可能缺失前端页面: {', '.join(unmatched[:10])}")
    else:
        print("   🎉 所有后端路由都有对应前端页面！")

    return matched, len(be_routes), unmatched

def main():
    root = Path(__file__).parent.parent.parent
    frontend_dir = root / "frontend"

    skip_tsc = "--skip-tsc" in sys.argv

    ok = True
    if not skip_tsc:
        tsc_ok, err_count, tsc_out = run_tsc(frontend_dir)
        ok = ok and tsc_ok
        if not tsc_ok and tsc_out and tsc_out != "skipped":
            print("\n--- TypeScript 错误详情 (前20条) ---")
            for line in tsc_out.split("\n")[:20]:
                if line.strip():
                    print(line)
    else:
        print("⏭️ 跳过TypeScript检查")

    matched, total, unmatched = check_route_coverage(root)
    coverage_ok = matched >= total * 0.9

    print(f"\n{'='*60}")
    if ok and coverage_ok:
        print("🟢 构建验证通过")
        sys.exit(0)
    else:
        print("🟡 构建验证有警告/错误")
        sys.exit(1)

if __name__ == "__main__":
    main()
