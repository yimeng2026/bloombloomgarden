"use client";

import { useState, useMemo } from "react";
import {
  modules, categories, type SylvaModule
} from "../data";

// ==================== 辅助组件 ====================

function StatusBadge({ sorryCount }: { sorryCount: number }) {
  if (sorryCount === 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✅ 零 sorry</span>;
  }
  if (sorryCount <= 3) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">⚠️ {sorryCount} sorry</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">🔴 {sorryCount} sorry</span>;
}

function ModuleDetailModal({ module, onClose }: { module: SylvaModule; onClose: () => void }) {
  const relatedModules = useMemo(() => {
    return modules.filter(m => module.dependencies.includes(m.id));
  }, [module]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{module.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{module.path}</p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge sorryCount={module.sorryCount} />
            <span className="text-xs text-gray-500">{module.lines.toLocaleString()} 行</span>
            <span className="text-xs text-gray-500">{module.category}</span>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">🎯 定理列表（{module.theorems.length}）</h3>
            <div className="flex flex-wrap gap-2">
              {module.theorems.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">📐 定义列表（{module.definitions.length}）</h3>
            <div className="flex flex-wrap gap-2">
              {module.definitions.map(d => (
                <span key={d} className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">{d}</span>
              ))}
            </div>
          </div>

          {module.dependencies.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 依赖模块</h3>
              <div className="space-y-2">
                {relatedModules.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.path}</span>
                    <StatusBadge sorryCount={m.sorryCount} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500 font-mono">
            <div className="font-bold text-gray-700 mb-1">lakefile.lean 引用</div>
            <div>require &quot;{module.path.split("/")[0].toLowerCase()}&quot; from &quot;{module.path}&quot;</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function ModulesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<SylvaModule | null>(null);

  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchSearch = search === "" || m.name.toLowerCase().includes(search.toLowerCase()) || m.path.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchStatus = statusFilter === "all" ||
        (statusFilter === "complete" && m.status === "complete") ||
        (statusFilter === "incomplete" && m.status === "incomplete") ||
        (statusFilter === "zero" && m.sorryCount === 0) ||
        (statusFilter === "has-sorry" && m.sorryCount > 0);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [search, categoryFilter, statusFilter]);

  const groupedModules = useMemo(() => {
    const groups: Record<string, SylvaModule[]> = {};
    filteredModules.forEach(m => {
      const cat = m.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [filteredModules]);

  const totalLines = useMemo(() => filteredModules.reduce((s, m) => s + m.lines, 0), [filteredModules]);
  const totalFilteredSorry = useMemo(() => filteredModules.reduce((s, m) => s + m.sorryCount, 0), [filteredModules]);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 SYLVA 模块浏览器</h1>
          <p className="text-sm text-gray-500 mt-1">浏览、搜索和筛选 TOE-SYLVA 形式化模块</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索模块名称或路径..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="all">全部学科</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="all">全部状态</option>
            <option value="complete">✅ 完成</option>
            <option value="incomplete">🔴 未完成</option>
            <option value="zero">🌟 零 sorry</option>
            <option value="has-sorry">⚠️ 有 sorry</option>
          </select>
          <div className="text-sm text-gray-500">
            显示 {filteredModules.length} 个模块
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>📊 总代码行: {totalLines.toLocaleString()}</span>
          <span>🔧 Sorry 总数: {totalFilteredSorry}</span>
          <span>🎯 定理总数: {filteredModules.reduce((s, m) => s + m.theorems.length, 0)}</span>
          <span>📐 定义总数: {filteredModules.reduce((s, m) => s + m.definitions.length, 0)}</span>
        </div>
      </div>

      {/* 模块树形列表 */}
      <div className="space-y-6">
        {Object.keys(groupedModules).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-sm">没有匹配的模块</div>
            <div className="text-xs mt-1">尝试调整筛选条件</div>
          </div>
        )}
        {Object.entries(groupedModules).map(([category, catModules]) => (
          <div key={category} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-700">{category}</h2>
              <span className="text-xs text-gray-500">{catModules.length} 个模块</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catModules.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModule(m)}
                  className="text-left p-4 rounded-lg border border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-800">{m.name}</span>
                    <StatusBadge sorryCount={m.sorryCount} />
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{m.path}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{m.lines.toLocaleString()} 行</span>
                    <span>{m.theorems.length} 定理</span>
                    <span>{m.definitions.length} 定义</span>
                    {m.dependencies.length > 0 && <span>🔗 {m.dependencies.length} 依赖</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 详情弹窗 */}
      {selectedModule && <ModuleDetailModal module={selectedModule} onClose={() => setSelectedModule(null)} />}
    </div>
  );
}
