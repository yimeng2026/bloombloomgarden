#!/usr/bin/env python3
"""
test_multi_provider_concurrent.py — 10大Provider并发连通性测试
用法: python test_multi_provider_concurrent.py
支持: OpenAI / Azure / Anthropic / DeepSeek / Moonshot / Kimi Code / Qwen / Gemini / GLM / OpenRouter
"""
import os
import sys
import time
import json
import asyncio
import concurrent.futures
from dataclasses import dataclass, asdict
from typing import Optional, Dict, List, Any
import urllib.request
import urllib.error
import ssl

# ============== 配置: 从环境变量读取密钥，也可在此硬编码测试 ==============
PROVIDER_CONFIGS = [
    {
        "id": "kimi-code",
        "name": "Kimi Code",
        "category": "commercial",
        "base_url": "https://api.moonshot.cn/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "kimi-latest",
        "keys_env": ["KIMI_CODE_API_KEY_1", "KIMI_CODE_API_KEY_2", "KIMI_CODE_API_KEY_3", "KIMI_CODE_API_KEY_4", "KIMI_CODE_API_KEY_5", "KIMICODE_API_KEY", "KIMI_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "User-Agent": "claude-code/0.7.8", "Content-Type": "application/json"},
        "test_body": None,  # GET请求
        "timeout": 15,
    },
    {
        "id": "openai",
        "name": "OpenAI",
        "category": "commercial",
        "base_url": "https://api.openai.com/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "gpt-4o-mini",
        "keys_env": ["OPENAI_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "category": "commercial",
        "base_url": "https://api.anthropic.com",
        "test_endpoint": "/v1/models",
        "chat_endpoint": "/v1/messages",
        "model": "claude-3-5-sonnet-20241022",
        "keys_env": ["ANTHROPIC_API_KEY"],
        "headers_builder": lambda key: {"x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "deepseek",
        "name": "DeepSeek",
        "category": "commercial",
        "base_url": "https://api.deepseek.com/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "deepseek-chat",
        "keys_env": ["DEEPSEEK_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "moonshot",
        "name": "Moonshot (Kimi)",
        "category": "commercial",
        "base_url": "https://api.moonshot.cn/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "moonshot-v1-8k",
        "keys_env": ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "qwen",
        "name": "阿里云 Qwen",
        "category": "commercial",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "qwen-turbo",
        "keys_env": ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "category": "commercial",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "test_endpoint": "/models",
        "chat_endpoint": "/models/gemini-1.5-flash:generateContent",
        "model": "gemini-1.5-flash",
        "keys_env": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        "headers_builder": lambda key: {"Content-Type": "application/json"},
        "test_body": None,
        "query_param": lambda key: f"?key={key}",
        "timeout": 15,
    },
    {
        "id": "glm",
        "name": "智谱 GLM",
        "category": "commercial",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "glm-4-flash",
        "keys_env": ["GLM_API_KEY", "ZHIPU_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "category": "aggregator",
        "base_url": "https://openrouter.ai/api/v1",
        "test_endpoint": "/models",
        "chat_endpoint": "/chat/completions",
        "model": "openai/gpt-4o-mini",
        "keys_env": ["OPENROUTER_API_KEY"],
        "headers_builder": lambda key: {"Authorization": f"Bearer {key}", "HTTP-Referer": "https://thousand-realms.garden", "X-Title": "千界花园", "Content-Type": "application/json"},
        "test_body": None,
        "timeout": 15,
    },
    {
        "id": "azure-openai",
        "name": "Azure OpenAI",
        "category": "commercial",
        "base_url_env": "AZURE_OPENAI_ENDPOINT",  # 如 https://xxx.openai.azure.com/openai/deployments/xxx
        "test_endpoint": "/chat/completions",
        "chat_endpoint": "/chat/completions",
        "model": "gpt-4o",
        "keys_env": ["AZURE_OPENAI_API_KEY"],
        "headers_builder": lambda key: {"api-key": key, "Content-Type": "application/json"},
        "test_body": lambda model: json.dumps({"messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5}),
        "timeout": 20,
        "skip_if_no_env": ["AZURE_OPENAI_ENDPOINT"],
    },
]


@dataclass
class TestResult:
    provider: str
    key_alias: str
    success: bool
    latency_ms: float
    status_code: Optional[int] = None
    error: Optional[str] = None
    model_list: Optional[List[str]] = None
    response_snippet: Optional[str] = None


def _build_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def test_provider_key(cfg: Dict, key: str, key_alias: str) -> TestResult:
    """测试单个Provider的单个Key"""
    start = time.perf_counter()
    try:
        base = cfg.get("base_url", "")
        if not base and "base_url_env" in cfg:
            base = os.environ.get(cfg["base_url_env"], "")
        if not base:
            return TestResult(
                provider=cfg["id"], key_alias=key_alias, success=False,
                latency_ms=0, error="Base URL not configured"
            )

        endpoint = cfg["test_endpoint"]
        url = f"{base.rstrip('/')}{endpoint}"

        # Gemini 特殊处理: key放query
        if "query_param" in cfg:
            url += cfg["query_param"](key)

        headers = cfg["headers_builder"](key)
        body = cfg.get("test_body")
        if callable(body):
            body = body(cfg["model"])

        req = urllib.request.Request(
            url,
            data=body.encode("utf-8") if body else None,
            headers=headers,
            method="GET" if not body else "POST",
        )

        ctx = _build_ssl_context()
        resp = urllib.request.urlopen(req, timeout=cfg["timeout"], context=ctx)
        latency = (time.perf_counter() - start) * 1000

        data = resp.read().decode("utf-8", errors="replace")
        status = resp.getcode()

        # 尝试解析模型列表
        models = []
        try:
            j = json.loads(data)
            if "data" in j and isinstance(j["data"], list):
                models = [m.get("id", m.get("name", "unknown")) for m in j["data"]]
            elif "models" in j:
                models = [m.get("name", "unknown") for m in j["models"]]
        except:
            pass

        snippet = data[:200] if data else None

        return TestResult(
            provider=cfg["id"],
            key_alias=key_alias,
            success=200 <= status < 300,
            latency_ms=round(latency, 1),
            status_code=status,
            model_list=models[:5] if models else None,
            response_snippet=snippet,
        )

    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000
        body = e.read().decode("utf-8", errors="replace")[:300] if e.read else ""
        return TestResult(
            provider=cfg["id"], key_alias=key_alias, success=False,
            latency_ms=round(latency, 1), status_code=e.code,
            error=f"HTTP {e.code}: {body}"
        )
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return TestResult(
            provider=cfg["id"], key_alias=key_alias, success=False,
            latency_ms=round(latency, 1), error=str(e)[:200]
        )


def discover_keys(cfg: Dict) -> List[tuple]:
    """从环境变量中发现此Provider的所有可用key"""
    keys = []
    for env_name in cfg["keys_env"]:
        val = os.environ.get(env_name, "").strip()
        if val and val.startswith("sk-") or val.startswith("AK-") or len(val) > 20:
            keys.append((val, env_name))
    return keys


def run_all_tests(max_workers: int = 10) -> List[TestResult]:
    """并发测试所有Provider的所有Key"""
    tasks = []
    for cfg in PROVIDER_CONFIGS:
        # 检查是否因缺少环境变量而跳过
        if "skip_if_no_env" in cfg:
            if any(os.environ.get(e, "").strip() == "" for e in cfg["skip_if_no_env"]):
                continue
        keys = discover_keys(cfg)
        if not keys:
            # 占位: 记录未配置
            tasks.append((cfg, None, "NOT_CONFIGURED"))
        for k, alias in keys:
            tasks.append((cfg, k, alias))

    results: List[TestResult] = []

    def run_one(task):
        cfg, key, alias = task
        if key is None:
            return TestResult(
                provider=cfg["id"], key_alias=alias, success=False,
                latency_ms=0, error="API Key not configured in environment"
            )
        return test_provider_key(cfg, key, alias)

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = [ex.submit(run_one, t) for t in tasks]
        for f in concurrent.futures.as_completed(futures):
            try:
                results.append(f.result())
            except Exception as e:
                print(f"[ERROR] Task crashed: {e}")

    return results


def print_report(results: List[TestResult]):
    """打印彩色测试报告"""
    by_provider: Dict[str, List[TestResult]] = {}
    for r in results:
        by_provider.setdefault(r.provider, []).append(r)

    print("\n" + "=" * 70)
    print("🧪 千界花园 — 10大LLM Provider 并发连通性测试报告")
    print("=" * 70)

    total = len(results)
    passed = sum(1 for r in results if r.success)
    failed = total - passed
    avg_latency = sum(r.latency_ms for r in results if r.success) / max(passed, 1)

    print(f"\n📊 汇总: {passed}/{total} 通过 | 失败: {failed} | 平均延迟: {avg_latency:.1f}ms\n")

    for provider, rs in sorted(by_provider.items()):
        ok = sum(1 for r in rs if r.success)
        print(f"\n🔹 {provider.upper()} ({ok}/{len(rs)})")
        for r in rs:
            status = "✅" if r.success else "❌"
            print(f"   {status} [{r.key_alias}] {r.latency_ms:>7.1f}ms", end="")
            if r.status_code:
                print(f" | HTTP {r.status_code}", end="")
            if r.error:
                print(f" | {r.error[:80]}", end="")
            if r.model_list:
                print(f" | models: {', '.join(r.model_list[:3])}", end="")
            print()

    # JSON报告输出
    report_path = "test_provider_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in results], f, ensure_ascii=False, indent=2)
    print(f"\n📁 详细报告已保存: {report_path}")

    # 返回码
    return 0 if failed == 0 else 1


def test_chat_completion(provider_id: str, key_env: str, message: str = "你好，请用一句话介绍自己"):
    """测试单个Provider的对话能力（需要环境变量中已配置key）"""
    cfg = next((c for c in PROVIDER_CONFIGS if c["id"] == provider_id), None)
    if not cfg:
        print(f"Unknown provider: {provider_id}")
        return

    keys = discover_keys(cfg)
    if not keys:
        print(f"No key found for {provider_id}. Set one of: {cfg['keys_env']}")
        return

    key, alias = keys[0]
    base = cfg.get("base_url", "")
    if "base_url_env" in cfg:
        base = os.environ.get(cfg["base_url_env"], base)

    url = f"{base.rstrip('/')}{cfg['chat_endpoint']}"
    if "query_param" in cfg:
        url += cfg["query_param"](key)

    headers = cfg["headers_builder"](key)

    # 构造chat body
    body = {
        "model": cfg["model"],
        "messages": [{"role": "user", "content": message}],
        "max_tokens": 256,
        "temperature": 0.7,
    }

    # Anthropic格式转换
    if provider_id == "anthropic":
        body = {
            "model": cfg["model"],
            "max_tokens": 256,
            "messages": [{"role": "user", "content": message}],
        }

    # Gemini格式转换
    if provider_id == "gemini":
        body = {
            "contents": [{"role": "user", "parts": [{"text": message}]}],
            "generationConfig": {"maxOutputTokens": 256, "temperature": 0.7},
        }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    print(f"\n🚀 测试对话: {provider_id}")
    print(f"   URL: {url}")
    print(f"   Model: {cfg['model']}")
    start = time.perf_counter()
    try:
        ctx = _build_ssl_context()
        resp = urllib.request.urlopen(req, timeout=60, context=ctx)
        latency = (time.perf_counter() - start) * 1000
        data = resp.read().decode("utf-8", errors="replace")
        print(f"   ✅ HTTP {resp.getcode()} | {latency:.1f}ms")
        try:
            j = json.loads(data)
            # 提取content
            content = ""
            if "choices" in j:
                content = j["choices"][0].get("message", {}).get("content", "")
            elif "content" in j:
                content = j["content"][0].get("text", "")
            elif "candidates" in j:
                content = j["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"   💬 回复: {content[:120]}...")
        except Exception as e:
            print(f"   ⚠️ 解析失败: {e}")
            print(f"   原始: {data[:200]}")
    except Exception as e:
        print(f"   ❌ 失败: {e}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="千界花园多Provider测试套件")
    parser.add_argument("--chat", type=str, help="测试指定Provider的对话能力 (如: kimi-code)")
    parser.add_argument("--message", type=str, default="你好，请用一句话介绍自己", help="对话测试消息")
    parser.add_argument("--workers", type=int, default=10, help="并发线程数")
    args = parser.parse_args()

    if args.chat:
        test_chat_completion(args.chat, "", args.message)
    else:
        results = run_all_tests(max_workers=args.workers)
        code = print_report(results)
        sys.exit(code)
