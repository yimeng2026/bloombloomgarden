"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AGENT_ROLES, LLM_PROVIDERS, AGENT_PLATFORMS } from "@/lib/platforms";

// ==================== 类型定义 ====================
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  apiKey: string;
  llmProvider: string;
  agentPlatform: string;
  skills: string;
  channels: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count?: { conversations: number };
}

interface Conversation {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  agent?: { name: string; avatar: string; systemPrompt?: string; model?: string; temperature?: number };
  _count?: { messages: number };
}

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

// ==================== API Key 自动检测供应商 ====================
function detectProvider(apiKey: string): { provider: string; model: string } {
  if (apiKey.includes(".bigmodel.") || (apiKey.includes(".") && apiKey.length < 40))
    return { provider: "zhipu", model: "glm-5.1" };
  if (apiKey.startsWith("sk-") && apiKey.length > 50)
    return { provider: "openai", model: "gpt-4o" };
  if (apiKey.startsWith("sk-ant-"))
    return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  if (apiKey.startsWith("sk-") && apiKey.length <= 50)
    return { provider: "deepseek", model: "deepseek-r1" };
  return { provider: "zhipu", model: "glm-5.1" };
}

// ==================== 主组件 ====================
export default function Home() {
  const [view, setView] = useState<"agents" | "chat">("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 创建表单 - 极简版
  const [showCreate, setShowCreate] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [detectedProvider, setDetectedProvider] = useState<{ provider: string; model: string }>({ provider: "zhipu", model: "glm-5.1" });

  // ==================== 数据获取 ====================
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgents(await res.json());
    } catch (e) { console.error("获取 Agent 列表失败:", e); }
  }, []);

  const fetchConversations = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/conversations?agentId=${agentId}`);
      if (res.ok) setConversations(await res.json());
    } catch (e) { console.error("获取对话列表失败:", e); }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) { console.error("获取消息失败:", e); }
  }, []);

  // 初始加载
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) { const data = await res.json(); setAgents(data); }
      } catch (e) { console.error("获取 Agent 列表失败:", e); }
    }
    load();
  }, []);

  // ==================== API Key 变化自动检测 ====================
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (key.trim().length > 10) {
      setDetectedProvider(detectProvider(key.trim()));
    }
  };

  // ==================== 创建 Agent（一键） ====================
  const handleCreateAgent = async () => {
    if (!apiKey.trim() || !selectedRole) return;
    setLoading(true);
    try {
      const role = AGENT_ROLES.find((r) => r.id === selectedRole);
      if (!role) return;

      const name = customName.trim() || role.name;
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: role.tagline,
          avatar: role.emoji,
          systemPrompt: role.systemPrompt,
          model: detectedProvider.model,
          temperature: 0.7,
          apiKey: apiKey.trim(),
          llmProvider: detectedProvider.provider,
          agentPlatform: role.recommendedPlatform,
          skills: role.recommendedSkills,
          channels: ["web"],
          role: role.id,
        }),
      });
      if (res.ok) {
        await fetchAgents();
        setShowCreate(false);
        setApiKey("");
        setSelectedRole("");
        setCustomName("");
      } else {
        const err = await res.json();
        alert(err.error || "创建失败");
      }
    } catch (e) {
      console.error("创建 Agent 失败:", e);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 对话操作 ====================
  const handleStartChat = async (agent: Agent) => {
    setSelectedAgent(agent);
    await fetchConversations(agent.id);
    setView("chat");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setCurrentConversation(conv);
        setMessages([]);
      }
    } catch (e) { console.error("创建对话失败:", e); }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv);
    await fetchMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversation || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setStreamingContent("");

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation.id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversation.id, content }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        alert(err.error || "发送失败");
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setSending(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "chunk") {
              setStreamingContent((prev) => prev + data.content);
            } else if (data.type === "done") {
              const assistantMsg: Message = {
                id: data.messageId,
                conversationId: currentConversation.id,
                role: "assistant",
                content: data.fullContent,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingContent("");
            } else if (data.type === "error") {
              alert(`AI 响应错误: ${data.error}`);
              setStreamingContent("");
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("发送消息失败:", e);
      alert("发送消息失败，请重试");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("确定要删除这个 Agent 吗？")) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAgents();
        if (selectedAgent?.id === id) { setSelectedAgent(null); setView("agents"); }
      }
    } catch (e) { console.error("删除失败:", e); }
  };

  // ==================== 头像颜色 ====================
  const getAvatarColor = (name: string) => {
    const colors = ["bg-blue-500","bg-purple-500","bg-pink-500","bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500","bg-teal-500","bg-cyan-500","bg-indigo-500"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ==================== 渲染 ====================
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ===== 左侧边栏 ===== */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <button onClick={() => { setView("agents"); setSelectedAgent(null); setCurrentConversation(null); }}
            className="flex items-center gap-2 w-full hover:opacity-80 transition">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">B</div>
            <span className="font-bold text-lg text-gray-800">BloomBloomGarden</span>
          </button>
        </div>

        {/* Agent 列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">我的 Agent</span>
            <button onClick={() => setShowCreate(true)}
              className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md hover:bg-purple-100 transition font-medium">
              + 新建
            </button>
          </div>
          {agents.map((agent) => (
            <div key={agent.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${
                selectedAgent?.id === agent.id ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50 border border-transparent"
              }`}
              onClick={() => handleStartChat(agent)}>
              <div className={`w-9 h-9 ${getAvatarColor(agent.name)} rounded-lg flex items-center justify-center text-white text-sm shrink-0`}>
                {agent.avatar || agent.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{agent.name}</div>
                <div className="text-xs text-gray-400 truncate">{agent.role ? AGENT_ROLES.find(r => r.id === agent.role)?.tagline || agent.description : agent.description}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-xs p-1">✕</button>
            </div>
          ))}
          {agents.length === 0 && (
            <div className="text-center py-8 text-gray-300">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm">还没有 Agent</p>
              <p className="text-xs mt-1">点击「+ 新建」创建第一个</p>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-3 border-t border-gray-100 text-xs text-gray-300 text-center">
          粘贴 API Key → 选角色 → 开聊
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      {view === "agents" ? (
        /* 欢迎页 */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🌸</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">欢迎使用 BloomBloomGarden</h1>
            <p className="text-gray-500 mb-8">粘贴你的 API Key，选择一个角色，一键创建 Agent 开始对话</p>
            <button onClick={() => setShowCreate(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200 transition-all text-lg">
              创建第一个 Agent
            </button>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <div className="text-2xl mb-1">🔑</div>
                <div className="text-xs text-gray-500">粘贴 API Key</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <div className="text-2xl mb-1">🎭</div>
                <div className="text-xs text-gray-500">选择角色</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <div className="text-2xl mb-1">💬</div>
                <div className="text-xs text-gray-500">开始对话</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 聊天视图 */
        <div className="flex-1 flex flex-col min-w-0">
          {/* 聊天头部 */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
            <button onClick={() => { setView("agents"); setSelectedAgent(null); setCurrentConversation(null); }}
              className="text-gray-400 hover:text-gray-600 transition">←</button>
            {selectedAgent && (
              <>
                <div className={`w-8 h-8 ${getAvatarColor(selectedAgent.name)} rounded-lg flex items-center justify-center text-white text-sm`}>
                  {selectedAgent.avatar || selectedAgent.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{selectedAgent.name}</div>
                  <div className="text-xs text-gray-400">{selectedAgent.model} · {selectedAgent.llmProvider}</div>
                </div>
              </>
            )}
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-500 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-white border border-gray-200 text-gray-800 text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">▊</span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent min-h-[44px] max-h-32"
                rows={1}
                disabled={sending}
              />
              <button onClick={handleSendMessage}
                disabled={!input.trim() || sending}
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200 disabled:opacity-40 transition-all text-sm shrink-0">
                {sending ? "..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 创建 Agent 弹窗 ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-lg font-bold text-gray-800">创建 Agent</h2>
              <p className="text-xs text-gray-500 mt-0.5">粘贴 API Key → 选择角色 → 一键创建</p>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Step 1: API Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  🔑 API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="粘贴你的 API Key（如：xxxx.xxxx）"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                />
                {apiKey.length > 10 && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="text-green-500">✓ 已识别</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {LLM_PROVIDERS.find(p => p.id === detectedProvider.provider)?.name || detectedProvider.provider}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {detectedProvider.model}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: 选择角色 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  🎭 选择角色 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {AGENT_ROLES.map((role) => (
                    <button key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedRole === role.id
                          ? "border-purple-300 bg-purple-50 ring-2 ring-purple-200"
                          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{role.emoji}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{role.name}</div>
                          <div className="text-xs text-gray-400">{role.tagline}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: 自定义名称（可选） */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ✏️ 自定义名称 <span className="text-gray-400 font-normal">（可选，默认用角色名）</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={selectedRole ? AGENT_ROLES.find(r => r.id === selectedRole)?.name : "选择角色后自动填充"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                />
              </div>

              {/* 预览 */}
              {selectedRole && apiKey.length > 10 && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                  <div className="text-xs font-semibold text-purple-700 mb-2">📋 即将创建</div>
                  <div className="space-y-1 text-xs text-gray-600">
                    {(() => {
                      const role = AGENT_ROLES.find(r => r.id === selectedRole);
                      const platform = AGENT_PLATFORMS.find(p => p.id === role?.recommendedPlatform);
                      const provider = LLM_PROVIDERS.find(p => p.id === detectedProvider.provider);
                      return (
                        <>
                          <div>名称：<b>{customName || role?.name}</b></div>
                          <div>角色：<b>{role?.name}</b> - {role?.tagline}</div>
                          <div>平台：<b>{platform?.name}</b></div>
                          <div>模型：<b>{provider?.name} / {detectedProvider.model}</b></div>
                          <div>技能：<b>{role?.recommendedSkills.length} 个</b></div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => { setShowCreate(false); setApiKey(""); setSelectedRole(""); setCustomName(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition">
                取消
              </button>
              <button onClick={handleCreateAgent}
                disabled={!apiKey.trim() || !selectedRole || loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-200 disabled:opacity-40 transition-all">
                {loading ? "创建中..." : "一键创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
