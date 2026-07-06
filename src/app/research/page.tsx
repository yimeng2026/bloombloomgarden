"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  modules, recentActivities, totalModules, totalSorry, zeroSorryCount,
  totalTheorems, totalPapers, categoryProgress, zeroSorryModules, categories,
  type SylvaModule, type Activity
} from "./data";

// ==================== 辅助组件 ====================

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-5 text-white shadow-lg`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function CategoryProgressBar({ category, complete, total }: { category: string; complete: number; total: number }) {
  const pct = Math.round((complete / total) * 100);
  const colors: Record<string, string> = {
    "集合论/逻辑": "bg-violet-500",
    "代数": "bg-blue-500",
    "数论": "bg-amber-500",
    "分析/PDE": "bg-emerald-500",
    "拓扑": "bg-rose-500",
    "几何": "bg-cyan-500",
    "物理": "bg-indigo-500",
  };
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-20 text-xs text-gray-600 font-medium shrink-0">{category}</div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[category] || "bg-gray-400"} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-xs text-gray-500 text-right shrink-0">{complete}/{total}</div>
      <div className="w-10 text-xs font-bold text-gray-700 text-right shrink-0">{pct}%</div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const typeIcons: Record<string, string> = {
    theorem_proven: "🎯",
    sorry_closed: "🔧",
    module_complete: "✅",
    paper_linked: "🔗",
    definition_added: "📐",
  };
  const typeLabels: Record<string, string> = {
    theorem_proven: "定理证明",
    sorry_closed: "Sorry 关闭",
    module_complete: "模块完成",
    paper_linked: "论文关联",
    definition_added: "定义添加",
  };
  const typeColors: Record<string, string> = {
    theorem_proven: "bg-amber-50 text-amber-700 border-amber-200",
    sorry_closed: "bg-blue-50 text-blue-700 border-blue-200",
    module_complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paper_linked: "bg-violet-50 text-violet-700 border-violet-200",
    definition_added: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition">
      <div className="text-lg shrink-0">{typeIcons[activity.type] || "📋"}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800">{activity.message}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${typeColors[activity.type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{typeLabels[activity.type] || activity.type}</span>
          {activity.module && <span className="text-xs text-gray-400">{activity.module}</span>}
          {activity.paper && <span className="text-xs text-gray-400">{activity.paper}</span>}
        </div>
      </div>
      <div className="text-xs text-gray-400 shrink-0">{new Date(activity.timestamp).toLocaleDateString("zh-CN")}</div>
    </div>
  );
}

function ZeroSorryCard({ module }: { module: SylvaModule }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60 transition">
      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{module.name}</div>
        <div className="text-xs text-gray-500">{module.category} · {module.lines.toLocaleString()} 行</div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">零 sorry</span>
    </div>
  );
}

// ==================== 主页面 ====================

export default function ResearchDashboard() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredZeroSorry = useMemo(() => {
    if (categoryFilter === "all") return zeroSorryModules;
    return zeroSorryModules.filter(m => m.category === categoryFilter);
  }, [categoryFilter]);

  const overallProgress = useMemo(() => {
    const total = modules.length;
    const complete = modules.filter(m => m.status === "complete").length;
    return Math.round((complete / total) * 100);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎓 学术研究仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">SYLVA · 形式化数学研究平台</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium border border-violet-200">
          <span className="text-base">🔬</span>
          <span>TOE-SYLVA 真实数据</span>
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="模块总数" value={totalModules} icon="📦" color="from-violet-500 to-purple-400" />
        <StatCard label="Sorry 总数" value={totalSorry} icon="🔧" color="from-amber-500 to-orange-400" />
        <StatCard label="定理数" value={totalTheorems} icon="🎯" color="from-blue-500 to-cyan-400" />
        <StatCard label="论文数" value={totalPapers} icon="📄" color="from-emerald-500 to-teal-400" />
        <StatCard label="零 sorry 模块" value={zeroSorryCount} icon="✅" color="from-rose-500 to-pink-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 进度图表 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700">📊 按学科完成度</h2>
            <span className="text-sm text-gray-500">总进度: <span className="font-bold text-violet-600">{overallProgress}%</span></span>
          </div>
          <div className="mb-4">
            {categoryProgress.map(cp => (
              <CategoryProgressBar key={cp.category} category={cp.category} complete={cp.complete} total={cp.total} />
            ))}
          </div>
          <div className="h-px bg-gray-100 my-4" />
          <div className="grid grid-cols-2 gap-3">
            {categoryProgress.map(cp => {
              const pct = Math.round((cp.complete / cp.total) * 100);
              return (
                <div key={cp.category} className="text-center p-3 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-gray-700">{cp.complete}/{cp.total}</div>
                  <div className="text-xs text-gray-500">{cp.category}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-4">🕐 最近活动</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentActivities.map(act => (
              <ActivityItem key={act.id} activity={act} />
            ))}
          </div>
        </div>
      </div>

      {/* 零 sorry 模块高亮 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-700">🌟 零 sorry 模块（{zeroSorryCount} 个）</h2>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              <option value="all">全部学科</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Link href="/research/modules" className="text-sm px-3 py-1.5 bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition">
              查看全部模块 →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredZeroSorry.map(m => (
            <ZeroSorryCard key={m.id} module={m} />
          ))}
        </div>
      </div>

      {/* 快速入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/research/modules" className="bg-gradient-to-br from-violet-500 to-purple-400 rounded-xl p-5 text-white hover:shadow-lg transition hover:scale-105">
          <div className="text-2xl mb-2">📦</div>
          <div className="font-bold">模块浏览器</div>
          <div className="text-xs opacity-80 mt-1">浏览 {totalModules} 个 SYLVA 模块</div>
        </Link>
        <Link href="/research/papers" className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl p-5 text-white hover:shadow-lg transition hover:scale-105">
          <div className="text-2xl mb-2">📄</div>
          <div className="font-bold">论文与定理</div>
          <div className="text-xs opacity-80 mt-1">{totalPapers} 篇经典论文</div>
        </Link>
        <Link href="/research/verification" className="bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl p-5 text-white hover:shadow-lg transition hover:scale-105">
          <div className="text-2xl mb-2">✅</div>
          <div className="font-bold">形式化验证</div>
          <div className="text-xs opacity-80 mt-1">追踪 {totalSorry} 个 sorry</div>
        </Link>
        <Link href="/research/workspace" className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl p-5 text-white hover:shadow-lg transition hover:scale-105">
          <div className="text-2xl mb-2">📝</div>
          <div className="font-bold">研究协作</div>
          <div className="text-xs opacity-80 mt-1">笔记与工作区</div>
        </Link>
      </div>
    </div>
  );
}
