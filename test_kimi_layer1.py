#!/usr/bin/env python3
"""
Kimi API Key Test Script - Layer 1
Uses requests library directly (no subprocess/exec)
"""

import requests
import json
import time
from datetime import datetime

# Read keys from environment or fallback
import os

keys = [
    os.environ.get("KIMI_API_KEY_1", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_2", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_3", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_4", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_5", "REMOVED_FROM_HISTORY"),
]

BASE_URL = "https://api.moonshot.cn/v1"
results = []

def test_key(key_idx, key):
    key_short = key[:15] + "..." + key[-10:]
    print(f"\n{'='*60}")
    print(f"Key {key_idx+1}: {key_short}")
    print(f"{'='*60}")

    key_results = {"key_short": key_short, "tests": []}

    # Test 1: Standard API - List models
    print("\n[1] Standard API - List models")
    try:
        start = time.time()
        resp = requests.get(
            f"{BASE_URL}/models",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=15
        )
        latency = int((time.time() - start) * 1000)
        status = "PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})"
        print(f"    Status: {status} | Latency: {latency}ms")
        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("id", "") for m in data.get("data", [])[:5]]
            print(f"    Models: {models}")
        else:
            print(f"    Response: {resp.text[:200]}")
        key_results["tests"].append({"name": "list_models", "status": status, "latency_ms": latency, "code": resp.status_code})
    except Exception as e:
        print(f"    ERROR: {e}")
        key_results["tests"].append({"name": "list_models", "status": f"ERROR: {e}", "latency_ms": None, "code": None})

    # Test 2: Standard Chat - moonshot-v1-8k
    print("\n[2] Standard Chat - moonshot-v1-8k")
    try:
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "moonshot-v1-8k",
                "messages": [{"role": "user", "content": "你好"}],
                "max_tokens": 100,
                "temperature": 0.3
            },
            timeout=30
        )
        latency = int((time.time() - start) * 1000)
        status = "PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})"
        print(f"    Status: {status} | Latency: {latency}ms")
        if resp.status_code == 200:
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")[:50]
            print(f"    Content: {content}...")
        else:
            print(f"    Response: {resp.text[:200]}")
        key_results["tests"].append({"name": "chat_8k", "status": status, "latency_ms": latency, "code": resp.status_code})
    except Exception as e:
        print(f"    ERROR: {e}")
        key_results["tests"].append({"name": "chat_8k", "status": f"ERROR: {e}", "latency_ms": None, "code": None})

    # Test 3: Kimi Code - with User-Agent + max_tokens=4000
    print("\n[3] Kimi Code - with User-Agent, max_tokens=4000")
    try:
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "User-Agent": "claude-code/0.7.8"
            },
            json={
                "model": "kimi-k2-code",
                "messages": [{"role": "user", "content": "写一个Python快速排序"}],
                "max_tokens": 4000,
                "temperature": 0.3
            },
            timeout=120
        )
        latency = int((time.time() - start) * 1000)
        status = "PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})"
        print(f"    Status: {status} | Latency: {latency}ms")
        if resp.status_code == 200:
            data = resp.json()
            msg = data.get("choices", [{}])[0].get("message", {})
            content = msg.get("content", "")[:80]
            reasoning = msg.get("reasoning_content", "")[:80]
            print(f"    Content: {content}...")
            if reasoning:
                print(f"    Reasoning: {reasoning}...")
        else:
            print(f"    Response: {resp.text[:200]}")
        key_results["tests"].append({"name": "kimi_code_ua_4000", "status": status, "latency_ms": latency, "code": resp.status_code})
    except Exception as e:
        print(f"    ERROR: {e}")
        key_results["tests"].append({"name": "kimi_code_ua_4000", "status": f"ERROR: {e}", "latency_ms": None, "code": None})

    # Test 4: Kimi Code - NO User-Agent (should fail or behave differently)
    print("\n[4] Kimi Code - WITHOUT User-Agent, max_tokens=4000")
    try:
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "kimi-k2-code",
                "messages": [{"role": "user", "content": "你好"}],
                "max_tokens": 4000
            },
            timeout=60
        )
        latency = int((time.time() - start) * 1000)
        status = "PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})"
        print(f"    Status: {status} | Latency: {latency}ms")
        if resp.status_code != 200:
            print(f"    Response: {resp.text[:200]}")
        key_results["tests"].append({"name": "kimi_code_no_ua", "status": status, "latency_ms": latency, "code": resp.status_code})
    except Exception as e:
        print(f"    ERROR: {e}")
        key_results["tests"].append({"name": "kimi_code_no_ua", "status": f"ERROR: {e}", "latency_ms": None, "code": None})

    # Test 5: Kimi Code - max_tokens=500 (should return empty content)
    print("\n[5] Kimi Code - max_tokens=500 (low - should fail/empty)")
    try:
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "User-Agent": "claude-code/0.7.8"
            },
            json={
                "model": "kimi-k2-code",
                "messages": [{"role": "user", "content": "写一个快速排序"}],
                "max_tokens": 500
            },
            timeout=60
        )
        latency = int((time.time() - start) * 1000)
        status = "PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})"
        print(f"    Status: {status} | Latency: {latency}ms")
        if resp.status_code == 200:
            data = resp.json()
            msg = data.get("choices", [{}])[0].get("message", {})
            content = msg.get("content", "")
            reasoning = msg.get("reasoning_content", "")
            print(f"    Content len: {len(content)} | Reasoning len: {len(reasoning)}")
            if not content and reasoning:
                print(f"    >>> CONFIRMED: content empty, reasoning_content present (expected bug)")
        else:
            print(f"    Response: {resp.text[:200]}")
        key_results["tests"].append({"name": "kimi_code_500", "status": status, "latency_ms": latency, "code": resp.status_code})
    except Exception as e:
        print(f"    ERROR: {e}")
        key_results["tests"].append({"name": "kimi_code_500", "status": f"ERROR: {e}", "latency_ms": None, "code": None})

    results.append(key_results)

# Run all tests
print(f"\n{'#'*60}")
print(f"Kimi API Key Test - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"{'#'*60}")

for i, key in enumerate(keys):
    test_key(i, key)

# Summary
print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")
for r in results:
    passed = sum(1 for t in r["tests"] if "PASS" in str(t["status"]))
    total = len(r["tests"])
    print(f"  {r['key_short']}: {passed}/{total} passed")
    for t in r["tests"]:
        status_icon = "✅" if "PASS" in str(t["status"]) else "❌"
        lat = f"{t['latency_ms']}ms" if t['latency_ms'] else "N/A"
        print(f"    {status_icon} {t['name']:20s} | {t['status']:15s} | {lat}")

# Save report
report_file = "kimi_test_report.json"
with open(report_file, "w", encoding="utf-8") as f:
    json.dump({
        "timestamp": datetime.now().isoformat(),
        "total_keys": len(keys),
        "results": results
    }, f, ensure_ascii=False, indent=2)
print(f"\nReport saved: {report_file}")
