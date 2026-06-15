"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  HardDrive,
  Brain,
  Layers,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileCode,
  Table,
  Image,
  File,
  Download,
  Copy,
  Trash2,
  Upload,
  FolderPlus,
  RefreshCw,
  Clock,
  Search,
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
}

interface MockFile {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
  modifiedAt: string;
  folder: string;
  tags: string[];
}

interface MemoryItem {
  id: string;
  name: string;
  type: string;
  fileCount: number;
  totalSize: string;
  lastUsed: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const folderTree: FolderNode[] = [
  {
    id: "root",
    name: "workspace",
    children: [
      {
        id: "agents",
        name: "agents",
        children: [
          { id: "agent-a", name: "Agent-A" },
          { id: "agent-b", name: "Agent-B" },
        ],
      },
      {
        id: "groups",
        name: "groups",
        children: [{ id: "group-1", name: "开发团队" }],
      },
      {
        id: "tasks",
        name: "tasks",
        children: [
          { id: "task-001", name: "task-001" },
          { id: "task-002", name: "task-002" },
        ],
      },
      { id: "shared", name: "shared" },
      { id: "temp", name: "temp" },
    ],
  },
];

const mockFiles: MockFile[] = [
  {
    id: "f1",
    name: "persona.json",
    type: "json",
    size: "12KB",
    sizeBytes: 12288,
    modifiedAt: "2026-06-15 10:00",
    folder: "agent-a",
    tags: ["配置", "记忆"],
  },
  {
    id: "f2",
    name: "session_context.json",
    type: "json",
    size: "8KB",
    sizeBytes: 8192,
    modifiedAt: "2026-06-15 09:30",
    folder: "agent-a",
    tags: ["上下文"],
  },
  {
    id: "f3",
    name: "workspace_notes.md",
    type: "md",
    size: "24KB",
    sizeBytes: 24576,
    modifiedAt: "2026-06-14 16:00",
    folder: "shared",
    tags: ["笔记"],
  },
  {
    id: "f4",
    name: "data_export.csv",
    type: "csv",
    size: "156KB",
    sizeBytes: 159744,
    modifiedAt: "2026-06-14 14:00",
    folder: "shared",
    tags: ["数据"],
  },
  {
    id: "f5",
    name: "architecture.png",
    type: "png",
    size: "2.1MB",
    sizeBytes: 2202009,
    modifiedAt: "2026-06-13 11:00",
    folder: "shared",
    tags: ["设计"],
  },
  {
    id: "f6",
    name: "api_client.ts",
    type: "ts",
    size: "18KB",
    sizeBytes: 18432,
    modifiedAt: "2026-06-15 08:00",
    folder: "task-001",
    tags: ["代码"],
  },
  {
    id: "f7",
    name: "report_template.md",
    type: "md",
    size: "45KB",
    sizeBytes: 46080,
    modifiedAt: "2026-06-12 09:00",
    folder: "task-002",
    tags: ["模板"],
  },
  {
    id: "f8",
    name: "preferences.json",
    type: "json",
    size: "4KB",
    sizeBytes: 4096,
    modifiedAt: "2026-06-15 07:00",
    folder: "agent-b",
    tags: ["配置"],
  },
  {
    id: "f9",
    name: "analysis_result.xlsx",
    type: "xlsx",
    size: "89KB",
    sizeBytes: 91136,
    modifiedAt: "2026-06-14 10:00",
    folder: "groups",
    tags: ["分析"],
  },
  {
    id: "f10",
    name: "deployment.yml",
    type: "yml",
    size: "6KB",
    sizeBytes: 6144,
    modifiedAt: "2026-06-13 15:00",
    folder: "task-001",
    tags: ["部署"],
  },
  {
    id: "f11",
    name: "README.md",
    type: "md",
    size: "3KB",
    sizeBytes: 3072,
    modifiedAt: "2026-06-10 08:00",
    folder: "root",
    tags: ["文档"],
  },
  {
    id: "f12",
    name: "icon_set.svg",
    type: "svg",
    size: "15KB",
    sizeBytes: 15360,
    modifiedAt: "2026-06-11 13:00",
    folder: "shared",
    tags: ["资源"],
  },
];

const memoryFiles: MemoryItem[] = [
  {
    id: "m1",
    name: "Agent-A 记忆",
    type: "对话记忆",
    fileCount: 12,
    totalSize: "128KB",
    lastUsed: "最近 2 小时",
  },
  {
    id: "m2",
    name: "Agent-B 记忆",
    type: "工作记忆",
    fileCount: 8,
    totalSize: "86KB",
    lastUsed: "最近 5 小时",
  },
  {
    id: "m3",
    name: "系统记忆",
    type: "全局配置",
    fileCount: 4,
    totalSize: "32KB",
    lastUsed: "最近 1 天",
  },
  {
    id: "m4",
    name: "知识库缓存",
    type: "向量索引",
    fileCount: 24,
    totalSize: "2.1MB",
    lastUsed: "最近 3 小时",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getFileIcon(type: string) {
  switch (type) {
    case "md":
      return { Icon: FileText, color: "text-blue-500" };
    case "json":
    case "js":
    case "ts":
    case "py":
      return { Icon: FileCode, color: "text-purple-500" };
    case "csv":
    case "xlsx":
      return { Icon: Table, color: "text-green-500" };
    case "png":
    case "jpg":
    case "svg":
      return { Icon: Image, color: "text-orange-500" };
    case "pdf":
      return { Icon: FileText, color: "text-red-500" };
    default:
      return { Icon: File, color: "text-slate-400" };
  }
}

/* ------------------------------------------------------------------ */
/*  Folder Tree Item (recursive)                                       */
/* ------------------------------------------------------------------ */

function TreeItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
          isSelected
            ? "bg-emerald-50 text-emerald-700 font-medium"
            : "text-slate-600 hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="shrink-0 p-0.5 rounded hover:bg-slate-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-amber-400" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function WorkspacePage() {
  const [selectedFolder, setSelectedFolder] = useState("root");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["root", "agents", "groups", "tasks"])
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFiles = mockFiles.filter((f) => {
    const matchFolder =
      selectedFolder === "root" || f.folder === selectedFolder;
    const matchSearch =
      !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const handleCopyPath = (fileName: string, id: string) => {
    navigator.clipboard?.writeText(
      `/workspace/${
        selectedFolder === "root" ? "" : selectedFolder + "/"
      }${fileName}`
    );
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const usedGB = 2.4;
  const totalGB = 10;
  const usagePercent = (usedGB / totalGB) * 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="工作空间" subtitle="文件管理与记忆系统" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="总文件数"
              value={128}
              change={0}
              icon={FolderOpen}
              color="bg-emerald-500"
            />
            <StatsCard
              title="总大小"
              value="2.4GB"
              change={0}
              icon={HardDrive}
              color="bg-blue-500"
            />
            <StatsCard
              title="记忆文件"
              value={36}
              change={0}
              icon={Brain}
              color="bg-amber-500"
            />
            <StatsCard
              title="任务组"
              value={12}
              change={0}
              icon={Layers}
              color="bg-violet-500"
            />
          </div>

          {/* Main Content: 2-column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: File Manager */}
            <div className="lg:col-span-2 space-y-4">
              {/* File Tree */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    文件目录
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索文件..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 w-44"
                    />
                  </div>
                </div>
                <div className="p-3 overflow-x-auto">
                  <div className="min-w-[280px]">
                    {folderTree.map((node) => (
                      <TreeItem
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedId={selectedFolder}
                        expandedIds={expandedIds}
                        onToggle={toggleExpand}
                        onSelect={setSelectedFolder}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* File List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    文件列表
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      ({filteredFiles.length} 个文件)
                    </span>
                  </h2>
                </div>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">加载文件中...</p>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs text-slate-400">
                          <th className="text-left px-5 py-3 font-medium">
                            文件名
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            类型
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            大小
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            修改时间
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            标签
                          </th>
                          <th className="text-right px-5 py-3 font-medium">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiles.map((file) => {
                          const { Icon, color } = getFileIcon(file.type);
                          return (
                            <tr
                              key={file.id}
                              className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    className={`w-4 h-4 shrink-0 ${color}`}
                                  />
                                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                                    {file.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase">
                                  {file.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {file.size}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {file.modifiedAt}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {file.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    title="下载"
                                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    title="复制路径"
                                    onClick={() =>
                                      handleCopyPath(file.name, file.id)
                                    }
                                    className="p-1.5 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                                  >
                                    {copiedId === file.id ? (
                                      <span className="text-[10px] text-emerald-600 font-medium">
                                        已复制
                                      </span>
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    title="删除"
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderOpen className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">暂无文件</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Memory + Quick Actions */}
            <div className="lg:col-span-1 space-y-4">
              {/* Memory Files Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-800">
                    记忆文件
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {memoryFiles.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-amber-200 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700">
                          {mem.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {mem.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          {mem.fileCount} 文件
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {mem.totalSize}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {mem.lastUsed}
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    清理过期记忆
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-800">
                    快速操作
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  <button className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Upload className="w-4 h-4" />
                    上传文件
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <FolderPlus className="w-4 h-4" />
                    新建文件夹
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <RefreshCw className="w-4 h-4" />
                    刷新
                  </button>
                </div>

                {/* Storage Usage */}
                <div className="px-4 pb-4">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        存储使用
                      </span>
                      <span className="text-xs text-slate-400">
                        {usedGB}GB / {totalGB}GB
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
