"use client";

import { useState, useMemo } from "react";
import {
  papers, modules, categories, type Paper
} from "../data";

// ==================== 辅助组件 ====================

const statusConfig: Record<string, { label: string; color: string; badge: string }> = {
  solved: { label: "✅ 已解决", color: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  open: { label: "🔴 未解决", color: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  partial: { label: "⚠️ 部分解决", color: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  research: { label: "🔬 研究中", color: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
};

const fieldColors: Record<string, string> = {
  "集合论/逻辑": "bg-violet-50 text-violet-700",
  "代数": "bg-blue-50 text-blue-700",
  "数论": "bg-amber-50 text-amber-700",
  "分析/PDE": "bg-emerald-50 text-emerald-700",
  "拓扑": "bg-rose-50 text-rose-700",
  "几何": "bg-cyan-50 text-cyan-700",
  "物理": "bg-indigo-50 text-indigo-700",
};

function PaperDetailModal({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const relatedMods = useMemo(() => modules.filter(m => paper.relatedModules.includes(m.id)), [paper]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{paper.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{paper.author} · {paper.year}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[paper.status].badge}`}>{statusConfig[paper.status].label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fieldColors[paper.field] || "bg-gray-100 text-gray-700"}`}>{paper.field}</span>
            <span className="text-xs text-gray-500">{paper.leanSnippets} 个 Lean 代码片段</span>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">📝 摘要</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{paper.abstract}</p>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">📅 历史里程碑</h3>
            <div className="space-y-2">
              {paper.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-bold text-gray-700 shrink-0">{m.year}</div>
                  <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  <div className="text-sm text-gray-600">{m.event}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">🔬 SYLVA 研究进展</h3>
            <p className="text-sm text-gray-600">{paper.sylvaStatus}</p>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">💻 Lean 代码预览</h3>
            <div className="p-3 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
              <div className="text-gray-500">-- {paper.title} 形式化框架</div>
              <div className="mt-1">namespace {paper.id.replace(/-/g, "_")}</div>
              <div className="mt-1">open Classical</div>
              <div className="mt-1">variable (α : Type*)</div>
              <div className="mt-2">theorem {paper.id.replace(/-/g, "_")}_main :</div>
              <div className="ml-4">∀ (h : Hypothesis), Conclusion h := by</div>
              <div className="ml-4">intro h</div>
              <div className="ml-4">-- sorry: 形式化证明进行中</div>
              <div className="ml-4 text-amber-400">sorry</div>
            </div>
          </div>

          {relatedMods.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 关联模块</h3>
              <div className="flex flex-wrap gap-2">
                {relatedMods.map(m => (
                  <span key={m.id} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{m.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function PapersPage() {
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const filteredPapers = useMemo(() => {
    return papers.filter(p => {
      const matchSearch = search === "" || p.title.toLowerCase().includes(search.toLowerCase()) || p.abstract.toLowerCase().includes(search.toLowerCase());
      const matchField = fieldFilter === "all" || p.field === fieldFilter;
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchField && matchStatus;
    });
  }, [search, fieldFilter, statusFilter]);

  const hilbertPapers = filteredPapers.filter(p => p.id.startsWith("hil-"));
  const millenniumPapers = filteredPapers.filter(p => p.id.startsWith("mil-"));

  const stats = useMemo(() => ({
    solved: papers.filter(p => p.status === "solved").length,
    open: papers.filter(p => p.status === "open").length,
    partial: papers.filter(p => p.status === "partial").length,
    research: papers.filter(p => p.status === "research").length,
  }), []);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📄 论文与定理库</h1>
          <p className="text-sm text-gray-500 mt-1">希尔伯特 23 问题 + 千禧年 7 难题</p>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-700">{stats.solved}</div>
          <div className="text-xs text-emerald-600">已解决</div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <div className="text-2xl font-bold text-rose-700">{stats.open}</div>
          <div className="text-xs text-rose-600">未解决</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="text-2xl font-bold text-amber-700">{stats.partial}</div>
          <div className="text-xs text-amber-600">部分解决</div>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="text-2xl font-bold text-violet-700">{stats.research}</div>
          <div className="text-xs text-violet-600">研究中</div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索论文标题或摘要..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <select
            value={fieldFilter}
            onChange={e => setFieldFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="all">全部领域</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="all">全部状态</option>
            <option value="solved">✅ 已解决</option>
            <option value="open">🔴 未解决</option>
            <option value="partial">⚠️ 部分解决</option>
            <option value="research">🔬 研究中</option>
          </select>
          <div className="text-sm text-gray-500">
            显示 {filteredPapers.length} 篇论文
          </div>
        </div>
      </div>

      {/* 希尔伯特问题 */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🏛️ 希尔伯特 23 问题</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hilbertPapers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPaper(p)}
              className="text-left bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-sm text-gray-800 pr-2">{p.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusConfig[p.status].badge}`}>{statusConfig[p.status].label}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{p.author} · {p.year}</p>
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">{p.abstract}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fieldColors[p.field] || "bg-gray-100 text-gray-700"}`}>{p.field}</span>
                <span className="text-xs text-gray-400">{p.leanSnippets} Lean 片段</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 千禧年难题 */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🌟 千禧年 7 大难题</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {millenniumPapers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPaper(p)}
              className="text-left bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-sm text-gray-800 pr-2">{p.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusConfig[p.status].badge}`}>{statusConfig[p.status].label}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{p.author} · {p.year}</p>
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">{p.abstract}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fieldColors[p.field] || "bg-gray-100 text-gray-700"}`}>{p.field}</span>
                <span className="text-xs text-gray-400">{p.leanSnippets} Lean 片段</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedPaper && <PaperDetailModal paper={selectedPaper} onClose={() => setSelectedPaper(null)} />}
    </div>
  );
}
