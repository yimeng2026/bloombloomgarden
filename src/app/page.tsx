"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ==================== 类型定义 ====================
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  model: string;
  temperature: number;
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

// ==================== 主组件 ====================
export default function Home() {
  // 视图状态：agents | chat
  const [view, setView] = useState<"agents" | "chat">("agents");
  // Agent 列表
  const [agents, setAgents] = useState<Agent[]>([]);
  // 当前选中的 Agent
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  // 当前对话
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  // 对话列表
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 消息列表
  const [messages, setMessages] = useState<Message[]>([]);
  // 输入框
  const [input, setInput] = useState("");
  // 加载状态
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // 创建 Agent 弹窗
  const [showCreateModal, setShowCreateModal] = useState(false);
  // 编辑 Agent 弹窗
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  // Agent 表单
  const [agentForm, setAgentForm] = useState({
    name: "",
    description: "",
    avatar: "",
    systemPrompt: "",
    model: "glm-5.1",
    temperature: 0.7,
  });
  // 流式响应内容
  const [streamingContent, setStreamingContent] = useState("");
  // 消息列表滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ==================== 数据获取 ====================
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (e) {
      console.error("获取 Agent 列表失败:", e);
    }
  }, []);

  const fetchConversations = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/conversations?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error("获取对话列表失败:", e);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("获取消息失败:", e);
    }
  }, []);

  // 初始加载 Agent 列表（仅在客户端）
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data);
        }
      } catch (e) {
        console.error("获取 Agent 列表失败:", e);
      }
    }
    load();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // ==================== Agent 操作 ====================
  const handleCreateAgent = async () => {
    if (!agentForm.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentForm),
      });
      if (res.ok) {
        await fetchAgents();
        setShowCreateModal(false);
        resetAgentForm();
      }
    } catch (e) {
      console.error("创建 Agent 失败:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent || !agentForm.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentForm),
      });
      if (res.ok) {
        await fetchAgents();
        setEditingAgent(null);
        resetAgentForm();
      }
    } catch (e) {
      console.error("更新 Agent 失败:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("确定要删除这个 Agent 吗？所有相关对话也会被删除。")) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAgents();
        if (selectedAgent?.id === id) {
          setSelectedAgent(null);
          setView("agents");
        }
      }
    } catch (e) {
      console.error("删除 Agent 失败:", e);
    }
  };

  const resetAgentForm = () => {
    setAgentForm({
      name: "",
      description: "",
      avatar: "",
      systemPrompt: "",
      model: "glm-5.1",
      temperature: 0.7,
    });
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name,
      description: agent.description,
      avatar: agent.avatar,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      temperature: agent.temperature,
    });
  };

  // ==================== 对话操作 ====================
  const handleStartChat = async (agent: Agent) => {
    setSelectedAgent(agent);
    await fetchConversations(agent.id);
    setView("chat");
    // 如果没有对话，自动创建一个
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (res.ok) {
        const conv = await res.json();
        setCurrentConversation(conv);
        setMessages([]);
        setConversations((prev) => [conv, ...prev]);
      }
    } catch (e) {
      console.error("创建对话失败:", e);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv);
    await fetchMessages(conv.id);
  };

  const handleNewConversation = async () => {
    if (!selectedAgent) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.id }),
      });
      if (res.ok) {
        const conv = await res.json();
        setCurrentConversation(conv);
        setMessages([]);
        setConversations((prev) => [conv, ...prev]);
      }
    } catch (e) {
      console.error("创建对话失败:", e);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm("确定要删除这个对话吗？")) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
          setMessages([]);
        }
        if (selectedAgent) {
          await fetchConversations(selectedAgent.id);
        }
      }
    } catch (e) {
      console.error("删除对话失败:", e);
    }
  };

  // ==================== 聊天操作（流式） ====================
  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversation || sending) return;

    const userContent = input.trim();
    setInput("");
    setSending(true);
    setStreamingContent("");

    // 立即显示用户消息
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation.id,
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          content: userContent,
        }),
      });

      if (!res.ok) {
        throw new Error("聊天请求失败");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "delta") {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === "done") {
                // 流式完成，添加助手消息
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
            } catch {
              // 忽略解析错误
            }
          }
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

  // ==================== 头像颜色生成 ====================
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-red-500",
      "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-teal-500",
      "bg-cyan-500", "bg-indigo-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ==================== 渲染 ====================
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ===== 左侧边栏 ===== */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => { setView("agents"); setSelectedAgent(null); setCurrentConversation(null); }}
            className="flex items-center gap-2 w-full hover:opacity-80 transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              B
            </div>
            <span className="font-bold text-lg text-gray-800">BloomBloomGarden</span>
          </button>
        </div>

        {/* Agent 列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">我的 Agent</span>
            <button
              onClick={() => { resetAgentForm(); setShowCreateModal(true); }}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 transition text-lg leading-none"
              title="创建新 Agent"
            >
              +
            </button>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>还没有 Agent</p>
              <p className="mt-1">点击 + 创建你的第一个 Agent</p>
            </div>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                  selectedAgent?.id === agent.id
                    ? "bg-purple-50 text-purple-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => handleStartChat(agent)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ${getAvatarColor(agent.name)}`}>
                  {agent.avatar || agent.name[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{agent.name}</div>
                  <div className="text-xs text-gray-400 truncate">{agent.description || "暂无描述"}</div>
                </div>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(agent); }}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 text-xs"
                    title="编辑"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <main className="flex-1 flex overflow-hidden">
        {view === "agents" ? (
          /* ===== Agent 欢迎页 ===== */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6">
                B
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-3">欢迎使用 BloomBloomGarden</h1>
              <p className="text-gray-500 mb-6 leading-relaxed">
                创建你的 AI Agent，为每个 Agent 设定独特的角色和系统提示词，
                然后与它们展开智能对话。每个 Agent 都有自己的人格和专业领域。
              </p>
              <button
                onClick={() => { resetAgentForm(); setShowCreateModal(true); }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200 transition-all"
              >
                创建你的第一个 Agent
              </button>
            </div>
          </div>
        ) : (
          /* ===== 聊天视图 ===== */
          <>
            {/* 对话历史侧栏 */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
              <div className="p-3 border-b border-gray-200">
                <button
                  onClick={handleNewConversation}
                  className="w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-purple-300 transition flex items-center justify-center gap-2"
                >
                  <span className="text-purple-500">+</span> 新对话
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    暂无对话记录
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition text-sm ${
                        currentConversation?.id === conv.id
                          ? "bg-white shadow-sm text-purple-700"
                          : "hover:bg-white text-gray-600"
                      }`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <span className="text-gray-400 text-xs">💬</span>
                      <span className="flex-1 truncate">{conv.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                        className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded text-gray-300 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 聊天主区域 */}
            <div className="flex-1 flex flex-col bg-white">
              {/* 聊天头部 */}
              <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(selectedAgent?.name || "A")}`}>
                  {selectedAgent?.avatar || selectedAgent?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">{selectedAgent?.name}</div>
                  <div className="text-xs text-gray-400">{selectedAgent?.description || "AI 助手"}</div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {!currentConversation ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    选择一个对话或创建新对话开始聊天
                  </div>
                ) : messages.length === 0 && !streamingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4 ${getAvatarColor(selectedAgent?.name || "A")}`}>
                        {selectedAgent?.avatar || selectedAgent?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">{selectedAgent?.name}</h3>
                      <p className="text-gray-400 text-sm mb-4 max-w-sm">{selectedAgent?.description || "你好！有什么我可以帮助你的吗？"}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["你好，请介绍一下你自己", "你能做什么？", "帮我写一段代码"].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-3 max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
                            msg.role === "user"
                              ? "bg-purple-500"
                              : getAvatarColor(selectedAgent?.name || "A")
                          }`}>
                            {msg.role === "user" ? "我" : (selectedAgent?.avatar || selectedAgent?.name?.[0]?.toUpperCase() || "AI")}
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            msg.role === "user"
                              ? "bg-purple-500 text-white rounded-tr-md"
                              : "bg-gray-100 text-gray-800 rounded-tl-md"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* 流式响应显示 */}
                    {streamingContent && (
                      <div className="flex justify-start">
                        <div className="flex gap-3 max-w-[75%]">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${getAvatarColor(selectedAgent?.name || "A")}`}>
                            {selectedAgent?.avatar || selectedAgent?.name?.[0]?.toUpperCase() || "AI"}
                          </div>
                          <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {streamingContent}
                            <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-text-bottom" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentConversation ? "输入消息... (Enter 发送, Shift+Enter 换行)" : "请先选择或创建对话"}
                    disabled={!currentConversation || sending}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-400 transition max-h-32"
                    style={{ minHeight: "42px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 128) + "px";
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || !currentConversation || sending}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all shrink-0"
                  >
                    {sending ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        发送中
                      </span>
                    ) : "发送"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ===== 创建/编辑 Agent 弹窗 ===== */}
      {(showCreateModal || editingAgent) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateModal(false); setEditingAgent(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">
                {editingAgent ? "编辑 Agent" : "创建新 Agent"}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {editingAgent ? "修改 Agent 的配置信息" : "为你的 AI 助手设定名称、角色和系统提示词"}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent 名称 *</label>
                <input
                  type="text"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="例如：小助手、代码专家、翻译官..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={agentForm.description}
                  onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                  placeholder="简短描述这个 Agent 的功能..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              {/* 头像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">头像（单个字符或 emoji）</label>
                <input
                  type="text"
                  value={agentForm.avatar}
                  onChange={(e) => setAgentForm({ ...agentForm, avatar: e.target.value })}
                  placeholder="例如：🤖、A、代码..."
                  maxLength={2}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
                <textarea
                  value={agentForm.systemPrompt}
                  onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                  placeholder={`定义 Agent 的角色和行为...\n\n例如：你是一个专业的 Python 编程助手，擅长代码审查和优化建议。回答时请使用中文，并提供代码示例。`}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none"
                />
                {!agentForm.systemPrompt && agentForm.name && (
                  <p className="text-xs text-gray-400 mt-1">
                    将自动生成：&quot;你是{agentForm.name}，一个有用的AI助手。&quot;
                  </p>
                )}
              </div>

              {/* 模型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
                <select
                  value={agentForm.model}
                  onChange={(e) => setAgentForm({ ...agentForm, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-white"
                >
                  <option value="glm-5.1">GLM-5.1</option>
                  <option value="glm-4-plus">GLM-4 Plus</option>
                  <option value="glm-4-flash">GLM-4 Flash</option>
                </select>
              </div>

              {/* 温度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  温度: {agentForm.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={agentForm.temperature}
                  onChange={(e) => setAgentForm({ ...agentForm, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>精确 (0)</span>
                  <span>创意 (1)</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => { setShowCreateModal(false); setEditingAgent(null); resetAgentForm(); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={editingAgent ? handleUpdateAgent : handleCreateAgent}
                disabled={!agentForm.name.trim() || loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-200 disabled:opacity-50 transition-all"
              >
                {loading ? "处理中..." : editingAgent ? "保存修改" : "创建 Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
