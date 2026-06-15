"use client";

import { useState, useEffect } from "react";
import {
  Puzzle, Zap, Globe, RefreshCw, CheckCircle, Store, HardDrive,
  Download, Trash2, Settings, Star, Plus, Search, ChevronDown,
  ChevronUp, Check, X, Cpu, FileText, Code, Database, Link2
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface Plugin { id: string; name: string; description: string; version: string; latestVersion: string; status: "active" | "disabled" | "update_available"; category: string; author: string; size: string; installedAt: string; }
interface MarketPlugin { id: string; name: string; description: string; version: string; downloads: number; rating: number; category: string; author: string; }
interface Skill { id: string; name: string; description: string; category: string; level: string; agentCount: number; }

const installedPlugins: Plugin[] = [
  { id: "p1", name: "File System", description: "文件系统读写操作", version: "2.1.0", latestVersion: "2.1.0", status: "active", category: "core", author: "OpenClaw", size: "12KB", installedAt: "2026-06-01" },
  { id: "p2", name: "Browser", description: "网页浏览与搜索", version: "1.5.2", latestVersion: "1.5.3", status: "active", category: "core", author: "OpenClaw", size: "45KB", installedAt: "2026-06-01" },
  { id: "p3", name: "Shell", description: "Shell 命令执行", version: "3.0.1", latestVersion: "3.0.1", status: "active", category: "core", author: "OpenClaw", size: "8KB", installedAt: "2026-06-01" },
  { id: "p4", name: "Calendar", description: "日历管理与提醒", version: "1.2.0", latestVersion: "1.2.0", status: "active", category: "productivity", author: "Community", size: "23KB", installedAt: "2026-06-05" },
  { id: "p5", name: "Email", description: "邮件收发与管理", version: "2.0.0", latestVersion: "2.0.1", status: "update_available", category: "communication", author: "Community", size: "34KB", installedAt: "2026-06-03" },
  { id: "p6", name: "GitHub", description: "GitHub 操作集成", version: "1.1.5", latestVersion: "1.1.5", status: "active", category: "dev", author: "Community", size: "18KB", installedAt: "2026-06-08" },
  { id: "p7", name: "Notion", description: "Notion 页面管理", version: "0.9.0", latestVersion: "1.0.0", status: "update_available", category: "productivity", author: "Third-party", size: "28KB", installedAt: "2026-06-10" },
  { id: "p8", name: "Slack", description: "Slack 消息发送", version: "1.0.0", latestVersion: "1.0.0", status: "disabled", category: "communication", author: "Community", size: "15KB", installedAt: "2026-06-12" },
];

const marketPlugins: MarketPlugin[] = [
  { id: "m1", name: "Database Query", description: "SQL 数据库查询操作", version: "1.0.0", downloads: 2340, rating: 4.8, category: "data", author: "OpenClaw" },
  { id: "m2", name: "Image Generation", description: "AI 图像生成接口", version: "2.0.0", downloads: 5670, rating: 4.6, category: "ai", author: "Community" },
  { id: "m3", name: "PDF Parser", description: "PDF 文档解析与提取", version: "1.3.0", downloads: 1890, rating: 4.5, category: "data", author: "Community" },
  { id: "m4", name: "Weather API", description: "天气查询与预报", version: "1.0.2", downloads: 890, rating: 4.2, category: "integration", author: "Third-party" },
  { id: "m5", name: "Translation", description: "多语言翻译服务", version: "3.1.0", downloads: 3450, rating: 4.7, category: "ai", author: "OpenClaw" },
  { id: "m6", name: "Code Review", description: "自动代码审查", version: "1.0.0", downloads: 1230, rating: 4.4, category: "dev", author: "Community" },
];

const skills: Skill[] = [
  { id: "s1", name: "代码生成", description: "根据需求生成代码片段", category: "dev", level: "advanced", agentCount: 5 },
  { id: "s2", name: "数据分析", description: "数据清洗与可视化分析", category: "data", level: "intermediate", agentCount: 3 },
  { id: "s3", name: "文档写作", description: "技术文档与报告撰写", category: "writing", level: "intermediate", agentCount: 4 },
  { id: "s4", name: "翻译", description: "多语言翻译与本地化", category: "language", level: "beginner", agentCount: 2 },
  { id: "s5", name: "搜索", description: "网络搜索与信息聚合", category: "research", level: "beginner", agentCount: 6 },
  { id: "s6", name: "调试", description: "代码调试与错误排查", category: "dev", level: "advanced", agentCount: 3 },
];

const categoryMap: Record<string, { icon: any; label: string }> = {
  core: { icon: Cpu, label: "核心" }, communication: { icon: Link2, label: "通信" }, productivity: { icon: FileText, label: "生产力" },
  dev: { icon: Code, label: "开发" }, data: { icon: Database, label: "数据" }, ai: { icon: Zap, label: "AI" }, integration: { icon: Globe, label: "集成" },
};

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "text-emerald-600", bg: "bg-emerald-50", label: "运行中" },
  disabled: { color: "text-slate-400", bg: "bg-slate-100", label: "已禁用" },
  update_available: { color: "text-amber-600", bg: "bg-amber-50", label: "有更新" },
};

export default function PluginsPage() {
  const [tab, setTab] = useState<"installed" | "market" | "skills">("installed");
  const [pluginList, setPluginList] = useState(installedPlugins);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 400); }, []);

  const togglePlugin = (id: string) => {
    setPluginList((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "active" ? "disabled" : "active" as any } : p));
  };

  const filteredPlugins = pluginList.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMarket = marketPlugins.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredSkills = skills.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { id: "installed" as const, label: "已安装", icon: CheckCircle },
    { id: "market" as const, label: "市场", icon: Store },
    { id: "skills" as const, label: "技能", icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="插件与技能" subtitle="管理插件市场和智能体技能" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="已安装插件" value="18" change={5.2} icon={Puzzle} color="bg-emerald-500" />
            <StatsCard title="可用技能" value="42" change={8.1} icon={Zap} color="bg-blue-500" />
            <StatsCard title="市场插件" value="156" change={12.3} icon={Globe} color="bg-amber-500" />
            <StatsCard title="待更新" value="3" change={-1} icon={RefreshCw} color="bg-rose-500" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索插件或技能..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="flex items-center gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" /><p className="text-slate-500">加载中...</p></div>
          ) : (
            <div>
              {tab === "installed" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlugins.map((p) => {
                    const sc = statusMap[p.status];
                    const isExpanded = expandedId === p.id;
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sc.bg}`}>
                                <Puzzle className={`w-4 h-4 ${sc.color}`} />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800">{p.name}</h4>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => togglePlugin(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors" title={p.status === "active" ? "禁用" : "启用"}>
                                {p.status === "active" ? <X size={14} /> : <Check size={14} />}
                              </button>
                              <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{p.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>v{p.version}</span>
                            <span>{p.author}</span>
                            <span>{p.size}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                            <p className="text-xs font-medium text-slate-600 mb-2">动态配置</p>
                            <div className="space-y-1.5 mb-3">
                              <div className="flex items-center gap-2"><span className="text-xs text-slate-400 w-20">timeout</span><input defaultValue="30000" className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300" /></div>
                              <div className="flex items-center gap-2"><span className="text-xs text-slate-400 w-20">retries</span><input defaultValue="3" type="number" className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300" /></div>
                              <div className="flex items-center justify-between"><span className="text-xs text-slate-400">verbose</span><input type="checkbox" defaultChecked className="accent-emerald-500" /></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">保存</button>
                              {p.status === "update_available" && <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600">更新</button>}
                              <button className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "market" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMarket.map((p) => {
                    const cat = categoryMap[p.category] || { icon: Puzzle, label: p.category };
                    const CatIcon = cat.icon;
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center"><CatIcon className="w-4 h-4 text-slate-500" /></div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">{p.name}</h4>
                              <span className="text-[10px] text-slate-400">v{p.version} · {cat.label}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{p.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3">
                          <span className="flex items-center gap-1"><Download size={10} /> {p.downloads}</span>
                          <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" /> {p.rating}</span>
                          <span>{p.author}</span>
                        </div>
                        <button className="w-full py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">安装</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "skills" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSkills.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Zap className="w-4 h-4 text-emerald-500" /></div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{s.name}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.level === "advanced" ? "bg-rose-50 text-rose-600" : s.level === "intermediate" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {s.level === "advanced" ? "高级" : s.level === "intermediate" ? "中级" : "初级"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{s.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{s.agentCount} 个智能体使用</span>
                        <button className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100">分配</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
