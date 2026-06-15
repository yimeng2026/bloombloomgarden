"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  BarChart3,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Database,
  Flower2,
  HelpCircle,
  Leaf,
  Server,
  Sparkles,
  Sprout,
  TreeDeciduous,
  TreePine,
  Upload,
  Users,
} from "lucide-react";
import { Header } from "@/components/layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SourceType = "single" | "group" | "clone" | "import";

interface PlatformOption {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  models: string[];
  icon: any;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  icon: any;
  docCount: number;
}

interface AvatarOption {
  id: string;
  icon: any;
  color: string;
  bgColor: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const sourceOptions = [
  {
    id: "single" as SourceType,
    label: "单智能体",
    desc: "从零配置一个独立 AI Agent",
    icon: Bot,
  },
  {
    id: "group" as SourceType,
    label: "群组协作",
    desc: "创建多智能体协作团队",
    icon: Users,
  },
  {
    id: "clone" as SourceType,
    label: "克隆现有",
    desc: "基于现有 Agent 快速复制",
    icon: Copy,
  },
  {
    id: "import" as SourceType,
    label: "导入配置",
    desc: "从 JSON/YAML 文件导入",
    icon: Upload,
  },
];

const platforms: PlatformOption[] = [
  {
    id: "openai",
    name: "OpenAI",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    models: ["GPT-4o", "GPT-4o-mini", "GPT-3.5-turbo"],
    icon: Server,
  },
  {
    id: "kimi",
    name: "Kimi",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    models: ["GLM-5", "GLM-4", "GLM-4V"],
    icon: Server,
  },
  {
    id: "claude",
    name: "Claude",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    models: ["Claude-3.5-Sonnet", "Claude-3-Haiku"],
    icon: Server,
  },
  {
    id: "gemini",
    name: "Gemini",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    models: ["Gemini-1.5-Pro", "Gemini-1.5-Flash"],
    icon: Server,
  },
  {
    id: "ollama",
    name: "Ollama",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    models: [],
    icon: Server,
  },
  {
    id: "custom",
    name: "自定义",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    models: [],
    icon: Server,
  },
];

const skillCategories = [
  {
    name: "代码开发",
    skills: [
      { id: "code-gen", name: "代码生成" },
      { id: "code-review", name: "代码审查" },
    ],
  },
  {
    name: "内容创作",
    skills: [
      { id: "doc-write", name: "文档写作" },
      { id: "translate", name: "多语言翻译" },
    ],
  },
  {
    name: "数据分析",
    skills: [
      { id: "data-clean", name: "数据清洗" },
      { id: "data-viz", name: "可视化报告" },
    ],
  },
  {
    name: "设计创意",
    skills: [
      { id: "ui-design", name: "UI设计" },
      { id: "img-gen", name: "图像生成" },
    ],
  },
  {
    name: "研究分析",
    skills: [
      { id: "lit-search", name: "文献搜索" },
      { id: "comp-analysis", name: "竞品分析" },
    ],
  },
  {
    name: "管理协作",
    skills: [
      { id: "project-mgmt", name: "项目管理" },
      { id: "meeting-notes", name: "会议记录" },
    ],
  },
];

const fileTreeData: FileNode[] = [
  {
    id: "long-term",
    name: "长期记忆",
    path: "/memory/long-term",
    type: "folder",
    children: [
      { id: "persona", name: "persona.json", path: "/memory/long-term/persona.json", type: "file" },
      { id: "preferences", name: "preferences.json", path: "/memory/long-term/preferences.json", type: "file" },
    ],
  },
  {
    id: "short-term",
    name: "短期记忆",
    path: "/memory/short-term",
    type: "folder",
    children: [
      { id: "session", name: "session_context.json", path: "/memory/short-term/session_context.json", type: "file" },
    ],
  },
  {
    id: "workspace",
    name: "workspace",
    path: "/workspace",
    type: "folder",
    children: [
      { id: "docs", name: "docs", path: "/workspace/docs", type: "folder", children: [] },
      { id: "scripts", name: "scripts", path: "/workspace/scripts", type: "folder", children: [] },
      { id: "data", name: "data", path: "/workspace/data", type: "folder", children: [] },
    ],
  },
];

const knowledgeBases: KnowledgeBase[] = [
  { id: "tech-docs", name: "技术文档", description: "编程语言、框架文档", icon: Code, docCount: 128 },
  { id: "product", name: "产品知识", description: "产品规格、功能说明", icon: Database, docCount: 86 },
  { id: "industry", name: "行业报告", description: "市场分析、行业趋势", icon: BarChart3, docCount: 64 },
  { id: "best-practice", name: "最佳实践", description: "代码规范、设计模式", icon: CheckCircle, docCount: 42 },
  { id: "faq", name: "FAQ库", description: "常见问题与解答", icon: HelpCircle, docCount: 256 },
  { id: "private", name: "私有数据", description: "内部数据库、私有文档", icon: Server, docCount: 512 },
];

const avatarOptions: AvatarOption[] = [
  { id: "bot", icon: Bot, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { id: "leaf", icon: Leaf, color: "text-green-600", bgColor: "bg-green-100" },
  { id: "flower", icon: Flower2, color: "text-pink-600", bgColor: "bg-pink-100" },
  { id: "tree", icon: TreePine, color: "text-amber-600", bgColor: "bg-amber-100" },
  { id: "fern", icon: TreeDeciduous, color: "text-teal-600", bgColor: "bg-teal-100" },
  { id: "mushroom", icon: Sprout, color: "text-purple-600", bgColor: "bg-purple-100" },
];

const wizardSteps = [
  "选择创建方式",
  "选择 LLM 平台",
  "配置模型参数",
  "选择智能体技能",
  "配置记忆与工作空间",
  "关联知识库",
  "确认配置",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FileTreeNode({
  node,
  expanded,
  selectedFiles,
  toggleExpand,
  toggleFile,
}: {
  node: FileNode;
  expanded: Set<string>;
  selectedFiles: Set<string>;
  toggleExpand: (id: string) => void;
  toggleFile: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedFiles.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div className="flex items-center gap-2 py-1.5">
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(node.id)}
            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleFile(node.id)}
          className="w-4 h-4 rounded border-slate-300 accent-emerald-500 cursor-pointer"
        />
        <span className="text-sm text-slate-600">{node.name}</span>
        <span className="text-xs text-slate-400 ml-1">{node.path}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="pl-6">
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              selectedFiles={selectedFiles}
              toggleExpand={toggleExpand}
              toggleFile={toggleFile}
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

export default function CreateAgentPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Step 0: Source
  const [source, setSource] = useState<SourceType | null>(null);

  // Step 1: Platform
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");

  // Step 2: API Config
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("你是一个 helpful 的 AI 助手...");

  // Step 3: Skills
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  // Step 4: Memory & Workspace
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["long-term", "short-term", "workspace"]));
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Step 5: Knowledge Base
  const [selectedKBs, setSelectedKBs] = useState<Set<string>>(new Set());

  // Step 6: Confirmation
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const selectedPlatform = platforms.find((p) => p.id === platformId);

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFile = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleKB = (id: string) => {
    setSelectedKBs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canNext = (() => {
    switch (step) {
      case 0:
        return source !== null;
      case 1:
        return platformId !== null;
      case 2:
        return modelName.trim().length > 0;
      case 6:
        return agentName.trim().length > 0;
      default:
        return true;
    }
  })();

  const handlePrev = () => setStep((s) => Math.max(0, s - 1));
  const handleNext = () => {
    if (step < wizardSteps.length - 1) setStep((s) => s + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="创建智能体" subtitle="配置您的 AI Agent" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="创建智能体" subtitle="配置您的 AI Agent" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Steps */}
          <div className="flex items-center justify-center mb-8">
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
                  <span className={`text-xs whitespace-nowrap ${i === step ? "text-slate-700 font-semibold" : i < step ? "text-slate-500" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {i < wizardSteps.length - 1 && (
                  <div className={`mx-2 mb-5 h-0.5 w-8 ${i < step ? "bg-emerald-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Step 0: Source Selection */}
            {step === 0 && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">选择创建方式</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sourceOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = source === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSource(opt.id)}
                        className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 text-center transition-all ${
                          isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{opt.label}</div>
                          <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Platform Selection */}
            {step === 1 && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">选择 LLM 平台</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {platforms.map((plat) => {
                    const Icon = plat.icon;
                    const isSelected = platformId === plat.id;
                    return (
                      <button
                        key={plat.id}
                        onClick={() => {
                          setPlatformId(plat.id);
                          setModelName(plat.models.length > 0 ? plat.models[0] : "");
                        }}
                        className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 text-center transition-all ${
                          isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${plat.bgColor} ${plat.color}`}>
                          <Icon size={24} />
                        </div>
                        <div className="text-sm font-semibold text-slate-700">{plat.name}</div>
                        <div className="text-xs text-slate-400">
                          {plat.models.length > 0 ? plat.models.join(" / ") : plat.id === "ollama" ? "本地模型，输入模型名称" : "自定义 API 端点"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedPlatform && (
                  <div className="mt-6 p-5 rounded-xl border border-slate-200 bg-white">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      选择模型 {selectedPlatform.models.length === 0 && <span className="text-red-500">*</span>}
                    </label>
                    {selectedPlatform.models.length > 0 ? (
                      <select
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                      >
                        {selectedPlatform.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={selectedPlatform.id === "ollama" ? "输入模型名称（如 llama3.1）" : "输入自定义模型名称"}
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: API Configuration */}
            {step === 2 && (
              <div className="max-w-xl mx-auto space-y-5">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">配置模型参数</h2>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-2">模型</label>
                  <input
                    type="text"
                    value={modelName}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
                  />
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    温度参数: {temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    最大 Token: {maxTokens}
                  </label>
                  <input
                    type="range"
                    min={1024}
                    max={8192}
                    step={128}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1024</span>
                    <span>4096</span>
                    <span>8192</span>
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="输入您的 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-2">系统提示词</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-y"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Skills */}
            {step === 3 && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">选择智能体技能</h2>
                {selectedSkills.size > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-sm text-emerald-700 text-center">
                    已选择 {selectedSkills.size} 个技能
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skillCategories.map((cat) => (
                    <div key={cat.name} className="p-5 rounded-xl border border-slate-200 bg-white">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">{cat.name}</h3>
                      <div className="space-y-2">
                        {cat.skills.map((skill) => {
                          const isSelected = selectedSkills.has(skill.id);
                          return (
                            <button
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500" : "bg-slate-200"}`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                              <span className="text-sm text-slate-700">{skill.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Memory & Workspace */}
            {step === 4 && (
              <div className="max-w-xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">配置记忆与工作空间</h2>
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <div className="space-y-1">
                    {fileTreeData.map((node) => (
                      <FileTreeNode
                        key={node.id}
                        node={node}
                        expanded={expandedNodes}
                        selectedFiles={selectedFiles}
                        toggleExpand={toggleExpand}
                        toggleFile={toggleFile}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Knowledge Base */}
            {step === 5 && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">关联知识库</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {knowledgeBases.map((kb) => {
                    const Icon = kb.icon;
                    const isSelected = selectedKBs.has(kb.id);
                    return (
                      <button
                        key={kb.id}
                        onClick={() => toggleKB(kb.id)}
                        className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500" : "bg-slate-200"}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            <Icon size={20} />
                          </div>
                        </div>
                        <div className="pl-8">
                          <div className="text-sm font-semibold text-slate-700">{kb.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{kb.description}</div>
                          <div className="text-xs text-emerald-600 mt-2">已关联 {kb.docCount} 文档</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Confirmation */}
            {step === 6 && (
              <div className="max-w-xl mx-auto space-y-5">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">确认配置</h2>
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      智能体名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="输入智能体名称"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                    <textarea
                      placeholder="描述此智能体的用途..."
                      value={agentDesc}
                      onChange={(e) => setAgentDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">来源类型</label>
                    <div className="text-sm text-slate-500 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      {sourceOptions.find((s) => s.id === source)?.label || "—"}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <label className="block text-sm font-medium text-slate-700 mb-3">选择头像</label>
                  <div className="flex items-center gap-3">
                    {avatarOptions.map((av) => {
                      const Icon = av.icon;
                      const isSelected = avatarId === av.id;
                      return (
                        <button
                          key={av.id}
                          onClick={() => setAvatarId(av.id)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${av.bgColor} ${av.color} ${
                            isSelected ? "ring-2 ring-offset-2 ring-emerald-500" : "hover:opacity-80"
                          }`}
                        >
                          <Icon size={22} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">配置摘要</h4>
                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex justify-between">
                      <span>平台</span>
                      <span className="text-slate-700">{selectedPlatform?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>模型</span>
                      <span className="text-slate-700">{modelName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>温度</span>
                      <span className="text-slate-700">{temperature.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>技能数量</span>
                      <span className="text-slate-700">{selectedSkills.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>知识库数量</span>
                      <span className="text-slate-700">{selectedKBs.size}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {/* TODO: create agent */}}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-base hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={18} />
                    创建智能体
                  </span>
                </button>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-4 pb-2">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft size={16} />
                上一步
              </button>
              {step < wizardSteps.length - 1 && (
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
                >
                  下一步
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
