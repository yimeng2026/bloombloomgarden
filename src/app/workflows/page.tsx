"use client";

import { useState, useEffect } from "react";
import {
  Network, Play, LayoutTemplate, Clock, FolderOpen, CheckCircle, AlertTriangle,
  Pause, Pencil, Trash2, Plus, ChevronDown, ChevronUp, ArrowRight, Search,
  RefreshCw, XCircle, Loader2, Star
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface Workflow { id: string; name: string; description: string; status: "active" | "paused" | "draft"; nodes: number; executions: number; lastRun: string; template: string; }
interface Template { id: string; name: string; description: string; category: string; nodes: number; uses: number; rating: number; }
interface Execution { id: string; workflowId: string; workflowName: string; status: "success" | "running" | "failed"; startedAt: string; duration: string; output: string; }

const workflows: Workflow[] = [
  { id: "w1", name: "内容创作流水线", description: "研究→写作→翻译→审校→发布", status: "active", nodes: 5, executions: 156, lastRun: "10分钟前", template: "content_factory" },
  { id: "w2", name: "代码审查流程", description: "提交→分析→审查→修复→合并", status: "active", nodes: 5, executions: 89, lastRun: "1小时前", template: "code_review" },
  { id: "w3", name: "数据同步任务", description: "采集→清洗→转换→加载→验证", status: "paused", nodes: 5, executions: 234, lastRun: "昨天", template: "data_pipeline" },
  { id: "w4", name: "智能客服响应", description: "接收→分类→响应→升级→记录", status: "active", nodes: 5, executions: 1200, lastRun: "刚刚", template: "customer_service" },
  { id: "w5", name: "邮件自动处理", description: "接收→分类→摘要→回复→归档", status: "active", nodes: 5, executions: 567, lastRun: "5分钟前", template: "email_auto" },
  { id: "w6", name: "报告自动生成", description: "收集→分析→生成→审阅→分发", status: "draft", nodes: 4, executions: 0, lastRun: "—", template: "custom" },
];

const templates: Template[] = [
  { id: "t1", name: "内容工厂", description: "研究→写作→翻译→审校→发布", category: "content", nodes: 5, uses: 2300, rating: 4.9 },
  { id: "t2", name: "代码审查", description: "提交→分析→审查→修复→合并", category: "dev", nodes: 5, uses: 1200, rating: 4.7 },
  { id: "t3", name: "数据流水线", description: "采集→清洗→转换→加载→验证", category: "data", nodes: 5, uses: 890, rating: 4.6 },
  { id: "t4", name: "智能客服", description: "接收→分类→响应→升级→记录", category: "service", nodes: 5, uses: 3100, rating: 4.8 },
  { id: "t5", name: "邮件自动化", description: "接收→分类→摘要→回复→归档", category: "productivity", nodes: 5, uses: 1500, rating: 4.5 },
  { id: "t6", name: "报告生成", description: "收集→分析→生成→审阅→分发", category: "productivity", nodes: 4, uses: 670, rating: 4.4 },
];

const executions: Execution[] = [
  { id: "e1", workflowId: "w1", workflowName: "内容创作流水线", status: "success", startedAt: "2026-06-15 10:00", duration: "2m 30s", output: "文章已发布" },
  { id: "e2", workflowId: "w4", workflowName: "智能客服响应", status: "running", startedAt: "2026-06-15 10:42", duration: "45s", output: "处理中..." },
  { id: "e3", workflowId: "w2", workflowName: "代码审查流程", status: "failed", startedAt: "2026-06-15 10:30", duration: "1m 15s", output: "审查未通过" },
  { id: "e4", workflowId: "w1", workflowName: "内容创作流水线", status: "success", startedAt: "2026-06-15 09:00", duration: "3m 10s", output: "文章已发布" },
  { id: "e5", workflowId: "w5", workflowName: "邮件自动处理", status: "success", startedAt: "2026-06-15 08:30", duration: "1m 45s", output: "5封邮件已处理" },
];

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "text-emerald-600", bg: "bg-emerald-50", label: "运行中" },
  paused: { color: "text-amber-600", bg: "bg-amber-50", label: "已暂停" },
  draft: { color: "text-slate-400", bg: "bg-slate-100", label: "草稿" },
};

const execStatusMap: Record<string, { color: string; bg: string; icon: any }> = {
  success: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  running: { color: "text-blue-600", bg: "bg-blue-50", icon: Loader2 },
  failed: { color: "text-rose-600", bg: "bg-rose-50", icon: XCircle },
};

const nodeTypes = [
  { id: "input", name: "输入", color: "bg-blue-500" },
  { id: "ai_task", name: "AI任务", color: "bg-emerald-500" },
  { id: "approval", name: "审批", color: "bg-amber-500" },
  { id: "summary", name: "汇总", color: "bg-violet-500" },
  { id: "publish", name: "发布", color: "bg-rose-500" },
];

export default function WorkflowsPage() {
  const [tab, setTab] = useState<"workflows" | "templates" | "executions">("workflows");
  const [wfList, setWfList] = useState(workflows);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 400); }, []);

  const toggleStatus = (id: string) => {
    setWfList((prev) => prev.map((w) => w.id === id ? { ...w, status: w.status === "active" ? "paused" : "active" as any } : w));
  };

  const tabs = [
    { id: "workflows" as const, label: "我的工作流", icon: FolderOpen },
    { id: "templates" as const, label: "模板市场", icon: LayoutTemplate },
    { id: "executions" as const, label: "执行记录", icon: Clock },
  ];

  const filteredWf = wfList.filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTpl = templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredExec = executions.filter((e) => !search || e.workflowName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="工作流中心" subtitle="编排自动化任务流程" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="工作流总数" value="18" change={5.2} icon={Network} color="bg-emerald-500" />
            <StatsCard title="运行中" value="4" change={1} icon={Play} color="bg-blue-500" />
            <StatsCard title="模板数" value="12" change={3} icon={LayoutTemplate} color="bg-amber-500" />
            <StatsCard title="今日执行" value="47" change={8.3} icon={Clock} color="bg-violet-500" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索工作流..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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
              {tab === "workflows" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredWf.map((w) => {
                    const sc = statusMap[w.status];
                    const isExpanded = expandedId === w.id;
                    return (
                      <div key={w.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">{w.name}</h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleStatus(w.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors">
                                {w.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <button onClick={() => setExpandedId(isExpanded ? null : w.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{w.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{w.nodes} 节点</span><span>{w.executions} 次执行</span><span>最后: {w.lastRun}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                            <p className="text-xs font-medium text-slate-600 mb-2">节点预览</p>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                              {nodeTypes.slice(0, w.nodes).map((n, i) => (
                                <div key={n.id} className="flex items-center gap-2 shrink-0">
                                  <div className={`px-3 py-1.5 rounded-lg ${n.color} text-white text-xs font-medium`}>{n.name}</div>
                                  {i < w.nodes - 1 && <ArrowRight size={14} className="text-slate-300" />}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">运行</button>
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

              {tab === "templates" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTpl.map((t) => (
                    <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
                      <h4 className="text-sm font-semibold text-slate-800 mb-1">{t.name}</h4>
                      <p className="text-xs text-slate-500 mb-2">{t.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-3">
                        <span>{t.nodes} 节点</span><span>{t.uses} 次使用</span><span className="flex items-center gap-0.5"><Star size={10} className="text-amber-400" /> {t.rating}</span>
                      </div>
                      <button className="w-full py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">使用模板</button>
                    </div>
                  ))}
                </div>
              )}

              {tab === "executions" && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left px-4 py-3 font-medium">工作流</th><th className="text-left px-4 py-3 font-medium">状态</th><th className="text-left px-4 py-3 font-medium">开始时间</th><th className="text-left px-4 py-3 font-medium">耗时</th><th className="text-left px-4 py-3 font-medium">输出</th></tr></thead>
                    <tbody>
                      {filteredExec.map((e) => {
                        const sc = execStatusMap[e.status];
                        const StatusIcon = sc.icon;
                        return (
                          <tr key={e.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{e.workflowName}</td>
                            <td className="px-4 py-3"><span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}><StatusIcon size={12} className={e.status === "running" ? "animate-spin" : ""} /> {e.status === "success" ? "成功" : e.status === "running" ? "运行中" : "失败"}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-500">{e.startedAt}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{e.duration}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{e.output}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
