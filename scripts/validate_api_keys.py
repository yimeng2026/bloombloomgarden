#!/usr/bin/env python3
"""
千界花园 — API Key 格式本地验证器 + Token 估算器
无需网络，纯本地正则 + 算法验证
用法: python scripts/validate_api_keys.py
"""

import re
import sys
from pathlib import Path

PASS = 0
FAIL = 0

def test(name, cond, msg=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}: {msg}")

# ── Provider Key 格式规则 ────────────────────────
KEY_PATTERNS = {
    'openai':    r'^sk-[a-zA-Z0-9]{48}$',
    'anthropic': r'^sk-ant-api03-[a-zA-Z0-9_-]{93,}$',
    'moonshot':  r'^sk-[a-zA-Z0-9]{48}$',
    'kimi-code': r'^sk-kimi-[a-zA-Z0-9]{48,64}$',
    'deepseek':  r'^sk-[a-zA-Z0-9]{32,48}$',
    'qwen':      r'^sk-[a-zA-Z0-9]{32,64}$',
    'gemini':    r'^AIza[0-9A-Za-z_-]{35,}$',
    'glm':       r'^[a-zA-Z0-9]{32,64}$',
    'openrouter': r'^sk-or-[a-zA-Z0-9]{48,}$',
    'azure':     r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
}

print("=" * 60)
print("  API Key 格式本地验证")
print("=" * 60 + "\n")

# 测试真实格式（用假key但正确长度/前缀）
SAMPLE_KEYS = {
    'openai':    'sk-' + 'a' * 48,
    'anthropic': 'sk-ant-api03-' + 'a' * 93,
    'moonshot':  'sk-' + 'b' * 48,
    'kimi-code': 'sk-kimi-' + 'c' * 48,
    'deepseek':  'sk-' + 'd' * 48,
    'qwen':      'sk-' + 'e' * 48,
    'gemini':    'AIza' + 'f' * 35,
    'glm':       'g' * 32,
    'openrouter': 'sk-or-' + 'h' * 48,
    'azure':     '12345678-1234-1234-1234-123456789abc',
}

for provider, pattern in KEY_PATTERNS.items():
    sample = SAMPLE_KEYS.get(provider, '')
    valid = bool(re.match(pattern, sample))
    test(f"[{provider}] 格式规则有效", valid, f"样本 '{sample[:20]}...' 不匹配 {pattern[:30]}")

# 测试用户提供的 Kimi Keys（脱敏展示）
user_kimi_keys = [
    "REMOVED_FROM_HISTORY",
    "REMOVED_FROM_HISTORY",
    "REMOVED_FROM_HISTORY",
    "REMOVED_FROM_HISTORY",
    "REMOVED_FROM_HISTORY",
]
for i, key in enumerate(user_kimi_keys, 1):
    valid = bool(re.match(KEY_PATTERNS['kimi-code'], key))
    test(f"用户提供 Kimi Key #{i} 格式正确", valid, f"长度={len(key)}, 前缀={key[:10]}")

print("\n" + "=" * 60)
print("  Token 估算测试（基于 UTF-8 字节 / 4 字符近似）")
print("=" * 60 + "\n")

def estimate_tokens(text: str) -> int:
    """粗略估算：英文≈1 token/字，中文≈1 token/字，通用按字符数/1.5取整"""
    if not text:
        return 0
    # 混合文本：中文字符算1，其他算0.5
    cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    other = len(text) - cn
    return int(cn + other * 0.5) + 1

TEST_TEXTS = [
    ("Hello world", 6),
    ("你好世界", 4),
    ("Hello 你好 world 世界", 8),
    ("x" * 1000, 500),
]

for text, expected_min in TEST_TEXTS:
    tokens = estimate_tokens(text)
    test(f"Token估算 '{text[:20]}...' => {tokens} tokens", tokens >= expected_min, f"实际 {tokens}")

# 测试 3DACP AxisMessage 序列化开销 ────────────────
import json
axis_msg = {
    "source": {"x": "web-frontend", "y": "dialog", "z": "rest"},
    "target": {"x": "backend-api", "y": "llm", "z": "rest"},
    "payload": {"content": "你好", "model": "kimi-latest"},
    "metadata": {"timestamp": 1234567890, "traceId": "abc-123"}
}
serialized = json.dumps(axis_msg, ensure_ascii=False)
tokens = estimate_tokens(serialized)
print(f"\n  AxisMessage 序列化开销: ~{tokens} tokens ({len(serialized)} bytes)")
test("AxisMessage 序列化 < 200 tokens", tokens < 200)

print(f"\n{'=' * 60}")
print(f"  完成: ✅ {PASS} 通过 / ❌ {FAIL} 失败")
print(f"{'=' * 60}")
sys.exit(0 if FAIL == 0 else 1)
