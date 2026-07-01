#!/usr/bin/env python3
"""
test_failover_loadbalance.py — Kimi集群Failover与负载均衡测试
用法: python test_failover_loadbalance.py
功能:
  1. 多Key轮询测试（RoundRobin）
  2. 失败自动切换（Failover）
  3. 响应时间统计与慢节点标记
  4. 5个Kimi Key的并发压力测试
"""
import os
import sys
import time
import json
import random
import statistics
import concurrent.futures
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from collections import defaultdict
import urllib.request
import urllib.error
import ssl

KIMI_KEYS = [
    os.environ.get("KIMI_CODE_API_KEY_1", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_CODE_API_KEY_2", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_CODE_API_KEY_3", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_CODE_API_KEY_4", "REMOVED_FROM_HISTORY"),
    os.environ.get("KIMI_CODE_API_KEY_5", "REMOVED_FROM_HISTORY"),
]

KIMI_BASE_URL = "https://api.moonshot.cn/v1"
TEST_MODEL = "kimi-latest"


def _ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


@dataclass
class EndpointStats:
    key_idx: int
    total_requests: int = 0
    successes: int = 0
    failures: int = 0
    latencies: List[float] = field(default_factory=list)
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    marked_unhealthy: bool = False

    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies) if self.latencies else 0

    @property
    def p95_latency(self) -> float:
        if len(self.latencies) < 2:
            return self.avg_latency
        sorted_l = sorted(self.latencies)
        idx = int(len(sorted_l) * 0.95)
        return sorted_l[min(idx, len(sorted_l) - 1)]

    @property
    def success_rate(self) -> float:
        return self.successes / max(self.total_requests, 1) * 100


def call_kimi_chat(key_idx: int, key: str, message: str, max_tokens: int = 50) -> dict:
    """调用Kimi chat completion，返回详细结果"""
    url = f"{KIMI_BASE_URL}/chat/completions"
    body = json.dumps({
        "model": TEST_MODEL,
        "messages": [{"role": "user", "content": message}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    })
    req = urllib.request.Request(
        url,
        data=body.encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "User-Agent": "claude-code/0.7.8",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    start = time.perf_counter()
    try:
        resp = urllib.request.urlopen(req, timeout=60, context=_ctx())
        latency = (time.perf_counter() - start) * 1000
        data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"] if "choices" in data else ""
        reasoning = data["choices"][0].get("message", {}).get("reasoning_content", "")
        return {
            "success": True,
            "key_idx": key_idx,
            "latency_ms": round(latency, 2),
            "status_code": resp.getcode(),
            "content": content[:80],
            "reasoning": reasoning[:80] if reasoning else "",
            "tokens": data.get("usage", {}),
        }
    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000
        body = e.read().decode("utf-8", errors="replace")[:200]
        return {
            "success": False,
            "key_idx": key_idx,
            "latency_ms": round(latency, 2),
            "status_code": e.code,
            "error": f"HTTP {e.code}: {body}",
        }
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return {
            "success": False,
            "key_idx": key_idx,
            "latency_ms": round(latency, 2),
            "error": str(e)[:150],
        }


class KimiLoadBalancer:
    """Kimi集群负载均衡器: 支持轮询、加权、失败熔断"""

    def __init__(self, keys: List[str], strategy: str = "round_robin"):
        self.keys = keys
        self.strategy = strategy
        self.stats = [EndpointStats(key_idx=i) for i in range(len(keys))]
        self.rr_index = 0
        self.failure_threshold = 3
        self.recovery_timeout = 30
        self.circuit_states: Dict[int, dict] = defaultdict(lambda: {"open": False, "opened_at": 0})

    def pick_key(self) -> tuple:
        """选择下一个可用的key"""
        healthy = []
        for i, st in enumerate(self.stats):
            cs = self.circuit_states[i]
            if cs["open"]:
                if time.time() - cs["opened_at"] > self.recovery_timeout:
                    cs["open"] = False
                    st.marked_unhealthy = False
                    healthy.append(i)
            else:
                healthy.append(i)

        if not healthy:
            # 全部熔断，强制放行第一个
            return 0, self.keys[0]

        if self.strategy == "round_robin":
            idx = healthy[self.rr_index % len(healthy)]
            self.rr_index += 1
            return idx, self.keys[idx]
        elif self.strategy == "least_latency":
            # 选平均延迟最低的
            idx = min(healthy, key=lambda i: self.stats[i].avg_latency if self.stats[i].latencies else 0)
            return idx, self.keys[idx]
        elif self.strategy == "random":
            idx = random.choice(healthy)
            return idx, self.keys[idx]
        else:
            idx = healthy[0]
            return idx, self.keys[idx]

    def record_result(self, key_idx: int, success: bool, latency: float, error: str = None):
        st = self.stats[key_idx]
        st.total_requests += 1
        st.latencies.append(latency)
        if len(st.latencies) > 1000:
            st.latencies = st.latencies[-500:]  # 滑动窗口
        if success:
            st.successes += 1
            st.consecutive_failures = 0
        else:
            st.failures += 1
            st.consecutive_failures += 1
            st.last_error = error
            if st.consecutive_failures >= self.failure_threshold:
                self.circuit_states[key_idx]["open"] = True
                self.circuit_states[key_idx]["opened_at"] = time.time()
                st.marked_unhealthy = True


def test_round_robin(n_requests: int = 20):
    """轮询测试: 验证每个key都被均匀调用"""
    print(f"\n{'='*60}")
    print(f"🔄 测试1: RoundRobin 轮询负载均衡 ({n_requests} 请求)")
    print("=" * 60)

    lb = KimiLoadBalancer(KIMI_KEYS, strategy="round_robin")
    messages = ["你好", "讲个笑话", "1+1=", "Python优点", "写首诗"] * ((n_requests // 5) + 1)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futures = []
        for i in range(n_requests):
            idx, key = lb.pick_key()
            f = ex.submit(call_kimi_chat, idx, key, messages[i % len(messages)], 30)
            futures.append((idx, f))

        for idx, f in futures:
            result = f.result()
            lb.record_result(result["key_idx"], result["success"], result["latency_ms"], result.get("error"))
            status = "✅" if result["success"] else "❌"
            print(f"   {status} Key-{result['key_idx']+1} | {result['latency_ms']:>7.2f}ms | {result.get('content', result.get('error', ''))[:50]}")

    print(f"\n📊 轮询统计:")
    for st in lb.stats:
        status = "🔴 熔断" if st.marked_unhealthy else "🟢 正常"
        print(f"   Key-{st.key_idx+1}: {st.successes}/{st.total_requests} 成功 | 平均延迟 {st.avg_latency:.1f}ms | P95 {st.p95_latency:.1f}ms | {status}")


def test_failover_simulation():
    """Failover测试: 模拟某个key失效后的自动切换"""
    print(f"\n{'='*60}")
    print("🛡️ 测试2: Failover 自动故障转移")
    print("=" * 60)

    # 使用1个正确key + 4个错误key模拟故障
    bad_keys = ["sk-kimi-INVALID-KEY-FOR-TEST"] * 4
    mixed_keys = [KIMI_KEYS[0]] + bad_keys

    lb = KimiLoadBalancer(mixed_keys, strategy="round_robin")
    lb.failure_threshold = 1  # 快速熔断

    success_count = 0
    for i in range(12):
        idx, key = lb.pick_key()
        result = call_kimi_chat(idx, key, "测试failover", 20)
        lb.record_result(idx, result["success"], result["latency_ms"], result.get("error"))

        if result["success"]:
            success_count += 1
            print(f"   ✅ 请求{i+1:02d} → Key-{idx+1} 成功 ({result['latency_ms']:.1f}ms)")
        else:
            print(f"   ❌ 请求{i+1:02d} → Key-{idx+1} 失败: {result.get('error', 'unknown')[:40]}")

        # 显示熔断状态
        open_circuits = sum(1 for c in lb.circuit_states.values() if c["open"])
        if open_circuits > 0:
            print(f"       ⚡ 当前熔断节点: {open_circuits}/{len(mixed_keys)}")

    print(f"\n📊 Failover结果: {success_count}/12 请求最终成功")
    print(f"   正确Key被选中概率: 随着错误Key熔断逐步提高")


def test_concurrent_stress(duration_sec: int = 30, concurrency: int = 5):
    """并发压力测试: 持续向Kimi集群发送请求"""
    print(f"\n{'='*60}")
    print(f"🔥 测试3: 并发压力测试 ({duration_sec}秒, {concurrency}并发)")
    print("=" * 60)

    lb = KimiLoadBalancer(KIMI_KEYS, strategy="least_latency")
    start_time = time.time()
    total = 0
    success = 0
    latencies = []

    def worker():
        nonlocal total, success
        while time.time() - start_time < duration_sec:
            idx, key = lb.pick_key()
            result = call_kimi_chat(idx, key, "压力测试", 20)
            lb.record_result(idx, result["success"], result["latency_ms"], result.get("error"))
            total += 1
            if result["success"]:
                success += 1
                latencies.append(result["latency_ms"])
            time.sleep(0.2)  # 控制速率，避免触发限流

    threads = []
    import threading
    for _ in range(concurrency):
        t = threading.Thread(target=worker)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    elapsed = time.time() - start_time
    rps = total / elapsed
    print(f"\n📊 压力测试结果:")
    print(f"   总请求: {total} | 成功: {success} | 失败: {total - success}")
    print(f"   QPS: {rps:.1f} req/s | 平均延迟: {statistics.mean(latencies):.1f}ms")
    if len(latencies) > 2:
        print(f"   P50: {statistics.median(latencies):.1f}ms | P95: {sorted(latencies)[int(len(latencies)*0.95)]:.1f}ms | P99: {sorted(latencies)[int(len(latencies)*0.99)]:.1f}ms")

    print(f"\n   各Key统计:")
    for st in lb.stats:
        status = "🔴" if st.marked_unhealthy else "🟢"
        print(f"   {status} Key-{st.key_idx+1}: {st.successes}/{st.total_requests} | avg={st.avg_latency:.1f}ms | p95={st.p95_latency:.1f}ms")


def test_reasoning_content():
    """测试Kimi Code特有的 reasoning_content 字段"""
    print(f"\n{'='*60}")
    print("🧠 测试4: Kimi Code reasoning_content 推理内容验证")
    print("=" * 60)

    key = KIMI_KEYS[0]
    # 用一个需要推理的问题
    result = call_kimi_chat(0, key, "请详细解释为什么1+1=2，要求分步骤推理", 500)
    if result["success"]:
        print(f"   ✅ 延迟: {result['latency_ms']:.1f}ms")
        print(f"   📝 content: {result.get('content', '')[:100]}...")
        print(f"   💡 reasoning: {result.get('reasoning', '')[:100] if result.get('reasoning') else '无 (可能模型未返回reasoning_content)'}...")
    else:
        print(f"   ❌ 失败: {result.get('error', '')}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Kimi集群Failover与负载均衡测试")
    parser.add_argument("--test", choices=["roundrobin", "failover", "stress", "reasoning", "all"], default="all")
    parser.add_argument("--stress-duration", type=int, default=30, help="压力测试持续时间(秒)")
    parser.add_argument("--stress-concurrency", type=int, default=5, help="压力测试并发数")
    args = parser.parse_args()

    if args.test in ("roundrobin", "all"):
        test_round_robin(n_requests=20)

    if args.test in ("failover", "all"):
        test_failover_simulation()

    if args.test in ("stress", "all"):
        test_concurrent_stress(duration_sec=args.stress_duration, concurrency=args.stress_concurrency)

    if args.test in ("reasoning", "all"):
        test_reasoning_content()

    print(f"\n{'='*60}")
    print("✅ 全部测试完成")
    print("=" * 60)
