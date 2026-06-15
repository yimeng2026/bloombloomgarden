"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Network,
  Cpu,
  Zap,
  Activity,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bot,
  Leaf,
  Layers,
  Play,
  Pause,
  Power,
  Search,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  ArrowRightLeft,
  Settings,
  Server,
  Plus,
  Trash2,
  CheckCircle,
  Filter,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface SwarmNode {
  id: string;
  name: string;
  type: "coordinator" | "worker" | "leaf" | "gateway" | "observer";
  status: "active" | "idle" | "offline" | "error";
  load: number;
  tasks: number;
  memory: number;
  uptime: string;
  version: string;
  region: string;
  lastHeartbeat: string;
}

interface SwarmTask {
  id: string;
  name: string;
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: "high" | "medium" | "low";
  progress: number;
  startedAt: string;
  estimatedDuration: string;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  coordinator: { icon: Network, label: "协调器", color: "text-rose-600", bg: "bg-rose-50" },
  gateway: { icon: Globe, label: "网关", color: "text-blue-600", bg: "bg-blue-50" },
  worker: { icon: Cpu, label: "工作者", color: "text-amber-600", bg: "bg-amber-50" },
  leaf: { icon: Leaf, label: "叶子", color: "text-emerald-600", bg: "bg-emerald-50" },
  observer: { icon: Activity, label: "观察者", color: "text-violet-600", bg: "bg-violet-50" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  active: { color: "text-emerald-600 bg-emerald-50", label: "活跃", icon: Power },
  idle: { color: "text-slate-500 bg-slate-100", label: "空闲", icon: Pause },
  offline: { color: "text-red-600 bg-red-50", label: "离线", icon: XCircle },
  error: { color: "text-red-600 bg-red-50", label: "错误", icon: AlertTriangle },
};

const MOCK_NODES: SwarmNode[] = [
  { id: "n1", name: "Coordinator-01", type: "coordinator", status: "active", load: 45, tasks: 12, memory: 4096, uptime: "3d 12h", version: "v2.1.0", region: "cn-north-1", lastHeartbeat: "刚刚" },
  { id: "n2", name: "Gateway-01", type: "gateway", status: "active", load: 32, tasks: 8, memory: 2048, uptime: "5d 2h", version: "v2.1.0", region: "cn-north-1", lastHeartbeat: "刚刚" },
  { id: "n3", name: "Worker-01", type: "worker", status: "active", load: 78, tasks: 24, memory: 8192, uptime: "1d 8h", version: "v2.0.5", region: "cn-east-1", lastHeartbeat: "2秒前" },
  { id: "n4", name: "Worker-02", type: "worker", status: "idle", load: 12, tasks: 2, memory: 4096, uptime: "7d 4h", version: "v2.1.0", region: "cn-east-1", lastHeartbeat: "10秒前" },
  { id: "n5", name: "Leaf-01", type: "leaf", status: "active", load: 55, tasks: 6, memory: 1024, uptime: "2d 1h", version: "v2.0.8", region: "cn-south-1", lastHeartbeat: "5秒前" },
  { id: "n6", name: "Observer-01", type: "observer", status: "active", load: 8, tasks: 0, memory: 512, uptime: "10d 6h", version: "v2.1.0", region: "cn-north-1", lastHeartbeat: "1秒前" },
  { id: "n7", name: "Worker-03", type: "worker", status: "error", load: 0, tasks: 0, memory: 2048, uptime: "未知", version: "v2.0.5", region: "cn-south-1", lastHeartbeat: "5分钟前" },
];

const MOCK_TASKS: SwarmTask[] = [
  { id: "t1", name: "代码分析任务", nodeId: "n3", status: "running", priority: "high", progress: 67, startedAt: "2026-06-15 10:00", estimatedDuration: "30分钟" },
  { id: "t2", name: "文档生成", nodeId: "n1", status: "running", priority: "medium", progress: 34, startedAt: "2026-06-15 10:30", estimatedDuration: "45分钟" },
  { id: "t3", name: "数据清洗", nodeId: "n3", status: "pending", priority: "high", progress: 0, startedAt: "—", estimatedDuration: "20分钟" },
  { id: "t4", name: "模型推理", nodeId: "n5", status: "running", priority: "medium", progress: 89, startedAt: "2026-06-15 09:45", estimatedDuration: "15分钟" },
  { id: "t5", name: "日志聚合", nodeId: "n6", status: "completed", priority: "low", progress: 100, startedAt: "2026-06-15 08:00", estimatedDuration: "10分钟" },
  { id: "t6", name: "备份任务", nodeId: "n4", status: "failed", priority: "high", progress: 45, startedAt: "2026-06-15 09:00", estimatedDuration: "60分钟" },
];

export default function SwarmPage() {
  const [nodes, setNodes] = useState<SwarmNode[]>(MOCK_NODES);
  const [tasks] = useState<SwarmTask[]>(MOCK_TASKS);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"nodes" | "tasks" | "topology">("nodes");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleNodeStatus = (id: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const next = n.status === "active" ? "idle" : n.status === "idle" ? "offline" : "active";
        return { ...n, status: next };
      })
    );
  };

  const filteredNodes = nodes.filter((n) => {
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    return true;
  });

  const activeCount = nodes.filter((n) => n.status === "active").length;
  const totalTasks = nodes.reduce((sum, n) => sum + n.tasks, 0);
  const avgLoad = Math.round(nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length);
  const totalMemory = nodes.reduce((sum, n) => sum + n.memory, 0);
  const offlineCount = nodes.filter((n) => n.status === "offline" || n.status === "error").length;

  const nodeTasks = (nodeId: string) => tasks.filter((t) => t.nodeId === nodeId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="蜂群面板"
        subtitle={`${nodes.length} 个节点 · ${activeCount} 活跃 · ${totalTasks} 任务 · 平均负载 ${avgLoad}%`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="活跃节点" value={activeCount.toString()} change={8.3} icon={Cpu} color="bg-emerald-500" />
            <StatsCard title="总任务" value={totalTasks.toString()} change={-2.1} icon={Zap} color="bg-amber-500" />
            <StatsCard title="平均负载" value={`${avgLoad}%`} change={5.7} icon={Activity} color="bg-rose-500" />
            <StatsCard title="总内存" value={`${(totalMemory / 1024).toFixed(1)}GB`} change={0} icon={Layers} color="bg-blue-500" />
            <StatsCard title="离线/错误" value={offlineCount.toString()} change={-1} icon={AlertTriangle} color="bg-slate-500" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: "nodes" as const, label: `节点 (${filteredNodes.length})`, icon: Network },
              { id: "tasks" as const, label: `任务 (${tasks.length})`, icon: Layers },
              { id: "topology" as const, label: "拓扑", icon: Globe },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Nodes Tab */}
          {activeTab === "nodes" && (
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">加载蜂群数据中...</p>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索节点..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="all">全部类型</option>
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="all">全部状态</option>
                      <option value="active">活跃</option>
                      <option value="idle">空闲</option>
                      <option value="offline">离线</option>
                      <option value="error">错误</option>
                    </select>
                  </div>

                  {/* Node Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredNodes.map((node) => {
                      const typeCfg = TYPE_CONFIG[node.type];
                      const TypeIcon = typeCfg.icon;
                      const statusCfg = STATUS_CONFIG[node.status];
                      const StatusIcon = statusCfg.icon;
                      const isSelected = selectedNode === node.id;
                      const nTasks = nodeTasks(node.id);
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(isSelected ? null : node.id)}
                          className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? "ring-2 ring-emerald-500 border-emerald-200" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeCfg.bg}`}>
                                <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-slate-800">{node.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${typeCfg.bg} ${typeCfg.color}`}>
                                    {typeCfg.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{node.region}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleNodeStatus(node.id);
                              }}
                              className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ${statusCfg.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </button>
                          </div>

                          {/* Metrics */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center bg-slate-50 rounded-xl py-2">
                              <p className="text-xs text-slate-400">负载</p>
                              <p className={`text-sm font-bold ${node.load > 80 ? "text-red-500" : node.load > 50 ? "text-amber-500" : "text-emerald-600"}`}>
                                {node.load}%
                              </p>
                            </div>
                            <div className="text-center bg-slate-50 rounded-xl py-2">
                              <p className="text-xs text-slate-400">任务</p>
                              <p className="text-sm font-bold text-slate-800">{node.tasks}</p>
                            </div>
                            <div className="text-center bg-slate-50 rounded-xl py-2">
                              <p className="text-xs text-slate-400">内存</p>
                              <p className="text-sm font-bold text-slate-800">{node.memory}MB</p>
                            </div>
                          </div>

                          {/* Load bar */}
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${node.load}%`,
                                backgroundColor: node.load > 80 ? "#ef4444" : node.load > 50 ? "#f59e0b" : "#10b981",
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>运行 {node.uptime}</span>
                            <span>{node.version}</span>
                            <span>心跳: {node.lastHeartbeat}</span>
                          </div>

                          {/* Task list for selected node */}
                          {isSelected && nTasks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-xs font-medium text-slate-600 mb-2">节点任务</p>
                              <div className="space-y-1.5">
                                {nTasks.map((t) => (
                                  <div key={t.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        t.status === "running"
                                          ? "bg-blue-500"
                                          : t.status === "completed"
                                          ? "bg-emerald-500"
                                          : t.status === "failed"
                                          ? "bg-red-500"
                                          : "bg-amber-500"
                                      }`}
                                    />
                                    <span className="text-slate-700 flex-1">{t.name}</span>
                                    <span className="text-slate-400">{t.progress}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">任务</th>
                    <th className="text-left px-4 py-3 font-medium">节点</th>
                    <th className="text-left px-4 py-3 font-medium">优先级</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="text-left px-4 py-3 font-medium">进度</th>
                    <th className="text-left px-4 py-3 font-medium">开始时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => {
                    const node = nodes.find((n) => n.id === t.nodeId);
                    return (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                        <td className="px-4 py-3 text-slate-500">{node?.name || t.nodeId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.priority === "high"
                                ? "bg-red-50 text-red-600"
                                : t.priority === "medium"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.status === "running"
                                ? "bg-blue-50 text-blue-600"
                                : t.status === "completed"
                                ? "bg-emerald-50 text-emerald-600"
                                : t.status === "failed"
                                ? "bg-red-50 text-red-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {t.status === "running"
                              ? "进行中"
                              : t.status === "completed"
                              ? "已完成"
                              : t.status === "failed"
                              ? "失败"
                              : "待处理"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${t.progress}%`,
                                  backgroundColor: t.status === "failed" ? "#ef4444" : "#3b82f6",
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{t.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{t.startedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Topology Tab */}
          {activeTab === "topology" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                蜂群拓扑
              </h3>
              <div className="relative h-[350px] bg-slate-50 rounded-xl border border-slate-100 p-4 overflow-hidden">
                {nodes.map((node, i) => {
                  const typeCfg = TYPE_CONFIG[node.type];
                  const x = 80 + (i % 4) * 220;
                  const y = 60 + Math.floor(i / 4) * 130;
                  return (
                    <div key={node.id} className="absolute" style={{ left: x, top: y }}>
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center border-2 bg-white"
                        style={{
                          borderColor: node.status === "active" ? typeCfg.color.replace("text-", "") : "#e2e8f0",
                        }}
                      >
                        <typeCfg.icon className={`w-6 h-6 ${typeCfg.color}`} />
                      </div>
                      <p className="text-[10px] text-center mt-1 text-slate-600 font-medium">{node.name}</p>
                      <p className="text-[9px] text-center text-slate-400">{node.load}%</p>
                    </div>
                  );
                })}
                {/* Hub node in center */}
                <div className="absolute" style={{ left: 340, top: 140 }}>
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-rose-200 bg-rose-50">
                    <Network className="w-7 h-7 text-rose-500" />
                  </div>
                  <p className="text-[10px] text-center mt-1 text-slate-600 font-medium">Swarm Hub</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${cfg.bg}`} />
                    <span className="text-xs text-slate-500">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
