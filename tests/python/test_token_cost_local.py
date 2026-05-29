#!/usr/bin/env python3
"""
test_token_cost_local.py — 千界花园 Token 估算与成本计算本地测试
纯本地执行，不依赖任何外部 API 或网络。

覆盖范围：
1. Token 计数启发式算法（中英混合文本）
2. 10 大 Provider 成本模型对照
3. SpendTracker 统计逻辑校验
4. Token 预算分级匹配
"""

import json
import math
import unittest
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class ProviderCostModel:
    """Provider 成本模型（每 1K tokens 美元）"""
    name: str
    input_price: float       # $ / 1K input tokens
    output_price: float      # $ / 1K output tokens
    currency: str = "USD"


@dataclass
class TokenEstimate:
    """单次请求 Token 估算结果"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float


# ========== 千界花园 10 大 Provider 成本表（参考公开定价） ==========
PROVIDER_COST_TABLE: Dict[str, ProviderCostModel] = {
    "openai": ProviderCostModel("openai", 0.0050, 0.0150),          # gpt-4o 级别
    "azure": ProviderCostModel("azure", 0.0050, 0.0150),            # Azure OpenAI 同价
    "anthropic": ProviderCostModel("anthropic", 0.0030, 0.0150),    # Claude 3 Sonnet
    "deepseek": ProviderCostModel("deepseek", 0.00014, 0.00028),    # DeepSeek-V3
    "moonshot": ProviderCostModel("moonshot", 0.00060, 0.00060),   # Moonshot v1
    "kimi-code": ProviderCostModel("kimi-code", 0.00060, 0.00060), # Kimi Code
    "qwen": ProviderCostModel("qwen", 0.00050, 0.0020),           # Qwen-Max
    "gemini": ProviderCostModel("gemini", 0.00035, 0.00105),       # Gemini 1.5 Pro
    "glm": ProviderCostModel("glm", 0.00100, 0.00100),             # GLM-4
    "openrouter": ProviderCostModel("openrouter", 0.0000, 0.0000),  # 免费模型占位
}


# ========== Token 预算分级（与 ProviderOptimization.ts 对齐） ==========
TOKEN_BUDGETS = {
    "simple": 500,
    "normal": 1500,
    "code": 4000,
    "long": 4000,
}


def estimate_tokens(text: str) -> int:
    """
    混合语言 Token 估算启发式：
    - 英文/数字/标点：≈ 0.25 tokens / char（基于 GPT 词表平均）
    - 中文/日文/韩文：≈ 1.0 ~ 1.5 tokens / char（Unicode 范围判断）
    - 代码符号：≈ 0.3 tokens / char
    经验公式足够用于预算预检查，无需精确到 tiktoken。
    """
    if not text:
        return 0
    total = 0
    for ch in text:
        o = ord(ch)
        if 0x4E00 <= o <= 0x9FFF or 0x3040 <= o <= 0x309F or 0x30A0 <= o <= 0x30FF:
            # CJK 统一表意文字 / 平假名 / 片假名
            total += 1.2
        elif ch.isascii():
            if ch.isalnum():
                total += 0.25
            else:
                total += 0.3
        else:
            total += 0.5
    return math.ceil(total)


def estimate_cost(provider: str, prompt_text: str, completion_text: str) -> TokenEstimate:
    """估算单次请求的成本（美元）"""
    model = PROVIDER_COST_TABLE.get(provider)
    if not model:
        raise ValueError(f"Unknown provider: {provider}")
    prompt_tokens = estimate_tokens(prompt_text)
    completion_tokens = estimate_tokens(completion_text)
    total_tokens = prompt_tokens + completion_tokens
    cost = (prompt_tokens / 1000 * model.input_price) + (completion_tokens / 1000 * model.output_price)
    return TokenEstimate(prompt_tokens, completion_tokens, total_tokens, round(cost, 6))


def match_budget_level(token_count: int) -> str:
    """根据 Token 数量匹配预算级别"""
    for level in ["simple", "normal", "code", "long"]:
        if token_count <= TOKEN_BUDGETS[level]:
            return level
    return "exceed"


# ========== 测试用例 ==========

class TestTokenEstimation(unittest.TestCase):
    """1. Token 计数算法校验"""

    def test_empty_text(self):
        self.assertEqual(estimate_tokens(""), 0)

    def test_english_short(self):
        text = "Hello world"
        # 11 ascii chars, mostly alnum -> ~11*0.25=2.75 -> ceil 3
        self.assertAlmostEqual(estimate_tokens(text), 3, delta=1)

    def test_english_long(self):
        text = "The quick brown fox jumps over the lazy dog. " * 10
        tokens = estimate_tokens(text)
        # ~450 chars, mostly ascii alnum+space+punct -> ~450*0.27=121
        self.assertGreater(tokens, 80)
        self.assertLess(tokens, 200)

    def test_chinese_short(self):
        text = "你好世界"
        # 4 CJK chars -> 4*1.2=4.8 -> ceil 5
        self.assertAlmostEqual(estimate_tokens(text), 5, delta=1)

    def test_chinese_long(self):
        text = "这是一个用于测试Token估算功能的较长中文句子，包含标点符号和数字123。" * 20
        tokens = estimate_tokens(text)
        self.assertGreater(tokens, 300)
        self.assertLess(tokens, 800)

    def test_mixed_text(self):
        text = "Hello 世界，this is a mixed sentence 测试123。"
        tokens = estimate_tokens(text)
        self.assertGreater(tokens, 10)
        self.assertLess(tokens, 40)

    def test_code_snippet(self):
        code = "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n"
        tokens = estimate_tokens(code)
        # ~70 ascii chars -> ~70*0.27=19
        self.assertGreater(tokens, 10)
        self.assertLess(tokens, 30)


class TestCostCalculation(unittest.TestCase):
    """2. 成本计算校验"""

    def test_openai_cost(self):
        prompt = "Explain quantum computing in simple terms."
        completion = "Quantum computing uses qubits which can be 0 and 1 simultaneously..."
        est = estimate_cost("openai", prompt, completion)
        self.assertGreater(est.prompt_tokens, 5)
        self.assertGreater(est.completion_tokens, 5)
        self.assertGreater(est.estimated_cost_usd, 0.0)
        # 输入约 10 tokens，输出约 15 tokens -> 10/1000*0.005 + 15/1000*0.015 = 0.000275
        self.assertLess(est.estimated_cost_usd, 0.01)

    def test_deepseek_cost_cheap(self):
        prompt = "Write a Python function to sort a list."
        completion = "def sort_list(lst): return sorted(lst)"
        est = estimate_cost("deepseek", prompt, completion)
        # DeepSeek 非常便宜，应该 < 0.0001
        self.assertLess(est.estimated_cost_usd, 0.0001)

    def test_all_providers_have_prices(self):
        for name, model in PROVIDER_COST_TABLE.items():
            self.assertGreaterEqual(model.input_price, 0.0, f"{name} input price invalid")
            self.assertGreaterEqual(model.output_price, 0.0, f"{name} output price invalid")

    def test_cost_monotonicity(self):
        """更多 Token 应该产生更高成本"""
        est_small = estimate_cost("anthropic", "Hi", "Hello")
        est_large = estimate_cost("anthropic", "Hi" * 1000, "Hello" * 2000)
        self.assertGreater(est_large.estimated_cost_usd, est_small.estimated_cost_usd)


class TestBudgetLevels(unittest.TestCase):
    """3. Token 预算分级匹配"""

    def test_simple_level(self):
        self.assertEqual(match_budget_level(100), "simple")
        self.assertEqual(match_budget_level(500), "simple")

    def test_normal_level(self):
        self.assertEqual(match_budget_level(501), "normal")
        self.assertEqual(match_budget_level(1500), "normal")

    def test_code_level(self):
        self.assertEqual(match_budget_level(1501), "code")
        self.assertEqual(match_budget_level(4000), "code")
        # long 也是 4000，所以 4000 会被 simple 匹配截获（按顺序）
        # 实际上 4000 <= simple(500)? 不对，重新看实现
        # 实现是按顺序检查，500, 1500, 4000, 4000
        # 1501 -> >500, >1500, <=4000 -> code

    def test_exceed_level(self):
        self.assertEqual(match_budget_level(4001), "exceed")
        self.assertEqual(match_budget_level(10000), "exceed")


class TestSpendTrackerLogic(unittest.TestCase):
    """4. SpendTracker 统计逻辑模拟"""

    def test_daily_aggregation(self):
        """模拟按日聚合用量"""
        records = [
            {"date": "2025-05-28", "provider": "openai", "tokens": 1000, "cost": 0.01},
            {"date": "2025-05-28", "provider": "openai", "tokens": 2000, "cost": 0.02},
            {"date": "2025-05-29", "provider": "deepseek", "tokens": 5000, "cost": 0.001},
        ]
        daily = {}
        for r in records:
            d = r["date"]
            daily[d] = daily.get(d, {"tokens": 0, "cost": 0.0})
            daily[d]["tokens"] += r["tokens"]
            daily[d]["cost"] += r["cost"]
        self.assertEqual(daily["2025-05-28"]["tokens"], 3000)
        self.assertAlmostEqual(daily["2025-05-28"]["cost"], 0.03, places=5)
        self.assertEqual(daily["2025-05-29"]["tokens"], 5000)

    def test_provider_ranking(self):
        """模拟 Provider 用量排名"""
        records = [
            {"provider": "openai", "tokens": 10000},
            {"provider": "deepseek", "tokens": 50000},
            {"provider": "anthropic", "tokens": 8000},
        ]
        ranking = sorted(records, key=lambda x: x["tokens"], reverse=True)
        self.assertEqual(ranking[0]["provider"], "deepseek")
        self.assertEqual(ranking[1]["provider"], "openai")
        self.assertEqual(ranking[2]["provider"], "anthropic")


class TestJsonSerialization(unittest.TestCase):
    """5. 数据序列化校验（对接前端 SpendTracker 接口格式）"""

    def test_spend_data_structure(self):
        data = {
            "by_provider": [
                {"name": "openai", "tokens": 12000, "cost": 0.15, "requests": 45},
                {"name": "deepseek", "tokens": 34000, "cost": 0.008, "requests": 120},
            ],
            "by_model": [
                {"name": "gpt-4o", "tokens": 8000, "cost": 0.10, "requests": 20},
            ],
            "by_date": [
                {"date": "2025-05-29", "tokens": 15000, "cost": 0.05},
            ],
            "total": {"tokens": 15000, "cost": 0.05, "requests": 80},
        }
        json_str = json.dumps(data, ensure_ascii=False)
        parsed = json.loads(json_str)
        self.assertEqual(len(parsed["by_provider"]), 2)
        self.assertEqual(parsed["total"]["requests"], 80)


# ========== 主入口 ==========

if __name__ == "__main__":
    unittest.main(verbosity=2)
