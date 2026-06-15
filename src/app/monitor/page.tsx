"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Activity,
  ClipboardList,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Server,
  HardDrive,
  Wifi,
  Cpu,
  RefreshCw,
  Trash2,
  Download,
  Pause,
  ChevronDown,
  ChevronUp,
  Circle,
  Sparkles,
  Brain,
  BookOpen,
  MemoryStick,
  Settings,
  Layers,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ─── 类型 ─── */
interface SystemLog {
  time: string;
  message: string;
  level: "info" | "warn" | "error";
}

interface Provider {
  name: string;
  availability: number;
  load: number;
}

interface TaskItem {
  id: string;
  name: string;
  node: string;
  status: "success" | "running" | "failed" | "pending";
  duration: string;
}

interface EvolutionRecord {
  time: string;
  agent: string;
  description: string;
  type: "skill" | "model" | "knowledge" | "memory" | "config";
}

interface SwarmNode {
  name: string;
  load: number;
  status: "active" | "idle" | "warning";
}

/* ─── 模拟数据 ─── */
const SYSTEM_LOGS: SystemLog[] = [
  { time: "10:42:15", message: "Agent-03 完成代码审查任务", level: "info" },
  { time: "10:38:02", message: "OpenAI API 响应时间超过阈值", level: "warn" },
  { time: "10:35:47", message: "Swarm Hub 自动扩容完成", level: "info" },
  { time: "10:30:12", message: "Agent-07 节点心跳丢失", level: "error" },
  { time: "10:28:55", message: "系统备份任务启动", level: "info" },
];

const PROVIDERS: Provider[] = [
  { name: "OpenAI", availability: 98, load: 45 },
  { name: "Kimi", availability: 96, load: 62 },
  { name: "Claude", availability: 99, load: 30 },
  { name: "Gemini", availability: 94, load: 78 },
  { name: "Ollama", availability: 100, load: 12 },
  { name: "自定义", availability: 91, load: 85 },
];

const TASKS: TaskItem[] = [
  { id: "t1", name: "代码审查", node: "Agent-03", status: "success", duration: "2m 15s" },
  { id: "t2", name: "文档生成", node: "Agent-07", status: "running", duration: "5m 32s" },
  { id: "t3", name: "数据清洗", node: "Agent-12", status: "failed", duration: "1m 08s" },
  { id: "t4", name: "模型推理", node: "Agent-05", status: "success", duration: "3m 45s" },
  { id: "t5", name: "日志聚合", node: "Agent-09", status: "pending", duration: "—" },
  { id: "t6", name: "备份同步", node: "Agent-01", status: "running", duration: "8m 12s" },
];

const EVOLUTIONS: EvolutionRecord[] = [
  { time: "10:40", agent: "Agent-07", description: "技能升级：代码审查 → 架构分析", type: "skill" },
  { time: "10:35", agent: "Agent-03", description: "模型切换：GPT-3.5 → GPT-4o", type: "model" },
  { time: "10:28", agent: "Agent-12", description: "新增知识库：技术文档", type: "knowledge" },
  { time: "10:22", agent: "Agent-05", description: "记忆优化：压缩率提升 32%", type: "memory" },
  { time: "10:15", agent: "Agent-09", description: "配置更新：温度 0.7 → 0.5", type: "config" },
];

const SWARM_NODES: SwarmNode[] = [
  { name: "Coordinator", load: 45, status: "active" },
  { name: "Worker-A", load: 72, status: "warning" },
  { name: "Worker-B", load: 30, status: "active" },
  { name: "Leaf-01", load: 12, status: "active" },
  { name: "Observer", load: 8, status: "idle" },
];

const CLAW_LOGS = [
  "[10:42:15] 系统监控面板启动",
  "[10:42:10] Agent-03 心跳正常",
  "[10:42:05] OpenAI API 延迟 234ms",
  "[10:41:55] Kimi API 延迟 189ms",
  "[10:41:50] Claude API 延迟 156ms",
  "[10:41:45] Gemini API 延迟 267ms",
  "[10:41:40] Ollama 本地服务正常",
  "[10:41:35] 自定义节点响应 312ms",
  "[10:41:30] Swarm Hub 负载均衡完成",
  "[10:41:25] 系统健康检查通过",
];

/* ─── 工具函数 ─── */
function providerColor(load: number): string {
  if (load >= 80) return "bg-red-500";
  if (load >= 60) return "bg-amber-500";
  if (load >= 40) return "bg-yellow-400";
  return "bg-emerald-500";
}

function providerBg(load: number): string {
  if (load >= 80) return "bg-red-50";
  if (load >= 60) return "bg-amber-50";
  if (load >= 40) return "bg-yellow-50";
  return "bg-emerald-50";
}

function taskStatusConfig(status: TaskItem["status"]) {
  switch (status) {
    case "success":
      return { color: "bg-emerald-500", text: "text-emerald-600", label: "成功", bg: "bg-emerald-50" };
    case "running":
      return { color: "bg-blue-500", text: "text-blue-600", label: "进行中", bg: "bg-blue-50" };
    case "failed":
      return { color: "bg-red-500", text: "text-red-600", label: "失败", bg: "bg-red-50" };
    case "pending":
      return { color: "bg-amber-500", text: "text-amber-600", label: "等待", bg: "bg-amber-50" };
  }
}

function logLevelConfig(level: SystemLog["level"]) {
  switch (level) {
    case "info":
      return { icon: CheckCircle2, color: "text-emerald-500" };
    case "warn":
      return { icon: AlertCircle, color: "text-amber-500" };
    case "error":
      return { icon: AlertCircle, color: "text-red-500" };
  }
}

function evolutionIcon(type: EvolutionRecord["type"]) {
  switch (type) {
    case "skill": return Sparkles;
    case "model": return Brain;
    case "knowledge": return BookOpen;
    case "memory": return MemoryStick;
    case "config": return Settings;
  }
}

function nodeStatusColor(status: SwarmNode["status"]) {
  switch (status) {
    case "active": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "idle": return "bg-slate-400";
  }
}

/* ─── 主页面 ─── */
export default function MonitorPage() {
  const [loading, setLoading] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="监控面板" subtitle="系统状态监控与实时分析" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">加载监控数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="监控面板"
        subtitle={`${currentTime.toLocaleString("zh-CN")} · 42 个活跃 Agent · 系统健康 94%`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ─── Stats 行 ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="活跃 Agent 数" value="42" change={5} icon={Bot} color="bg-emerald-500" />
            <StatsCard title="系统健康分" value="94" change={2} icon={Activity} color="bg-blue-500" />
            <StatsCard title="待处理任务" value="12" change={-8} icon={ClipboardList} color="bg-amber-500" />
            <StatsCard title="API 延迟" value="234ms" change={-15} icon={Zap} color="bg-violet-500" />
          </div>

          {/* ─── 中间 2 列布局 ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── 左列 ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* AgentZeroStatusCard */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-500" />
                    AgentZero 系统状态
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-600">系统运行正常</span>
                  </div>
                </div>

                {/* 关键指标 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: "CPU 使用率", value: "45%", icon: Cpu, color: "bg-blue-500", width: 45 },
                    { label: "内存使用", value: "3.2GB/8GB", icon: MemoryStick, color: "bg-violet-500", width: 40 },
                    { label: "磁盘 I/O", value: "120MB/s", icon: HardDrive, color: "bg-amber-500", width: 60 },
                    { label: "网络吞吐", value: "2.4Gbps", icon: Wifi, color: "bg-emerald-500", width: 48 },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <metric.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">{metric.label}</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800">{metric.value}</p>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.color}`}
                          style={{ width: `${metric.width}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 系统日志时间线 */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-600 mb-3">最近系统日志</p>
                  <div className="relative space-y-3">
                    {/* 竖线 */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                    {SYSTEM_LOGS.map((log, i) => {
                      const cfg = logLevelConfig(log.level);
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.color} bg-white border-2 border-white`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                              <span className={`text-xs font-medium ${cfg.color}`}>
                                {log.level === "info" ? "信息" : log.level === "warn" ? "警告" : "错误"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{log.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ProviderHeatMap */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  LLM 提供商热力图
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROVIDERS.map((p) => (
                    <div
                      key={p.name}
                      className={`rounded-xl p-4 border border-slate-100 ${providerBg(p.load)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{p.name}</span>
                        <span className={`text-xs font-bold ${p.load >= 80 ? "text-red-600" : p.load >= 60 ? "text-amber-600" : "text-emerald-600"}`}>
                          {p.load}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/80 overflow-hidden mb-2">
                        <div className={`h-full rounded-full ${providerColor(p.load)}`} style={{ width: `${p.load}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">可用性</span>
                        <span className="text-[10px] font-medium text-slate-600">{p.availability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TaskTimeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  任务时间线
                </h3>
                <div className="relative space-y-4">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  {TASKS.map((task) => {
                    const cfg = taskStatusConfig(task.status);
                    return (
                      <div key={task.id} className="flex items-start gap-3 relative">
                        <div className={`w-4 h-4 rounded-full shrink-0 mt-0.5 border-2 border-white ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{task.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">{task.duration}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">节点: {task.node}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── 右列 ─── */}
            <div className="lg:col-span-1 space-y-6">
              {/* SwarmTopology */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Circle className="w-4 h-4 text-slate-500" />
                  蜂群拓扑
                </h3>
                <div className="relative h-64 w-full">
                  {/* 连接线 */}
                  {SWARM_NODES.map((_, i) => {
                    const angle = (i * 360) / SWARM_NODES.length - 90;
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50;
                    const cy = 50;
                    const r = 35;
                    const x2 = cx + r * Math.cos(rad);
                    const y2 = cy + r * Math.sin(rad);
                    const dx = (x2 - cx);
                    const dy = (y2 - cy);
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const rot = Math.atan2(dy, dx) * (180 / Math.PI);
                    return (
                      <div
                        key={`line-${i}`}
                        className="absolute border-t border-dashed border-slate-300"
                        style={{
                          left: `${cx}%`,
                          top: `${cy}%`,
                          width: `${len}%`,
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: "left center",
                        }}
                      />
                    );
                  })}

                  {/* 中心 Hub */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-rose-600">Hub</span>
                    </div>
                  </div>

                  {/* 环绕节点 */}
                  {SWARM_NODES.map((node, i) => {
                    const angle = (i * 360) / SWARM_NODES.length - 90;
                    const rad = (angle * Math.PI) / 180;
                    const r = 35;
                    const left = 50 + r * Math.cos(rad);
                    const top = 50 + r * Math.sin(rad);
                    return (
                      <div
                        key={node.name}
                        className="absolute z-10 flex flex-col items-center"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className={`w-10 h-10 rounded-full ${nodeStatusColor(node.status)} border-2 border-white shadow-sm flex items-center justify-center`}>
                          <span className="text-[10px] font-bold text-white">{node.load}%</span>
                        </div>
                        <div className="mt-1 whitespace-nowrap">
                          <p className="text-[10px] font-medium text-slate-700">{node.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EvolutionLog */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  智能体进化日志
                </h3>
                <div className="space-y-3">
                  {EVOLUTIONS.map((evo, i) => {
                    const Icon = evolutionIcon(evo.type);
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">{evo.time} · {evo.agent}</p>
                          <p className="text-xs text-slate-700 mt-0.5">{evo.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ClawPanel */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  系统控制面板
                </h3>

                {/* 快捷操作按钮 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "重启 Swarm", icon: RefreshCw, color: "text-rose-600 bg-rose-50 hover:bg-rose-100" },
                    { label: "清理缓存", icon: Trash2, color: "text-amber-600 bg-amber-50 hover:bg-amber-100" },
                    { label: "全量备份", icon: Download, color: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
                    { label: "紧急暂停", icon: Pause, color: "text-red-600 bg-red-50 hover:bg-red-100" },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-slate-100 transition-colors ${btn.color}`}
                    >
                      <btn.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{btn.label}</span>
                    </button>
                  ))}
                </div>

                {/* 系统日志展开区域 */}
                <button
                  onClick={() => setLogsOpen(!logsOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-600"
                >
                  <span>系统日志</span>
                  {logsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {logsOpen && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {CLAW_LOGS.map((log, i) => (
                        <p key={i} className="text-[10px] text-slate-500 font-mono leading-relaxed">
                          {log}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
