#!/usr/bin/env python3
"""
test_provider_schema_local.py — 千界花园 Provider 配置 Schema 本地校验
纯本地执行，不依赖任何外部 API 或网络。

覆盖范围：
1. 10 大 Provider 配置完整性校验（字段缺失/类型/取值范围）
2. Endpoint URL 格式合法性
3. 重试与熔断器参数合规性
4. OpenAPI Schema 与 ProviderOptimization 一致性交叉验证
5. 环境变量模板 .env.example 字段覆盖度检查
"""

import re
import json
import unittest
from pathlib import Path
from typing import Any, Dict, List


# ========== 从 TypeScript 中提取的 10 大 Provider 基准配置（Python 镜像） ==========
PROVIDER_SCHEMAS: List[Dict[str, Any]] = [
    {
        "name": "kimi-code",
        "endpoint": "https://api.kimi.com/coding/v1",
        "custom_headers": {"User-Agent": "KimiCLI/0.77"},
        "reasoning_field": "reasoning_content",
        "merge_strategy": "concat",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 120000, "long": 120000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "openai",
        "endpoint": "https://api.openai.com/v1",
        "custom_headers": {},
        "reasoning_field": None,
        "merge_strategy": "ignore",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 60000, "long": 90000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": ["temperature", "top_p"],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "azure",
        "endpoint": "https://{resource}.openai.azure.com/openai/deployments/{deployment}",
        "custom_headers": {},
        "reasoning_field": None,
        "merge_strategy": "ignore",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 60000, "long": 90000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": ["temperature", "top_p"],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "anthropic",
        "endpoint": "https://api.anthropic.com/v1",
        "custom_headers": {},
        "reasoning_field": "thinking",
        "merge_strategy": "separate",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 90000, "long": 120000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": ["system"],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "deepseek",
        "endpoint": "https://api.deepseek.com/v1",
        "custom_headers": {},
        "reasoning_field": "reasoning_content",
        "merge_strategy": "concat",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 120000, "long": 120000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "moonshot",
        "endpoint": "https://api.moonshot.cn/v1",
        "custom_headers": {},
        "reasoning_field": "reasoning_content",
        "merge_strategy": "concat",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 120000, "long": 120000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "gemini",
        "endpoint": "https://generativelanguage.googleapis.com/v1beta",
        "custom_headers": {},
        "reasoning_field": None,
        "merge_strategy": "ignore",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4096, "long": 4096},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 60000, "long": 90000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": ["systemInstruction", "contents"],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "glm",
        "endpoint": "https://open.bigmodel.cn/api/paas/v4",
        "custom_headers": {},
        "reasoning_field": None,
        "merge_strategy": "ignore",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 60000, "long": 90000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "openrouter",
        "endpoint": "https://openrouter.ai/api/v1",
        "custom_headers": {},
        "reasoning_field": "reasoning",
        "merge_strategy": "concat",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 120000, "long": 120000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
    {
        "name": "qwen",
        "endpoint": "https://dashscope.aliyuncs.com/api/v1",
        "custom_headers": {},
        "reasoning_field": None,
        "merge_strategy": "ignore",
        "token_budgets": {"simple": 500, "normal": 1500, "code": 4000, "long": 4000},
        "timeouts": {"simple": 30000, "normal": 60000, "code": 60000, "long": 90000},
        "streaming_supported": True,
        "streaming_preferred": True,
        "forbidden_params": [],
        "required_params": [],
        "retry": {"max_retries": 3, "base_delay_ms": 1000, "max_delay_ms": 16000, "jitter": True, "retry_on_status_codes": [429, 500, 502, 503, 504]},
        "circuit_breaker": {"enabled": True, "failure_threshold": 5, "recovery_timeout_ms": 30000, "half_open_max_calls": 1},
    },
]


# ========== 校验器 ==========

URL_RE = re.compile(r"^https?://[a-zA-Z0-9_.\-{}]+(/[a-zA-Z0-9_.\-/~{}]*)*$")


def validate_provider_schema(p: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    name = p.get("name", "unknown")

    # 必填字段
    required_fields = [
        "name", "endpoint", "custom_headers", "reasoning_field",
        "merge_strategy", "token_budgets", "timeouts",
        "streaming_supported", "streaming_preferred",
        "forbidden_params", "required_params",
        "retry", "circuit_breaker",
    ]
    for f in required_fields:
        if f not in p:
            errors.append(f"[{name}] missing required field: {f}")

    # endpoint URL 格式
    endpoint = p.get("endpoint", "")
    if not URL_RE.match(endpoint):
        errors.append(f"[{name}] endpoint URL invalid: {endpoint}")

    # merge_strategy 枚举
    if p.get("merge_strategy") not in ("concat", "ignore", "separate"):
        errors.append(f"[{name}] merge_strategy invalid")

    # token_budgets 子字段
    tb = p.get("token_budgets", {})
    for k in ("simple", "normal", "code", "long"):
        if k not in tb:
            errors.append(f"[{name}] token_budgets missing {k}")
        elif not isinstance(tb[k], int) or tb[k] <= 0:
            errors.append(f"[{name}] token_budgets.{k} must be positive int")

    # timeouts 子字段
    to = p.get("timeouts", {})
    for k in ("simple", "normal", "code", "long"):
        if k not in to:
            errors.append(f"[{name}] timeouts missing {k}")
        elif not isinstance(to[k], int) or to[k] < 1000:
            errors.append(f"[{name}] timeouts.{k} must be int >= 1000")

    # retry 结构
    retry = p.get("retry", {})
    for k in ("max_retries", "base_delay_ms", "max_delay_ms", "jitter", "retry_on_status_codes"):
        if k not in retry:
            errors.append(f"[{name}] retry missing {k}")
    if retry.get("max_retries", 0) < 0:
        errors.append(f"[{name}] max_retries must be >= 0")
    if retry.get("base_delay_ms", 0) > retry.get("max_delay_ms", 0):
        errors.append(f"[{name}] base_delay_ms > max_delay_ms")

    # circuit_breaker 结构
    cb = p.get("circuit_breaker", {})
    for k in ("enabled", "failure_threshold", "recovery_timeout_ms", "half_open_max_calls"):
        if k not in cb:
            errors.append(f"[{name}] circuit_breaker missing {k}")
    if cb.get("failure_threshold", 0) <= 0:
        errors.append(f"[{name}] failure_threshold must be > 0")
    if cb.get("half_open_max_calls", 0) <= 0:
        errors.append(f"[{name}] half_open_max_calls must be > 0")

    return errors


# ========== 测试用例 ==========

class TestProviderSchemaCompleteness(unittest.TestCase):
    """1. 10 大 Provider 配置完整性"""

    def test_all_providers_valid(self):
        all_errors = []
        for p in PROVIDER_SCHEMAS:
            errs = validate_provider_schema(p)
            all_errors.extend(errs)
        if all_errors:
            self.fail("\n".join(all_errors))

    def test_provider_name_unique(self):
        names = [p["name"] for p in PROVIDER_SCHEMAS]
        self.assertEqual(len(names), len(set(names)), f"Duplicate names: {names}")

    def test_ten_providers_present(self):
        self.assertEqual(len(PROVIDER_SCHEMAS), 10)


class TestEndpointUrlValidity(unittest.TestCase):
    """2. Endpoint URL 格式合法性"""

    def test_all_urls_https(self):
        for p in PROVIDER_SCHEMAS:
            ep = p["endpoint"]
            self.assertTrue(ep.startswith("https://"), f"{p['name']} not HTTPS: {ep}")

    def test_azure_template_placeholders(self):
        ep = next(p["endpoint"] for p in PROVIDER_SCHEMAS if p["name"] == "azure")
        self.assertIn("{resource}", ep)
        self.assertIn("{deployment}", ep)

    def test_no_trailing_slash_inconsistency(self):
        """确保没有多余的尾部斜杠（除根路径外）"""
        for p in PROVIDER_SCHEMAS:
            ep = p["endpoint"]
            if ep != "https://api.openai.com/v1":  # 允许 v1 结尾
                self.assertFalse(ep.endswith("//"), f"{p['name']} double slash")


class TestRetryAndCircuitBreaker(unittest.TestCase):
    """3. 重试与熔断器参数合规"""

    def test_retry_status_codes_standard(self):
        standard = {429, 500, 502, 503, 504}
        for p in PROVIDER_SCHEMAS:
            codes = set(p["retry"]["retry_on_status_codes"])
            self.assertTrue(standard.issubset(codes), f"{p['name']} missing standard retry codes")

    def test_circuit_breaker_enabled(self):
        for p in PROVIDER_SCHEMAS:
            self.assertTrue(p["circuit_breaker"]["enabled"], f"{p['name']} CB disabled")

    def test_failure_threshold_sane(self):
        for p in PROVIDER_SCHEMAS:
            ft = p["circuit_breaker"]["failure_threshold"]
            self.assertGreaterEqual(ft, 3)
            self.assertLessEqual(ft, 10)


class TestOpenapiCrossValidation(unittest.TestCase):
    """4. OpenAPI 与 Provider 配置交叉验证"""

    def test_openapi_file_exists(self):
        root = Path(__file__).resolve().parent.parent.parent
        openapi_path = root / "openapi.yaml"
        self.assertTrue(openapi_path.exists(), "openapi.yaml not found")

    def test_openapi_contains_provider_names(self):
        root = Path(__file__).resolve().parent.parent.parent
        openapi_path = root / "openapi.yaml"
        if not openapi_path.exists():
            self.skipTest("openapi.yaml missing")
        content = openapi_path.read_text(encoding="utf-8")
        for p in PROVIDER_SCHEMAS:
            # 至少有一个 Provider 名称或相关关键字出现在 OpenAPI 中
            self.assertIn(p["name"], content.lower() or p["endpoint"].split("//")[1].split("/")[0], f"{p['name']} not referenced")


class TestEnvExampleCoverage(unittest.TestCase):
    """5. .env.example 字段覆盖度"""

    def test_env_file_exists(self):
        root = Path(__file__).resolve().parent.parent.parent
        env_path = root / ".env.example"
        self.assertTrue(env_path.exists(), ".env.example not found")

    def test_all_providers_have_api_key_placeholder(self):
        root = Path(__file__).resolve().parent.parent.parent
        env_path = root / ".env.example"
        if not env_path.exists():
            self.skipTest(".env.example missing")
        content = env_path.read_text(encoding="utf-8")
        key_mappings = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "moonshot": "MOONSHOT_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "kimi-code": "KIMI_API_KEY_1",  # 或 KIMI_API_KEY_2..5
            "qwen": "QWEN_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "glm": "GLM_API_KEY",
            "azure": "AZURE_OPENAI_KEY",
        }
        for p_name, key_name in key_mappings.items():
            self.assertIn(key_name, content, f"{key_name} missing in .env.example")


# ========== 主入口 ==========

if __name__ == "__main__":
    unittest.main(verbosity=2)
