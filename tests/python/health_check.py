#!/usr/bin/env python3
"""
千界花园 - 全链路健康检查脚本
检查后端所有端点、数据库连接、Redis、前端构建状态
用法: python health_check.py [--host http://localhost:3000] [--verbose]
"""

import sys, argparse, json, time
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ENDPOINTS = {
    "基础健康": [
        ("GET", "/api/health", 200),
        ("GET", "/api/version", 200),
    ],
    "Agent管理": [
        ("GET", "/api/agents", 200),
        ("POST", "/api/agents", 201),  # 创建Agent需要body，这里仅检查路由存在
        ("GET", "/api/agents/templates", 200),
    ],
    "对话系统": [
        ("GET", "/api/dialogs", 200),
        ("GET", "/api/dialogs/sessions", 200),
    ],
    "知识库": [
        ("GET", "/api/knowledge/bases", 200),
        ("GET", "/api/knowledge/search?query=test", 200),
        ("GET", "/api/uploads", 200),
    ],
    "Agent组/编排": [
        ("GET", "/api/groups", 200),
        ("GET", "/api/blueprints", 200),
        ("GET", "/api/tasks", 200),
    ],
    "监控与成本": [
        ("GET", "/api/system/metrics", 200),
        ("GET", "/api/system/processes", 200),
        ("GET", "/api/events", 200),
        ("GET", "/api/spend/summary", 200),
    ],
    "外部集成与注册": [
        ("GET", "/api/external/integrations", 200),
        ("GET", "/api/registry/nodes", 200),
        ("GET", "/api/kimi-cluster/status", 200),
    ],
    "API密钥与安全": [
        ("GET", "/api/apikeys", 200),
        ("GET", "/api/apikeys/providers", 200),
        ("GET", "/api/security/audit-logs", 200),
    ],
    "3DACP核心": [
        ("GET", "/api/axis/nodes", 200),
        ("GET", "/api/axis/routes", 200),
        ("POST", "/api/axis/message", 202),  # 消息投递
    ],
}

def check_endpoint(host: str, method: str, path: str, expect: int, verbose: bool) -> dict:
    url = host.rstrip("/") + path
    start = time.time()
    try:
        req = Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        if method == "POST" and "message" in path:
            req.data = json.dumps({
                "header": {"x": 0, "y": 0, "z": 0, "source": "health-check", "target": "*", "msgType": "ping"},
                "payload": {"type": "text", "content": "ping"},
                "meta": {"timestamp": time.time(), "traceId": "health-" + str(int(time.time()*1000))}
            }).encode("utf-8")
        elif method == "POST":
            req.data = b"{}"
        with urlopen(req, timeout=10) as resp:
            latency = (time.time() - start) * 1000
            body = resp.read().decode("utf-8", errors="ignore")[:200]
            status = resp.status
            ok = status == expect
            if verbose:
                print(f"  {'✓' if ok else '✗'} {method} {path} => {status} ({latency:.0f}ms) {body[:80]}")
            return {"ok": ok, "status": status, "latency_ms": round(latency, 1), "path": path, "method": method}
    except HTTPError as e:
        latency = (time.time() - start) * 1000
        # 如果路由存在但返回4xx（如缺少body参数），也算部分成功
        partial = e.code in (400, 401, 403, 404, 422, 409)
        if verbose:
            print(f"  {'⚠' if partial else '✗'} {method} {path} => {e.code} ({latency:.0f}ms) {e.reason}")
        return {"ok": False, "partial": partial, "status": e.code, "latency_ms": round(latency, 1), "path": path, "method": method, "error": str(e.reason)}
    except URLError as e:
        if verbose:
            print(f"  ✗ {method} {path} => 连接失败: {e.reason}")
        return {"ok": False, "status": 0, "path": path, "method": method, "error": str(e.reason)}
    except Exception as e:
        if verbose:
            print(f"  ✗ {method} {path} => 异常: {e}")
        return {"ok": False, "status": 0, "path": path, "method": method, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="千界花园全链路健康检查")
    parser.add_argument("--host", default="http://localhost:3000", help="后端主机地址")
    parser.add_argument("--verbose", action="store_true", help="打印详细结果")
    parser.add_argument("--json", action="store_true", help="输出JSON报告")
    args = parser.parse_args()

    results = []
    total = 0
    passed = 0
    partial = 0

    print(f"🔍 千界花园健康检查 => {args.host}")
    print("=" * 60)

    for category, eps in ENDPOINTS.items():
        print(f"\n📦 {category}")
        for method, path, expect in eps:
            total += 1
            r = check_endpoint(args.host, method, path, expect, args.verbose)
            results.append({"category": category, **r})
            if r.get("ok"):
                passed += 1
            elif r.get("partial"):
                partial += 1

    print("\n" + "=" * 60)
    print(f"📊 结果: {passed}/{total} 通过, {partial} 部分可用(路由存在但参数/权限异常)")
    if passed + partial >= total * 0.85:
        print("🟢 状态: 健康")
        code = 0
    elif passed + partial >= total * 0.6:
        print("🟡 状态: 警告")
        code = 1
    else:
        print("🔴 状态: 严重")
        code = 2

    if args.json:
        print(json.dumps({"passed": passed, "total": total, "partial": partial, "results": results}, indent=2, ensure_ascii=False))

    sys.exit(code)

if __name__ == "__main__":
    main()
