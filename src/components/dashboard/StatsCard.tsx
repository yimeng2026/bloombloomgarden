"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  color: string;
}

export function StatsCard({ title, value, change, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <div className="flex items-center mt-2 gap-1">
            {change >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span
              className={`text-xs font-medium ${
                change >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-slate-400">较昨日</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
