"use client";

import { useState, useEffect } from "react";
import {
  Database,
  FileText,
  CheckCircle,
  RefreshCw,
  Search,
  Grid3X3,
  List,
  Plus,
  FileCode,
  Table,
  Image,
  File,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Circle,
  XCircle,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: string;
  docCount: number;
  indexedCount: number;
  totalCount: number;
  tags: string[];
  lastUpdated: string;
  status: "synced" | "syncing" | "error";
}

interface DocItem {
  id: string;
  name: string;
  type: "pdf" | "markdown" | "excel" | "image" | "other";
  size: string;
  chunks: number;
  status: "indexed" | "indexing" | "pending" | "error";
  modifiedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const knowledgeBases: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "技术文档库",
    description: "API文档、开发规范、代码库说明和架构设计文档",
    type: "technical",
    docCount: 156,
    indexedCount: 156,
    totalCount: 156,
    tags: ["API", "开发", "架构"],
    lastUpdated: "2小时前",
    status: "synced",
  },
  {
    id: "kb-2",
    name: "产品知识库",
    description: "产品功能说明、用户手册、FAQ和竞品分析",
    type: "business",
    docCount: 89,
    indexedCount: 89,
    totalCount: 89,
    tags: ["产品", "用户", "FAQ"],
    lastUpdated: "1天前",
    status: "synced",
  },
  {
    id: "kb-3",
    name: "通用知识",
    description: "通用常识、百科知识和多语言翻译参考",
    type: "general",
    docCount: 234,
    indexedCount: 229,
    totalCount: 234,
    tags: ["百科", "翻译", "常识"],
    lastUpdated: "3小时前",
    status: "syncing",
  },
  {
    id: "kb-4",
    name: "内部数据",
    description: "公司内部文档、会议记录和项目资料",
    type: "private",
    docCount: 67,
    indexedCount: 67,
    totalCount: 67,
    tags: ["内部", "会议", "项目"],
    lastUpdated: "5小时前",
    status: "synced",
  },
  {
    id: "kb-5",
    name: "外部资源",
    description: "第三方 API 文档、开源项目说明和外部参考资料",
    type: "external",
    docCount: 45,
    indexedCount: 42,
    totalCount: 45,
    tags: ["第三方", "开源", "参考"],
    lastUpdated: "1周前",
    status: "error",
  },
  {
    id: "kb-6",
    name: "最佳实践",
    description: "代码规范、设计模式、运维手册和团队约定",
    type: "technical",
    docCount: 78,
    indexedCount: 78,
    totalCount: 78,
    tags: ["规范", "模式", "运维"],
    lastUpdated: "12小时前",
    status: "synced",
  },
];

const mockDocsMap: Record<string, DocItem[]> = {
  "kb-1": [
    { id: "d1", name: "API设计规范v3.pdf", type: "pdf", size: "2.4 MB", chunks: 48, status: "indexed", modifiedAt: "2小时前" },
    { id: "d2", name: "后端架构.md", type: "markdown", size: "156 KB", chunks: 12, status: "indexed", modifiedAt: "3小时前" },
    { id: "d3", name: "数据库设计.xlsx", type: "excel", size: "890 KB", chunks: 24, status: "indexed", modifiedAt: "5小时前" },
    { id: "d4", name: "部署流程.md", type: "markdown", size: "45 KB", chunks: 8, status: "indexing", modifiedAt: "10分钟前" },
    { id: "d5", name: "接口契约.json", type: "other", size: "12 KB", chunks: 2, status: "indexed", modifiedAt: "1天前" },
  ],
  "kb-2": [
    { id: "d6", name: "产品手册v2.pdf", type: "pdf", size: "5.1 MB", chunks: 102, status: "indexed", modifiedAt: "1天前" },
    { id: "d7", name: "FAQ整理.md", type: "markdown", size: "234 KB", chunks: 18, status: "indexed", modifiedAt: "2天前" },
    { id: "d8", name: "竞品分析.xlsx", type: "excel", size: "1.2 MB", chunks: 36, status: "indexed", modifiedAt: "3天前" },
    { id: "d9", name: "用户指南.pdf", type: "pdf", size: "3.8 MB", chunks: 76, status: "indexed", modifiedAt: "1周前" },
    { id: "d10", name: "功能清单.md", type: "markdown", size: "89 KB", chunks: 14, status: "pending", modifiedAt: "1小时前" },
  ],
  "kb-3": [
    { id: "d11", name: "百科词条库.xlsx", type: "excel", size: "4.5 MB", chunks: 90, status: "indexed", modifiedAt: "3小时前" },
    { id: "d12", name: "翻译术语表.md", type: "markdown", size: "567 KB", chunks: 42, status: "indexed", modifiedAt: "5小时前" },
    { id: "d13", name: "常识图谱.json", type: "other", size: "2.1 MB", chunks: 56, status: "indexing", modifiedAt: "20分钟前" },
    { id: "d14", name: "多语言对照.pdf", type: "pdf", size: "6.7 MB", chunks: 134, status: "indexed", modifiedAt: "1天前" },
    { id: "d15", name: "百科插图集", type: "image", size: "12.3 MB", chunks: 0, status: "pending", modifiedAt: "2小时前" },
    { id: "d16", name: "知识更新日志.md", type: "markdown", size: "34 KB", chunks: 6, status: "indexed", modifiedAt: "6小时前" },
  ],
  "kb-4": [
    { id: "d17", name: "会议纪要_0601.pdf", type: "pdf", size: "1.2 MB", chunks: 24, status: "indexed", modifiedAt: "5小时前" },
    { id: "d18", name: "项目排期.xlsx", type: "excel", size: "456 KB", chunks: 18, status: "indexed", modifiedAt: "1天前" },
    { id: "d19", name: "内部规范.md", type: "markdown", size: "123 KB", chunks: 16, status: "indexed", modifiedAt: "2天前" },
    { id: "d20", name: "团队架构.png", type: "image", size: "2.4 MB", chunks: 0, status: "indexed", modifiedAt: "3天前" },
    { id: "d21", name: "周报汇总.md", type: "markdown", size: "78 KB", chunks: 10, status: "indexed", modifiedAt: "1周前" },
  ],
  "kb-5": [
    { id: "d22", name: "Stripe API Docs.pdf", type: "pdf", size: "8.9 MB", chunks: 178, status: "error", modifiedAt: "1周前" },
    { id: "d23", name: "开源协议汇总.md", type: "markdown", size: "345 KB", chunks: 28, status: "indexed", modifiedAt: "2周前" },
    { id: "d24", name: "第三方接入指南.pdf", type: "pdf", size: "3.2 MB", chunks: 64, status: "indexed", modifiedAt: "1周前" },
    { id: "d25", name: "参考资源清单.xlsx", type: "excel", size: "234 KB", chunks: 12, status: "error", modifiedAt: "3天前" },
    { id: "d26", name: "社区贡献规范.md", type: "markdown", size: "67 KB", chunks: 8, status: "pending", modifiedAt: "1天前" },
  ],
  "kb-6": [
    { id: "d27", name: "代码规范v2.md", type: "markdown", size: "234 KB", chunks: 22, status: "indexed", modifiedAt: "12小时前" },
    { id: "d28", name: "设计模式手册.pdf", type: "pdf", size: "4.5 MB", chunks: 90, status: "indexed", modifiedAt: "1天前" },
    { id: "d29", name: "运维手册.xlsx", type: "excel", size: "1.8 MB", chunks: 42, status: "indexed", modifiedAt: "2天前" },
    { id: "d30", name: "团队约定.md", type: "markdown", size: "45 KB", chunks: 6, status: "indexed", modifiedAt: "3天前" },
    { id: "d31", name: "CI/CD流程.png", type: "image", size: "1.2 MB", chunks: 0, status: "indexed", modifiedAt: "5天前" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const typeColorMap: Record<string, string> = {
  technical: "bg-blue-500",
  business: "bg-amber-500",
  general: "bg-emerald-500",
  private: "bg-slate-500",
  external: "bg-violet-500",
  error: "bg-rose-500",
};

const typeLabelMap: Record<string, string> = {
  technical: "技术",
  business: "产品",
  general: "通用",
  private: "内部",
  external: "外部",
};

const typeColorTextMap: Record<string, string> = {
  technical: "text-blue-500",
  business: "text-amber-500",
  general: "text-emerald-500",
  private: "text-slate-500",
  external: "text-violet-500",
};

const typeBgMap: Record<string, string> = {
  technical: "bg-blue-50",
  business: "bg-amber-50",
  general: "bg-emerald-50",
  private: "bg-slate-50",
  external: "bg-violet-50",
};

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  synced: { bg: "bg-emerald-50", text: "text-emerald-700", label: "已同步", dot: "bg-emerald-500" },
  syncing: { bg: "bg-blue-50", text: "text-blue-700", label: "同步中", dot: "bg-blue-500" },
  error: { bg: "bg-rose-50", text: "text-rose-700", label: "错误", dot: "bg-rose-500" },
};

const docTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  markdown: FileCode,
  excel: Table,
  image: Image,
  other: File,
};

const docStatusConfig: Record<string, { icon: React.ElementType; color: string; text: string; label: string }> = {
  indexed: { icon: CheckCircle, color: "text-emerald-500", text: "text-emerald-600", label: "已索引" },
  indexing: { icon: Loader2, color: "text-blue-500", text: "text-blue-600", label: "索引中" },
  pending: { icon: Circle, color: "text-slate-400", text: "text-slate-500", label: "待处理" },
  error: { icon: XCircle, color: "text-rose-500", text: "text-rose-600", label: "错误" },
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function KnowledgePage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [kbs, setKbs] = useState<KnowledgeBase[]>(knowledgeBases);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = (id: string) => {
    setKbs((prev) => prev.filter((k) => k.id !== id));
  };

  const filteredKbs = kbs.filter((kb) => {
    const matchSearch =
      !search ||
      kb.name.toLowerCase().includes(search.toLowerCase()) ||
      kb.description.toLowerCase().includes(search.toLowerCase()) ||
      kb.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || kb.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeFilters = [
    { id: "all", label: "全部" },
    { id: "technical", label: "技术" },
    { id: "business", label: "产品" },
    { id: "general", label: "通用" },
    { id: "private", label: "内部" },
    { id: "external", label: "外部" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="知识库管理" subtitle="管理知识库、文档和索引状态" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">知识库管理</h1>
              <p className="text-sm text-slate-400 mt-1">管理知识库、文档和索引状态 · Knowledge Base</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="知识库总数" value={6} change={0} icon={Database} color="bg-emerald-500" />
            <StatsCard title="文档总数" value={482} change={0} icon={FileText} color="bg-blue-500" />
            <StatsCard title="已索引" value={475} change={0} icon={CheckCircle} color="bg-amber-500" />
            <StatsCard title="索引中" value={7} change={0} icon={RefreshCw} color="bg-violet-500" />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索知识库或文档..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "grid" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                网格
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "list" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="w-4 h-4" />
                列表
              </button>
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {typeFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTypeFilter(filter.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    typeFilter === filter.id
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* New Button */}
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow shrink-0">
              <Plus className="w-4 h-4" />
              新建知识库
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="w-10 h-10 text-slate-400 animate-spin mb-4" />
              <p className="text-slate-500">加载知识库数据中...</p>
            </div>
          ) : filteredKbs.length > 0 ? (
            <div className="space-y-4">
              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKbs.map((kb) => {
                    const sc = statusConfig[kb.status];
                    const topColor = kb.status === "error" ? typeColorMap.error : typeColorMap[kb.type] || "bg-slate-400";
                    const typeLabel = typeLabelMap[kb.type] || kb.type;
                    const typeText = typeColorTextMap[kb.type] || "text-slate-500";
                    const typeBg = typeBgMap[kb.type] || "bg-slate-50";
                    const isExpanded = !!expandedIds[kb.id];
                    const docs = mockDocsMap[kb.id] || [];

                    return (
                      <div key={kb.id} className="space-y-0">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                          {/* Color bar */}
                          <div className={`h-1 ${topColor}`} />

                          <div className="p-5">
                            {/* Name + Type */}
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-base font-semibold text-slate-800">{kb.name}</h3>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${typeBg} ${typeText}`}>
                                {typeLabel}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{kb.description}</p>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> {kb.docCount} 文档
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> {kb.indexedCount}/{kb.totalCount} 已索引
                              </span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {kb.tags.map((tag) => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Footer: time + status + expand */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{kb.lastUpdated}</span>
                                <span className={`flex items-center gap-1 text-xs font-medium ${sc.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                  {sc.label}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleExpand(kb.id)}
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    收起
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    文档
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Error warning */}
                            {kb.status === "error" && (
                              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-xs text-rose-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                同步失败，请检查文档格式或重新索引
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                                <Eye className="w-3.5 h-3.5" /> 查看文档
                              </button>
                              <button className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(kb.id)}
                                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded docs panel */}
                        {isExpanded && (
                          <div className="mt-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-700">文档列表</span>
                              <span className="text-xs text-slate-400">{docs.length} 个文档</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {docs.map((doc) => {
                                const DocIcon = docTypeIcons[doc.type] || File;
                                const dsc = docStatusConfig[doc.status];
                                const StatusIcon = dsc.icon;
                                return (
                                  <div key={doc.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                      <DocIcon className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-700 truncate">{doc.name}</div>
                                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                        <span>{doc.size}</span>
                                        <span>{doc.chunks} 分块</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`flex items-center gap-1 text-xs font-medium ${dsc.text}`}>
                                        <StatusIcon className={`w-3.5 h-3.5 ${doc.status === "indexing" ? "animate-spin" : ""} ${dsc.color}`} />
                                        {dsc.label}
                                      </span>
                                      <span className="text-xs text-slate-400">{doc.modifiedAt}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left px-4 py-3 font-medium text-slate-600">名称</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">类型</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">文档数</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">索引状态</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">标签</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">更新时间</th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredKbs.map((kb) => {
                          const sc = statusConfig[kb.status];
                          const typeLabel = typeLabelMap[kb.type] || kb.type;
                          const typeText = typeColorTextMap[kb.type] || "text-slate-500";
                          const typeBg = typeBgMap[kb.type] || "bg-slate-50";
                          const progress = kb.totalCount > 0 ? (kb.indexedCount / kb.totalCount) * 100 : 0;
                          const isExpanded = !!expandedIds[kb.id];
                          const docs = mockDocsMap[kb.id] || [];

                          return (
                            <>
                              <tr key={kb.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleExpand(kb.id)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-800">{kb.name}</span>
                                      <span className="text-xs text-slate-400">{kb.description}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${typeBg} ${typeText}`}>
                                    {typeLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{kb.docCount}</td>
                                <td className="px-4 py-3">
                                  <div className="w-full max-w-[160px]">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-slate-500">
                                        {kb.indexedCount}/{kb.totalCount}
                                      </span>
                                      <span className={`font-medium ${sc.text}`}>{sc.label}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          kb.status === "error"
                                            ? "bg-rose-500"
                                            : progress === 100
                                            ? "bg-emerald-500"
                                            : "bg-blue-500"
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {kb.tags.map((tag) => (
                                      <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">{kb.lastUpdated}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(kb.id)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded docs row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-0">
                                    <div className="bg-slate-50 border-y border-slate-100">
                                      <div className="px-4 py-3 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">文档列表</span>
                                        <span className="text-xs text-slate-400">{docs.length} 个文档</span>
                                      </div>
                                      <div className="px-4 pb-4">
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                          <div className="divide-y divide-slate-100">
                                            {docs.map((doc) => {
                                              const DocIcon = docTypeIcons[doc.type] || File;
                                              const dsc = docStatusConfig[doc.status];
                                              const StatusIcon = dsc.icon;
                                              return (
                                                <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
                                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                    <DocIcon className="w-4 h-4 text-slate-500" />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-700 truncate">{doc.name}</div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                      <span>{doc.size}</span>
                                                      <span>{doc.chunks} 分块</span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${dsc.text}`}>
                                                      <StatusIcon className={`w-3.5 h-3.5 ${doc.status === "indexing" ? "animate-spin" : ""} ${dsc.color}`} />
                                                      {dsc.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{doc.modifiedAt}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">暂无知识库</h3>
              <p className="text-sm text-slate-400 mt-1">点击上方按钮创建您的第一个知识库</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
