#!/usr/bin/env python3
"""
test_stress_benchmark.py — LLM Provider 压力测试与性能基准
用法: python test_stress_benchmark.py --provider kimi-code --duration 60 --concurrency 10
"""
import os
import sys
import time
import json
import statistics
import argparse
import concurrent.futures
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from datetime import datetime
import urllib.request
import urllib.error
import ssl


@dataclass
class BenchmarkResult:
    provider: str
    model: str
    timestamp: str
    duration_sec: int
    concurrency: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    latencies_ms: List[float] = field(default_factory=list)
    ttft_ms_list: List[float] = field(default_factory=list)  # Time To First Token
    tokens_per_sec_list: List[float] = field(default_factory=list)
    errors: Dict[str, int] = field(default_factory=dict)

    @property
    def qps(self) -> float:
        return self.total_requests / max(self.duration_sec, 1)

    @property
    def success_rate(self) -> float:
        return self.successful_requests / max(self.total_requests, 1) * 100

    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0

    @property
    def median_latency(self) -> float:
        return statistics.median(self.latencies_ms) if self.latencies_ms else 0

    @property
    def p99_latency(self) -> float:
        if not self.latencies_ms:
            return 0
        s = sorted(self.latencies_ms)
        return s[int(len(s) * 0.99)]

    @property
    def stddev_latency(self) -> float:
        return statistics.stdev(self.latencies_ms) if len(self.latencies_ms) > 1 else 0

    def to_dict(self):
        d = asdict(self)
        d.update({
            "qps": self.qps,
            "success_rate": self.success_rate,
            "avg_latency_ms": self.avg_latency,
            "median_latency_ms": self.median_latency,
            "p99_latency_ms": self.p99_latency,
            "stddev_latency_ms": self.stddev_latency,
        })
        return d


PROVIDER_MAP = {
    "kimi-code": {
        "base_url": "https://api.moonshot.cn/v1",
        "model": "kimi-latest",
        "auth_env": "KIMI_CODE_API_KEY_1",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "User-Agent": "claude-code/0.7.8", "Content-Type": "application/json"},
    },
    "kimi": {
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "auth_env": "KIMI_API_KEY",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "auth_env": "OPENAI_API_KEY",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "auth_env": "DEEPSEEK_API_KEY",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
    },
    "qwen": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-turbo",
        "auth_env": "DASHSCOPE_API_KEY",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
    },
    "glm": {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "model": "glm-4-flash",
        "auth_env": "GLM_API_KEY",
        "headers": lambda k: {"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
    },
}


def _ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def single_request(provider_cfg: dict, key: str, prompt: str, max_tokens: int) -> dict:
    """发送单个请求，返回性能指标"""
    url = f"{provider_cfg['base_url'].rstrip('/')}/chat/completions"
    body = json.dumps({
        "model": provider_cfg["model"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False,
    })
    req = urllib.request.Request(
        url,
        data=body.encode("utf-8"),
        headers=provider_cfg["headers"](key),
        method="POST",
    )

    start = time.perf_counter()
    try:
        resp = urllib.request.urlopen(req, timeout=120, context=_ctx())
        first_byte_time = time.perf_counter()
        data = resp.read().decode("utf-8")
        end_time = time.perf_counter()

        total_latency = (end_time - start) * 1000
        ttft = (first_byte_time - start) * 1000  # 非流式情况下近似

        j = json.loads(data)
        usage = j.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", completion_tokens)

        # 计算吞吐量 tokens/second
        gen_time = max(total_latency - ttft, 1) / 1000
        tps = completion_tokens / gen_time if gen_time > 0 else 0

        return {
            "success": True,
            "latency_ms": total_latency,
            "ttft_ms": ttft,
            "tokens_per_sec": tps,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        }
    except urllib.error.HTTPError as e:
        return {
            "success": False,
            "error": f"HTTP {e.code}",
            "latency_ms": (time.perf_counter() - start) * 1000,
        }
    except Exception as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "latency_ms": (time.perf_counter() - start) * 1000,
        }


def run_benchmark(provider_id: str, duration_sec: int, concurrency: int, prompt: str, max_tokens: int) -> BenchmarkResult:
    """运行基准测试"""
    cfg = PROVIDER_MAP.get(provider_id)
    if not cfg:
        print(f"Unknown provider: {provider_id}")
        sys.exit(1)

    key = os.environ.get(cfg["auth_env"], "").strip()
    if not key:
        print(f"请设置环境变量: {cfg['auth_env']}")
        sys.exit(1)

    result = BenchmarkResult(
        provider=provider_id,
        model=cfg["model"],
        timestamp=datetime.now().isoformat(),
        duration_sec=duration_sec,
        concurrency=concurrency,
        total_requests=0,
        successful_requests=0,
        failed_requests=0,
    )

    print(f"\n🚀 启动基准测试: {provider_id} ({cfg['model']})")
    print(f"   持续时间: {duration_sec}s | 并发: {concurrency} | max_tokens: {max_tokens}")
    print(f"   提示词: {prompt[:50]}...")
    print("   测试中...", end="", flush=True)

    start_time = time.time()

    def worker():
        while time.time() - start_time < duration_sec:
            res = single_request(cfg, key, prompt, max_tokens)
            result.total_requests += 1
            if res["success"]:
                result.successful_requests += 1
                result.latencies_ms.append(res["latency_ms"])
                result.ttft_ms_list.append(res["ttft_ms"])
                result.tokens_per_sec_list.append(res["tokens_per_sec"])
            else:
                result.failed_requests += 1
                err = res.get("error", "unknown")
                result.errors[err] = result.errors.get(err, 0) + 1
            time.sleep(0.1)

    threads = []
    import threading
    for _ in range(concurrency):
        t = threading.Thread(target=worker)
        t.start()
        threads.append(t)

    # 进度显示
    while any(t.is_alive() for t in threads):
        time.sleep(2)
        elapsed = time.time() - start_time
        print(f"\r   测试中... {elapsed:.0f}s / {duration_sec}s | 请求: {result.total_requests} | 成功: {result.successful_requests}", end="", flush=True)

    for t in threads:
        t.join()

    print(f"\r   ✅ 测试完成 ({time.time() - start_time:.1f}s)                  ")
    return result


def print_report(result: BenchmarkResult):
    print(f"\n{'='*60}")
    print(f"📊 千界花园 — {result.provider.upper()} 性能基准报告")
    print("=" * 60)
    print(f"   模型: {result.model}")
    print(f"   时间: {result.timestamp}")
    print(f"   配置: {result.duration_sec}s × {result.concurrency}并发")
    print()
    print(f"   📈 吞吐量")
    print(f"      总请求: {result.total_requests}")
    print(f"      成功: {result.successful_requests} ({result.success_rate:.1f}%)")
    print(f"      失败: {result.failed_requests}")
    print(f"      QPS: {result.qps:.2f}")
    print()
    print(f"   ⏱️ 延迟分布 (ms)")
    print(f"      平均: {result.avg_latency:.1f}")
    print(f"      中位数: {result.median_latency:.1f}")
    print(f"      P99: {result.p99_latency:.1f}")
    print(f"      标准差: {result.stddev_latency:.1f}")
    print()
    if result.tokens_per_sec_list:
        avg_tps = statistics.mean(result.tokens_per_sec_list)
        print(f"   📝 生成性能")
        print(f"      平均Token吞吐: {avg_tps:.1f} tokens/s")
        print(f"      平均TTFT: {statistics.mean(result.ttft_ms_list):.1f}ms")
    if result.errors:
        print()
        print(f"   ❌ 错误分布")
        for err, count in sorted(result.errors.items(), key=lambda x: -x[1]):
            print(f"      {err}: {count}")

    # 保存JSON
    fname = f"benchmark_{result.provider}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
    print(f"\n📁 报告已保存: {fname}")


def compare_providers(providers: List[str], duration: int = 10, concurrency: int = 2):
    """多Provider对比测试"""
    print(f"\n{'='*60}")
    print("🏆 Provider 横向对比")
    print("=" * 60)
    results = []
    for pid in providers:
        if pid not in PROVIDER_MAP:
            print(f"跳过未知Provider: {pid}")
            continue
        if not os.environ.get(PROVIDER_MAP[pid]["auth_env"], "").strip():
            print(f"跳过未配置Key的Provider: {pid}")
            continue
        r = run_benchmark(pid, duration, concurrency, "你好，请简要介绍自己", 100)
        results.append(r)
        print_report(r)

    # 汇总对比表
    print(f"\n{'='*60}")
    print("📋 对比汇总表")
    print("=" * 60)
    print(f"{'Provider':<12} {'Model':<20} {'QPS':>8} {'Avg(ms)':>10} {'P99(ms)':>10} {'Success%':>10}")
    print("-" * 70)
    for r in results:
        print(f"{r.provider:<12} {r.model:<20} {r.qps:>8.2f} {r.avg_latency:>10.1f} {r.p99_latency:>10.1f} {r.success_rate:>9.1f}%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LLM Provider 压力测试与性能基准")
    parser.add_argument("--provider", type=str, default="kimi-code", help="Provider ID")
    parser.add_argument("--duration", type=int, default=30, help="测试持续时间(秒)")
    parser.add_argument("--concurrency", type=int, default=5, help="并发数")
    parser.add_argument("--prompt", type=str, default="你好，请用三句话介绍人工智能的应用场景", help="测试提示词")
    parser.add_argument("--max-tokens", type=int, default=150, help="最大生成token数")
    parser.add_argument("--compare", nargs="+", help="对比多个Provider (如: --compare kimi-code openai deepseek)")
    args = parser.parse_args()

    if args.compare:
        compare_providers(args.compare, duration=args.duration, concurrency=args.concurrency)
    else:
        result = run_benchmark(args.provider, args.duration, args.concurrency, args.prompt, args.max_tokens)
        print_report(result)
