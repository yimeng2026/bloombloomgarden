"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout";

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  role: string;
  status: string;
  llmProvider: string;
  model: string;
  agentPlatform: string;
}

const AGENT_ROLES = [
  { id: "researcher", name: "研究员", emoji: "🔬", tagline: "深度调研与信息搜集", systemPrompt: "你是研究员...", recommendedPlatform: "kimi", recommendedSkills: "搜索,分析" },
  { id: "writer", name: "写作者", emoji: "✍️", tagline: "文案创作与内容生成", systemPrompt: "你是写作者...", recommendedPlatform: "claude", recommendedSkills: "写作,翻译" },
  { id: "coder", name: "程序员", emoji: "💻", tagline: "代码编写与调试", systemPrompt: "你是程序员...", recommendedPlatform: "openai", recommendedSkills: "代码,调试" },
  { id: "designer", name: "设计师", emoji: "🎨", tagline: "UI/UX 设计建议", systemPrompt: "你是设计师...", recommendedPlatform: "claude", recommendedSkills: "设计,审美" },
  { id: "analyst", name: "分析师", emoji: "📊", tagline: "数据分析与可视化", systemPrompt: "你是分析师...", recommendedPlatform: "openai", recommendedSkills: "数据,统计" },
  { id: "pm", name: "产品经理", emoji: "📋", tagline: "需求分析与规划", systemPrompt: "你是产品经理...", recommendedPlatform: "kimi", recommendedSkills: "规划,沟通" },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-emerald-50 text-emerald-700";
      case "paused":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-500";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="智能体管理" subtitle="管理你的 AI Agent 团队" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索智能体..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <Link
              href="/agents/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              新建 Agent
            </Link>
          </div>

          {/* Agent Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-400">加载中...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Bot className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">暂无智能体</p>
              <p className="text-xs text-slate-300 mt-1">点击上方按钮创建</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xl">
                      {agent.avatar || agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm">{agent.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{agent.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status || "idle"}
                    </span>
                    <span className="text-xs text-slate-400">{agent.llmProvider}/{agent.model}</span>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100">
                      <MessageSquare className="w-3.5 h-3.5" />
                      聊天
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
