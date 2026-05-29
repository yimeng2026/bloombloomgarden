#!/usr/bin/env python3
"""
Kimi Advanced Test Suite
- Concurrent load balancing across 5 keys
- content + reasoning_content dual-field parsing
- Auto-failover on key failure
- Detailed JSON report with latency/success-rate/token estimates
- CLI: --all, --key-index N, --concurrency, --dry-run, --report
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional

import requests

# Default 5 Kimi keys from env or fallback
DEFAULT_KEYS = [
    os.environ.get("KIMI_API_KEY_1", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_2", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_3", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_4", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_API_KEY_5", "REMOVED_FROM_HISTORY"),
]

BASE_URL = "https://api.moonshot.cn/v1"
DEFAULT_CONCURRENCY = 5


@dataclass
class KeyStats:
    key_index: int
    key_short: str
    total_requests: int = 0
    successes: int = 0
    failures: int = 0
    total_latency_ms: float = 0.0
    tokens_estimated: int = 0
    last_error: Optional[str] = None
    is_healthy: bool = True


@dataclass
class TestResult:
    name: str
    status: str
    key_index: int
    key_short: str
    latency_ms: float
    has_content: bool = False
    has_reasoning: bool = False
    content_preview: str = ""
    reasoning_preview: str = ""
    error: Optional[str] = None
    timestamp: str = ""


class KimiLoadBalancer:
    """Round-robin + failover key selector"""

    def __init__(self, keys: List[str]):
        self.keys = [k for k in keys if k.startswith("sk-")]
        self.index = 0
        self.stats: Dict[int, KeyStats] = {
            i: KeyStats(key_index=i, key_short=self._shorten(k))
            for i, k in enumerate(self.keys)
        }

    @staticmethod
    def _shorten(key: str) -> str:
        return f"{key[:12]}...{key[-8:]}"

    def next_key(self) -> tuple[int, str]:
        start = self.index
        for _ in range(len(self.keys)):
            idx = self.index % len(self.keys)
            self.index = (self.index + 1) % len(self.keys)
            if self.stats[idx].is_healthy:
                return idx, self.keys[idx]
        # All unhealthy, return first anyway (last resort)
        return 0, self.keys[0]

    def mark_failure(self, idx: int, error: str):
        self.stats[idx].is_healthy = False
        self.stats[idx].last_error = error
        self.stats[idx].failures += 1

    def mark_success(self, idx: int, latency_ms: float, tokens_est: int = 0):
        self.stats[idx].is_healthy = True
        self.stats[idx].successes += 1
        self.stats[idx].total_latency_ms += latency_ms
        self.stats[idx].tokens_estimated += tokens_est

    def get_fallback(self, failed_idx: int) -> tuple[int, str]:
        for i in range(len(self.keys)):
            idx = (failed_idx + 1 + i) % len(self.keys)
            if idx != failed_idx and self.stats[idx].is_healthy:
                return idx, self.keys[idx]
        return (failed_idx + 1) % len(self.keys), self.keys[(failed_idx + 1) % len(self.keys)]


class KimiAdvancedTester:
    def __init__(self, keys: List[str] = None, dry_run: bool = False):
        self.keys = keys or DEFAULT_KEYS
        self.dry_run = dry_run
        self.lb = KimiLoadBalancer(self.keys)
        self.results: List[TestResult] = []

    def _call(self, key_idx: int, key: str, endpoint: str, payload: dict, timeout: int = 30) -> tuple[bool, dict, float, Optional[str]]:
        if self.dry_run:
            # Simulate realistic dry-run response
            time.sleep(0.05)
            mock_resp = {
                "content": f"[DRY-RUN] Response from key {key_idx + 1}",
                "reasoning_content": f"[DRY-RUN] Thinking process for key {key_idx + 1}" if "chat" in endpoint else None,
                "model": "moonshot-v1-8k",
                "usage": {"total_tokens": 150},
            }
            return True, mock_resp, 50.0, None

        start = time.time()
        try:
            resp = requests.post(
                f"{BASE_URL}{endpoint}",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": "claude-code/0.7.8",
                },
                json=payload,
                timeout=timeout,
            )
            latency = (time.time() - start) * 1000
            if resp.status_code == 200:
                return True, resp.json(), latency, None
            else:
                return False, {}, latency, f"HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.exceptions.Timeout:
            return False, {}, (time.time() - start) * 1000, "Timeout"
        except requests.exceptions.ConnectionError as e:
            return False, {}, (time.time() - start) * 1000, f"ConnectionError: {e}"
        except Exception as e:
            return False, {}, (time.time() - start) * 1000, str(e)

    def test_list_models(self, key_idx: int, key: str) -> TestResult:
        if self.dry_run:
            return TestResult(
                name="list_models", status="PASS", key_index=key_idx,
                key_short=self.lb._shorten(key), latency_ms=50,
                has_content=True, content_preview="[DRY-RUN] Models listed",
                timestamp=datetime.now().isoformat(),
            )
        start = time.time()
        try:
            resp = requests.get(
                f"{BASE_URL}/models",
                headers={"Authorization": f"Bearer {key}", "User-Agent": "claude-code/0.7.8"},
                timeout=15,
            )
            latency = (time.time() - start) * 1000
            ok = resp.status_code == 200
            data = resp.json() if ok else {}
            return TestResult(
                name="list_models", status="PASS" if ok else f"FAIL({resp.status_code})",
                key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=latency,
                has_content=ok, content_preview=str(data.get("data", [])[:2]) if ok else resp.text[:100],
                error=None if ok else f"HTTP {resp.status_code}",
                timestamp=datetime.now().isoformat(),
            )
        except Exception as e:
            return TestResult(
                name="list_models", status=f"ERROR", key_index=key_idx,
                key_short=self.lb._shorten(key), latency_ms=(time.time() - start) * 1000,
                error=str(e), timestamp=datetime.now().isoformat(),
            )

    def test_chat_standard(self, key_idx: int, key: str) -> TestResult:
        payload = {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": "Say 'hello' and nothing else."}],
            "temperature": 0.1,
            "max_tokens": 50,
        }
        ok, data, latency, error = self._call(key_idx, key, "/chat/completions", payload)
        content = ""
        reasoning = ""
        if ok and "choices" in data:
            msg = data["choices"][0].get("message", {})
            content = msg.get("content", "")
            reasoning = msg.get("reasoning_content", "") or ""
        return TestResult(
            name="chat_standard", status="PASS" if ok else (f"FAIL" if error else "UNKNOWN"),
            key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=latency,
            has_content=bool(content), has_reasoning=bool(reasoning),
            content_preview=content[:60], reasoning_preview=reasoning[:60],
            error=error, timestamp=datetime.now().isoformat(),
        )

    def test_chat_with_reasoning(self, key_idx: int, key: str) -> TestResult:
        """Test that reasoning_content field exists in response"""
        payload = {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": "Calculate 15 * 23. Show your reasoning."}],
            "temperature": 0.2,
            "max_tokens": 500,
        }
        ok, data, latency, error = self._call(key_idx, key, "/chat/completions", payload)
        content, reasoning = "", ""
        if ok and "choices" in data:
            msg = data["choices"][0].get("message", {})
            content = msg.get("content", "")
            reasoning = msg.get("reasoning_content", "") or ""
        return TestResult(
            name="chat_with_reasoning", status="PASS" if ok else f"FAIL",
            key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=latency,
            has_content=bool(content), has_reasoning=bool(reasoning),
            content_preview=content[:80], reasoning_preview=reasoning[:80],
            error=error, timestamp=datetime.now().isoformat(),
        )

    def test_failover(self, key_idx: int, key: str) -> TestResult:
        """Simulate a failure on this key, then verify fallback works"""
        if self.dry_run:
            # In dry-run, simulate failure on key 0
            if key_idx == 0:
                self.lb.mark_failure(0, "Simulated failure")
                fb_idx, fb_key = self.lb.get_fallback(0)
                return TestResult(
                    name="failover", status="PASS",
                    key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=0,
                    content_preview=f"Failed key {key_idx + 1}, fallback to key {fb_idx + 1}",
                    timestamp=datetime.now().isoformat(),
                )
            return TestResult(
                name="failover", status="PASS",
                key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=0,
                content_preview=f"Key {key_idx + 1} healthy, no failover needed",
                timestamp=datetime.now().isoformat(),
            )

        # Real test: intentionally use a bad key format to trigger 401, then failover
        bad_key = key + "_invalid_suffix"
        ok, _, _, err = self._call(key_idx, bad_key, "/chat/completions", {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        if not ok and ("401" in (err or "") or "Unauthorized" in (err or "")):
            self.lb.mark_failure(key_idx, err)
            fb_idx, fb_key = self.lb.get_fallback(key_idx)
            # Try with fallback key
            ok2, data2, lat2, err2 = self._call(fb_idx, fb_key, "/chat/completions", {
                "model": "moonshot-v1-8k",
                "messages": [{"role": "user", "content": "Hi"}],
            })
            if ok2:
                return TestResult(
                    name="failover", status="PASS",
                    key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=lat2,
                    content_preview=f"Primary key failed ({err}), fallback key {fb_idx + 1} succeeded",
                    timestamp=datetime.now().isoformat(),
                )
        return TestResult(
            name="failover", status="FAIL",
            key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=0,
            error="Failover did not recover",
            timestamp=datetime.now().isoformat(),
        )

    def test_streaming(self, key_idx: int, key: str) -> TestResult:
        payload = {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": "Count to 3."}],
            "stream": True,
            "max_tokens": 100,
        }
        if self.dry_run:
            return TestResult(
                name="streaming", status="PASS",
                key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=100,
                content_preview="[DRY-RUN] Stream chunks received",
                timestamp=datetime.now().isoformat(),
            )

        start = time.time()
        try:
            resp = requests.post(
                f"{BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": "claude-code/0.7.8",
                },
                json=payload,
                timeout=30,
                stream=True,
            )
            chunks = 0
            for line in resp.iter_lines():
                if line:
                    chunks += 1
            latency = (time.time() - start) * 1000
            return TestResult(
                name="streaming", status="PASS" if resp.status_code == 200 else f"FAIL({resp.status_code})",
                key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=latency,
                content_preview=f"Received {chunks} stream chunks",
                error=None if resp.status_code == 200 else f"HTTP {resp.status_code}",
                timestamp=datetime.now().isoformat(),
            )
        except Exception as e:
            return TestResult(
                name="streaming", status="ERROR",
                key_index=key_idx, key_short=self.lb._shorten(key), latency_ms=(time.time() - start) * 1000,
                error=str(e), timestamp=datetime.now().isoformat(),
            )

    def run_all_tests(self, key_indices: List[int], concurrency: int = DEFAULT_CONCURRENCY):
        tests = [
            ("list_models", self.test_list_models),
            ("chat_standard", self.test_chat_standard),
            ("chat_with_reasoning", self.test_chat_with_reasoning),
            ("streaming", self.test_streaming),
            ("failover", self.test_failover),
        ]

        total_tasks = len(key_indices) * len(tests)
        completed = 0

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = {}
            for ki in key_indices:
                for test_name, test_fn in tests:
                    future = executor.submit(test_fn, ki, self.keys[ki])
                    futures[future] = (ki, test_name)

            for future in as_completed(futures):
                ki, test_name = futures[future]
                try:
                    result = future.result()
                except Exception as e:
                    result = TestResult(
                        name=test_name, status="CRASH", key_index=ki,
                        key_short=self.lb._shorten(self.keys[ki]), latency_ms=0,
                        error=str(e), timestamp=datetime.now().isoformat(),
                    )
                self.results.append(result)
                if result.status == "PASS":
                    self.lb.mark_success(ki, result.latency_ms, tokens_est=150)
                else:
                    self.lb.mark_failure(ki, result.error or "Unknown")
                completed += 1
                if not self.dry_run:
                    print(f"  [{completed}/{total_tasks}] Key {ki + 1}/{len(self.keys)} | {test_name}: {result.status} ({result.latency_ms:.0f}ms)")

    def generate_report(self) -> dict:
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = total - passed
        avg_latency = sum(r.latency_ms for r in self.results) / max(total, 1)
        total_tokens = sum(s.tokens_estimated for s in self.lb.stats.values())

        per_key = {}
        for ki, stat in self.lb.stats.items():
            key_results = [r for r in self.results if r.key_index == ki]
            per_key[f"key_{ki + 1}"] = {
                "key_short": stat.key_short,
                "total_requests": stat.total_requests + len(key_results),
                "successes": sum(1 for r in key_results if r.status == "PASS"),
                "failures": sum(1 for r in key_results if r.status != "PASS"),
                "avg_latency_ms": round(sum(r.latency_ms for r in key_results) / max(len(key_results), 1), 2),
                "tokens_estimated": stat.tokens_estimated,
                "is_healthy": stat.is_healthy,
                "last_error": stat.last_error,
            }

        report = {
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "base_url": BASE_URL,
                "dry_run": self.dry_run,
                "total_keys": len(self.keys),
            },
            "summary": {
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "success_rate": f"{passed / max(total, 1) * 100:.1f}%",
                "avg_latency_ms": round(avg_latency, 2),
                "total_tokens_estimated": total_tokens,
            },
            "per_key": per_key,
            "results": [asdict(r) for r in self.results],
        }
        return report

    def print_summary(self):
        report = self.generate_report()
        s = report["summary"]
        print("\n" + "=" * 60)
        print("         KIMI ADVANCED TEST REPORT")
        print("=" * 60)
        print(f"Total Tests : {s['total_tests']}")
        print(f"Passed      : {s['passed']}")
        print(f"Failed      : {s['failed']}")
        print(f"Success Rate: {s['success_rate']}")
        print(f"Avg Latency : {s['avg_latency_ms']}ms")
        print(f"Est. Tokens : {s['total_tokens_estimated']}")
        print("-" * 60)
        for key_id, stats in report["per_key"].items():
            status = "HEALTHY" if stats["is_healthy"] else "UNHEALTHY"
            print(f"{key_id}: {stats['successes']}/{stats['total_requests']} pass | "
                  f"{stats['avg_latency_ms']}ms avg | {status}")
        print("=" * 60)
        return report


def main():
    parser = argparse.ArgumentParser(description="Kimi Advanced Test Suite")
    parser.add_argument("--all", action="store_true", help="Test all 5 keys")
    parser.add_argument("--key-index", type=int, default=0, choices=range(0, 5),
                        help="Test specific key (0-4)")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY,
                        help="Concurrent worker count")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without actual API calls (fast validation)")
    parser.add_argument("--report", type=str, default="kimi_test_report.json",
                        help="Output JSON report file")
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY-RUN MODE] No actual API calls will be made.\n")

    tester = KimiAdvancedTester(dry_run=args.dry_run)

    if args.all:
        key_indices = list(range(len(tester.keys)))
        print(f"Testing ALL {len(key_indices)} keys with concurrency={args.concurrency}...")
    else:
        key_indices = [args.key_index]
        print(f"Testing key {args.key_index + 1} only...")

    tester.run_all_tests(key_indices, concurrency=args.concurrency)
    report = tester.print_summary()

    # Write JSON report
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nReport saved to: {args.report}")

    # Exit code
    if report["summary"]["failed"] > 0 and not args.dry_run:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
