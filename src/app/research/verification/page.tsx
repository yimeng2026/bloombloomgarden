"use client";

import { useMemo } from "react";
import {
  modules, verificationStats, type VerificationStats
} from "../data";

// ==================== 辅助组件 ====================

function PieSlice({ startAngle, endAngle, color, label }: { startAngle: number; endAngle: number; color: string; label: string }) {
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);
  const r = 80;
  const x1 = 100 + r * Math.cos(startRad);
  const y1 = 100 + r * Math.sin(startRad);
  const x2 = 100 + r * Math.cos(endRad);
  const y2 = 100 + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const path = `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

  return <path d={path} fill={color} stroke="white" strokeWidth={2} className="hover:opacity-80 transition-opacity" />;
}

function BarChart({ data, max }: { data: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-20 text-xs text-gray-600 shrink-0">{d.label}</div>
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }} />
          </div>
          <div className="w-8 text-xs font-medium text-gray-700 text-right shrink-0">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ stats }: { stats: VerificationStats[] }) {
  const total = stats.reduce((s, d) => s + d.sorryCount, 0);
  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-40 h-40">
        {stats.map((d, i) => {
          const angle = (d.sorryCount / total) * 360;
          const slice = (
            <PieSlice
              key={d.category}
              startAngle={currentAngle}
              endAngle={currentAngle + angle}
              color={d.color}
              label={`${d.category}: ${d.sorryCount}`}
            />
          );
          currentAngle += angle;
          return slice;
        })}
        <circle cx="100" cy="100" r="35" fill="white" />
        <text x="100" y="95" textAnchor="middle" className="text-xs font-bold fill-gray-700">{total}</text>
        <text x="100" y="110" textAnchor="middle" className="text-[8px] fill-gray-500">Total sorry</text>
      </svg>
      <div className="space-y-2">
        {stats.map(d => (
          <div key={d.category} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-600">{d.category}: {d.sorryCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function VerificationPage() {
  const zeroSorryCount = useMemo(() => modules.filter(m => m.sorryCount === 0).length, []);
  const hasSorryCount = useMemo(() => modules.filter(m => m.sorryCount > 0).length, []);
  const totalSorry = useMemo(() => modules.reduce((s, m) => s + m.sorryCount, 0), []);

  const theoremStatus = useMemo(() => {
    const proven = modules.reduce((s, m) => s + m.theorems.length, 0);
    // 简化的假设：每个 sorry 对应一个未完成的定理
    const researching = totalSorry;
    const axioms = modules.reduce((s, m) => s + m.definitions.length, 0);
    return { proven, researching, axioms };
  }, [totalSorry]);

  const maxSorry = Math.max(...verificationStats.map(s => s.sorryCount));

  const categorySorry = useMemo(() => {
    const map: Record<string, number> = {};
    modules.forEach(m => {
      map[m.category] = (map[m.category] || 0) + m.sorryCount;
    });
    const colors = ["#8b5cf6", "#3b82f6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4", "#6366f1"];
    return Object.entries(map).map(([cat, count], i) => ({
      label: cat,
      value: count,
      color: colors[i % colors.length]
    }));
  }, []);

  const maxCatSorry = Math.max(...categorySorry.map(c => c.value));

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">✅ 形式化验证中心</h1>
          <p className="text-sm text-gray-500 mt-1">Zero Sorry 追踪与构建状态</p>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
          <div className="text-3xl font-bold text-emerald-700">{zeroSorryCount}</div>
          <div className="text-sm text-emerald-600 mt-1">零 sorry 模块</div>
          <div className="text-xs text-emerald-500 mt-1">{Math.round((zeroSorryCount / modules.length) * 100)}% 完成</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <div className="text-3xl font-bold text-amber-700">{hasSorryCount}</div>
          <div className="text-sm text-amber-600 mt-1">有 sorry 模块</div>
          <div className="text-xs text-amber-500 mt-1">{totalSorry} 个 sorry 待填</div>
        </div>
        <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
          <div className="text-3xl font-bold text-violet-700">{theoremStatus.proven}</div>
          <div className="text-sm text-violet-600 mt-1">已证明定理</div>
          <div className="text-xs text-violet-500 mt-1">分布在 {modules.length} 个模块</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
          <div className="text-3xl font-bold text-blue-700">{theoremStatus.axioms}</div>
          <div className="text-sm text-blue-600 mt-1">公理/定义</div>
          <div className="text-xs text-blue-500 mt-1">形式化基础</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sorry 分布饼图 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-4">🥧 Sorry 分布（按来源）</h2>
          <PieChart stats={verificationStats} />
          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-600">
            <div className="font-medium text-gray-700 mb-1">来源说明</div>
            <div>archive: 已归档的遗留 sorry（118）</div>
            <div>mathlib4: 依赖 mathlib4 的未同步改动（5）</div>
            <div>research: 活跃研究中的未证明命题（95）</div>
            <div>tutorial: 教学文档中的占位（15）</div>
            <div>legacy: 旧代码库中的遗留（26）</div>
          </div>
        </div>

        {/* 按学科 sorry 统计 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-4">📊 按学科 sorry 统计</h2>
          <BarChart data={categorySorry} max={maxCatSorry} />
        </div>
      </div>

      {/* 定理状态分布 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🎯 定理状态分布</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-700">{theoremStatus.proven}</div>
            <div className="text-sm text-emerald-600">已证明定理</div>
            <div className="text-xs text-emerald-500 mt-1">已完成形式化证明</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-2xl font-bold text-amber-700">{theoremStatus.researching}</div>
            <div className="text-sm text-amber-600">研究中 / 待证明</div>
            <div className="text-xs text-amber-500 mt-1">对应 {totalSorry} 个 sorry</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{theoremStatus.axioms}</div>
            <div className="text-sm text-blue-600">公理 / 定义</div>
            <div className="text-xs text-blue-500 mt-1">作为证明基础</div>
          </div>
        </div>
      </div>

      {/* Git 同步状态 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🔄 Git 同步状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/50">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm text-gray-800">TOE-SYLVA 主仓库</div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✅ 同步</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Branch: main</div>
              <div>Commit: a7f3c21e "形式化 Cardinal-Arithmetic 部分定理"</div>
              <div>Last sync: 2025-06-17 14:30</div>
              <div>Modules: {modules.length} | Theorems: {theoremStatus.proven} | Sorry: {totalSorry}</div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm text-gray-800">PFE (Proof Formulation Engine)</div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">⚠️ 部分同步</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Branch: develop</div>
              <div>Commit: e9d4a8f2 "集成 LLM 证明建议接口"</div>
              <div>Last sync: 2025-06-16 22:00</div>
              <div>Status: 3 个模块未同步（PFE 侧修改冲突）</div>
            </div>
          </div>
        </div>
      </div>

      {/* 构建状态 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🏗️ 构建状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="font-bold text-sm text-gray-800">lake build</div>
            </div>
            <div className="text-xs text-gray-500">构建成功</div>
            <div className="text-xs text-gray-500">Duration: 3m 42s</div>
            <div className="text-xs text-gray-500">Warnings: 0</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="font-bold text-sm text-gray-800">lake test</div>
            </div>
            <div className="text-xs text-gray-500">全部通过</div>
            <div className="text-xs text-gray-500">Tests: 142 passed</div>
            <div className="text-xs text-gray-500">Duration: 1m 15s</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <div className="font-bold text-sm text-gray-800">lake lint</div>
            </div>
            <div className="text-xs text-gray-500">部分通过</div>
            <div className="text-xs text-gray-500">Lint errors: 7</div>
            <div className="text-xs text-gray-500">Style warnings: 23</div>
          </div>
        </div>
      </div>
    </div>
  );
}
