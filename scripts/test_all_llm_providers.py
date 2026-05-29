#!/usr/bin/env python3
"""
千界花园 — 10大LLM Provider 全面连通性测试
支持: OpenAI / Azure / Anthropic / DeepSeek / Moonshot / Kimi Code / Qwen / Gemini / GLM / OpenRouter
用法:
    export KIMI_API_KEY_1="sk-kimi-..."
    export KIMI_API_KEY_2="sk-kimi-..."
    ...
    python scripts/test_all_llm_providers.py
"""

import os
import sys
import time
import json
import concurrent.futures
from dataclasses import dataclass
from typing import Optional, Dict, Any, List

try:
    import requests
except ImportError:
    print("[ERROR] 需要 requests: pip install requests")
    sys.exit(1)


@dataclass
class ProviderTestResult:
    provider: str
    name: str
    success: bool
    latency_ms: float
    response_text: Optional[str] = None
    error: Optional[str] = None
    token_usage: Optional[Dict] = None
    model: Optional[str] = None


PROVIDERS = [
    {
        "id": "kimi-code",
        "name": "Kimi Code (Moonshot)",
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "needs_ua": True,
        "ua": "claude-code/0.7.8",
        "api_key_env": ["KIMI_API_KEY_1", "KIMI_API_KEY_2", "KIMI_API_KEY_3", "KIMI_API_KEY_4", "KIMI_API_KEY_5", "MOONSHOT_API_KEY"],
        "timeout": 60,
    },
    {
        "id": "openai",
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-3.5-turbo",
        "api_key_env": ["OPENAI_API_KEY"],
        "timeout": 30,
    },
    {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "base_url": "https://api.anthropic.com/v1",
        "model": "claude-3-haiku-20240307",
        "api_key_env": ["ANTHROPIC_API_KEY"],
        "timeout": 60,
        "headers_extra": {"anthropic-version": "2023-06-01"},
    },
    {
        "id": "deepseek",
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "api_key_env": ["DEEPSEEK_API_KEY"],
        "timeout": 60,
    },
    {
        "id": "qwen",
        "name": "通义千问 (Qwen)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-turbo",
        "api_key_env": ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
        "timeout": 60,
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "model": "gemini-pro",
        "api_key_env": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        "timeout": 60,
        "path_style": "gemini",
    },
    {
        "id": "glm",
        "name": "智谱 GLM",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "model": "glm-4-flash",
        "api_key_env": ["GLM_API_KEY", "ZHIPU_API_KEY"],
        "timeout": 60,
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "model": "openai/gpt-3.5-turbo",
        "api_key_env": ["OPENROUTER_API_KEY"],
        "timeout": 60,
        "headers_extra": {"HTTP-Referer": "https://thousand-realms.garden", "X-Title": "ThousandRealmsGarden"},
    },
    {
        "id": "azure",
        "name": "Azure OpenAI",
        "base_url_env": "AZURE_OPENAI_ENDPOINT",
        "model_env": "AZURE_OPENAI_DEPLOYMENT",
        "api_key_env": ["AZURE_OPENAI_KEY"],
        "timeout": 60,
        "path_style": "azure",
    },
    {
        "id": "moonshot",
        "name": "Moonshot (通用)",
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "api_key_env": ["MOONSHOT_API_KEY"],
        "timeout": 60,
    },
]


def get_api_key(config: Dict) -> Optional[str]:
    for env_name in config.get("api_key_env", []):
        key = os.environ.get(env_name)
        if key:
            return key.strip()
    return None


def build_openai_request(base_url: str, api_key: str, model: str, messages: List[Dict], stream: bool = False) -> tuple:
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 150,
        "temperature": 0.7,
        "stream": stream,
    }
    return url, headers, payload


def build_anthropic_request(base_url: str, api_key: str, model: str, messages: List[Dict]) -> tuple:
    url = f"{base_url}/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    system_msg = ""
    clean_messages = []
    for m in messages:
        if m.get("role") == "system":
            system_msg = m.get("content", "")
        else:
            clean_messages.append({"role": m["role"], "content": m["content"]})
    payload = {
        "model": model,
        "max_tokens": 150,
        "messages": clean_messages,
    }
    if system_msg:
        payload["system"] = system_msg
    return url, headers, payload


def build_gemini_request(base_url: str, api_key: str, model: str, messages: List[Dict]) -> tuple:
    url = f"{base_url}/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    # Convert OpenAI format to Gemini
    gemini_contents = []
    for m in messages:
        if m["role"] == "system":
            continue  # Gemini handles system differently
        role = "user" if m["role"] == "user" else "model"
        gemini_contents.append({"role": role, "parts": [{"text": m["content"]}]})
    payload = {"contents": gemini_contents, "generationConfig": {"maxOutputTokens": 150, "temperature": 0.7}}
    return url, headers, payload


def build_azure_request(endpoint: str, api_key: str, deployment: str, messages: List[Dict]) -> tuple:
    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01"
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "model": deployment,
        "messages": messages,
        "max_tokens": 150,
        "temperature": 0.7,
    }
    return url, headers, payload


def test_provider(config: Dict, test_messages: List[Dict]) -> ProviderTestResult:
    provider_id = config["id"]
    provider_name = config["name"]
    api_key = get_api_key(config)

    if not api_key:
        return ProviderTestResult(
            provider=provider_id,
            name=provider_name,
            success=False,
            latency_ms=0,
            error="未配置 API Key（环境变量缺失）",
        )

    # Determine base URL and model
    if "base_url_env" in config:
        base_url = os.environ.get(config["base_url_env"], "")
        model = os.environ.get(config.get("model_env", ""), "")
        if not base_url or not model:
            return ProviderTestResult(
                provider=provider_id, name=provider_name,
                success=False, latency_ms=0,
                error=f"缺少 Azure 环境变量: {config['base_url_env']} / {config.get('model_env', '')}",
            )
    else:
        base_url = config["base_url"]
        model = config["model"]

    try:
        path_style = config.get("path_style", "openai")
        if path_style == "anthropic":
            url, headers, payload = build_anthropic_request(base_url, api_key, model, test_messages)
        elif path_style == "gemini":
            url, headers, payload = build_gemini_request(base_url, api_key, model, test_messages)
        elif path_style == "azure":
            url, headers, payload = build_azure_request(base_url, api_key, model, test_messages)
        else:
            url, headers, payload = build_openai_request(base_url, api_key, model, test_messages)

        # Add extra headers
        if config.get("needs_ua"):
            headers["User-Agent"] = config.get("ua", "ThousandRealmsGarden/1.0")
        for k, v in config.get("headers_extra", {}).items():
            headers[k] = v

        timeout = config.get("timeout", 60)
        start = time.time()
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        latency = round((time.time() - start) * 1000, 2)

        if resp.status_code != 200:
            return ProviderTestResult(
                provider=provider_id, name=provider_name,
                success=False, latency_ms=latency,
                error=f"HTTP {resp.status_code}: {resp.text[:500]}",
            )

        data = resp.json()
        response_text = None
        token_usage = None

        if path_style == "anthropic":
            response_text = data.get("content", [{}])[0].get("text", "")
            token_usage = data.get("usage")
        elif path_style == "gemini":
            candidates = data.get("candidates", [])
            if candidates:
                response_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        else:
            choices = data.get("choices", [])
            if choices:
                msg = choices[0].get("message", {})
                response_text = msg.get("content", "")
                # Check for reasoning_content (Kimi special)
                reasoning = msg.get("reasoning_content", "")
                if reasoning:
                    response_text = f"[推理] {reasoning}\n\n[回复] {response_text}"
            token_usage = data.get("usage")

        return ProviderTestResult(
            provider=provider_id, name=provider_name,
            success=True, latency_ms=latency,
            response_text=response_text,
            token_usage=token_usage,
            model=model,
        )

    except requests.exceptions.Timeout:
        return ProviderTestResult(
            provider=provider_id, name=provider_name,
            success=False, latency_ms=config.get("timeout", 60) * 1000,
            error="请求超时",
        )
    except requests.exceptions.ConnectionError as e:
        return ProviderTestResult(
            provider=provider_id, name=provider_name,
            success=False, latency_ms=0,
            error=f"连接失败: {str(e)[:200]}",
        )
    except Exception as e:
        return ProviderTestResult(
            provider=provider_id, name=provider_name,
            success=False, latency_ms=0,
            error=f"异常: {str(e)[:500]}",
        )


def test_kimi_cluster(keys: List[str]) -> List[ProviderTestResult]:
    """Test all Kimi keys as a cluster (load balancing simulation)"""
    config = PROVIDERS[0]  # kimi-code config
    test_messages = [
        {"role": "system", "content": "你是千界花园的助手。"},
        {"role": "user", "content": "请回复一句话确认连接正常。"},
    ]
    results = []
    for i, key in enumerate(keys, 1):
        cfg = {**config, "api_key_env": [f"KIMI_TMP_{i}"]}
        os.environ[f"KIMI_TMP_{i}"] = key
        result = test_provider(cfg, test_messages)
        result.provider = f"kimi-code-key-{i}"
        result.name = f"Kimi Code Key #{i}"
        results.append(result)
    return results


def main():
    print("=" * 70)
    print("千界花园 — 10大LLM Provider 全面连通性测试")
    print("=" * 70)

    # Detect available keys
    kimi_keys = []
    for i in range(1, 6):
        k = os.environ.get(f"KIMI_API_KEY_{i}")
        if k:
            kimi_keys.append(k)
    if not kimi_keys:
        # Try single env
        k = os.environ.get("KIMI_API_KEY") or os.environ.get("MOONSHOT_API_KEY")
        if k:
            kimi_keys.append(k)

    print(f"\n检测到 {len(kimi_keys)} 个 Kimi/Moonshot API Key")
    available_providers = []
    for p in PROVIDERS:
        if get_api_key(p) or (p["id"] == "kimi-code" and kimi_keys):
            available_providers.append(p)

    if not available_providers:
        print("\n[WARNING] 未检测到任何 API Key。请设置环境变量后重试。")
        print("示例:")
        print('  export KIMI_API_KEY_1="sk-kimi-xxxxxxxx"')
        print('  export OPENAI_API_KEY="sk-xxxxxxxx"')
        print("\n支持的环境变量:")
        for p in PROVIDERS:
            print(f"  {p['id']}: {', '.join(p['api_key_env'])}")
        sys.exit(0)

    test_messages = [
        {"role": "system", "content": "你是千界花园（Thousand Realms Garden）的智能助手，请用简洁的中文回复。"},
        {"role": "user", "content": "请用一句话确认 API 连接正常，并简单介绍千界花园这个项目。"},
    ]

    all_results: List[ProviderTestResult] = []

    # 1. Test Kimi cluster keys individually
    if kimi_keys:
        print(f"\n--- Kimi Code 集群测试 ({len(kimi_keys)} keys) ---")
        kimi_results = test_kimi_cluster(kimi_keys)
        for r in kimi_results:
            all_results.append(r)
            status = "✅ 通过" if r.success else "❌ 失败"
            print(f"  {r.name}: {status} | {r.latency_ms}ms")
            if r.error:
                print(f"    错误: {r.error[:100]}")

    # 2. Test all other providers in parallel
    other_providers = [p for p in available_providers if p["id"] != "kimi-code"]
    if other_providers:
        print(f"\n--- 其他 Provider 并行测试 ({len(other_providers)} 个) ---")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_provider = {
                executor.submit(test_provider, p, test_messages): p
                for p in other_providers
            }
            for future in concurrent.futures.as_completed(future_to_provider):
                p = future_to_provider[future]
                try:
                    result = future.result()
                except Exception as exc:
                    result = ProviderTestResult(
                        provider=p["id"], name=p["name"],
                        success=False, latency_ms=0,
                        error=f"线程异常: {exc}",
                    )
                all_results.append(result)
                status = "✅ 通过" if result.success else "❌ 失败"
                print(f"  {result.name}: {status} | {r.latency_ms if (r:=result) else 0}ms")
                if result.error:
                    print(f"    错误: {result.error[:120]}")

    # Summary
    print("\n" + "=" * 70)
    print("测试汇总")
    print("=" * 70)
    passed = sum(1 for r in all_results if r.success)
    failed = len(all_results) - passed
    total_latency = sum(r.latency_ms for r in all_results if r.success)
    avg_latency = round(total_latency / passed, 2) if passed else 0

    print(f"  总测试数: {len(all_results)}")
    print(f"  ✅ 通过: {passed}")
    print(f"  ❌ 失败: {failed}")
    print(f"  ⏱️  平均延迟: {avg_latency}ms")
    print()

    # Detailed table
    print(f"{'Provider':<22} {'状态':<8} {'延迟':<10} {'模型':<25} {'响应预览'}")
    print("-" * 100)
    for r in all_results:
        status = "PASS" if r.success else "FAIL"
        latency = f"{r.latency_ms}ms" if r.success else "-"
        model = r.model or "-"
        preview = (r.response_text or "")[:40].replace("\n", " ") if r.success else (r.error or "")[:40]
        print(f"{r.name:<22} {status:<8} {latency:<10} {model:<25} {preview}")

    # JSON report
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": {
            "total": len(all_results),
            "passed": passed,
            "failed": failed,
            "avg_latency_ms": avg_latency,
        },
        "results": [
            {
                "provider": r.provider,
                "name": r.name,
                "success": r.success,
                "latency_ms": r.latency_ms,
                "response_text": r.response_text,
                "error": r.error,
                "token_usage": r.token_usage,
                "model": r.model,
            }
            for r in all_results
        ],
    }

    report_path = "/mnt/agents/thousand-realms-garden/llm_test_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n详细报告已保存: {report_path}")

    if failed == 0:
        print("\n🎉 所有 Provider 测试通过！")
        sys.exit(0)
    else:
        print(f"\n⚠️ {failed} 个 Provider 需要检查配置")
        sys.exit(1)


if __name__ == "__main__":
    main()
