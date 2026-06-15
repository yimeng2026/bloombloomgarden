"use client";

import { useState, useEffect } from "react";
import {
  Clock, Play, Zap, AlertTriangle, Pause, Pencil, Trash2, Plus,
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Search,
  RefreshCw, FileText, Check, X
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface CronJob {
  id: string; name: string; description: string; schedule: string;
  scheduleDesc: string; status: "active" | "paused";
  lastRun: string; nextRun: string; lastResult: "success" | "failed" | "running";
  duration: string; agent: string;
}

const cronJobs: CronJob[] = [
  { id: "cron-1", name: "每日数据备份", description: "自动备份数据库到远程存储", schedule: "0 2 * * *", scheduleDesc: "每天 02:00", status: "active", lastRun: "2026-06-15 02:00", nextRun: "2026-06-16 02:00", lastResult: "success", duration: "5m 30s", agent: "Agent-Backup" },
  { id: "cron-2", name: "健康检查", description: "检查所有节点健康状态", schedule: "0 */6 * * *", scheduleDesc: "每 6 小时", status: "active", lastRun: "2026-06-15 12:00", nextRun: "2026-06-15 18:00", lastResult: "success", duration: "2m 15s", agent: "Agent-Health" },
  { id: "cron-3", name: "日志清理", description: "清理 7 天前的日志文件", schedule: "0 3 * * 0", scheduleDesc: "每周日 03:00", status: "active", lastRun: "2026-06-14 03:00", nextRun: "2026-06-21 03:00", lastResult: "success", duration: "1m 45s", agent: "Agent-Cleanup" },
  { id: "cron-4", name: "模型同步", description: "同步远程模型仓库", schedule: "0 */12 * * *", scheduleDesc: "每 12 小时", status: "active", lastRun: "2026-06-15 06:00", nextRun: "2026-06-15 18:00", lastResult: "success", duration: "8m 20s", agent: "Agent-Sync" },
  { id: "cron-5", name: "报告生成", description: "生成每日运营报告", schedule: "0 9 * * *", scheduleDesc: "每天 09:00", status: "active", lastRun: "2026-06-15 09:00", nextRun: "2026-06-16 09:00", lastResult: "success", duration: "3m 10s", agent: "Agent-Report" },
  { id: "cron-6", name: "索引更新", description: "更新知识库向量索引", schedule: "0 */4 * * *", scheduleDesc: "每 4 小时", status: "paused", lastRun: "2026-06-15 08:00", nextRun: "已暂停", lastResult: "success", duration: "12m 30s", agent: "Agent-Index" },
  { id: "cron-7", name: "成本统计", description: "计算每日 API 调用成本", schedule: "0 1 * * *", scheduleDesc: "每天 01:00", status: "active", lastRun: "2026-06-15 01:00", nextRun: "2026-06-16 01:00", lastResult: "success", duration: "45s", agent: "Agent-Cost" },
  { id: "cron-8", name: "安全扫描", description: "扫描依赖安全漏洞", schedule: "0 0 * * 1", scheduleDesc: "每周一 00:00", status: "active", lastRun: "2026-06-09 00:00", nextRun: "2026-06-16 00:00", lastResult: "failed", duration: "2m 05s", agent: "Agent-Security" },
  { id: "cron-9", name: "内存优化", description: "压缩和优化记忆文件", schedule: "0 4 * * *", scheduleDesc: "每天 04:00", status: "active", lastRun: "2026-06-15 04:00", nextRun: "2026-06-16 04:00", lastResult: "success", duration: "6m 15s", agent: "Agent-Memory" },
  { id: "cron-10", name: "流量分析", description: "分析用户访问流量", schedule: "0 */8 * * *", scheduleDesc: "每 8 小时", status: "active", lastRun: "2026-06-15 08:00", nextRun: "2026-06-15 16:00", lastResult: "success", duration: "4m 30s", agent: "Agent-Analytics" },
  { id: "cron-11", name: "插件更新检查", description: "检查插件更新", schedule: "0 0 * * *", scheduleDesc: "每天 00:00", status: "active", lastRun: "2026-06-15 00:00", nextRun: "2026-06-16 00:00", lastResult: "success", duration: "1m 20s", agent: "Agent-Plugin" },
  { id: "cron-12", name: "全量备份", description: "系统全量备份", schedule: "0 0 1 * *", scheduleDesc: "每月 1 日 00:00", status: "active", lastRun: "2026-06-01 00:00", nextRun: "2026-07-01 00:00", lastResult: "success", duration: "15m 30s", agent: "Agent-Backup" },
];

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "text-emerald-600", bg: "bg-emerald-50", label: "启用" },
  paused: { color: "text-amber-600", bg: "bg-amber-50", label: "暂停" },
};

const resultMap: Record<string, { color: string; bg: string; icon: any }> = {
  success: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  failed: { color: "text-rose-600", bg: "bg-rose-50", icon: XCircle },
  running: { color: "text-blue-600", bg: "bg-blue-50", icon: Loader2 },
};

const scheduleTemplates = [
  { label: "每小时", value: "0 * * * *" },
  { label: "每天", value: "0 0 * * *" },
  { label: "每周", value: "0 0 * * 0" },
  { label: "每月", value: "0 0 1 * *" },
];

export default function CronPage() {
  const [jobList, setJobList] = useState<CronJob[]>(cronJobs);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 400); }, []);

  const toggleStatus = (id: string) => {
    setJobList((prev) => prev.map((j) => j.id === id ? { ...j, status: j.status === "active" ? "paused" : "active" as any } : j));
  };

  const filtered = jobList.filter((j) => !search || j.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = jobList.filter((j) => j.status === "active").length;
  const runningCount = jobList.filter((j) => j.lastResult === "running").length;
  const failedCount = jobList.filter((j) => j.lastResult === "failed").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Cron 任务" subtitle={`${activeCount} 启用 · ${jobList.length} 总计`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="定时任务" value={jobList.length.toString()} change={3} icon={Clock} color="bg-emerald-500" />
            <StatsCard title="运行中" value={runningCount.toString()} change={1} icon={Play} color="bg-blue-500" />
            <StatsCard title="今日执行" value="18" change={5} icon={Zap} color="bg-amber-500" />
            <StatsCard title="失败次数" value={failedCount.toString()} change={-1} icon={AlertTriangle} color="bg-rose-500" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索任务..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg">
              <Plus size={14} /> 新建任务
            </button>
          </div>

          {showCreate && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">新建 Cron 任务</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-slate-500 mb-1 block">任务名称</label><input placeholder="输入名称" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block">负责 Agent</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"><option>Agent-Backup</option><option>Agent-Health</option><option>Agent-Sync</option></select></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-500 mb-1 block">描述</label><input placeholder="任务描述..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block">Cron 表达式</label><input placeholder="0 2 * * *" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block">常用模板</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                  <option>自定义</option>{scheduleTemplates.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select></div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">创建</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200">取消</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20"><RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" /><p className="text-slate-500">加载中...</p></div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr>
                  <th className="text-left px-4 py-3 font-medium">任务</th>
                  <th className="text-left px-4 py-3 font-medium">计划</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-left px-4 py-3 font-medium">上次执行</th>
                  <th className="text-left px-4 py-3 font-medium">下次执行</th>
                  <th className="text-left px-4 py-3 font-medium">结果</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr></thead>
                <tbody>
                  {filtered.map((j) => {
                    const sc = statusMap[j.status];
                    const rc = resultMap[j.lastResult];
                    const ResultIcon = rc.icon;
                    const isLogExpanded = expandedLog === j.id;
                    return (
                      <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3"><div className="font-medium text-slate-800">{j.name}</div><div className="text-xs text-slate-400">{j.description}</div></td>
                        <td className="px-4 py-3"><div className="text-xs text-slate-600 font-mono">{j.schedule}</div><div className="text-[10px] text-slate-400">{j.scheduleDesc}</div></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{j.lastRun}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{j.nextRun}</td>
                        <td className="px-4 py-3"><span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rc.bg} ${rc.color}`}><ResultIcon size={12} className={j.lastResult === "running" ? "animate-spin" : ""} /> {j.lastResult === "success" ? "成功" : j.lastResult === "failed" ? "失败" : "运行中"}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleStatus(j.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors" title={j.status === "active" ? "暂停" : "启用"}>
                              {j.status === "active" ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                            <button onClick={() => setExpandedLog(isLogExpanded ? null : j.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="日志">
                              {isLogExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="删除"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
