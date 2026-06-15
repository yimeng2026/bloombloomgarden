"use client";

import { Shield } from "lucide-react";

export function HealthScore({ score = 92 }: { score?: number }) {
  const circumference = 2 * Math.PI * 56;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">系统健康度</h2>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-100"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  score >= 80
                    ? "text-emerald-500"
                    : score >= 60
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{score}</span>
              <span className="text-xs text-slate-400">健康分</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">系统状态</span>
            <span className="font-medium text-emerald-500">良好</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">最后检查</span>
            <span className="text-slate-700">刚刚</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">运行时间</span>
            <span className="text-slate-700">14天 6小时</span>
          </div>
        </div>
      </div>
    </div>
  );
}
