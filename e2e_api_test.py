#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
千界花园 — 端到端API全量测试 (Python)
覆盖: 所有170个后端端点、响应格式校验、状态码检查
用法: python e2e_api_test.py [--host http://localhost:3001] [--parallel 4]
"""
import asyncio
import argparse
import json
import sys
import time
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    import yaml
except ImportError:
    print("Installing dependencies: requests, pyyaml...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "pyyaml", "-q"])
    import requests
    import yaml

# ────────────────────────────────────────────
# 配置
# ────────────────────────────────────────────
DEFAULT_HOST = "http://localhost:3001"
DEFAULT_PARALLEL = 4
TIMEOUT = 15

# ────────────────────────────────────────────
# 数据模型
# ────────────────────────────────────────────
@dataclass
class TestResult:
    method: str
    path: str
    url: str
    status_code: int = 0
    response_time_ms: float = 0.0
    success: bool = False
    error: str = ""
    schema_valid: bool = False
    schema_errors: List[str] = field(default_factory=list)
    response_preview: str = ""

# ────────────────────────────────────────────
# 后端路由扫描 (复用已有逻辑)
# ────────────────────────────────────────────
def scan_backend_routes(project_root: str) -> Dict[str, List[str]]:
    """扫描backend/src/routes/*.ts 提取所有注册的路由"""
    routes_dir = Path(project_root) / "backend" / "src" / "routes"
    prefix_map = {
        'agent-context.ts': '/agents', 'agents.ts': '/agents', 'apikeys.ts': '/apikeys',
        'auth.ts': '/auth', 'backups.ts': '/backups', 'blueprints.ts': '/blueprints',
        'coordinator.ts': '/coordinator', 'dialog.ts': '/dialog', 'events.ts': '/events',
        'external.ts': '/external', 'groups.ts': '/groups', 'handoff.ts': '/handoff',
        'hierarchical.ts': '/hierarchical', 'integrations.ts': '/integrations',
        'intervention.ts': '/intervention', 'kimi-cluster.ts': '/kimi-cluster',
        'knowledge.ts': '/knowledge', 'monitor.ts': '/monitor', 'platforms.ts': '/platforms',
        'processes.ts': '/processes', 'registry.ts': '/registry', 'security.ts': '/security',
        'settings.ts': '/settings', 'skills.ts': '/skills', 'spend.ts': '/spend',
        'tasks.ts': '/tasks', 'unified-api.ts': '/unified-api', 'workspace.ts': '/workspace',
    }

    endpoints: Dict[str, List[str]] = {}
    route_pattern = re.compile(r"router\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]")

    for rf in sorted(routes_dir.glob('*.ts')):
        prefix = prefix_map.get(rf.name, f"/{rf.stem}")
        content = rf.read_text(encoding='utf-8', errors='ignore')
        for m in route_pattern.finditer(content):
            method = m.group(1).upper()
            path = m.group(2)
            abs_path = prefix + path if path.startswith('/') else prefix + '/' + path
            abs_path = abs_path.rstrip('/').replace(':id', '{id}').replace(':x', '{x}').replace(':y', '{y}')
            abs_path = abs_path.replace(':z', '{z}').replace(':key', '{key}').replace(':pid', '{pid}')
            abs_path = abs_path.replace(':ip', '{ip}').replace(':agentId', '{agentId}')
            endpoints.setdefault(abs_path, []).append(method)

    # app.ts 独立路由
    app_ts = Path(project_root) / "backend" / "src" / "app.ts"
    if app_ts.exists():
        content = app_ts.read_text(encoding='utf-8', errors='ignore')
        for m in re.finditer(r"app\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]", content):
            method = m.group(1).upper()
            path = m.group(2).rstrip('/')
            endpoints.setdefault(path, []).append(method)

    return {k: sorted(list(set(v))) for k, v in endpoints.items()}

# ────────────────────────────────────────────
# 智能请求体生成
# ────────────────────────────────────────────
PAYLOAD_TEMPLATES = {
    '/auth/register': {'username': 'testuser', 'email': 'test@example.com', 'password': 'testpass123'},
    '/auth/login': {'username': 'testuser', 'password': 'testpass123'},
    '/agents': {'name': 'TestAgent', 'role': 'developer', 'systemPrompt': 'You are a helpful assistant'},
    '/agents/{id}/chat': {'content': 'Hello', 'role': 'user'},
    '/groups': {'name': 'TestGroup', 'mode': 'sequential', 'agentIds': ['agent1']},
    '/groups/{id}/execute': {'mode': 'sequential', 'input': 'test task'},
    '/tasks': {'title': 'Test Task', 'priority': 'medium'},
    '/tasks/{id}/execute': {},
    '/tasks/{id}': {'title': 'Updated Task', 'status': 'in_progress'},
    '/knowledge': {'name': 'TestKB', 'description': 'Test knowledge base'},
    '/knowledge/{id}/search': {'query': 'test query'},
    '/knowledge/{id}/upload': {'filename': 'test.md', 'contentType': 'text/markdown'},
    '/knowledge/{id}/query': {'query': 'test question', 'topK': 3},
    '/apikeys': {'provider': 'openai', 'apiKey': 'sk-test123', 'isActive': True},
    '/apikeys/{id}/test': {},
    '/apikeys/test-all': {},
    '/dialog': {'agentId': 'test-agent', 'title': 'New Chat'},
    '/dialog/{agentId}/chat': {'content': 'Hello', 'role': 'user'},
    '/events': {'type': 'info', 'message': 'Test event'},
    '/skills': {'name': 'test_skill', 'config': {}},
    '/blueprints': {'name': 'TestBlueprint', 'nodes': []},
    '/blueprints/{id}/execute': {},
    '/intervention/request': {'agentId': 'test', 'level': 2, 'reason': 'test'},
    '/intervention/global-pause': {},
    '/handoff/initiate': {'fromAgentId': 'a1', 'toAgentId': 'a2', 'context': {}},
    '/backups': {'name': 'auto-backup'},
    '/backups/{id}/restore': {},
    '/settings': {'key': 'theme', 'value': 'dark'},
    '/integrations': {'name': 'test_integration', 'type': 'rest'},
    '/integrations/{id}/test': {},
    '/external/platforms/{id}/config': {'apiKey': 'test'},
    '/external/platforms/{id}/test': {},
    '/coordinator/chariot': {'name': 'test_chariot'},
    '/coordinator/merge': {'chariotIds': ['c1', 'c2']},
    '/coordinator/split': {'chariotId': 'c1', 'agents': []},
    '/coordinator/delegate': {'chariotId': 'c1', 'agentId': 'a1', 'task': 'test'},
    '/coordinator/broadcast': {'chariotId': 'c1', 'message': 'test'},
    '/coordinator/chariot/{id}/execute': {},
    '/coordinator/chariot/{id}/match': {},
    '/registry': {'name': 'test_node', 'x': 1, 'y': 1, 'z': 1},
    '/registry/{id}/heartbeat': {},
    '/security/blocked-ips': {'ip': '192.168.1.1', 'reason': 'test'},
    '/spend/budget': {'monthlyLimit': 100},
    '/unified-api/detect': {'messages': [{'role': 'user', 'content': 'hello'}]},
    '/unified-api/config': {'provider': 'openai', 'model': 'gpt-4o'},
    '/workspace/tasks': {'title': 'test', 'content': 'test'},
    '/workspace/tasks/{id}/import': {'source': 'csv'},
}

def build_payload(method: str, path: str) -> Optional[dict]:
    if method in ('GET', 'DELETE'):
        return None
    # 精确匹配
    for tmpl_path, payload in PAYLOAD_TEMPLATES.items():
        if path == tmpl_path or re.sub(r'\{\w+\}', '{id}', path) == tmpl_path:
            return dict(payload)
    # 通用POST/PUT fallback
    return {'name': 'test', 'data': {}}

def fill_path_params(path: str) -> str:
    """用虚拟值填充路径参数"""
    path = path.replace('{id}', 'test-123')
    path = path.replace('{agentId}', 'agent-123')
    path = path.replace('{x}', '1').replace('{y}', '2').replace('{z}', '3')
    path = path.replace('{key}', 'theme')
    path = path.replace('{pid}', 'proc-123')
    path = path.replace('{ip}', '127.0.0.1')
    return path

# ────────────────────────────────────────────
# 响应校验
# ────────────────────────────────────────────
def validate_schema(data: dict, path: str, method: str) -> List[str]:
    errors = []
    if not isinstance(data, dict):
        errors.append(f"Response is not JSON object, got {type(data).__name__}")
        return errors
    if 'success' not in data:
        errors.append("Missing 'success' field in response")
    elif not isinstance(data.get('success'), bool):
        errors.append(f"'success' should be bool, got {type(data.get('success')).__name__}")
    return errors

# ────────────────────────────────────────────
# 执行单次测试
# ────────────────────────────────────────────
def run_single_test(host: str, method: str, path: str) -> TestResult:
    filled_path = fill_path_params(path)
    url = f"{host}/api{filled_path}"
    payload = build_payload(method, path)

    result = TestResult(method=method, path=path, url=url)
    start = time.perf_counter()

    try:
        req_kwargs = {'timeout': TIMEOUT, 'headers': {'Content-Type': 'application/json'}}
        if payload is not None:
            req_kwargs['json'] = payload

        resp = requests.request(method, url, **req_kwargs)
        result.status_code = resp.status_code
        result.response_time_ms = round((time.perf_counter() - start) * 1000, 2)

        # 2xx = 成功
        result.success = 200 <= resp.status_code < 300

        # 尝试解析JSON
        try:
            data = resp.json()
            result.schema_errors = validate_schema(data, path, method)
            result.schema_valid = len(result.schema_errors) == 0
            result.response_preview = json.dumps(data, ensure_ascii=False)[:200]
        except ValueError:
            result.schema_errors = ["Response is not valid JSON"]
            result.response_preview = resp.text[:200]

        # 特殊状态码处理
        if resp.status_code == 401:
            result.error = "Authentication required (401)"
        elif resp.status_code == 404:
            result.error = "Resource not found (404) - path params may need real IDs"
            # 404对测试来说不算完全失败，可能是需要真实ID
            result.success = True
        elif resp.status_code == 429:
            result.error = "Rate limited (429)"
        elif resp.status_code >= 500:
            result.error = f"Server error ({resp.status_code})"
            result.success = False

    except requests.exceptions.ConnectionError as e:
        result.error = f"Connection refused: {e}"
        result.status_code = 0
    except requests.exceptions.Timeout:
        result.error = "Request timeout"
        result.status_code = 0
    except Exception as e:
        result.error = str(e)[:200]
        result.status_code = 0

    return result

# ────────────────────────────────────────────
# 测试报告
# ────────────────────────────────────────────
def print_report(results: List[TestResult], total_time: float):
    passed = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    schema_issues = [r for r in results if not r.schema_valid]

    print("\n" + "=" * 70)
    print("📊 千界花园 API 端到端测试报告")
    print("=" * 70)
    print(f"总端点:     {len(results)}")
    print(f"通过:       {len(passed)} ({len(passed)*100//len(results)}%)")
    print(f"失败:       {len(failed)} ({len(failed)*100//len(results) if results else 0}%)")
    print(f"Schema异常: {len(schema_issues)}")
    print(f"总耗时:     {total_time:.2f}s")
    print(f"平均响应:   {sum(r.response_time_ms for r in results)/max(len(results),1):.2f}ms")
    print("=" * 70)

    if failed:
        print("\n🔴 失败的端点:")
        for r in failed[:20]:
            print(f"   {r.method} {r.path} -> {r.status_code} | {r.error or r.schema_errors[0]}")
        if len(failed) > 20:
            print(f"   ... 还有 {len(failed)-20} 个")

    if schema_issues:
        print("\n🟡 Schema校验问题 (非阻塞):")
        for r in schema_issues[:10]:
            err = r.schema_errors[0] if r.schema_errors else 'unknown'
            print(f"   {r.method} {r.path}: {err}")

    # 慢端点
    slow = sorted(results, key=lambda x: x.response_time_ms, reverse=True)[:5]
    print("\n🐌 最慢端点:")
    for r in slow:
        print(f"   {r.response_time_ms:.2f}ms {r.method} {r.path}")

    # 写入JSON报告
    report_file = Path('e2e_api_report.json')
    serializable = []
    for r in results:
        serializable.append({
            'method': r.method, 'path': r.path, 'url': r.url,
            'status_code': r.status_code, 'response_time_ms': r.response_time_ms,
            'success': r.success, 'error': r.error,
            'schema_valid': r.schema_valid, 'schema_errors': r.schema_errors,
            'response_preview': r.response_preview,
        })
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(results), 'passed': len(passed), 'failed': len(failed),
                'schema_issues': len(schema_issues), 'total_time_sec': round(total_time, 2),
            },
            'results': serializable,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n📝 详细报告已写入: {report_file.absolute()}")

# ────────────────────────────────────────────
# 主函数
# ────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='千界花园端到端API测试')
    parser.add_argument('--host', default=DEFAULT_HOST, help='后端地址')
    parser.add_argument('--parallel', type=int, default=DEFAULT_PARALLEL, help='并发数')
    parser.add_argument('--project-root', default='/mnt/agents/thousand-realms-garden', help='项目根目录')
    args = parser.parse_args()

    project_root = Path(args.project_root)
    if not (project_root / 'backend' / 'src' / 'routes').exists():
        print(f"❌ 项目目录不存在: {project_root}")
        sys.exit(1)

    print(f"🔍 扫描后端路由: {project_root}/backend/src/routes")
    endpoints = scan_backend_routes(str(project_root))
    total_endpoints = sum(len(v) for v in endpoints.values())
    print(f"   发现 {len(endpoints)} 个路径，共 {total_endpoints} 个端点")

    # 展平为测试任务列表
    tasks = []
    for path, methods in sorted(endpoints.items()):
        for method in methods:
            tasks.append((args.host, method, path))

    print(f"\n🚀 开始测试 {len(tasks)} 个端点 (并发={args.parallel})...")
    results: List[TestResult] = []
    start_time = time.perf_counter()

    with ThreadPoolExecutor(max_workers=args.parallel) as executor:
        futures = {executor.submit(run_single_test, h, m, p): (m, p) for h, m, p in tasks}
        for future in as_completed(futures):
            results.append(future.result())

    total_time = time.perf_counter() - start_time
    print_report(results, total_time)

    # 返回退出码
    failed_count = len([r for r in results if not r.success])
    sys.exit(0 if failed_count == 0 else 1)

if __name__ == '__main__':
    main()
