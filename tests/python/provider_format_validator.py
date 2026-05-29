#!/usr/bin/env python3
"""
千界花园 - LLM Provider 响应格式验证器
验证各Provider的响应是否符合UnifiedLLMAdapter期望格式
用法: python provider_format_validator.py [--provider kimi-code|openai|anthropic|...]
"""

import json, sys, argparse, os
from dataclasses import dataclass
from typing import Optional

@dataclass
class ProviderSpec:
    name: str
    reasoning_field: Optional[str]
    content_field: str
    usage_field: Optional[str]
    has_streaming: bool
    custom_headers: dict
    expected_status: int

SPECS = {
    "kimi-code": ProviderSpec(
        name="Kimi Code",
        reasoning_field="reasoning_content",
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"User-Agent": "claude-code/0.7.8", "Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "moonshot": ProviderSpec(
        name="Moonshot",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "openai": ProviderSpec(
        name="OpenAI",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "anthropic": ProviderSpec(
        name="Anthropic",
        reasoning_field=None,
        content_field="text",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"x-api-key": "{key}", "anthropic-version": "2023-06-01"},
        expected_status=200,
    ),
    "deepseek": ProviderSpec(
        name="DeepSeek",
        reasoning_field="reasoning_content",
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "qwen": ProviderSpec(
        name="Qwen",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "gemini": ProviderSpec(
        name="Gemini",
        reasoning_field=None,
        content_field="text",
        usage_field=None,
        has_streaming=True,
        custom_headers={"x-goog-api-key": "{key}"},
        expected_status=200,
    ),
    "glm": ProviderSpec(
        name="ChatGLM",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}"},
        expected_status=200,
    ),
    "openrouter": ProviderSpec(
        name="OpenRouter",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"Authorization": "Bearer {key}", "HTTP-Referer": "https://thousand-realms.garden", "X-Title": "ThousandRealmsGarden"},
        expected_status=200,
    ),
    "azure-openai": ProviderSpec(
        name="Azure OpenAI",
        reasoning_field=None,
        content_field="content",
        usage_field="usage",
        has_streaming=True,
        custom_headers={"api-key": "{key}", "Content-Type": "application/json"},
        expected_status=200,
    ),
}

def validate_response(provider: str, raw_json: dict) -> list:
    """验证响应JSON是否符合规范"""
    spec = SPECS.get(provider)
    if not spec:
        return [("error", f"未知Provider: {provider}")]

    errors = []
    warnings = []

    # 标准OpenAI兼容格式检查
    if "choices" in raw_json:
        choices = raw_json.get("choices", [])
        if not choices:
            errors.append(("error", "choices为空数组"))
        else:
            first = choices[0]
            if "message" not in first and "delta" not in first:
                errors.append(("error", "choices[0]缺少message/delta字段"))
            else:
                msg = first.get("message") or first.get("delta", {})
                if spec.content_field not in msg:
                    errors.append(("error", f"缺少内容字段 '{spec.content_field}'"))
                if spec.reasoning_field and spec.reasoning_field not in msg:
                    warnings.append(("warn", f"可选推理字段 '{spec.reasoning_field}' 不存在"))
    elif "content" in raw_json or "text" in raw_json or "output" in raw_json:
        # 非标准格式（Gemini/Anthropic原生等）
        pass
    else:
        errors.append(("error", "响应既无choices也无content/text/output"))

    # usage检查
    if spec.usage_field and spec.usage_field not in raw_json:
        warnings.append(("warn", f"缺少用量字段 '{spec.usage_field}'"))
    elif spec.usage_field and raw_json.get(spec.usage_field):
        usage = raw_json[spec.usage_field]
        if "total_tokens" not in usage and ("prompt_tokens" not in usage or "completion_tokens" not in usage):
            warnings.append(("warn", "usage缺少标准token字段"))

    return errors + warnings

def build_request_body(provider: str, prompt: str = "Hello") -> dict:
    """构建标准请求体（OpenAI兼容格式）"""
    return {
        "model": "default",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 512,
    }

def build_headers(provider: str, api_key: str) -> dict:
    """构建请求头"""
    spec = SPECS.get(provider)
    if not spec:
        return {"Authorization": f"Bearer {api_key}"}
    headers = {}
    for k, v in spec.custom_headers.items():
        headers[k] = v.replace("{key}", api_key)
    headers["Content-Type"] = "application/json"
    return headers

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=list(SPECS.keys()), default="kimi-code")
    parser.add_argument("--file", help="从JSON文件读取响应进行验证")
    parser.add_argument("--test-request", action="store_true", help="打印该Provider的标准请求体和请求头")
    args = parser.parse_args()

    spec = SPECS[args.provider]
    print(f"🔧 Provider: {spec.name} ({args.provider})")
    print(f"   推理字段: {spec.reasoning_field or '无'}")
    print(f"   内容字段: {spec.content_field}")
    print(f"   用量字段: {spec.usage_field or '无'}")
    print(f"   流式支持: {'是' if spec.has_streaming else '否'}")

    if args.test_request:
        print("\n📤 标准请求体:")
        print(json.dumps(build_request_body(args.provider), indent=2, ensure_ascii=False))
        print("\n📋 请求头:")
        for k, v in build_headers(args.provider, "sk-xxx").items():
            print(f"   {k}: {v}")

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"\n📥 验证文件: {args.file}")
        results = validate_response(args.provider, data)
        for level, msg in results:
            icon = "❌" if level == "error" else "⚠️"
            print(f"   {icon} {msg}")
        if not results:
            print("   ✅ 响应格式完全符合规范")

if __name__ == "__main__":
    main()
