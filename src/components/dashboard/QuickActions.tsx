"use client";

import { Plus, Play, FileText, Settings, Terminal, RefreshCw } from "lucide-react";

const actions = [
  { icon: Plus, label: "新建 Agent", color: "bg-blue-500 hover:bg-blue-600" },
  { icon: Play, label: "启动任务", color: "bg-emerald-500 hover:bg-emerald-600" },
  { icon: FileText, label: "查看日志", color: "bg-violet-500 hover:bg-violet-600" },
  { icon: Settings, label: "系统配置", color: "bg-slate-500 hover:bg-slate-600" },
  { icon: Terminal, label: "命令面板", color: "bg-orange-500 hover:bg-orange-600" },
  { icon: RefreshCw, label: "刷新状态", color: "bg-cyan-500 hover:bg-cyan-600" },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">快速操作</h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95 ${action.color}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
