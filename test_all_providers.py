#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
千界花园 — LLM Provider 统一测试套件
支持：Kimi Code / OpenAI / Azure / Anthropic / DeepSeek / Moonshot / Qwen / Gemini / GLM / OpenRouter

用法:
    # 测试所有配置的Provider
    python test_all_providers.py

    # 仅测试特定Provider
    python test_all_providers.py --providers kimi-code openai deepseek

    # 详细输出模式
    python test_all_providers.py --verbose

    # 生成JSON报告
    python test_all_providers.py --report report.json
"""

import os
import sys
import json
import time
import argparse
import concurrent.futures
from dataclasses import dataclass, asdict
from typing import Optional, Dict, List, Any
from enum import Enum

# 尝试导入requests，如未安装给出友好提示
try:
    import requests
except ImportError:
    print("❌ 需要先安装 requests:  pip install requests")
    sys.exit(1)


class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"
    TIMEOUT = "TIMEOUT"


@dataclass
class TestResult:
    provider: str
    status: TestStatus
    latency_ms: float
    response_sample: str
    error_message: Optional[str] = None
    token_usage: Optional[Dict[str, int]] = None
    has_reasoning: bool = False
    model_used: Optional[str] = None
    timestamp: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "status": self.status.value,
            "latency_ms": round(self.latency_ms, 2),
            "response_sample": self.response_sample[:200] if self.response_sample else "",
            "error_message": self.error_message,
            "token_usage": self.token_usage,
            "has_reasoning": self.has_reasoning,
            "model_used": self.model_used,
            "timestamp": self.timestamp
        }


# ── Provider 配置 ─────────────────────────────────────────────────

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "kimi-code": {
        "name": "Kimi Code",
        "api_base": "https://api.kimi.moonshot.cn",
        "model": "kimi-code",
        "env_keys": ["KIMI_API_KEY_1", "KIMI_API_KEY_2", "KIMI_API_KEY_3", "KIMI_API_KEY_4", "KIMI_API_KEY_5", "KIMI_API_KEY"],
        "headers": {"User-Agent": "claude-code/0.7.8"},
        "timeout": 60,
        "test_prompt": "用一句话总结3DACP协议的核心思想。",
        "response_field": "content",
        "reasoning_field": "reasoning_content",
    },
    "moonshot": {
        "name": "Moonshot (Kimi)",
        "api_base": "https://api.moonshot.cn",
        "model": "moonshot-v1-8k",
        "env_keys": ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "你好，请做简短自我介绍。",
        "response_field": "content",
        "reasoning_field": None,
    },
    "openai": {
        "name": "OpenAI",
        "api_base": "https://api.openai.com",
        "model": "gpt-3.5-turbo",
        "env_keys": ["OPENAI_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "Say hello in Chinese.",
        "response_field": "content",
        "reasoning_field": None,
    },
    "azure-openai": {
        "name": "Azure OpenAI",
        "api_base": "",
        "model": "gpt-35-turbo",
        "env_keys": ["AZURE_OPENAI_KEY", "AZURE_OPENAI_ENDPOINT"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "Hello!",
        "response_field": "content",
        "reasoning_field": None,
    },
    "anthropic": {
        "name": "Anthropic Claude",
        "api_base": "https://api.anthropic.com",
        "model": "claude-3-haiku-20240307",
        "env_keys": ["ANTHROPIC_API_KEY"],
        "headers": {"anthropic-version": "2023-06-01"},
        "timeout": 30,
        "test_prompt": "Say a short greeting.",
        "response_field": "content",
        "reasoning_field": None,
        "payload_builder": "anthropic",
    },
    "deepseek": {
        "name": "DeepSeek",
        "api_base": "https://api.deepseek.com",
        "model": "deepseek-chat",
        "env_keys": ["DEEPSEEK_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "你好，简单介绍一下自己。",
        "response_field": "content",
        "reasoning_field": "reasoning_content",
    },
    "qwen": {
        "name": "阿里云 Qwen",
        "api_base": "https://dashscope.aliyuncs.com",
        "model": "qwen-turbo",
        "env_keys": ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "你好。",
        "response_field": "content",
        "reasoning_field": None,
        "payload_builder": "qwen",
    },
    "gemini": {
        "name": "Google Gemini",
        "api_base": "https://generativelanguage.googleapis.com",
        "model": "gemini-pro",
        "env_keys": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "Hello! Short reply please.",
        "response_field": "text",
        "reasoning_field": None,
        "payload_builder": "gemini",
    },
    "glm": {
        "name": "智谱 GLM",
        "api_base": "https://open.bigmodel.cn",
        "model": "glm-4-flash",
        "env_keys": ["GLM_API_KEY", "ZHIPU_API_KEY"],
        "headers": {},
        "timeout": 30,
        "test_prompt": "你好。",
        "response_field": "content",
        "reasoning_field": None,
    },
    "openrouter": {
        "name": "OpenRouter",
        "api_base": "https://openrouter.ai/api",
        "model": "openai/gpt-3.5-turbo",
        "env_keys": ["OPENROUTER_API_KEY"],
        "headers": {"HTTP-Referer": "https://thousand-realms-garden.local", "X-Title": "ThousandRealmsGarden"},
        "timeout": 30,
        "test_prompt": "Hi! One sentence reply.",
        "response_field": "content",
        "reasoning_field": None,
    },
}


# ── 请求构造器 ─────────────────────────────────────────────────────

def build_payload(provider_cfg: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """根据Provider类型构建正确的请求体"""
    builder = provider_cfg.get("payload_builder", "openai")
    model = provider_cfg["model"]

    if builder == "anthropic":
        return {
            "model": model,
            "max_tokens": 256,
            "messages": [{"role": "user", "content": prompt}]
        }
    elif builder == "gemini":
        return {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 256, "temperature": 0.7}
        }
    elif builder == "qwen":
        return {
            "model": model,
            "input": {"messages": [{"role": "user", "content": prompt}]},
            "parameters": {"max_tokens": 256, "temperature": 0.7}
        }
    else:
        # OpenAI兼容格式（默认）
        return {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 256,
            "temperature": 0.7,
            "stream": False
        }


def build_url(provider_cfg: Dict[str, Any], api_key: str) -> str:
    """构建正确的API端点URL"""
    base = provider_cfg["api_base"].rstrip("/")
    builder = provider_cfg.get("payload_builder", "openai")

    if builder == "gemini":
        return f"{base}/v1beta/models/{provider_cfg['model']}:generateContent?key={api_key}"
    elif builder == "qwen":
        return f"{base}/api/v1/services/aigc/text-generation/generation"
    elif provider_cfg["provider_id"] == "azure-openai":
        endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", base)
        return f"{endpoint}/openai/deployments/{provider_cfg['model']}/chat/completions?api-version=2024-02-01"
    else:
        return f"{base}/v1/chat/completions"


def build_headers(provider_cfg: Dict[str, Any], api_key: str) -> Dict[str, str]:
    """构建请求头"""
    headers = {
        "Content-Type": "application/json",
        **provider_cfg.get("headers", {})
    }

    builder = provider_cfg.get("payload_builder", "openai")
    if builder == "anthropic":
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
    elif builder == "qwen":
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers["Authorization"] = f"Bearer {api_key}"

    return headers


# ── 响应解析器 ─────────────────────────────────────────────────────

def parse_response(provider_cfg: Dict[str, Any], response_data: Dict[str, Any]) -> Dict[str, Any]:
    """从各Provider的响应格式中提取content和reasoning"""
    builder = provider_cfg.get("payload_builder", "openai")
    resp_field = provider_cfg.get("response_field", "content")
    reason_field = provider_cfg.get("reasoning_field")

    result = {
        "content": "",
        "reasoning": None,
        "model": None,
        "usage": None
    }

    try:
        if builder == "gemini":
            candidates = response_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                result["content"] = "".join(p.get("text", "") for p in parts)
            result["model"] = provider_cfg["model"]
        elif builder == "qwen":
            output = response_data.get("output", {})
            result["content"] = output.get("text", "")
            result["model"] = response_data.get("model", provider_cfg["model"])
            result["usage"] = response_data.get("usage")
        elif builder == "anthropic":
            content_list = response_data.get("content", [])
            texts = [c.get("text", "") for c in content_list if c.get("type") == "text"]
            result["content"] = "".join(texts)
            result["model"] = response_data.get("model")
            result["usage"] = response_data.get("usage")
        else:
            # OpenAI兼容格式
            choices = response_data.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                result["content"] = message.get(resp_field, "")
                if reason_field and reason_field in message:
                    result["reasoning"] = message[reason_field]
            result["model"] = response_data.get("model")
            result["usage"] = response_data.get("usage")
    except Exception as e:
        result["content"] = f"[解析错误: {e}]"

    return result


# ── 核心测试函数 ───────────────────────────────────────────────────

def test_provider(provider_id: str, cfg: Dict[str, Any], verbose: bool = False) -> TestResult:
    """测试单个Provider的连通性和响应"""

    # 查找可用的API Key
    api_key = None
    for env_name in cfg["env_keys"]:
        val = os.environ.get(env_name)
        if val and val.startswith("sk-"):
            api_key = val
            break

    if not api_key:
        msg = f"未找到API Key (环境变量: {', '.join(cfg['env_keys'])})，跳过测试"
        if verbose:
            print(f"  ⏭️  {cfg['name']}: {msg}")
        return TestResult(
            provider=provider_id,
            status=TestStatus.SKIP,
            latency_ms=0,
            response_sample=msg,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )

    # 构建请求
    url = build_url(cfg, api_key)
    headers = build_headers(cfg, api_key)
    payload = build_payload(cfg, cfg["test_prompt"])
    cfg["provider_id"] = provider_id  # 用于URL构建中的条件判断

    if verbose:
        print(f"  🔄  {cfg['name']} -> {url}")
        print(f"      Model: {cfg['model']}")

    start = time.time()
    try:
        resp = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=cfg.get("timeout", 30)
        )
        latency = (time.time() - start) * 1000

        if resp.status_code == 200:
            data = resp.json()
            parsed = parse_response(cfg, data)

            if verbose:
                print(f"  ✅  {cfg['name']} 成功 ({latency:.0f}ms)")
                print(f"      Model: {parsed.get('model')}")
                print(f"      Content: {parsed['content'][:80]}...")
                if parsed.get("reasoning"):
                    print(f"      Reasoning: {parsed['reasoning'][:80]}...")
                if parsed.get("usage"):
                    print(f"      Usage: {parsed['usage']}")

            return TestResult(
                provider=provider_id,
                status=TestStatus.PASS,
                latency_ms=latency,
                response_sample=parsed["content"],
                token_usage=parsed.get("usage"),
                has_reasoning=parsed.get("reasoning") is not None,
                model_used=parsed.get("model"),
                timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
            )
        else:
            err_text = resp.text[:300]
            if verbose:
                print(f"  ❌  {cfg['name']} HTTP {resp.status_code}: {err_text}")
            return TestResult(
                provider=provider_id,
                status=TestStatus.FAIL,
                latency_ms=(time.time() - start) * 1000,
                response_sample="",
                error_message=f"HTTP {resp.status_code}: {err_text}",
                timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
            )

    except requests.exceptions.Timeout:
        if verbose:
            print(f"  ⏱️  {cfg['name']} 超时")
        return TestResult(
            provider=provider_id,
            status=TestStatus.TIMEOUT,
            latency_ms=cfg.get("timeout", 30) * 1000,
            response_sample="",
            error_message="请求超时",
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )
    except Exception as e:
        if verbose:
            print(f"  ❌  {cfg['name']} 异常: {e}")
        return TestResult(
            provider=provider_id,
            status=TestStatus.FAIL,
            latency_ms=(time.time() - start) * 1000 if 'start' in dir() else 0,
            response_sample="",
            error_message=str(e),
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )


def test_kimi_cluster(verbose: bool = False) -> List[TestResult]:
    """专门测试Kimi Code的多Key负载均衡"""
    results = []
    keys = []
    for i in range(1, 6):
        k = os.environ.get(f"KIMI_API_KEY_{i}")
        if k:
            keys.append((f"KIMI_API_KEY_{i}", k))

    if not keys:
        if verbose:
            print("  ⏭️  未找到任何KIMI_API_KEY_*环境变量")
        return []

    cfg = PROVIDERS["kimi-code"].copy()
    cfg["provider_id"] = "kimi-code"

    if verbose:
        print(f"\n🔑 发现 {len(keys)} 个Kimi Code API Key，开始负载均衡测试...")

    for env_name, key in keys:
        if verbose:
            print(f"  测试 Key {env_name}...")

        # 临时覆盖cfg中的key查找逻辑
        class _cfg(dict):
            pass
        _c = _cfg(cfg)
        _c.env_keys = [env_name]

        result = test_provider(f"kimi-code-{env_name}", _c, verbose=verbose)
        result.provider = f"kimi-code ({env_name})"
        results.append(result)

    return results


# ── 报告生成 ─────────────────────────────────────────────────────

def print_report(results: List[TestResult], verbose: bool = False):
    """打印彩色终端报告"""
    print("\n" + "=" * 70)
    print("千界花园 — LLM Provider 测试结果报告")
    print("=" * 70)

    pass_count = sum(1 for r in results if r.status == TestStatus.PASS)
    fail_count = sum(1 for r in results if r.status == TestStatus.FAIL)
    skip_count = sum(1 for r in results if r.status == TestStatus.SKIP)
    timeout_count = sum(1 for r in results if r.status == TestStatus.TIMEOUT)

    print(f"\n📊 总计: {len(results)} 项测试")
    print(f"   ✅ 通过: {pass_count}")
    print(f"   ❌ 失败: {fail_count}")
    print(f"   ⏱️ 超时: {timeout_count}")
    print(f"   ⏭️ 跳过: {skip_count}")

    if pass_count > 0:
        avg_latency = sum(r.latency_ms for r in results if r.status == TestStatus.PASS) / pass_count
        print(f"   ⚡ 平均延迟(仅通过): {avg_latency:.0f}ms")

    print(f"\n{'Provider':<25} {'Status':<10} {'延迟(ms)':<12} {'模型':<25}")
    print("-" * 72)
    for r in results:
        status_icon = {
            TestStatus.PASS: "✅",
            TestStatus.FAIL: "❌",
            TestStatus.SKIP: "⏭️",
            TestStatus.TIMEOUT: "⏱️"
        }.get(r.status, "❓")
        model_str = (r.model_used or "-")[:24]
        latency_str = f"{r.latency_ms:.0f}" if r.latency_ms < 10000 else "N/A"
        print(f"{r.provider:<25} {status_icon} {r.status.value:<6} {latency_str:<12} {model_str}")

        if verbose and r.error_message:
            print(f"     错误: {r.error_message[:100]}")
        if verbose and r.has_reasoning:
            print(f"     包含推理链 ✨")

    # 通过率的Provider排行
    print("\n🏆 Provider 延迟排行榜 (Top 5)")
    sorted_by_latency = sorted(
        [r for r in results if r.status == TestStatus.PASS],
        key=lambda x: x.latency_ms
    )[:5]
    for i, r in enumerate(sorted_by_latency, 1):
        print(f"   {i}. {r.provider:<25} {r.latency_ms:.0f}ms")

    print("\n" + "=" * 70)


def save_json_report(results: List[TestResult], filepath: str):
    """保存JSON格式报告"""
    report = {
        "meta": {
            "suite": "ThousandRealmsGarden LLM Provider Test",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total": len(results),
            "pass": sum(1 for r in results if r.status == TestStatus.PASS),
            "fail": sum(1 for r in results if r.status == TestStatus.FAIL),
            "skip": sum(1 for r in results if r.status == TestStatus.SKIP),
            "timeout": sum(1 for r in results if r.status == TestStatus.TIMEOUT),
        },
        "results": [r.to_dict() for r in results]
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n📄 JSON报告已保存: {filepath}")


# ── 主入口 ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="千界花园 LLM Provider 统一测试套件")
    parser.add_argument("--providers", nargs="+", help="指定测试的Provider ID列表")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    parser.add_argument("--report", "-r", help="输出JSON报告到文件")
    parser.add_argument("--kimi-only", action="store_true", help="仅测试Kimi Code集群")
    parser.add_argument("--parallel", "-p", action="store_true", help="并行测试")
    args = parser.parse_args()

    print("🚀 千界花园 — LLM Provider 测试套件启动")
    print("-" * 50)

    # 确定测试列表
    if args.kimi_only:
        test_list = {}
    elif args.providers:
        test_list = {k: v for k, v in PROVIDERS.items() if k in args.providers}
    else:
        test_list = PROVIDERS

    all_results: List[TestResult] = []

    # 测试Kimi集群
    if args.kimi_only or not args.providers:
        kimi_results = test_kimi_cluster(verbose=args.verbose)
        all_results.extend(kimi_results)

    # 测试其他Provider
    if not args.kimi_only:
        if args.verbose:
            print(f"\n🔧 开始测试 {len(test_list)} 个Provider...")

        if args.parallel and len(test_list) > 1:
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = {
                    executor.submit(test_provider, pid, cfg.copy(), args.verbose): pid
                    for pid, cfg in test_list.items()
                }
                for future in concurrent.futures.as_completed(futures):
                    all_results.append(future.result())
        else:
            for pid, cfg in test_list.items():
                if args.verbose:
                    print(f"\n{'='*50}")
                result = test_provider(pid, cfg.copy(), args.verbose)
                all_results.append(result)

    # 输出报告
    print_report(all_results, verbose=args.verbose)

    if args.report:
        save_json_report(all_results, args.report)

    # 返回码
    fail_count = sum(1 for r in all_results if r.status in (TestStatus.FAIL, TestStatus.TIMEOUT))
    sys.exit(fail_count)


if __name__ == "__main__":
    main()
