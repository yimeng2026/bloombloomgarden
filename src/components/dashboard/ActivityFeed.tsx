"use client";

import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  ClipboardList,
  Zap,
  Server,
  ChevronRight,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "agent" | "task" | "system" | "api";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "pending";
}

const activities: ActivityItem[] = [
  { id: "1", type: "agent", title: "Agent 上线", description: "ResearchAgent-07 已连接", timestamp: "2分钟前", status: "success" },
  { id: "2", type: "task", title: "任务完成", description: "代码审查任务 #2841 已完成", timestamp: "15分钟前", status: "success" },
  { id: "3", type: "api", title: "API 调用", description: "/api/v1/agents/deploy 被调用 128 次", timestamp: "32分钟前", status: "warning" },
  { id: "4", type: "system", title: "系统更新", description: "Provider OpenAI 配置已更新", timestamp: "1小时前", status: "success" },
  { id: "5", type: "agent", title: "Agent 离线", description: "DataProcessor-03 连接超时", timestamp: "2小时前", status: "error" },
  { id: "6", type: "task", title: "任务创建", description: "新任务 \"文档生成\" 已创建", timestamp: "3小时前", status: "pending" },
];

const iconMap = {
  agent: Users,
  task: ClipboardList,
  api: Zap,
  system: Server,
};

const statusIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  pending: Clock,
};

const statusColor = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-rose-500",
  pending: "text-slate-400",
};

const typeColor = {
  agent: "bg-blue-50 text-blue-600",
  task: "bg-violet-50 text-violet-600",
  api: "bg-amber-50 text-amber-600",
  system: "bg-emerald-50 text-emerald-600",
};

export function ActivityFeed() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">最近活动</h2>
        </div>
        <button className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          查看全部
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="p-5">
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = iconMap[activity.type];
              const StatusIcon = statusIcon[activity.status];
              return (
                <div key={activity.id} className="relative flex items-start gap-4">
                  <div className={`relative z-10 p-2 rounded-full ${typeColor[activity.type]}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusColor[activity.status]}`} />
                        <span className="text-xs text-slate-400">{activity.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
