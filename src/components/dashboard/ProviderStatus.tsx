"use client";

import { Database, TrendingUp } from "lucide-react";

interface Provider {
  name: string;
  status: "online" | "degraded" | "offline";
  latency: number;
  requests: number;
}

const providers: Provider[] = [
  { name: "OpenAI", status: "online", latency: 234, requests: 12453 },
  { name: "Moonshot", status: "online", latency: 156, requests: 8932 },
  { name: "Claude", status: "degraded", latency: 890, requests: 5671 },
  { name: "Ollama", status: "online", latency: 45, requests: 3421 },
  { name: "DeepSeek", status: "offline", latency: 0, requests: 0 },
];

const statusConfig = {
  online: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "在线" },
  degraded: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700", label: "降级" },
  offline: { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700", label: "离线" },
};

export function ProviderStatus() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Provider 状态</h2>
        </div>
        <TrendingUp className="w-4 h-4 text-slate-400" />
      </div>
      <div className="p-5">
        <div className="space-y-4">
          {providers.map((provider) => {
            const cfg = statusConfig[provider.status];
            return (
              <div key={provider.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{provider.name}</p>
                    <p className="text-xs text-slate-400">
                      {provider.status !== "offline" ? `${provider.latency}ms` : "不可用"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {provider.requests.toLocaleString()} 请求
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
