"use client";

import { Server, Cpu, MemoryStick, HardDrive, Globe } from "lucide-react";

const resources = [
  { label: "CPU", value: 45, icon: Cpu, color: "bg-blue-500" },
  { label: "内存", value: 62, icon: MemoryStick, color: "bg-violet-500" },
  { label: "存储", value: 38, icon: HardDrive, color: "bg-emerald-500" },
  { label: "网络", value: 71, icon: Globe, color: "bg-amber-500" },
];

export function ResourceUsage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">资源使用</h2>
        </div>
      </div>
      <div className="p-5">
        <div className="space-y-5">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <div key={resource.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{resource.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{resource.value}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${resource.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${resource.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-xs text-slate-500">活跃节点</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">3.2GB</p>
              <p className="text-xs text-slate-500">内存使用</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
