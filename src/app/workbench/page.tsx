"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  Activity,
  Zap,
  Server,
  MessageSquare,
  Network,
  Cpu,
  Database,
  BarChart3,
  Plug,
  Plus,
  Play,
  Square,
  RefreshCw,
  Wifi,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Platform {
  id: string;
  name: string;
  category: string;
  mode: "embedded" | "proxy" | "launcher" | "native";
  status: "running" | "stopped" | "not_installed";
  url?: string;
  apiBase?: string;
  launcher?: string;
  features: string[];
  port: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const platforms: Platform[] = [
  { id: "aion", name: "AION UI", category: "聊天前端", mode: "embedded", status: "running", url: "http://localhost:3000", features: ["Chat", "Agents", "Swarm"], port: 3000 },
  { id: "openwebui", name: "Open WebUI", category: "聊天前端", mode: "embedded", status: "running", url: "http://localhost:3000", features: ["Chat", "RAG", "Models"], port: 3000 },
  { id: "librechat", name: "LibreChat", category: "聊天前端", mode: "embedded", status: "stopped", url: "http://localhost:3080", features: ["Chat", "Plugins"], port: 3080 },
  { id: "dify", name: "Dify", category: "聊天前端", mode: "embedded", status: "running", url: "http://localhost:80", features: ["Chat", "Workflow", "Knowledge"], port: 80 },
  { id: "n8n", name: "n8n", category: "工作流", mode: "embedded", status: "running", url: "http://localhost:5678", features: ["Workflows", "Executions"], port: 5678 },
  { id: "flowise", name: "Flowise", category: "工作流", mode: "embedded", status: "stopped", url: "http://localhost:3000", features: ["Chatflow", "Marketplace"], port: 3000 },
  { id: "ollama", name: "Ollama", category: "本地后端", mode: "proxy", status: "running", apiBase: "http://localhost:11434", features: ["Models", "Chat API"], port: 11434 },
  { id: "localai", name: "LocalAI", category: "本地后端", mode: "proxy", status: "running", apiBase: "http://localhost:8080", features: ["Models", "Embeddings"], port: 8080 },
  { id: "jan", name: "Jan AI", category: "本地后端", mode: "launcher", status: "not_installed", launcher: "jan.exe", features: ["Chat", "Models"], port: 1337 },
  { id: "lmstudio", name: "LM Studio", category: "本地后端", mode: "launcher", status: "not_installed", launcher: "LM Studio.exe", features: ["Chat", "Server"], port: 1234 },
  { id: "anythingllm", name: "AnythingLLM", category: "知识库", mode: "embedded", status: "running", url: "http://localhost:3001", features: ["Chat", "Workspace"], port: 3001 },
  { id: "weaviate", name: "Weaviate", category: "知识库", mode: "proxy", status: "running", apiBase: "http://localhost:8080", features: ["Vector Search"], port: 8080 },
  { id: "prometheus", name: "Prometheus", category: "监控工具", mode: "embedded", status: "running", url: "http://localhost:9090", features: ["Metrics", "Alerting"], port: 9090 },
  { id: "grafana", name: "Grafana", category: "监控工具", mode: "embedded", status: "running", url: "http://localhost:3000", features: ["Dashboards", "Visualization"], port: 3000 },
  { id: "fastapi", name: "FastAPI", category: "集成工具", mode: "proxy", status: "running", apiBase: "http://localhost:8000", features: ["API Docs", "Endpoints"], port: 8000 },
  { id: "nextchat", name: "NextChat", category: "集成工具", mode: "embedded", status: "stopped", url: "http://localhost:3000", features: ["Chat", "Plugins"], port: 3000 },
];

const categories = [
  { name: "聊天前端", icon: MessageSquare },
  { name: "工作流", icon: Network },
  { name: "本地后端", icon: Cpu },
  { name: "知识库", icon: Database },
  { name: "监控工具", icon: BarChart3 },
  { name: "集成工具", icon: Plug },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  running: { color: "bg-emerald-500", label: "运行中" },
  stopped: { color: "bg-slate-400", label: "已停止" },
  not_installed: { color: "bg-orange-500", label: "未安装" },
};

const modeConfig: Record<string, { bg: string; text: string }> = {
  embedded: { bg: "bg-blue-50", text: "text-blue-600" },
  proxy: { bg: "bg-violet-50", text: "text-violet-600" },
  launcher: { bg: "bg-amber-50", text: "text-amber-600" },
  native: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ProgressBar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function WorkbenchPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const getPlatformsByCategory = (category: string) => platforms.filter((p) => p.category === category);

  const recentPlatforms = platforms.filter((p) => p.status === "running").slice(0, 4);

  const events = [
    { time: "10:23", text: "AION UI 平台上线" },
    { time: "09:15", text: "n8n 配置更新完成" },
    { time: "08:42", text: "Ollama 服务错误恢复" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="统一工作台" subtitle="平台聚合中心 · 管理您的所有工具与服务" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="已安装平台" value={12} change={0} icon={Layers} color="bg-emerald-500" />
            <StatsCard title="运行中平台" value={7} change={0} icon={Activity} color="bg-blue-500" />
            <StatsCard title="总功能数" value={86} change={0} icon={Zap} color="bg-amber-500" />
            <StatsCard title="API 代理数" value={5} change={0} icon={Server} color="bg-violet-500" />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Platform List */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">平台列表</h2>
                  <span className="text-xs text-slate-400">{platforms.length} 个平台</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                    <span className="ml-3 text-slate-500">加载平台数据中...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((cat) => {
                      const catPlatforms = getPlatformsByCategory(cat.name);
                      const CatIcon = cat.icon;
                      return (
                        <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <CatIcon className="w-4 h-4 text-slate-500" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">{cat.name}</h3>
                            <span className="ml-auto text-xs text-slate-400">{catPlatforms.length} 个</span>
                          </div>
                          <div className="space-y-3">
                            {catPlatforms.map((p) => {
                              const sc = statusConfig[p.status];
                              const mc = modeConfig[p.mode];
                              const isSelected = selectedPlatform === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => setSelectedPlatform(isSelected ? null : p.id)}
                                  className={`cursor-pointer rounded-xl border transition-all ${
                                    isSelected
                                      ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/50"
                                      : "border-slate-100 hover:border-slate-300 hover:shadow-md"
                                  }`}
                                >
                                  <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${sc.color}`} />
                                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                                      </div>
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mc.bg} ${mc.text}`}
                                      >
                                        {p.mode}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> {p.features.length} 功能
                                      </span>
                                      <span>端口 {p.port}</span>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="px-3 pb-3 border-t border-slate-100 pt-2">
                                      <div className="flex flex-wrap gap-1.5">
                                        {p.features.map((f) => (
                                          <span
                                            key={f}
                                            className="text-xs px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600"
                                          >
                                            {f}
                                          </span>
                                        ))}
                                      </div>
                                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                        {p.url && (
                                          <span className="flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" /> {p.url}
                                          </span>
                                        )}
                                        {p.apiBase && (
                                          <span className="flex items-center gap-1">
                                            <Server className="w-3 h-3" /> {p.apiBase}
                                          </span>
                                        )}
                                        {p.launcher && (
                                          <span className="flex items-center gap-1">
                                            <Cpu className="w-3 h-3" /> {p.launcher}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Launch */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">快捷启动</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {recentPlatforms.map((p) => {
                    const sc = statusConfig[p.status];
                    return (
                      <button
                        key={p.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm text-slate-700"
                      >
                        <div className={`w-2 h-2 rounded-full ${sc.color}`} />
                        <span>{p.name}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* System Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-700">系统概览</h3>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">运行正常</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> CPU
                      </span>
                      <span>45%</span>
                    </div>
                    <ProgressBar value={45} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Server className="w-3 h-3" /> 内存
                      </span>
                      <span>3.2 GB</span>
                    </div>
                    <ProgressBar value={64} color="bg-blue-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" /> 磁盘
                      </span>
                      <span>120 GB</span>
                    </div>
                    <ProgressBar value={40} color="bg-amber-500" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span>连接正常，延迟 23ms</span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-medium text-slate-500 mb-2">最近事件</h4>
                  <div className="space-y-2">
                    {events.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Clock className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-slate-400">{e.time}</span>
                          <p className="text-slate-600">{e.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">操作面板</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
                    <Plus className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">安装平台</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
                    <Play className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">启动全部</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all">
                    <Square className="w-5 h-5 text-rose-500" />
                    <span className="text-xs font-medium text-slate-700">停止全部</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-medium text-slate-700">刷新状态</span>
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
