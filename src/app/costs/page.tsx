"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Calendar,
  TrendingUp,
  Hash,
  DollarSign,
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Server,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ─────────────────────── Types ─────────────────────── */

interface CostTrend {
  day: string;
  value: number;
}

interface ModelCost {
  name: string;
  provider: string;
  requests: number;
  tokens: string;
  cost: string;
  percent: number;
}

interface SubAgentActivity {
  agent: string;
  task: string;
  tokens: string;
  cost: string;
  status: "success" | "failed" | "running";
  duration: string;
}

interface AlertRule {
  id: string;
  label: string;
  enabled: boolean;
}

/* ─────────────────────── Mock Data ─────────────────────── */

const costData7d: CostTrend[] = [
  { day: "周一", value: 12.5 },
  { day: "周二", value: 8.3 },
  { day: "周三", value: 15.2 },
  { day: "周四", value: 9.1 },
  { day: "周五", value: 11.7 },
  { day: "周六", value: 7.4 },
  { day: "周日", value: 10.8 },
];

const costData30d: CostTrend[] = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}日`,
  value: Math.round((5 + Math.random() * 15) * 10) / 10,
}));

const costDataAll: CostTrend[] = Array.from({ length: 12 }, (_, i) => ({
  day: `${i + 1}月`,
  value: Math.round((150 + Math.random() * 250) * 10) / 10,
}));

const modelCosts: ModelCost[] = [
  { name: "GPT-4o", provider: "OpenAI", requests: 234, tokens: "456K", cost: "¥8.50", percent: 35 },
  { name: "GPT-4o-mini", provider: "OpenAI", requests: 567, tokens: "890K", cost: "¥2.30", percent: 15 },
  { name: "Claude-3.5-Sonnet", provider: "Anthropic", requests: 123, tokens: "234K", cost: "¥5.60", percent: 25 },
  { name: "GLM-5", provider: "Zhipu", requests: 89, tokens: "567K", cost: "¥1.80", percent: 10 },
  { name: "Ollama(local)", provider: "Local", requests: 456, tokens: "0", cost: "¥0", percent: 0 },
];

const subAgentActivities: SubAgentActivity[] = [
  { agent: "CodeReviewer", task: "审查 PR #234", tokens: "12.5K", cost: "¥0.42", status: "success", duration: "2m 15s" },
  { agent: "DocWriter", task: "生成 API 文档", tokens: "45.2K", cost: "¥1.35", status: "success", duration: "5m 30s" },
  { agent: "DataAnalyst", task: "分析用户行为数据", tokens: "89.0K", cost: "¥2.80", status: "running", duration: "8m 12s" },
  { agent: "TestBot", task: "运行 E2E 测试", tokens: "23.1K", cost: "¥0.68", status: "failed", duration: "3m 45s" },
  { agent: "Summarizer", task: "总结会议纪要", tokens: "8.7K", cost: "¥0.26", status: "success", duration: "1m 20s" },
];

const modelColors = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-slate-400",
];

/* ─────────────────────── Component ─────────────────────── */

export default function CostsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("7d");
  const [budget, setBudget] = useState(50);
  const [alerts, setAlerts] = useState<AlertRule[]>([
    { id: "1", label: "日成本 > ¥20 → 发送通知", enabled: true },
    { id: "2", label: "单请求 > ¥1 → 发送警告", enabled: true },
    { id: "3", label: "月成本 > ¥500 → 暂停非必要任务", enabled: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const currentData = range === "7d" ? costData7d : range === "30d" ? costData30d : costDataAll;
  const maxValue = Math.max(...currentData.map((d) => d.value));

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const statusConfig = {
    success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "成功" },
    failed: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50", label: "失败" },
    running: { icon: Zap, color: "text-amber-500", bg: "bg-amber-50", label: "运行中" },
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="成本追踪" subtitle="Token 使用与成本统计" />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="成本追踪" subtitle="Token 使用与成本统计" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ─── 顶部 Stats ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="今日成本" value="¥12.50" change={8.3} icon={Wallet} color="bg-emerald-500" />
            <StatsCard title="本月累计" value="¥245.80" change={12.5} icon={Calendar} color="bg-blue-500" />
            <StatsCard title="预计月费" value="¥380.00" change={5.2} icon={TrendingUp} color="bg-amber-500" />
            <StatsCard title="总 Token 数" value="2.4M" change={23.7} icon={Hash} color="bg-violet-500" />
          </div>

          {/* ─── 主 2 列布局 ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── 左列 ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* 成本趋势 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    成本趋势
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    {(["7d", "30d", "all"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          range === r
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {r === "7d" ? "7 天" : r === "30d" ? "30 天" : "全部"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-end gap-2 h-48 px-2">
                  {currentData.map((d, i) => {
                    const heightPercent = (d.value / maxValue) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {hoveredBar === i && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap z-10">
                            ¥{d.value}
                          </div>
                        )}
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 opacity-80 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] text-slate-400">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 模型成本明细 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-500" />
                    模型成本明细
                  </h3>
                  <span className="text-xs text-slate-400">近 30 天</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">模型名称</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">提供商</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">请求数</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">Token 数</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">成本</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelCosts.map((m, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{m.name}</td>
                          <td className="py-2.5 px-3 text-slate-500">{m.provider}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{m.requests}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{m.tokens}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">{m.cost}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-xs font-medium text-slate-600">{m.percent}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-Agent 活动 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-slate-500" />
                    Sub-Agent 活动
                  </h3>
                  <span className="text-xs text-slate-400">最近 5 条</span>
                </div>
                <div className="space-y-3">
                  {subAgentActivities.map((activity, i) => {
                    const cfg = statusConfig[activity.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                          <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{activity.agent}</span>
                            <span className="text-xs text-slate-400">{activity.task}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" /> {activity.tokens}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> {activity.cost}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {activity.duration}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── 右列 ─── */}
            <div className="lg:col-span-1 space-y-6">
              {/* 成本告警 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-500" />
                    成本告警
                  </h3>
                </div>

                {/* 日预算滑块 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">日预算阈值</span>
                    <span className="text-xs font-medium text-slate-800">¥{budget}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-emerald-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">0</span>
                    <span className="text-[10px] text-slate-400">100</span>
                  </div>
                </div>

                {/* 告警规则 */}
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100"
                    >
                      <span className="text-xs text-slate-600">{alert.label}</span>
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          alert.enabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
                            alert.enabled ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 模型用量饼图替代（色块网格） */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-500" />
                    模型用量分布
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {modelCosts.map((m, i) => (
                    <div
                      key={i}
                      className={`${modelColors[i]} rounded-xl p-3 text-white flex flex-col justify-between ${
                        m.percent === 0 ? "opacity-50" : ""
                      }`}
                      style={{ minHeight: `${60 + m.percent * 1.5}px` }}
                    >
                      <span className="text-xs font-medium truncate">{m.name}</span>
                      <span className="text-lg font-bold">{m.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 快捷操作 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  快捷操作
                </h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Download className="w-4 h-4 text-slate-400" />
                    导出报表
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    刷新数据
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" />
                    设置预算
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
