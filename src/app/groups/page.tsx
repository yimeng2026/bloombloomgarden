"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Network,
  Layers,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowRight,
  Settings,
  Trash2,
  Activity,
  Bot,
  Server,
  Code,
  BarChart3,
  Pencil,
  Star,
  Layout,
  FolderOpen,
  Zap,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentGroup {
  id: string;
  name: string;
  description: string;
  status: "active" | "idle" | "paused" | "error";
  agents: { id: string; name: string; avatarType: string; color: string }[];
  activeTasks: number;
  totalTasks: number;
  uptime: string;
}

interface CollaborationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  agentCount: number;
  handoffCount: number;
  uses: number;
  rating: number;
  icon: any;
}

interface AvailableAgent {
  id: string;
  name: string;
  platform: string;
  skills: string[];
  status: "running" | "idle" | "error";
  avatarType: string;
  color: string;
  fileCount: number;
  memoryCount: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const agentGroups: AgentGroup[] = [
  {
    id: "cg-1",
    name: "开发团队",
    description: "前端+后端+测试+文档协作开发",
    status: "active",
    agents: [
      { id: "a1", name: "代码助手", avatarType: "leaf", color: "#10b981" },
      { id: "a2", name: "测试工程师", avatarType: "mushroom", color: "#3b82f6" },
      { id: "a3", name: "文档撰写", avatarType: "tree", color: "#f59e0b" },
      { id: "a4", name: "API设计", avatarType: "fern", color: "#8b5cf6" },
    ],
    activeTasks: 3,
    totalTasks: 12,
    uptime: "2h 34m",
  },
  {
    id: "cg-2",
    name: "数据分析组",
    description: "数据清洗→分析→可视化→报告",
    status: "idle",
    agents: [
      { id: "a4", name: "数据清洗", avatarType: "petal", color: "#3b82f6" },
      { id: "a5", name: "分析专家", avatarType: "flower", color: "#ef4444" },
      { id: "a6", name: "可视化师", avatarType: "seed", color: "#f59e0b" },
    ],
    activeTasks: 0,
    totalTasks: 8,
    uptime: "空闲",
  },
  {
    id: "cg-3",
    name: "内容创作组",
    description: "研究→写作→翻译→审校",
    status: "paused",
    agents: [
      { id: "a7", name: "研究员", avatarType: "vine", color: "#a855f7" },
      { id: "a8", name: "写作者", avatarType: "leaf", color: "#10b981" },
      { id: "a9", name: "翻译员", avatarType: "fern", color: "#8b5cf6" },
      { id: "a10", name: "审校员", avatarType: "mushroom", color: "#3b82f6" },
    ],
    activeTasks: 1,
    totalTasks: 5,
    uptime: "已暂停",
  },
  {
    id: "cg-4",
    name: "客服团队",
    description: "多语言客服响应",
    status: "error",
    agents: [
      { id: "a11", name: "客服A", avatarType: "flower", color: "#ef4444" },
      { id: "a12", name: "客服B", avatarType: "tree", color: "#10b981" },
    ],
    activeTasks: 0,
    totalTasks: 3,
    uptime: "错误",
  },
  {
    id: "cg-5",
    name: "DevOps流水线",
    description: "构建→测试→部署→监控",
    status: "active",
    agents: [
      { id: "a13", name: "构建助手", avatarType: "seed", color: "#f59e0b" },
      { id: "a14", name: "部署专家", avatarType: "mushroom", color: "#3b82f6" },
      { id: "a15", name: "监控员", avatarType: "vine", color: "#a855f7" },
    ],
    activeTasks: 2,
    totalTasks: 6,
    uptime: "5h 12m",
  },
];

const templates: CollaborationTemplate[] = [
  {
    id: "t-1",
    name: "敏捷开发团队",
    category: "开发",
    description: "产品→前端→后端→测试→文档的完整敏捷开发流程",
    agentCount: 5,
    handoffCount: 4,
    uses: 2300,
    rating: 4.9,
    icon: Code,
  },
  {
    id: "t-2",
    name: "数据分析流水线",
    category: "数据分析",
    description: "采集→清洗→分析→可视化→报告的数据处理流水线",
    agentCount: 4,
    handoffCount: 3,
    uses: 1800,
    rating: 4.7,
    icon: BarChart3,
  },
  {
    id: "t-3",
    name: "多语言内容工厂",
    category: "内容创作",
    description: "研究→写作→翻译→审校→发布的内容生产工厂",
    agentCount: 5,
    handoffCount: 4,
    uses: 890,
    rating: 4.6,
    icon: Pencil,
  },
  {
    id: "t-4",
    name: "智能客服中心",
    category: "客服",
    description: "分类→响应→升级→反馈的智能客服处理流程",
    agentCount: 3,
    handoffCount: 3,
    uses: 3100,
    rating: 4.8,
    icon: Users,
  },
];

const availableAgents: AvailableAgent[] = [
  {
    id: "ag-1",
    name: "代码助手-01",
    platform: "OpenAI",
    skills: ["代码生成", "代码审查", "调试"],
    status: "running",
    avatarType: "leaf",
    color: "#10b981",
    fileCount: 12,
    memoryCount: 1,
  },
  {
    id: "ag-2",
    name: "数据分析-A",
    platform: "Kimi",
    skills: ["数据分析", "数据可视化", "报告生成"],
    status: "running",
    avatarType: "flower",
    color: "#ef4444",
    fileCount: 8,
    memoryCount: 1,
  },
  {
    id: "ag-3",
    name: "文档撰写-B",
    platform: "Claude",
    skills: ["文档写作", "翻译", "审校"],
    status: "idle",
    avatarType: "tree",
    color: "#f59e0b",
    fileCount: 5,
    memoryCount: 1,
  },
  {
    id: "ag-4",
    name: "翻译专员",
    platform: "GPT-4",
    skills: ["翻译", "本地化", "术语管理"],
    status: "running",
    avatarType: "fern",
    color: "#a855f7",
    fileCount: 3,
    memoryCount: 0,
  },
  {
    id: "ag-5",
    name: "测试工程师",
    platform: "Ollama",
    skills: ["测试用例", "自动化测试", "Bug追踪"],
    status: "running",
    avatarType: "mushroom",
    color: "#3b82f6",
    fileCount: 15,
    memoryCount: 2,
  },
  {
    id: "ag-6",
    name: "研究助手",
    platform: "Gemini",
    skills: ["文献搜索", "综述撰写", "引用管理"],
    status: "idle",
    avatarType: "vine",
    color: "#10b981",
    fileCount: 20,
    memoryCount: 3,
  },
];

const autonomyLevels = [
  "完全手动 — 每步需人工确认",
  "谨慎 — 关键决策需确认",
  "平衡 — 标准流程自动执行",
  "自主 — 复杂任务自动处理",
  "高度自主 — 极少需人工干预",
  "完全自主 — 全权委托给智能体",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "活跃" },
  running: { bg: "bg-emerald-50", text: "text-emerald-700", label: "运行中" },
  idle: { bg: "bg-slate-100", text: "text-slate-500", label: "空闲" },
  paused: { bg: "bg-amber-50", text: "text-amber-700", label: "暂停" },
  error: { bg: "bg-rose-50", text: "text-rose-700", label: "错误" },
};

function AvatarCircle({ color, type, size = 32 }: { color: string; type: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        backgroundColor: color + "20",
        color,
      }}
    >
      <Bot size={size * 0.5} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Wizard                                                      */
/* ------------------------------------------------------------------ */

const wizardSteps = ["基本信息", "添加智能体", "配置工作流", "确认创建"];

function CreateWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [taskType, setTaskType] = useState("sequential");
  const [autonomyLevel, setAutonomyLevel] = useState(2);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [outputFormat, setOutputFormat] = useState("structured");
  const [handoffRule, setHandoffRule] = useState("auto");

  const filteredAgents = availableAgents.filter(
    (a) =>
      !agentSearch ||
      a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
      a.skills.some((s) => s.includes(agentSearch))
  );

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const canNext = (() => {
    switch (step) {
      case 0:
        return groupName.trim().length > 0;
      case 1:
        return selectedAgents.length > 0;
      default:
        return true;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[800px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">新建协作组</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center">
            {wizardSteps.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      i < step
                        ? "bg-emerald-500 text-white w-6 h-6"
                        : i === step
                        ? "bg-emerald-500 text-white w-7 h-7 ring-4 ring-emerald-100"
                        : "border-2 border-slate-200 text-slate-400 w-6 h-6"
                    }`}
                  >
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === step ? "text-slate-700 font-semibold" : i < step ? "text-slate-500" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {i < wizardSteps.length - 1 && (
                  <div className={`mx-3 mb-5 h-0.5 w-12 ${i < step ? "bg-emerald-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-5 max-w-[600px] mx-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  协作组名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="输入协作组名称"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                <textarea
                  placeholder="描述此协作组的用途..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-y min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">任务类型</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "sequential", label: "顺序执行", desc: "按顺序依次执行" },
                    { id: "parallel", label: "并行执行", desc: "同时执行任务" },
                    { id: "conditional", label: "条件执行", desc: "根据条件分支" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTaskType(opt.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        taskType === opt.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-700">{opt.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  自主级别: {autonomyLevel} — {autonomyLevels[autonomyLevel]}
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={autonomyLevel}
                  onChange={(e) => setAutonomyLevel(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>手动</span>
                  <span>完全自主</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Add Agents */}
          {step === 1 && (
            <div className="max-w-[700px] mx-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索智能体..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              {selectedAgents.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-sm text-emerald-700">
                  已选择 {selectedAgents.length} 个智能体
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  const sc = statusConfig[agent.status];
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <AvatarCircle color={agent.color} type={agent.avatarType} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700">{agent.name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Server size={10} /> {agent.platform}
                            <span className={sc.text}>● {sc.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-8">
                        {agent.skills.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 pl-8">
                        <span className="flex items-center gap-1">
                          <FolderOpen size={10} /> {agent.fileCount} 工作文件
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={10} /> {agent.memoryCount} 记忆文件
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Workflow */}
          {step === 2 && (
            <div className="space-y-5 max-w-[600px] mx-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">交接规则</label>
                <div className="space-y-2">
                  {[
                    { id: "auto", label: "自动交接", desc: "任务完成后自动交接给下一个智能体" },
                    { id: "manual", label: "手动交接", desc: "每次交接需人工确认" },
                    { id: "conditional", label: "条件交接", desc: "根据任务结果决定交接路径" },
                  ].map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => setHandoffRule(rule.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        handoffRule === rule.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          handoffRule === rule.id ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                        }`}
                      >
                        {handoffRule === rule.id && <Check size={10} className="text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">{rule.label}</div>
                        <div className="text-xs text-slate-400">{rule.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">输出格式</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "structured", label: "结构化", desc: "JSON/XML格式" },
                    { id: "document", label: "文档", desc: "Markdown/Word" },
                    { id: "raw", label: "原始", desc: "纯文本输出" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setOutputFormat(fmt.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        outputFormat === fmt.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-700">{fmt.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">工作流预览</label>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 overflow-x-auto">
                  <div className="flex items-center gap-3 min-w-max">
                    {selectedAgents.map((agentId, i) => {
                      const agent = availableAgents.find((a) => a.id === agentId);
                      if (!agent) return null;
                      return (
                        <div key={agentId} className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <AvatarCircle color={agent.color} type={agent.avatarType} size={40} />
                            <span className="text-xs text-slate-600">{agent.name}</span>
                          </div>
                          {i < selectedAgents.length - 1 && (
                            <div className="flex flex-col items-center gap-1">
                              <ArrowRight size={16} className="text-slate-400" />
                              <span className="text-[10px] text-slate-400">
                                {handoffRule === "auto" ? "自动" : handoffRule === "manual" ? "手动" : "条件"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 max-w-[600px] mx-auto">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">协作组信息</h4>
                <div className="text-sm text-slate-500">名称: {groupName}</div>
                <div className="text-sm text-slate-500">描述: {groupDesc || "—"}</div>
                <div className="text-sm text-slate-500">
                  任务类型: {taskType === "sequential" ? "顺序执行" : taskType === "parallel" ? "并行执行" : "条件执行"}
                </div>
                <div className="text-sm text-slate-500">
                  自主级别: {autonomyLevel} — {autonomyLevels[autonomyLevel]}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">智能体成员 ({selectedAgents.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgents.map((id) => {
                    const agent = availableAgents.find((a) => a.id === id);
                    if (!agent) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600"
                      >
                        <AvatarCircle color={agent.color} type={agent.avatarType} size={18} />
                        {agent.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">工作流配置</h4>
                <div className="text-sm text-slate-500">
                  交接规则: {handoffRule === "auto" ? "自动交接" : handoffRule === "manual" ? "手动交接" : "条件交接"}
                </div>
                <div className="text-sm text-slate-500">
                  输出格式: {outputFormat === "structured" ? "结构化" : outputFormat === "document" ? "文档" : "原始"}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-base hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={18} />
                  创建协作组
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={16} />
              上一步
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
            >
              下一步
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<"groups" | "templates">("groups");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [groups, setGroups] = useState<AgentGroup[]>(agentGroups);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const filteredGroups = groups.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const tabs = [
    { id: "groups" as const, label: "协作组列表", icon: Users },
    { id: "templates" as const, label: "模板市场", icon: Layout },
  ];

  const statusFilters = [
    { id: "all", label: "全部" },
    { id: "active", label: "活跃" },
    { id: "idle", label: "空闲" },
    { id: "paused", label: "暂停" },
    { id: "error", label: "错误" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="多智能体协作" subtitle="组建智能体团队，协同工作" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">多智能体协作</h1>
              <p className="text-sm text-slate-400 mt-1">组建智能体团队，协同工作 · Agent Collaboration</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索协作组..."
                  className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
                />
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4" />
                新建协作组
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-emerald-700 border-emerald-500"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Groups Tab */}
          {activeTab === "groups" && (
            <div className="space-y-4">
              {/* Status Filters */}
              <div className="flex items-center gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      statusFilter === filter.id
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RefreshCw className="w-10 h-10 text-slate-400 animate-spin mb-4" />
                  <p className="text-slate-500">加载协作组数据中...</p>
                </div>
              ) : filteredGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGroups.map((group, i) => {
                    const sc = statusConfig[group.status];
                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {/* Status bar */}
                        <div
                          className={`h-1 ${
                            group.status === "active"
                              ? "bg-emerald-500"
                              : group.status === "idle"
                              ? "bg-slate-300"
                              : group.status === "paused"
                              ? "bg-amber-400"
                              : "bg-rose-500"
                          }`}
                        />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-base font-semibold text-slate-800">{group.name}</h3>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-4 line-clamp-2">{group.description}</p>

                          {/* Agent avatars */}
                          <div className="flex items-center mb-4">
                            <div className="flex -space-x-2">
                              {group.agents.slice(0, 5).map((agent) => (
                                <div key={agent.id} title={agent.name}>
                                  <AvatarCircle type={agent.avatarType} color={agent.color} size={32} />
                                </div>
                              ))}
                            </div>
                            {group.agents.length > 5 && (
                              <span className="ml-2 text-xs text-slate-400">+{group.agents.length - 5}</span>
                            )}
                            <span className="ml-auto text-xs text-slate-400">{group.agents.length} 个智能体</span>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                            <span className="flex items-center gap-1">
                              <CheckSquare size={12} /> {group.activeTasks}/{group.totalTasks} 任务
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity size={12} /> {group.uptime}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                              <Activity size={12} /> 监控
                            </button>
                            <button className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                              <Settings size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(group.id)}
                              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700">暂无协作组</h3>
                  <p className="text-sm text-slate-400 mt-1">点击上方按钮创建您的第一个协作组</p>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-800">{template.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{template.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {template.agentCount} 智能体
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> {template.handoffCount} 交接
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" /> {template.rating}
                      </span>
                      <span>{template.uses.toLocaleString()} 次使用</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCreate(true)}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                      >
                        使用模板
                      </button>
                      <button className="px-4 py-2 text-slate-500 bg-slate-50 rounded-lg text-sm hover:bg-slate-100 transition-colors">
                        预览
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Wizard Modal */}
      {showCreate && <CreateWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
