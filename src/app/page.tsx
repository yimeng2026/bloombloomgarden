"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AGENT_ROLES, LLM_PROVIDERS, AGENT_PLATFORMS } from "@/lib/platforms";

// ==================== 类型定义 ====================
interface Agent {
  id: string; name: string; description: string; avatar: string; systemPrompt: string;
  model: string; temperature: number; apiKey: string; llmProvider: string;
  agentPlatform: string; skills: string; channels: string; role: string;
  createdAt: string; updatedAt: string; _count?: { conversations: number };
}

interface AgentGroup {
  id: string; name: string; description: string; avatar: string; mode: string;
  createdAt: string; updatedAt: string;
  members: { id: string; agentId: string; role: string; agent: Agent }[];
  childGroups: { id: string; childGroupId: string; childGroup: { id: string; name: string; avatar: string; mode: string } }[];
  _count?: { conversations: number };
}

interface Conversation {
  id: string; title: string; agentId?: string; groupId?: string;
  createdAt: string; updatedAt: string;
  agent?: { name: string; avatar: string }; group?: { name: string; mode: string };
  _count?: { messages: number };
}

interface Message {
  id: string; conversationId: string; role: string; content: string; agentName: string; createdAt: string;
}

// ==================== API Key 自动检测 ====================
function detectProvider(apiKey: string): { provider: string; model: string } {
  if (apiKey.includes(".bigmodel.") || (apiKey.includes(".") && apiKey.length < 40)) return { provider: "zhipu", model: "glm-5.1" };
  if (apiKey.startsWith("sk-") && apiKey.length > 50) return { provider: "openai", model: "gpt-4o" };
  if (apiKey.startsWith("sk-ant-")) return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  if (apiKey.startsWith("sk-") && apiKey.length <= 50) return { provider: "deepseek", model: "deepseek-r1" };
  return { provider: "zhipu", model: "glm-5.1" };
}

const GROUP_MODES = [
  { id: "relay", name: "接力模式", icon: "🔄", desc: "Agent依次发言，前一个的输出作为后一个的输入" },
  { id: "debate", name: "辩论模式", icon: "⚔️", desc: "Agent分为正反方，交替论证" },
  { id: "vote", name: "投票模式", icon: "🗳️", desc: "每个Agent独立给出意见" },
  { id: "parallel", name: "并行模式", icon: "⚡", desc: "所有Agent同时回答" },
  { id: "roundtable", name: "圆桌模式", icon: "🪑", desc: "多轮讨论，每轮每个Agent发言一次" },
];

// ==================== 主组件 ====================
export default function Home() {
  const [tab, setTab] = useState<"agents" | "groups" | "chat">("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AgentGroup | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 创建Agent表单
  const [showCreate, setShowCreate] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [customName, setCustomName] = useState("");
  const [detectedProvider, setDetectedProvider] = useState({ provider: "zhipu", model: "glm-5.1" });

  // 创建群组表单
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMode, setGroupMode] = useState("relay");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedChildGroupIds, setSelectedChildGroupIds] = useState<string[]>([]);

  // ==================== 数据获取 ====================
  const fetchAgents = useCallback(async () => {
    try { const res = await fetch("/api/agents"); if (res.ok) setAgents(await res.json()); } catch (e) { console.error(e); }
  }, []);

  const fetchGroups = useCallback(async () => {
    try { const res = await fetch("/api/groups"); if (res.ok) setGroups(await res.json()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [ar, gr] = await Promise.all([fetch("/api/agents"), fetch("/api/groups")]);
        if (ar.ok) setAgents(await ar.json());
        if (gr.ok) setGroups(await gr.json());
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  // ==================== Agent 操作 ====================
  const handleApiKeyChange = (key: string) => { setApiKey(key); if (key.trim().length > 10) setDetectedProvider(detectProvider(key.trim())); };

  const handleCreateAgent = async () => {
    if (!apiKey.trim() || !selectedRole) return;
    setLoading(true);
    try {
      const role = AGENT_ROLES.find((r) => r.id === selectedRole);
      if (!role) return;
      const res = await fetch("/api/agents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customName.trim() || role.name, description: role.tagline, avatar: role.emoji, systemPrompt: role.systemPrompt, model: detectedProvider.model, temperature: 0.7, apiKey: apiKey.trim(), llmProvider: detectedProvider.provider, agentPlatform: role.recommendedPlatform, skills: role.recommendedSkills, channels: ["web"], role: role.id }),
      });
      if (res.ok) { await fetchAgents(); setShowCreate(false); setApiKey(""); setSelectedRole(""); setCustomName(""); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    await fetchAgents();
    if (selectedAgent?.id === id) { setSelectedAgent(null); setTab("agents"); }
  };

  // ==================== 群组操作 ====================
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedAgentIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), mode: groupMode, agentIds: selectedAgentIds, childGroupIds: selectedChildGroupIds }),
      });
      if (res.ok) { await fetchGroups(); setShowCreateGroup(false); setGroupName(""); setSelectedAgentIds([]); setSelectedChildGroupIds([]); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("确定删除群组？")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    await fetchGroups();
    if (selectedGroup?.id === id) { setSelectedGroup(null); setTab("agents"); }
  };

  const toggleAgentInGroup = (id: string) => {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleChildGroup = (id: string) => {
    setSelectedChildGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // ==================== 聊天操作 ====================
  const handleStartChat = async (agent: Agent) => {
    setSelectedAgent(agent); setSelectedGroup(null);
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: agent.id }) });
      if (res.ok) { const conv = await res.json(); setCurrentConversation(conv); setMessages([]); setTab("chat"); }
    } catch (e) { console.error(e); }
  };

  const handleStartGroupChat = async (group: AgentGroup) => {
    setSelectedGroup(group); setSelectedAgent(null);
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: group.id, title: `群组: ${group.name}` }) });
      if (res.ok) { const conv = await res.json(); setCurrentConversation(conv); setMessages([]); setTab("chat"); }
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim(); setInput(""); setSending(true); setStreamingContent("");
    const isGroupChat = !!currentConversation?.groupId;

    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, conversationId: currentConversation?.id || "", role: "user", content: userMsg, agentName: "用户", createdAt: new Date().toISOString() }]);

    try {
      const endpoint = isGroupChat ? "/api/chat/group" : "/api/chat";
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: currentConversation?.id, content: userMsg }) });

      if (!res.ok || !res.body) { setSending(false); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      let currentAgentName = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              setStreamingContent((prev) => prev + data.content);
            } else if (data.type === "agent_reply") {
              currentAgentName = data.agentName;
              setMessages((prev) => [...prev, { id: data.messageId || `m-${Date.now()}`, conversationId: currentConversation?.id || "", role: "assistant", content: data.content, agentName: data.agentName, createdAt: new Date().toISOString() }]);
              setStreamingContent("");
            } else if (data.type === "done") {
              if (streamingContent) {
                setMessages((prev) => [...prev, { id: `a-${Date.now()}`, conversationId: currentConversation?.id || "", role: "assistant", content: streamingContent, agentName: currentAgentName || "AI", createdAt: new Date().toISOString() }]);
                setStreamingContent("");
              }
            } else if (data.type === "agent_error") {
              setMessages((prev) => [...prev, { id: `e-${Date.now()}`, conversationId: currentConversation?.id || "", role: "assistant", content: `❌ ${data.agentName}: ${data.error}`, agentName: "系统", createdAt: new Date().toISOString() }]);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const getAvatarColor = (name: string) => {
    const colors = ["bg-blue-500","bg-purple-500","bg-pink-500","bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500","bg-teal-500","bg-cyan-500","bg-indigo-500"];
    let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ==================== 渲染 ====================
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ===== 左侧边栏 ===== */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <button onClick={() => { setTab("agents"); setSelectedAgent(null); setSelectedGroup(null); setCurrentConversation(null); }}
            className="flex items-center gap-2 w-full hover:opacity-80 transition">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">B</div>
            <span className="font-bold text-lg text-gray-800">BloomBloomGarden</span>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-200">
          {(["agents", "groups"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition ${tab === t ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "agents" ? "🤖 Agent" : "👥 群组"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {tab === "agents" && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">我的 Agent ({agents.length})</span>
                <button onClick={() => setShowCreate(true)} className="text-purple-500 hover:text-purple-700 text-lg">+</button>
              </div>
              {agents.map((agent) => (
                <div key={agent.id} onClick={() => setSelectedAgent(agent)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${selectedAgent?.id === agent.id ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50"}`}>
                  <div className={`w-8 h-8 ${getAvatarColor(agent.name)} rounded-full flex items-center justify-center text-white text-sm`}>
                    {agent.avatar || agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{agent.name}</div>
                    <div className="text-xs text-gray-400">{agent.llmProvider}/{agent.model}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "groups" && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">群组 ({groups.length})</span>
                <button onClick={() => setShowCreateGroup(true)} className="text-purple-500 hover:text-purple-700 text-lg">+</button>
              </div>
              {groups.map((group) => (
                <div key={group.id} onClick={() => setSelectedGroup(group)}
                  className={`p-2 rounded-lg cursor-pointer transition ${selectedGroup?.id === group.id ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm">👥</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{group.name}</div>
                      <div className="text-xs text-gray-400">{GROUP_MODES.find((m) => m.id === group.mode)?.icon} {group.members.length}人</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <main className="flex-1 flex flex-col min-w-0">
        {tab === "chat" && currentConversation ? (
          /* ===== 聊天界面 ===== */
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
              <button onClick={() => { setTab(selectedGroup ? "groups" : "agents"); setCurrentConversation(null); }}
                className="text-gray-400 hover:text-gray-600">←</button>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {selectedGroup ? `👥 ${selectedGroup.name}` : selectedAgent ? `🤖 ${selectedAgent.name}` : "对话"}
                </div>
                {selectedGroup && (
                  <div className="text-xs text-gray-400">
                    {GROUP_MODES.find((m) => m.id === selectedGroup.mode)?.name} · {selectedGroup.members.length} Agent
                    {selectedGroup.childGroups.length > 0 && ` · ${selectedGroup.childGroups.length} 子群组`}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${msg.role === "user" ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-800"} rounded-2xl px-4 py-2`}>
                    {msg.agentName && msg.role !== "user" && (
                      <div className="text-xs font-semibold text-purple-600 mb-1">{msg.agentName}</div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-2xl px-4 py-2">
                    <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                    <span className="inline-block w-1 h-4 bg-purple-500 animate-pulse ml-1" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={selectedGroup ? `向 ${selectedGroup.name} 发送消息...` : "输入消息..."}
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  rows={1} />
                <button onClick={handleSendMessage} disabled={sending || !input.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-40 transition">
                  {sending ? "..." : "发送"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ===== Agent/群组详情 ===== */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            {selectedAgent ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full mx-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 ${getAvatarColor(selectedAgent.name)} rounded-2xl flex items-center justify-center text-white text-2xl`}>
                    {selectedAgent.avatar || selectedAgent.name[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedAgent.name}</h2>
                    <p className="text-sm text-gray-500">{selectedAgent.llmProvider}/{selectedAgent.model}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <div>🔑 API Key: <span className="font-mono text-xs">{selectedAgent.apiKey}</span></div>
                  <div>🎭 角色: {selectedAgent.role || "自定义"}</div>
                  <div>🏗️ 平台: {AGENT_PLATFORMS.find((p) => p.id === selectedAgent.agentPlatform)?.name || selectedAgent.agentPlatform}</div>
                  <div>🔧 技能: {JSON.parse(selectedAgent.skills || "[]").length} 个</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleStartChat(selectedAgent)}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition">
                    💬 开始聊天
                  </button>
                  <button onClick={() => handleDeleteAgent(selectedAgent.id)}
                    className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition">删除</button>
                </div>
              </div>
            ) : selectedGroup ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 max-w-lg w-full mx-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl">👥</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedGroup.name}</h2>
                    <p className="text-sm text-gray-500">{GROUP_MODES.find((m) => m.id === selectedGroup.mode)?.icon} {GROUP_MODES.find((m) => m.id === selectedGroup.mode)?.name}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">成员 Agent:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.members.map((m) => (
                      <span key={m.id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                        {m.agent.avatar} {m.agent.name} {m.role === "leader" ? "⭐" : ""}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedGroup.childGroups.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">子群组:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroup.childGroups.map((cg) => (
                        <span key={cg.id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                          🏗️ {cg.childGroup.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleStartGroupChat(selectedGroup)}
                    className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition">
                    💬 群组聊天
                  </button>
                  <button onClick={() => handleDeleteGroup(selectedGroup.id)}
                    className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition">删除</button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🌸</div>
                <p className="text-lg font-medium">BloomBloomGarden</p>
                <p className="text-sm mt-1">粘贴 API Key → 选角色 → 一键创建 Agent</p>
                <p className="text-sm mt-1">组合多个 Agent → 创建群组 → 多模式协作</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===== 创建 Agent 弹窗 ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">🤖 创建 Agent</h2>
              <p className="text-sm text-gray-500 mt-1">粘贴 API Key → 选角色 → 一键创建</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔑 API Key</label>
                <input value={apiKey} onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="粘贴你的 API Key..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                {apiKey.length > 10 && (
                  <div className="mt-1 text-xs text-green-600">
                    ✅ 检测到: {LLM_PROVIDERS.find((p) => p.id === detectedProvider.provider)?.name} / {detectedProvider.model}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎭 选择角色</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {AGENT_ROLES.map((role) => (
                    <button key={role.id} onClick={() => setSelectedRole(role.id)}
                      className={`p-2 rounded-lg text-left text-xs transition ${selectedRole === role.id ? "bg-purple-50 border-2 border-purple-400" : "bg-gray-50 border border-gray-100 hover:bg-gray-100"}`}>
                      <span className="text-lg">{role.emoji}</span>
                      <span className="font-medium ml-1">{role.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">✏️ 自定义名称（可选）</label>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder={AGENT_ROLES.find((r) => r.id === selectedRole)?.name || "Agent 名称"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => { setShowCreate(false); setApiKey(""); setSelectedRole(""); setCustomName(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition">取消</button>
              <button onClick={handleCreateAgent} disabled={!apiKey.trim() || !selectedRole || loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-40 transition-all">
                {loading ? "创建中..." : "一键创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 创建群组弹窗 ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[560px] max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">👥 创建 Agent 群组</h2>
              <p className="text-sm text-gray-500 mt-1">组合多个 Agent，选择协作模式</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  placeholder="例如：量化交易团队"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">协作模式</label>
                <div className="grid grid-cols-1 gap-2">
                  {GROUP_MODES.map((mode) => (
                    <button key={mode.id} onClick={() => setGroupMode(mode.id)}
                      className={`p-3 rounded-lg text-left transition ${groupMode === mode.id ? "bg-indigo-50 border-2 border-indigo-400" : "bg-gray-50 border border-gray-100 hover:bg-gray-100"}`}>
                      <span className="font-medium text-sm">{mode.icon} {mode.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择 Agent ({selectedAgentIds.length} 个)</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {agents.map((agent) => (
                    <button key={agent.id} onClick={() => toggleAgentInGroup(agent.id)}
                      className={`p-2 rounded-lg text-left text-xs transition ${selectedAgentIds.includes(agent.id) ? "bg-purple-50 border-2 border-purple-400" : "bg-gray-50 border border-gray-100"}`}>
                      {agent.avatar} {agent.name}
                    </button>
                  ))}
                </div>
              </div>
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">嵌套子群组 ({selectedChildGroupIds.length} 个)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {groups.map((group) => (
                      <button key={group.id} onClick={() => toggleChildGroup(group.id)}
                        className={`p-2 rounded-lg text-left text-xs transition ${selectedChildGroupIds.includes(group.id) ? "bg-indigo-50 border-2 border-indigo-400" : "bg-gray-50 border border-gray-100"}`}>
                        👥 {group.name} ({group.members.length}人)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => { setShowCreateGroup(false); setGroupName(""); setSelectedAgentIds([]); setSelectedChildGroupIds([]); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition">取消</button>
              <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedAgentIds.length === 0 || loading}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-40 transition-all">
                {loading ? "创建中..." : "创建群组"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
