"use client";

import { useState, useEffect } from "react";
import {
  Building, Users, Layers, ClipboardList, Server, CheckCircle, AlertTriangle,
  Play, Pause, Pencil, Trash2, Plus, ChevronDown, ChevronUp, RefreshCw,
  Settings, Bot, Link2, Star, Clock, Activity
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface Team { id: string; name: string; description: string; members: string[]; taskCount: number; status: "active" | "idle"; }
interface Task { id: string; name: string; team: string; status: string; priority: string; progress: number; assignee: string; }

const company = {
  name: "BloomGarden AI", description: "AI 驱动的智能协作平台",
  gatewayUrl: "http://localhost:11435", gatewayStatus: "online" as const,
  gatewayVersion: "v2.1.0", agents: 12, teams: 4, tasks: 8, channels: 7, createdAt: "2026-01-15",
};

const teams: Team[] = [
  { id: "team-1", name: "开发团队", description: "前端+后端+测试", members: ["Agent-A", "Agent-B", "Agent-C", "Agent-D"], taskCount: 3, status: "active" },
  { id: "team-2", name: "数据分析组", description: "数据处理与可视化", members: ["Agent-E", "Agent-F"], taskCount: 2, status: "active" },
  { id: "team-3", name: "内容创作组", description: "写作与翻译", members: ["Agent-G", "Agent-H", "Agent-I"], taskCount: 2, status: "active" },
  { id: "team-4", name: "运维组", description: "系统监控与维护", members: ["Agent-J"], taskCount: 1, status: "idle" },
];

const tasks: Task[] = [
  { id: "task-1", name: "前端重构", team: "开发团队", status: "in_progress", priority: "high", progress: 65, assignee: "Agent-A" },
  { id: "task-2", name: "API 设计", team: "开发团队", status: "in_progress", priority: "medium", progress: 40, assignee: "Agent-B" },
  { id: "task-3", name: "数据清洗", team: "数据分析组", status: "in_progress", priority: "high", progress: 80, assignee: "Agent-E" },
  { id: "task-4", name: "文档翻译", team: "内容创作组", status: "pending", priority: "low", progress: 0, assignee: "Agent-G" },
  { id: "task-5", name: "系统监控", team: "运维组", status: "pending", priority: "medium", progress: 0, assignee: "Agent-J" },
];

const activities = [
  { id: "a1", title: "Agent-A 已上线", time: "2分钟前", type: "agent" },
  { id: "a2", title: "任务 #2841 已完成", time: "15分钟前", type: "task" },
  { id: "a3", title: "OpenAI 配置已更新", time: "1小时前", type: "config" },
  { id: "a4", title: "网关连接恢复", time: "2小时前", type: "system" },
  { id: "a5", title: "新团队 运维组 已创建", time: "3小时前", type: "team" },
];

const typeColors: Record<string, string> = { agent: "bg-blue-50 text-blue-600", task: "bg-violet-50 text-violet-600", config: "bg-amber-50 text-amber-600", system: "bg-emerald-50 text-emerald-600", team: "bg-rose-50 text-rose-600" };

export default function CompanyPage() {
  const [tab, setTab] = useState<"overview" | "teams" | "gateway">("overview");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 400); }, []);

  const handleTest = () => {
    setTestStatus("testing");
    setTimeout(() => setTestStatus("success"), 1500);
  };

  const tabs = [
    { id: "overview" as const, label: "公司概览", icon: Building },
    { id: "teams" as const, label: "团队管理", icon: Users },
    { id: "gateway" as const, label: "网关配置", icon: Server },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="AI Company" subtitle={`${company.name} · 网关${company.gatewayStatus === "online" ? "在线" : "离线"}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="公司成员" value={company.agents.toString()} change={12.5} icon={Users} color="bg-emerald-500" />
            <StatsCard title="活跃团队" value={company.teams.toString()} change={5.2} icon={Layers} color="bg-blue-500" />
            <StatsCard title="进行中任务" value={company.tasks.toString()} change={-2.1} icon={ClipboardList} color="bg-amber-500" />
            <StatsCard title="网关状态" value={company.gatewayStatus === "online" ? "在线" : "离线"} change={0} icon={Server} color="bg-violet-500" />
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

          {loading ? (
            <div className="text-center py-20"><RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" /><p className="text-slate-500">加载中...</p></div>
          ) : (
            <div>
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Building className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{company.name}</h3>
                        <p className="text-xs text-slate-400">{company.description} · 创建于 {company.createdAt}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[{ label: "成员", value: company.agents, icon: Users }, { label: "团队", value: company.teams, icon: Layers }, { label: "任务", value: company.tasks, icon: ClipboardList }, { label: "通道", value: company.channels, icon: Link2 }].map((s) => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                          <Icon className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-slate-800">{s.value}</p>
                          <p className="text-xs text-slate-400">{s.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">最近活动</h4>
                    <div className="space-y-3">
                      {activities.map((a) => (
                        <div key={a.id} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[a.type]}`}>{a.type}</span>
                          <span className="text-sm text-slate-600 flex-1">{a.title}</span>
                          <span className="text-xs text-slate-400">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "teams" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((t) => {
                    const isExpanded = expandedTeam === t.id;
                    return (
                      <div key={t.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">{t.name}</h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{t.status === "active" ? "活跃" : "空闲"}</span>
                            </div>
                            <button onClick={() => setExpandedTeam(isExpanded ? null : t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{t.description}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {t.members.map((m, i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 border border-white">{m[0]}</div>
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">{t.members.length} 成员 · {t.taskCount} 任务</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                            <p className="text-xs font-medium text-slate-600 mb-2">成员</p>
                            <div className="space-y-1 mb-3">
                              {t.members.map((m) => (
                                <div key={m} className="flex items-center gap-2 text-xs text-slate-600"><Bot size={12} /> {m}</div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">查看任务</button>
                              <button className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs hover:bg-slate-100"><Pencil size={12} /></button>
                              <button className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "gateway" && (
                <div className="space-y-4 max-w-2xl">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">网关状态</h4>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${company.gatewayStatus === "online" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="text-sm text-slate-600">{company.gatewayStatus === "online" ? "运行正常" : "离线"}</span>
                      <span className="text-xs text-slate-400">v{company.gatewayVersion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleTest} disabled={testStatus === "testing"} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                        {testStatus === "testing" ? "测试中..." : testStatus === "success" ? "连接正常" : testStatus === "error" ? "连接失败" : "测试连接"}
                      </button>
                      {testStatus === "success" && <CheckCircle size={16} className="text-emerald-500" />}
                      {testStatus === "error" && <AlertTriangle size={16} className="text-red-500" />}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">基本配置</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs text-slate-500 mb-1 block">网关 URL</label><input defaultValue={company.gatewayUrl} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" /></div>
                      <div><label className="text-xs text-slate-500 mb-1 block">API Key</label><input type="password" defaultValue="sk-***" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" /></div>
                      <div><label className="text-xs text-slate-500 mb-1 block">默认模型</label>
                        <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                          <option>GPT-4o</option><option>Claude-3.5-Sonnet</option><option>GLM-5</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">高级配置</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><span className="text-xs text-slate-500">超时时间 (ms)</span><input type="number" defaultValue={30000} className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs text-right" /></div>
                      <div className="flex items-center justify-between"><span className="text-xs text-slate-500">重试次数</span><input type="number" defaultValue={3} className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs text-right" /></div>
                      <div className="flex items-center justify-between"><span className="text-xs text-slate-500">并发限制</span><input type="number" defaultValue={10} className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs text-right" /></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-600 mb-2">配置 JSON 预览</p>
                    <pre className="text-[10px] text-slate-500 bg-slate-100 rounded-lg p-3 overflow-x-auto">{JSON.stringify({ gateway: company.gatewayUrl, version: company.gatewayVersion, agents: company.agents, teams: company.teams }, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
