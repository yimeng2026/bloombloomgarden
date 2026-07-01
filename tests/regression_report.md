# 千界花园回归测试报告
**时间:** 2026-05-29 10:54:39
**目标主机:** http://localhost:3000
**总耗时:** 0.9s

## 结果汇总
| 测试项 | 状态 | 耗时 | 备注 |
|--------|------|------|------|
| 全链路健康检查 | ✅ 通过 | 0.1s |  |
| Provider格式验证器 | ✅ 通过 | 0.1s |  |
| 压力基准测试 | ❌ 失败 | 0.2s | test_stress_benchmark.py: error: unrecognized argu |
| JS API兼容性测试 | ✅ 通过 | 0.1s |  |
| 多Provider并发测试 | ❌ 失败 | 0.3s | test_multi_provider_concurrent.py: error: unrecogn |
| 故障转移与负载均衡 | ❌ 失败 | 0.1s | test_failover_loadbalance.py: error: unrecognized  |

## 统计

- 通过: 3/6 (50%)
- 失败: 3
