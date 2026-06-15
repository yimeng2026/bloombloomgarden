"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Play,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Columns,
  Rows,
  Pause,
  XCircle,
  ArrowRight,
  Trash2,
  Ban,
  Clock,
  User,
  Tag,
  Loader2,
  CheckSquare,
  X,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TaskStatus = "running" | "pending" | "completed" | "failed" | "cancelled";
type TaskPriority = "high" | "medium" | "low";
type ViewMode = "board" | "list";

interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  agent: string;
  createdAt: string;
  estimated: string;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockTasks: Task[] = [
  { id: "t1", name: "数据同步任务", description: "同步各节点数据到主库", status: "running", priority: "high", progress: 65, agent: "Agent-A", createdAt: "2026-06-15 09:00", estimated: "2小时", tags: ["自动", "高频"] },
  { id: "t2", name: "模型训练", description: "训练新模型版本", status: "pending", priority: "medium", progress: 0, agent: "Agent-B", createdAt: "2026-06-15 10:00", estimated: "4小时", tags: ["训练", "GPU"] },
  { id: "t3", name: "健康检查", description: "检查所有节点健康状态", status: "completed", priority: "low", progress: 100, agent: "Agent-C", createdAt: "2026-06-15 08:00", estimated: "已完成", tags: ["监控", "定期"] },
  { id: "t4", name: "代码审查", description: "审查前端代码变更", status: "running", priority: "high", progress: 30, agent: "Agent-D", createdAt: "2026-06-15 11:00", estimated: "1.5小时", tags: ["代码", "审查"] },
  { id: "t5", name: "文档生成", description: "自动生成 API 文档", status: "completed", priority: "medium", progress: 100, agent: "Agent-E", createdAt: "2026-06-15 07:00", estimated: "已完成", tags: ["文档", "自动"] },
  { id: "t6", name: "日志分析", description: "分析系统异常日志", status: "failed", priority: "high", progress: 45, agent: "Agent-F", createdAt: "2026-06-15 06:00", estimated: "已失败", tags: ["日志", "分析"] },
  { id: "t7", name: "备份同步", description: "全量备份到远程存储", status: "pending", priority: "medium", progress: 0, agent: "Agent-G", createdAt: "2026-06-15 12:00", estimated: "3小时", tags: ["备份", "存储"] },
  { id: "t8", name: "负载测试", description: "对网关进行压力测试", status: "running", priority: "low", progress: 80, agent: "Agent-H", createdAt: "2026-06-15 09:30", estimated: "2小时", tags: ["测试", "性能"] },
  { id: "t9", name: "索引更新", description: "更新知识库向量索引", status: "completed", priority: "low", progress: 100, agent: "Agent-I", createdAt: "2026-06-15 05:00", estimated: "已完成", tags: ["索引", "知识库"] },
  { id: "t10", name: "配置检查", description: "检查所有平台配置一致性", status: "pending", priority: "medium", progress: 0, agent: "Agent-J", createdAt: "2026-06-15 13:00", estimated: "1小时", tags: ["配置", "检查"] },
  { id: "t11", name: "安全扫描", description: "扫描依赖安全漏洞", status: "failed", priority: "high", progress: 20, agent: "Agent-K", createdAt: "2026-06-15 04:00", estimated: "已失败", tags: ["安全", "扫描"] },
  { id: "t12", name: "数据迁移", description: "迁移旧版本数据到新架构", status: "cancelled", priority: "medium", progress: 60, agent: "Agent-L", createdAt: "2026-06-15 03:00", estimated: "已取消", tags: ["迁移", "数据"] },
];

/* ------------------------------------------------------------------ */
/*  Status & Priority Config                                           */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: typeof Play; color: string; bg: string; text: string; border: string }
> = {
  running: { label: "进行中", icon: Play, color: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  pending: { label: "待处理", icon: Pause, color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  completed: { label: "已完成", icon: CheckCircle, color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  failed: { label: "失败", icon: AlertTriangle, color: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  cancelled: { label: "已取消", icon: XCircle, color: "bg-slate-500", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

const priorityConfig: Record<TaskPriority, { border: string; bg: string; text: string }> = {
  high: { border: "border-rose-300", bg: "bg-rose-50", text: "text-rose-700" },
  medium: { border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-700" },
  low: { border: "border-emerald-300", bg: "bg-emerald-50", text: "text-emerald-700" },
};

const priorityLabel: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const boardColumns: { status: TaskStatus | TaskStatus[]; title: string; headerColor: string }[] = [
  { status: "pending", title: "待处理", headerColor: "bg-amber-500" },
  { status: "running", title: "进行中", headerColor: "bg-blue-500" },
  { status: "completed", title: "已完成", headerColor: "bg-emerald-500" },
  { status: ["failed", "cancelled"], title: "失败 / 取消", headerColor: "bg-rose-500" },
];

const filterOptions: { value: "all" | TaskStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "running", label: "进行中" },
  { value: "pending", label: "待处理" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
];

/* ------------------------------------------------------------------ */
/*  Sub Components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {priorityLabel[priority]}
    </span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const colorClass =
    progress === 100
      ? "bg-emerald-500"
      : progress >= 70
      ? "bg-blue-500"
      : progress >= 40
      ? "bg-amber-500"
      : "bg-rose-500";
  return (
    <div className="w-full">
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-300`} style={{ width: `${progress}%` }} />
      </div>
      <div className="text-right mt-0.5">
        <span className="text-[10px] text-slate-400">{progress}%</span>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const cfg = statusConfig[task.status];
  const pcfg = priorityConfig[task.priority];
  return (
    <div className={`bg-white rounded-xl border ${pcfg.border} p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-grab active:cursor-grabbing`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">{task.name}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>

      <div className="mb-3">
        <StatusBadge status={task.status} />
      </div>

      <div className="mb-3">
        <ProgressBar progress={task.progress} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
        <User className="w-3 h-3" />
        <span>{task.agent}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {task.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
            <Tag className="w-2.5 h-2.5 mr-0.5" />
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <Clock className="w-3 h-3" />
        <span>{task.createdAt}</span>
      </div>
    </div>
  );
}

function BoardView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {boardColumns.map((col) => {
        const columnTasks = tasks.filter((t) =>
          Array.isArray(col.status) ? col.status.includes(t.status) : t.status === col.status
        );
        const StatusIcon =
          col.status === "pending"
            ? Pause
            : col.status === "running"
            ? Play
            : col.status === "completed"
            ? CheckCircle
            : AlertTriangle;
        return (
          <div key={col.title} className="min-w-[280px] flex-1 flex flex-col">
            <div className={`${col.headerColor} text-white rounded-t-xl px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-semibold">{col.title}</span>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
            </div>
            <div className="bg-slate-50 rounded-b-xl border border-slate-200 border-t-0 p-3 flex-1 flex flex-col gap-3 min-h-[200px]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">暂无任务</div>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onDelete }: { tasks: Task[]; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">任务名</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">状态</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">优先级</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">进度</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">负责人</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">标签</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">创建时间</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{task.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{task.description}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-4 py-3">
                  <div className="w-24">
                    <ProgressBar progress={task.progress} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <User className="w-3 h-3 text-slate-400" />
                    {task.agent}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{task.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {task.status === "running" || task.status === "pending" ? (
                      <button className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="取消">
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => onDelete(task.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">暂无任务</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [view, setView] = useState<ViewMode>("board");

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.agent.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === "all" || t.status === filter;
    return matchSearch && matchFilter;
  });

  const allCount = tasks.length;
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const failedCount = tasks.filter((t) => t.status === "failed" || t.status === "cancelled").length;

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="任务管理" subtitle="看板与列表双视图管理任务" />

      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="全部任务" value={allCount} change={0} icon={ClipboardList} color="bg-slate-500" />
          <StatsCard title="进行中" value={runningCount} change={0} icon={Play} color="bg-blue-500" />
          <StatsCard title="已完成" value={completedCount} change={0} icon={CheckCircle} color="bg-emerald-500" />
          <StatsCard title="失败/异常" value={failedCount} change={0} icon={AlertTriangle} color="bg-rose-500" />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索任务、描述、负责人或标签..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === opt.value
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* View Toggle + Create */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setView("board")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === "board" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  看板
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Rows className="w-3.5 h-3.5" />
                  列表
                </button>
              </div>

              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
                <Plus className="w-4 h-4" />
                新建任务
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "board" ? (
          <BoardView tasks={filteredTasks} />
        ) : (
          <ListView tasks={filteredTasks} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
