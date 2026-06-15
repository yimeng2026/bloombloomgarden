"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  ClipboardList,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { ProviderStatus } from "@/components/dashboard/ProviderStatus";
import { ResourceUsage } from "@/components/dashboard/ResourceUsage";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="仪表盘"
        subtitle={`系统概览与实时监控 · ${currentTime.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}`}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Agent 总数"
              value="42"
              change={12.5}
              icon={Users}
              color="bg-blue-500"
            />
            <StatsCard
              title="在线数量"
              value="38"
              change={8.3}
              icon={Activity}
              color="bg-emerald-500"
            />
            <StatsCard
              title="今日任务"
              value="156"
              change={-3.2}
              icon={ClipboardList}
              color="bg-violet-500"
            />
            <StatsCard
              title="API 调用"
              value="28.4K"
              change={23.7}
              icon={Zap}
              color="bg-amber-500"
            />
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityFeed />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <HealthScore />
            <ProviderStatus />
            <ResourceUsage />
          </div>
        </div>
      </div>
    </div>
  );
}
