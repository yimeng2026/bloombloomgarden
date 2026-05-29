#!/usr/bin/env python3
"""
千界花园 - 自动化回归测试套件
运行所有测试并生成报告
用法: python run_regression.py [--host http://localhost:3000] [--report html|json|md]
"""

import subprocess, sys, argparse, json, time, os
from pathlib import Path
from datetime import datetime

def run_test(name, cmd, cwd=None):
    print(f"\n{'='*60}")
    print(f"🧪 {name}")
    print(f"{'='*60}")
    start = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, cwd=cwd or os.getcwd())
        elapsed = time.time() - start
        success = result.returncode == 0
        print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
        if result.stderr and not success:
            print(result.stderr[-1000:])
        print(f"⏱️ 耗时: {elapsed:.1f}s | 结果: {'✅ 通过' if success else '❌ 失败'} (exit={result.returncode})")
        return {"name": name, "success": success, "elapsed": elapsed, "stdout": result.stdout, "stderr": result.stderr, "exit": result.returncode}
    except subprocess.TimeoutExpired:
        print(f"⏱️ 耗时: >60s | 结果: ⏰ 超时")
        return {"name": name, "success": False, "elapsed": 60, "error": "timeout"}
    except Exception as e:
        print(f"⏱️ 耗时: - | 结果: 💥 异常: {e}")
        return {"name": name, "success": False, "elapsed": 0, "error": str(e)}

def generate_md_report(results, host, total_time):
    lines = [
        "# 千界花园回归测试报告\n",
        f"**时间:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        f"**目标主机:** {host}\n",
        f"**总耗时:** {total_time:.1f}s\n",
        "\n## 结果汇总\n",
        f"| 测试项 | 状态 | 耗时 | 备注 |\n",
        f"|--------|------|------|------|\n",
    ]
    passed = 0
    for r in results:
        status = "✅ 通过" if r["success"] else "❌ 失败"
        note = ""
        if not r["success"]:
            if "error" in r:
                note = r["error"]
            elif r.get("stderr"):
                note = r["stderr"].strip().split("\n")[-1][:50]
        lines.append(f"| {r['name']} | {status} | {r['elapsed']:.1f}s | {note} |\n")
        if r["success"]: passed += 1
    lines.append(f"\n## 统计\n\n- 通过: {passed}/{len(results)} ({passed/len(results)*100:.0f}%)\n")
    lines.append(f"- 失败: {len(results)-passed}\n")
    if passed == len(results):
        lines.append("\n🎉 所有测试全部通过！\n")
    return "".join(lines)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="http://localhost:3000")
    parser.add_argument("--report", choices=["html", "json", "md", "console"], default="console")
    args = parser.parse_args()

    root = Path(__file__).parent.parent.parent
    tests_dir = root / "tests" / "python"
    js_tests_dir = root / "tests" / "javascript"

    all_tests = []
    start_all = time.time()

    # 1. 健康检查
    if (tests_dir / "health_check.py").exists():
        all_tests.append(run_test(
            "全链路健康检查",
            [sys.executable, str(tests_dir / "health_check.py"), "--host", args.host, "--verbose"],
            str(root)
        ))

    # 2. Provider格式验证（仅dry-run）
    if (tests_dir / "provider_format_validator.py").exists():
        all_tests.append(run_test(
            "Provider格式验证器",
            [sys.executable, str(tests_dir / "provider_format_validator.py"), "--provider", "kimi-code", "--test-request"],
            str(root)
        ))

    # 3. 压力测试（不需要--host，直接测LLM端点）
    if (tests_dir / "test_stress_benchmark.py").exists():
        all_tests.append(run_test(
            "压力基准测试",
            [sys.executable, str(tests_dir / "test_stress_benchmark.py"), "--provider", "kimi-code", "--duration", "5", "--concurrency", "2"],
            str(root)
        ))

    # 4. JavaScript API兼容性测试（如果Node可用）
    if (js_tests_dir / "api_compatibility_test.js").exists():
        all_tests.append(run_test(
            "JS API兼容性测试",
            ["node", str(js_tests_dir / "api_compatibility_test.js"), "--host", args.host],
            str(root)
        ))

    # 5. 多Provider并发测试（不需要host参数）
    if (tests_dir / "test_multi_provider_concurrent.py").exists():
        all_tests.append(run_test(
            "多Provider并发测试",
            [sys.executable, str(tests_dir / "test_multi_provider_concurrent.py")],
            str(root)
        ))

    # 6. 故障转移测试
    if (tests_dir / "test_failover_loadbalance.py").exists():
        all_tests.append(run_test(
            "故障转移与负载均衡",
            [sys.executable, str(tests_dir / "test_failover_loadbalance.py"), "--test", "roundrobin"],
            str(root)
        ))

    total_time = time.time() - start_all
    passed = sum(1 for r in all_tests if r["success"])

    print(f"\n{'='*60}")
    print(f"📊 回归测试完成: {passed}/{len(all_tests)} 通过, 总耗时 {total_time:.1f}s")
    print(f"{'='*60}")

    # 生成报告
    report = generate_md_report(all_tests, args.host, total_time)

    if args.report == "md":
        out = root / "tests" / "regression_report.md"
        out.write_text(report, encoding="utf-8")
        print(f"\n📝 Markdown报告已保存: {out}")
    elif args.report == "json":
        out = root / "tests" / "regression_report.json"
        out.write_text(json.dumps({"summary": {"passed": passed, "total": len(all_tests), "time": total_time}, "results": all_tests}, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n📝 JSON报告已保存: {out}")
    elif args.report == "html":
        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>千界花园回归测试</title><style>
body{{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:20px;background:#0a0a0f;color:#fff}}
table{{width:100%;border-collapse:collapse;margin:20px 0}}th,td{{padding:10px;text-align:left;border-bottom:1px solid #333}}
.pass{{color:#34d399}}.fail{{color:#f87171}}.summary{{font-size:1.2rem;margin:20px 0;padding:15px;background:#12121a;border-radius:8px}}
</style></head><body><h1>千界花园回归测试报告</h1><div class="summary">
时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 主机: {args.host} | 总耗时: {total_time:.1f}s<br>
通过: <span class="pass">{passed}/{len(all_tests)}</span> ({passed/len(all_tests)*100:.0f}%)
</div><table><tr><th>测试项</th><th>状态</th><th>耗时</th><th>备注</th></tr>"""
        for r in all_tests:
            status_cls = "pass" if r["success"] else "fail"
            status = "通过" if r["success"] else "失败"
            note = r.get("error", "")
            if not r["success"] and not note and r.get("stderr"):
                note = r["stderr"].strip().split("\n")[-1][:50]
            html += f"<tr><td>{r['name']}</td><td class='{status_cls}'>{status}</td><td>{r['elapsed']:.1f}s</td><td>{note}</td></tr>"
        html += "</table></body></html>"
        out = root / "tests" / "regression_report.html"
        out.write_text(html, encoding="utf-8")
        print(f"\n📝 HTML报告已保存: {out}")

    sys.exit(0 if passed == len(all_tests) else 1)

if __name__ == "__main__":
    main()
