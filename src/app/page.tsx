"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AGENT_ROLES, LLM_PROVIDERS, AGENT_PLATFORMS } from "@/lib/platforms";
import { getPlatformInfo } from "@/lib/platform-adapter";

// ==================== 类型 ====================
interface Agent { id: string; name: string; description: string; avatar: string; systemPrompt: string; model: string; temperature: number; apiKey: string; llmProvider: string; agentPlatform: string; skills: string; channels: string; role: string; status: string; createdAt: string; updatedAt: string; _count?: { conversations: number }; }
interface AgentGroup { id: string; name: string; description: string; avatar: string; mode: string; swarmMode: string; humanControl: string; createdAt: string; updatedAt: string; members: { id: string; agentId: string; role: string; agent: Agent }[]; childGroups: { id: string; childGroupId: string; childGroup: { id: string; name: string; avatar: string; mode: string; swarmMode: string } }[]; _count?: { conversations: number }; }
interface Conversation { id: string; title: string; agentId?: string; groupId?: string; createdAt: string; updatedAt: string; agent?: { name: string; avatar: string }; group?: { name: string; mode: string }; _count?: { messages: number }; }
interface Message { id: string; conversationId: string; role: string; content: string; agentName: string; approved: boolean; createdAt: string; }

// ==================== localStorage 键 ====================
const LS_AGENTS_KEY = "bloomgarden_agents";
const LS_CHATS_KEY = "bloomgarden_chats";

function loadLocalAgents(): Agent[] {
  try { return JSON.parse(localStorage.getItem(LS_AGENTS_KEY) || "[]"); } catch { return []; }
}
function saveLocalAgents(agents: Agent[]) { localStorage.setItem(LS_AGENTS_KEY, JSON.stringify(agents)); }
const LS_GROUPS_KEY = "bloomgarden_groups";
function loadLocalGroups(): AgentGroup[] {
  try { return JSON.parse(localStorage.getItem(LS_GROUPS_KEY) || "[]"); } catch { return []; }
}
function saveLocalGroups(groups: AgentGroup[]) { localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(groups)); }
function loadLocalChats(): Record<string, Message[]> {
  try { return JSON.parse(localStorage.getItem(LS_CHATS_KEY) || "{}"); } catch { return {}; }
}
function saveLocalChats(chats: Record<string, Message[]>) { localStorage.setItem(LS_CHATS_KEY, JSON.stringify(chats)); }

// ==================== 蜂群协作机制 ====================
const SWARM_MODES = [
  { id: "basic", name: "基础蜂群", icon: "🐝", desc: "按编排模式（接力/辩论/投票/并行/圆桌）执行", color: "from-amber-400 to-orange-400" },
  { id: "stigmergy", name: "信号传递", icon: "🧪", desc: "Agent通过共享信息素间接协作，无需直接通信", color: "from-green-400 to-emerald-400" },
  { id: "hierarchical", name: "层级委派", icon: "👑", desc: "Leader分解任务→Worker执行→Leader汇总", color: "from-blue-400 to-indigo-400" },
  { id: "pipeline", name: "流水线", icon: "🏭", desc: "每个Agent处理上一步的输出，逐步精炼", color: "from-purple-400 to-pink-400" },
  { id: "consensus", name: "共识机制", icon: "🤝", desc: "多轮讨论直到Agent达成共识", color: "from-teal-400 to-cyan-400" },
  { id: "adversarial", name: "红蓝对抗", icon: "⚔️", desc: "红队攻击→蓝队防守→方案更健壮", color: "from-red-400 to-rose-400" },
  { id: "mentor", name: "导师学徒", icon: "👨‍🏫", desc: "资深Agent示范→新手学习→导师点评", color: "from-yellow-400 to-amber-400" },
];

// 人工干预级别
const HUMAN_CONTROL_LEVELS = [
  { id: "observe", name: "观察模式", icon: "👁️", desc: "AI自主运行，人类旁观学习" },
  { id: "approve", name: "审批模式", icon: "✅", desc: "AI输出需人类审批后才发送" },
  { id: "copilot", name: "副驾驶模式", icon: "🎮", desc: "人类可随时注入指令引导方向" },
  { id: "veto", name: "否决模式", icon: "🛑", desc: "人类可否决任何Agent的输出" },
];

// ==================== API Key 检测 ====================
function detectProvider(apiKey: string) {
  if (apiKey.startsWith("sk-or-v1-")) return { provider: "openrouter", model: "moonshotai/kimi-k2.5" };
  if (apiKey.includes(".bigmodel.") || (apiKey.includes(".") && apiKey.length < 40)) return { provider: "zhipu", model: "glm-5.1" };
  if (apiKey.startsWith("sk-") && apiKey.length > 50) return { provider: "openai", model: "gpt-4o" };
  if (apiKey.startsWith("sk-ant-")) return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  if (apiKey.startsWith("sk-") && apiKey.length <= 50) return { provider: "deepseek", model: "deepseek-r1" };
  return { provider: "zhipu", model: "glm-5.1" };
}

// ==================== 主组件 ====================
export default function Home() {
  // 视图：dashboard | agents | canvas | chat
  const [view, setView] = useState<"dashboard" | "agents" | "canvas" | "chat">("dashboard");
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
  const [platformStatus, setPlatformStatus] = useState<{ logo: string; name: string; status: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 创建Agent
  const [showCreate, setShowCreate] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [customName, setCustomName] = useState("");
  const [detectedProvider, setDetectedProvider] = useState({ provider: "zhipu", model: "glm-5.1" });

  // 创建群组
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [groupMode, setGroupMode] = useState("relay");
  const [swarmMode, setSwarmMode] = useState("basic");
  const [humanControl, setHumanControl] = useState("observe");

  // 画布视图
  const [canvasNodes, setCanvasNodes] = useState<{ id: string; x: number; y: number; agent?: Agent; group?: AgentGroup; type: string }[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<{ from: string; to: string }[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // 人工干预
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [injectMode, setInjectMode] = useState(false);
  const [injectTarget, setInjectTarget] = useState("");

  // 全局暴露（用于 E2E 测试）
  useEffect(() => {
    (window as any).__bloom_startChat__ = (agent: Agent) => {
      setSelectedAgent(agent); setSelectedGroup(null);
      const chats = loadLocalChats();
      const chatMessages = chats[agent.id] || [];
      setMessages(chatMessages);
      const convId = `conv-${agent.id}`;
      const conv: Conversation = { id: convId, title: `与 ${agent.name} 的对话`, agentId: agent.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), agent: { name: agent.name, avatar: agent.avatar } };
      setCurrentConversation(conv);
      setView("chat");
    };
    (window as any).__bloom_sendMessage__ = (content: string) => {
      setInput(content);
    };
  }, []);
  useEffect(() => {
    // 从 localStorage 加载本地 Agent 和群组
    const localAgents = loadLocalAgents();
    setAgents(localAgents);
    const localGroups = loadLocalGroups();
    setGroups(localGroups);
    setConversations([]);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  const fetchAgents = useCallback(async () => {
    // 本地 Agent 直接从 localStorage 读取
    setAgents(loadLocalAgents());
  }, []);

  const fetchGroups = useCallback(async () => { setGroups([]); }, []);
  const fetchConversations = useCallback(async () => { setConversations([]); }, []);

  // ==================== 创建Agent ====================
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (key.trim().length > 10) setDetectedProvider(detectProvider(key.trim()));
  };

  const handleCreateAgent = async () => {
    if (!apiKey.trim() || !selectedRole) return;
    setLoading(true);
    try {
      const role = AGENT_ROLES.find(r => r.id === selectedRole);
      if (!role) return;
      const name = customName.trim() || role.name;
      const res = await fetch("/api/agents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: role.tagline, avatar: role.emoji, systemPrompt: role.systemPrompt, model: detectedProvider.model, temperature: 0.7, apiKey: apiKey.trim(), llmProvider: detectedProvider.provider, agentPlatform: selectedPlatform || role.recommendedPlatform, skills: role.recommendedSkills, channels: ["web"], role: role.id }),
      });
      if (res.ok) {
        const newAgent = await res.json();
        // 保存完整 apiKey（后端返回的是脱敏的，但我们前端有原始值）
        const fullAgent: Agent = { ...newAgent, apiKey: apiKey.trim() };
        const updated = [fullAgent, ...loadLocalAgents()];
        saveLocalAgents(updated);
        setAgents(updated);
        setShowCreate(false); setApiKey(""); setSelectedRole(""); setSelectedPlatform(""); setCustomName("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "创建失败");
      }
    } catch (e) { console.error(e); alert("创建请求失败"); }
    finally { setLoading(false); }
  };

  // ==================== 创建群组 ====================
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedAgentIds.length === 0) return;
    setLoading(true);
    try {
      const memberAgents = agents.filter(a => selectedAgentIds.includes(a.id));
      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newGroup: AgentGroup = {
        id: groupId,
        name: groupName.trim(),
        description: `${swarmMode}模式群组`,
        avatar: "👥",
        mode: groupMode,
        swarmMode,
        humanControl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: memberAgents.map((a, i) => ({
          id: `member-${i}-${Date.now()}`,
          agentId: a.id,
          role: i === 0 ? "leader" : "worker",
          agent: a,
        })),
        childGroups: [],
        _count: { conversations: 0 },
      };
      const updated = [newGroup, ...loadLocalGroups()];
      saveLocalGroups(updated);
      setGroups(updated);
      setShowCreateGroup(false); setGroupName(""); setSelectedAgentIds([]); setSwarmMode("basic"); setHumanControl("observe");
    } catch (e) { console.error(e); alert("创建群组失败"); }
    finally { setLoading(false); }
  };

  // ==================== 聊天 ====================
  const handleStartChat = (agent: Agent) => {
    setSelectedAgent(agent); setSelectedGroup(null);
    // 从 localStorage 加载该 agent 的聊天历史
    const chats = loadLocalChats();
    const chatMessages = chats[agent.id] || [];
    setMessages(chatMessages);
    // 创建一个虚拟 conversation（仅用于 UI）
    const convId = `conv-${agent.id}`;
    const conv: Conversation = { id: convId, title: `与 ${agent.name} 的对话`, agentId: agent.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), agent: { name: agent.name, avatar: agent.avatar } };
    setCurrentConversation(conv);
    setView("chat");
  };

  const handleStartGroupChat = (group: AgentGroup) => {
    setSelectedGroup(group); setSelectedAgent(null);
    const chats = loadLocalChats();
    const chatMessages = chats[group.id] || [];
    setMessages(chatMessages);
    const convId = `conv-${group.id}`;
    const conv: Conversation = { id: convId, title: `${group.name}（${group.members.length}人）`, groupId: group.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), group: { name: group.name, mode: group.swarmMode } };
    setCurrentConversation(conv);
    setView("chat");
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim(); setInput(""); setSending(true); setStreamingContent(""); setPlatformStatus(null);

    // ===== 群组聊天 =====
    if (selectedGroup) {
      const group = selectedGroup;
      const leaderAgent = group.members[0]?.agent;
      if (!leaderAgent) { setSending(false); alert("群组中没有可用Agent"); return; }

      const userMsg: Message = { id: `msg-${Date.now()}-user`, conversationId: currentConversation?.id || "", role: "user", content, agentName: "", approved: true, createdAt: new Date().toISOString() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      const chats = loadLocalChats();
      chats[group.id] = updatedMessages;
      saveLocalChats(chats);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, agent: leaderAgent, messages: updatedMessages.slice(0, -1) }),
        });
        if (res.ok) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let full = "";
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "platform_status") { setPlatformStatus({ logo: data.platformLogo || "🤖", name: data.platformName || "AI", status: data.content || "思考中..." }); }
                  else if (data.type === "tool_call") { setPlatformStatus({ logo: data.platformLogo || "🔧", name: data.platformName || "AI", status: `调用工具: ${data.toolName || "unknown"}` }); }
                  else if (data.type === "tool_result") { setPlatformStatus({ logo: data.platformLogo || "🔧", name: data.platformName || "AI", status: `工具返回结果` }); }
                  else if (data.type === "memory_hit") { setPlatformStatus({ logo: data.platformLogo || "🧠", name: data.platformName || "AI", status: `检索记忆: ${(data.memorySnippet || "").slice(0, 30)}...` }); }
                  else if (data.type === "knowledge_hit") { setPlatformStatus({ logo: data.platformLogo || "📚", name: data.platformName || "AI", status: `检索知识库: ${(data.knowledgeSnippet || "").slice(0, 30)}...` }); }
                  else if (data.type === "token") { full += data.content; setStreamingContent(full); }
                  else if (data.type === "done") {
                    if (full) {
                      const assistantMsg: Message = { id: `msg-${Date.now()}-assistant`, conversationId: currentConversation?.id || "", role: "assistant", content: full, agentName: `${leaderAgent.name} (${group.swarmMode})`, approved: true, createdAt: new Date().toISOString() };
                      const finalMessages = [...updatedMessages, assistantMsg];
                      setMessages(finalMessages);
                      chats[group.id] = finalMessages;
                      saveLocalChats(chats);
                      full = "";
                    }
                    setStreamingContent(""); setPlatformStatus(null);
                  }
                  else if (data.type === "error") {
                    const errMsg: Message = { id: `msg-${Date.now()}-error`, conversationId: currentConversation?.id || "", role: "assistant", content: `❌ 错误: ${data.error}`, agentName: leaderAgent.name, approved: true, createdAt: new Date().toISOString() };
                    const finalMessages = [...updatedMessages, errMsg];
                    setMessages(finalMessages); chats[group.id] = finalMessages; saveLocalChats(chats);
                    setStreamingContent(""); setPlatformStatus(null);
                  }
                } catch (e) { console.error("SSE解析错误:", e); }
              }
            }
          }
        } else {
          const err = await res.json().catch(() => ({}));
          const errMsg: Message = { id: `msg-${Date.now()}-error`, conversationId: currentConversation?.id || "", role: "assistant", content: `❌ 发送失败: ${err.error || "未知错误"}`, agentName: leaderAgent.name, approved: true, createdAt: new Date().toISOString() };
          const finalMessages = [...updatedMessages, errMsg]; setMessages(finalMessages); chats[group.id] = finalMessages; saveLocalChats(chats);
        }
      } catch (e) { console.error("发送消息失败:", e); }
      finally { setSending(false); }
      return;
    }

    // ===== 单Agent聊天 =====
    const agent = selectedAgent;
    if (!agent) { setSending(false); alert("请先选择一个 Agent"); return; }

    const userMsg: Message = { id: `msg-${Date.now()}-user`, conversationId: currentConversation?.id || "", role: "user", content, agentName: "", approved: true, createdAt: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const chats = loadLocalChats();
    chats[agent.id] = updatedMessages;
    saveLocalChats(chats);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, agent, messages: updatedMessages.slice(0, -1) }),
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "platform_status") { setPlatformStatus({ logo: data.platformLogo || "🤖", name: data.platformName || "AI", status: data.content || "思考中..." }); }
                else if (data.type === "tool_call") { setPlatformStatus({ logo: data.platformLogo || "🔧", name: data.platformName || "AI", status: `调用工具: ${data.toolName || "unknown"}` }); }
                else if (data.type === "tool_result") { setPlatformStatus({ logo: data.platformLogo || "🔧", name: data.platformName || "AI", status: `工具返回结果` }); }
                else if (data.type === "memory_hit") { setPlatformStatus({ logo: data.platformLogo || "🧠", name: data.platformName || "AI", status: `检索记忆: ${(data.memorySnippet || "").slice(0, 30)}...` }); }
                else if (data.type === "knowledge_hit") { setPlatformStatus({ logo: data.platformLogo || "📚", name: data.platformName || "AI", status: `检索知识库: ${(data.knowledgeSnippet || "").slice(0, 30)}...` }); }
                else if (data.type === "token") { full += data.content; setStreamingContent(full); }
                else if (data.type === "done") {
                  if (full) {
                    const assistantMsg: Message = { id: `msg-${Date.now()}-assistant`, conversationId: currentConversation?.id || "", role: "assistant", content: full, agentName: agent.name, approved: true, createdAt: new Date().toISOString() };
                    const finalMessages = [...updatedMessages, assistantMsg];
                    setMessages(finalMessages);
                    chats[agent.id] = finalMessages;
                    saveLocalChats(chats);
                    full = "";
                  }
                  setStreamingContent(""); setPlatformStatus(null);
                }
                else if (data.type === "error") {
                  const errMsg: Message = { id: `msg-${Date.now()}-error`, conversationId: currentConversation?.id || "", role: "assistant", content: `❌ 错误: ${data.error}`, agentName: agent.name, approved: true, createdAt: new Date().toISOString() };
                  const finalMessages = [...updatedMessages, errMsg];
                  setMessages(finalMessages); chats[agent.id] = finalMessages; saveLocalChats(chats);
                  setStreamingContent(""); setPlatformStatus(null);
                }
              } catch (e) { console.error("SSE解析错误:", e); }
            }
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg: Message = { id: `msg-${Date.now()}-error`, conversationId: currentConversation?.id || "", role: "assistant", content: `❌ 发送失败: ${err.error || "未知错误"}`, agentName: agent.name, approved: true, createdAt: new Date().toISOString() };
        const finalMessages = [...updatedMessages, errMsg]; setMessages(finalMessages); chats[agent.id] = finalMessages; saveLocalChats(chats);
      }
    } catch (e) { console.error("发送消息失败:", e); }
    finally { setSending(false); }
  };

  // ==================== 画布拖拽 ====================
  const initCanvas = () => {
    const nodes: typeof canvasNodes = [];
    const edges: typeof canvasEdges = [];
    agents.forEach((a, i) => { nodes.push({ id: a.id, x: 80 + (i % 4) * 200, y: 80 + Math.floor(i / 4) * 160, agent: a, type: "agent" }); });
    groups.forEach((g, i) => {
      const gx = 80 + (i % 3) * 280; const gy = 400 + Math.floor(i / 3) * 180;
      nodes.push({ id: g.id, x: gx, y: gy, group: g, type: "group" });
      g.members.forEach(m => edges.push({ from: m.agentId, to: g.id }));
    });
    setCanvasNodes(nodes); setCanvasEdges(edges);
  };

  useEffect(() => {
    if (view === "canvas") {
      setTimeout(() => initCanvas(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, agents, groups]);

  const handleCanvasMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = canvasNodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(nodeId);
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setCanvasNodes(prev => prev.map(n => n.id === dragging ? { ...n, x, y } : n));
  };

  const handleCanvasMouseUp = () => { setDragging(null); };

  // ==================== 人工干预 ====================
  const handleApproveMessage = (msgId: string) => {
    setPendingMessages(prev => prev.filter(m => m.id !== msgId));
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, approved: true } : m));
  };

  const handleRejectMessage = (msgId: string) => { setPendingMessages(prev => prev.filter(m => m.id !== msgId)); };

  const handleInjectMessage = () => {
    if (!injectTarget || !input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), conversationId: currentConversation?.id || "", role: "system", content: `[人工注入→${injectTarget}]: ${input.trim()}`, agentName: "👤人类", approved: true, createdAt: new Date().toISOString() }]);
    setInput(""); setInjectMode(false); setInjectTarget("");
  };

  // ==================== 头像颜色 ====================
  const getAvatarColor = (name: string) => {
    const colors = ["bg-blue-500","bg-purple-500","bg-pink-500","bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500","bg-teal-500","bg-cyan-500","bg-indigo-500"];
    let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ==================== 统计 ====================
  const stats = {
    totalAgents: agents.length, totalGroups: groups.length,
    swarmModes: [...new Set(groups.map(g => g.swarmMode))].length,
    humanControls: [...new Set(groups.map(g => g.humanControl))].length,
    platformDist: agents.reduce((acc, a) => { acc[a.agentPlatform] = (acc[a.agentPlatform] || 0) + 1; return acc; }, {} as Record<string, number>),
    roleDist: agents.reduce((acc, a) => { acc[a.role || "other"] = (acc[a.role || "other"] || 0) + 1; return acc; }, {} as Record<string, number>),
  };

  // ==================== 渲染 ====================
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ===== 左侧导航 ===== */}
      <aside className="w-16 bg-gradient-to-b from-purple-600 to-indigo-700 flex flex-col items-center py-4 gap-2 shrink-0">
        {[
          { v: "dashboard" as const, icon: "📊", tip: "仪表盘" },
          { v: "agents" as const, icon: "🤖", tip: "Agent" },
          { v: "canvas" as const, icon: "🎨", tip: "画布" },
          { v: "chat" as const, icon: "💬", tip: "聊天" },
        ].map(item => (
          <button key={item.v} onClick={() => setView(item.v)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all ${view === item.v ? "bg-white/20 shadow-lg scale-110" : "hover:bg-white/10"}`}
            title={item.tip}>
            {item.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowCreate(true)} className="w-11 h-11 rounded-xl bg-pink-500 hover:bg-pink-400 flex items-center justify-center text-white text-xl shadow-lg" title="创建Agent">+</button>
      </aside>

      {/* ===== 主内容区 ===== */}
      <main className="flex-1 overflow-hidden">

        {/* ===== 仪表盘 ===== */}
        {view === "dashboard" && (
          <div className="h-full overflow-y-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">🐝 BloomBloomGarden 控制台</h1>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Agent", value: stats.totalAgents, icon: "🤖", color: "from-blue-500 to-cyan-400" },
                { label: "群组", value: stats.totalGroups, icon: "👥", color: "from-purple-500 to-pink-400" },
                { label: "蜂群模式", value: stats.swarmModes, icon: "🐝", color: "from-amber-500 to-orange-400" },
                { label: "干预级别", value: stats.humanControls, icon: "🎮", color: "from-green-500 to-emerald-400" },
              ].map(card => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-4 text-white shadow-lg`}>
                  <div className="text-2xl mb-1">{card.icon}</div>
                  <div className="text-3xl font-bold">{card.value}</div>
                  <div className="text-sm opacity-80">{card.label}</div>
                </div>
              ))}
            </div>

            {/* 蜂群协作机制选择 */}
            <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">🐝 蜂群协作机制</h2>
              <div className="grid grid-cols-4 gap-3">
                {SWARM_MODES.map(mode => (
                  <button key={mode.id} onClick={() => { setSwarmMode(mode.id); setShowCreateGroup(true); }}
                    className={`bg-gradient-to-br ${mode.color} rounded-xl p-4 text-left text-white hover:shadow-lg transition-all hover:scale-105`}>
                    <div className="text-2xl mb-1">{mode.icon}</div>
                    <div className="font-bold text-sm">{mode.name}</div>
                    <div className="text-xs opacity-80 mt-1">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 人工干预级别 */}
            <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">🎮 人工干预级别</h2>
              <div className="grid grid-cols-4 gap-3">
                {HUMAN_CONTROL_LEVELS.map(level => (
                  <button key={level.id} onClick={() => setHumanControl(level.id)}
                    className={`rounded-xl p-4 text-left border-2 transition-all ${humanControl === level.id ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-100 bg-gray-50 hover:border-gray-300"}`}>
                    <div className="text-2xl mb-1">{level.icon}</div>
                    <div className="font-bold text-sm text-gray-700">{level.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent 列表 */}
            <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-700">🤖 Agent 列表</h2>
                <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-400">+ 创建</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {agents.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">🤖</div>
                    <div className="text-sm">暂无Agent</div>
                    <div className="text-xs mt-1">点击「创建」添加第一个Agent</div>
                  </div>
                )}
                {agents.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition cursor-pointer"
                    onClick={() => handleStartChat(a)}>
                    <div className={`w-10 h-10 ${getAvatarColor(a.name)} rounded-lg flex items-center justify-center text-white text-lg shrink-0`}>{a.avatar || a.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.llmProvider}/{a.model} | {a.role}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === "running" ? "bg-green-100 text-green-700" : a.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>{a.status || "idle"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 群组列表 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-700">👥 群组列表</h2>
                <button onClick={() => setShowCreateGroup(true)} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-400">+ 创建群组</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {groups.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-sm">暂无群组</div>
                    <div className="text-xs mt-1">点击「创建群组」添加第一个蜂群</div>
                  </div>
                )}
                {groups.map(g => {
                  const swarm = SWARM_MODES.find(s => s.id === g.swarmMode);
                  const ctrl = HUMAN_CONTROL_LEVELS.find(c => c.id === g.humanControl);
                  return (
                    <div key={g.id} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition cursor-pointer"
                      onClick={() => handleStartGroupChat(g)}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{swarm?.icon || "👥"}</span>
                        <span className="font-bold text-gray-800">{g.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{g.mode}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{swarm?.name} | {ctrl?.icon} {ctrl?.name}</div>
                      <div className="flex gap-1 flex-wrap">
                        {g.members.map(m => (
                          <span key={m.id} className={`px-2 py-0.5 rounded-full text-xs ${m.role === "leader" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{m.agent.name}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== Agent 视图 ===== */}
        {view === "agents" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">🤖 Agent 管理</h1>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg">+ 创建 Agent</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {agents.map(a => (
                <div key={a.id} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 ${getAvatarColor(a.name)} rounded-xl flex items-center justify-center text-white text-xl`}>{a.avatar || a.name[0]}</div>
                    <div><div className="font-bold text-gray-800">{a.name}</div><div className="text-xs text-gray-400">{a.role}</div></div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <div>🔧 {a.llmProvider}/{a.model}</div>
                    <div>📡 {a.agentPlatform}</div>
                    <div>🔑 {a.apiKey}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleStartChat(a)} className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-400">💬 聊天</button>
                    <button onClick={() => { const updated = loadLocalAgents().filter(x => x.id !== a.id); saveLocalAgents(updated); setAgents(updated); if (selectedAgent?.id === a.id) { setSelectedAgent(null); setMessages([]); setCurrentConversation(null); } }} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 画布视图 ===== */}
        {view === "canvas" && (
          <div className="h-full flex flex-col">
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-800">🎨 编排画布</h1>
              <div className="flex gap-2">
                <button onClick={initCanvas} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">🔄 重排</button>
                <button onClick={() => setShowCreateGroup(true)} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs">+ 创建群组</button>
              </div>
            </div>
            <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-gray-50"
              style={{ backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
              {/* 连线 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {canvasEdges.map((edge, i) => {
                  const from = canvasNodes.find(n => n.id === edge.from);
                  const to = canvasNodes.find(n => n.id === edge.to);
                  if (!from || !to) return null;
                  return <line key={i} x1={from.x + 60} y1={from.y + 30} x2={to.x + 60} y2={to.y + 30} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 3" />;
                })}
              </svg>
              {/* 节点 */}
              {canvasNodes.map(node => (
                <div key={node.id}
                  className={`absolute cursor-grab active:cursor-grabbing rounded-xl shadow-md border-2 transition-shadow hover:shadow-lg ${node.type === "agent" ? "w-32 bg-white border-purple-200" : "w-44 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300"}`}
                  style={{ left: node.x, top: node.y }}
                  onMouseDown={e => handleCanvasMouseDown(e, node.id)}>
                  {node.type === "agent" && node.agent && (
                    <div className="p-3 text-center">
                      <div className={`w-10 h-10 ${getAvatarColor(node.agent.name)} rounded-lg mx-auto mb-1 flex items-center justify-center text-white text-lg`}>{node.agent.avatar || node.agent.name[0]}</div>
                      <div className="text-xs font-bold text-gray-700 truncate">{node.agent.name}</div>
                      <div className="text-[10px] text-gray-400">{node.agent.role}</div>
                    </div>
                  )}
                  {node.type === "group" && node.group && (
                    <div className="p-3">
                      <div className="text-xs font-bold text-indigo-700 mb-1">👥 {node.group?.name || "群组"}</div>
                      <div className="text-[10px] text-gray-500">{SWARM_MODES.find(s => s.id === node.group?.swarmMode)?.icon} {SWARM_MODES.find(s => s.id === node.group?.swarmMode)?.name}</div>
                      <div className="flex gap-0.5 mt-1 flex-wrap">
                        {node.group?.members.slice(0, 4).map(m => (
                          <span key={m.id} className={`w-5 h-5 ${getAvatarColor(m.agent.name)} rounded text-[8px] text-white flex items-center justify-center`}>{m.agent.name[0]}</span>
                        ))}
                        {node.group.members.length > 4 && <span className="text-[10px] text-gray-400">+{node.group.members.length - 4}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 聊天视图 ===== */}
        {view === "chat" && (
          <div className="h-full flex">
            {/* 对话列表侧边栏 - 显示所有Agent，点击直接聊天 */}
            <div className="w-64 bg-white border-r flex flex-col shrink-0">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">🤖 选择Agent</span>
                <button onClick={() => setView("dashboard")} className="text-gray-400 hover:text-gray-600 text-sm">← 返回</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {agents.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-xs">
                    暂无Agent<br />先在仪表盘创建
                  </div>
                )}
                {agents.map(a => (
                  <div key={a.id}
                    onClick={() => handleStartChat(a)}
                    className={`p-3 cursor-pointer border-b hover:bg-purple-50 transition ${selectedAgent?.id === a.id ? "bg-purple-50 border-l-2 border-l-purple-500" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${getAvatarColor(a.name)} rounded-lg flex items-center justify-center text-white text-sm shrink-0`}>{a.avatar || a.name[0]}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{a.name}</div>
                        <div className="text-xs text-gray-400">{a.llmProvider}/{a.model}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 聊天主区域 */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 聊天头部 */}
              <div className="p-4 bg-white border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedAgent && (
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${getAvatarColor(selectedAgent.name)} rounded-lg flex items-center justify-center text-white text-sm`}>{selectedAgent.avatar || selectedAgent.name[0]}</div>
                      <span className="font-bold text-gray-800">{selectedAgent.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                        {(() => { const pi = getPlatformInfo(selectedAgent.agentPlatform); return <>{pi.logo} {pi.name}</>; })()}
                      </span>
                    </div>
                  )}
                  {selectedGroup && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{SWARM_MODES.find(s => s.id === selectedGroup.swarmMode)?.icon}</span>
                      <span className="font-bold text-gray-800">{selectedGroup.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{SWARM_MODES.find(s => s.id === selectedGroup.swarmMode)?.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">{HUMAN_CONTROL_LEVELS.find(c => c.id === selectedGroup.humanControl)?.icon} {HUMAN_CONTROL_LEVELS.find(c => c.id === selectedGroup.humanControl)?.name}</span>
                    </div>
                  )}
                  {!selectedAgent && !selectedGroup && (
                    <span className="text-gray-400 text-sm">请从左侧选择对话</span>
                  )}
                </div>
                {/* 人工干预控制 */}
                {selectedGroup && (
                  <div className="flex gap-2">
                    <button onClick={() => setInjectMode(!injectMode)} className={`px-3 py-1.5 rounded-lg text-xs ${injectMode ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600"}`}>🎮 注入指令</button>
                  </div>
                )}
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!currentConversation && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-3">💬</div>
                      <div className="text-sm">选择一个对话开始聊天</div>
                      <div className="text-xs mt-1">或从仪表盘点击Agent/群组</div>
                    </div>
                  </div>
                )}
                {currentConversation && messages.length === 0 && !streamingContent && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-2xl mb-2">👋</div>
                      <div className="text-sm">开始对话吧！</div>
                    </div>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${msg.role === "user" ? "bg-purple-500 text-white" : msg.role === "system" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-white border border-gray-100 shadow-sm"}`}>
                      {msg.agentName && <div className="text-xs font-bold text-indigo-500 mb-1">{msg.agentName}</div>}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      {selectedGroup && !msg.approved && msg.role === "assistant" && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button onClick={() => handleApproveMessage(msg.id)} className="px-3 py-1 bg-green-500 text-white rounded text-xs">✅ 批准</button>
                          <button onClick={() => handleRejectMessage(msg.id)} className="px-3 py-1 bg-red-500 text-white rounded text-xs">❌ 否决</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {streamingContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] bg-white border border-purple-200 rounded-xl px-4 py-2.5 shadow-sm">
                      {platformStatus && (
                        <div className="flex items-center gap-2 mb-1.5 px-2 py-1 bg-gray-50 rounded-lg">
                          <span className="text-base">{platformStatus.logo}</span>
                          <span className="text-xs font-bold text-gray-700">{platformStatus.name}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{platformStatus.status}</span>
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap text-purple-700">{streamingContent}▊</div>
                    </div>
                  </div>
                )}
                {/* 平台状态（无流式内容时也显示） */}
                {platformStatus && !streamingContent && sending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg animate-pulse">{platformStatus.logo}</span>
                        <div>
                          <div className="text-xs font-bold text-gray-700">{platformStatus.name}</div>
                          <div className="text-xs text-gray-500">{platformStatus.status}</div>
                        </div>
                        <div className="ml-2 flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 注入指令面板 */}
              {injectMode && selectedGroup && (
                <div className="p-3 bg-amber-50 border-t border-amber-200">
                  <div className="text-xs font-bold text-amber-700 mb-2">🎮 人工注入指令</div>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {selectedGroup.members.map(m => (
                      <button key={m.id} onClick={() => setInjectTarget(m.agent.name)}
                        className={`px-2 py-1 rounded text-xs ${injectTarget === m.agent.name ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"}`}>
                        {m.agent.name}
                      </button>
                    ))}
                    <button onClick={() => setInjectTarget("all")} className={`px-2 py-1 rounded text-xs ${injectTarget === "all" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"}`}>全部</button>
                  </div>
                  <div className="flex gap-2">
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder={`向 ${injectTarget || "..."} 注入指令...`} className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button onClick={handleInjectMessage} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm">注入</button>
                  </div>
                </div>
              )}

              {/* 输入框 */}
              {currentConversation && (
                <div className="p-4 bg-white border-t">
                  <div className="flex gap-2">
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); injectMode ? handleInjectMessage() : handleSendMessage(); } }}
                      placeholder={injectMode ? "注入指令..." : "输入消息..."}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" rows={1} />
                    <button onClick={injectMode ? handleInjectMessage : handleSendMessage} disabled={sending || !input.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40">
                      {sending ? "..." : injectMode ? "注入" : "发送"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== 创建Agent弹窗 ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold text-gray-800">🤖 创建 Agent</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">API Key</label>
                <input value={apiKey} onChange={e => handleApiKeyChange(e.target.value)} placeholder="粘贴你的 API Key..." className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:outline-none" />
                {apiKey.length > 10 && <div className="mt-1 text-xs text-green-600">✅ 检测到: {LLM_PROVIDERS.find(p => p.id === detectedProvider.provider)?.name} / {detectedProvider.model}</div>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">选择角色</label>
                <div className="grid grid-cols-3 gap-2 mt-1 max-h-48 overflow-y-auto">
                  {AGENT_ROLES.map(role => (
                    <button key={role.id} onClick={() => setSelectedRole(role.id)}
                      className={`p-2 rounded-lg text-left text-xs transition ${selectedRole === role.id ? "bg-purple-100 border-2 border-purple-400" : "bg-gray-50 border border-gray-100"}`}>
                      <div className="text-lg">{role.emoji}</div>
                      <div className="font-bold">{role.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">🏗️ 选择平台</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {AGENT_PLATFORMS.map(platform => (
                    <button key={platform.id} onClick={() => setSelectedPlatform(platform.id)}
                      className={`p-2 rounded-xl text-left text-xs transition ${selectedPlatform === platform.id ? `${platform.tagBg} border-2 border-current` : "bg-gray-50 border border-gray-100"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{platform.logo}</span>
                        <span className="font-bold">{platform.name}</span>
                      </div>
                      <div className={`text-xs mt-1 ${selectedPlatform === platform.id ? platform.tagText : "text-gray-500"}`}>{platform.tagline}</div>
                    </button>
                  ))}
                </div>
                {selectedRole && !selectedPlatform && (
                  <div className="mt-1 text-xs text-amber-600">
                    💡 推荐: {AGENT_PLATFORMS.find(p => p.id === AGENT_ROLES.find(r => r.id === selectedRole)?.recommendedPlatform)?.name || "OpenClaw"}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">自定义名称（可选）</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder={AGENT_ROLES.find(r => r.id === selectedRole)?.name || "名称"} className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:outline-none" />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowCreate(false); setApiKey(""); setSelectedRole(""); setSelectedPlatform(""); setCustomName(""); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">取消</button>
              <button onClick={handleCreateAgent} disabled={!apiKey.trim() || !selectedRole || loading} className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-40">{loading ? "创建中..." : "一键创建"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 创建群组弹窗 ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-white rounded-2xl w-[560px] max-h-[95vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} ref={el => { if (el) el.scrollTop = 0; }}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold text-gray-800">👥 创建群组</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">群组名称</label>
                <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="输入群组名称..." className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">🐝 蜂群协作机制</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {SWARM_MODES.map(mode => (
                    <button key={mode.id} onClick={() => setSwarmMode(mode.id)}
                      className={`p-3 rounded-xl text-left transition ${swarmMode === mode.id ? `bg-gradient-to-br ${mode.color} text-white shadow-md` : "bg-gray-50 border border-gray-100"}`}>
                      <div className="flex items-center gap-2"><span className="text-lg">{mode.icon}</span><span className="font-bold text-sm">{mode.name}</span></div>
                      <div className={`text-xs mt-1 ${swarmMode === mode.id ? "opacity-80" : "text-gray-500"}`}>{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">🎮 人工干预级别</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {HUMAN_CONTROL_LEVELS.map(level => (
                    <button key={level.id} onClick={() => setHumanControl(level.id)}
                      className={`p-3 rounded-xl text-left transition ${humanControl === level.id ? "bg-indigo-100 border-2 border-indigo-400" : "bg-gray-50 border border-gray-100"}`}>
                      <div className="flex items-center gap-2"><span className="text-lg">{level.icon}</span><span className="font-bold text-sm">{level.name}</span></div>
                      <div className="text-xs text-gray-500 mt-1">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">编排模式</label>
                <div className="flex gap-2 mt-1">
                  {["relay", "debate", "vote", "parallel", "roundtable"].map(m => (
                    <button key={m} onClick={() => setGroupMode(m)} className={`px-3 py-1.5 rounded-lg text-xs ${groupMode === m ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">选择 Agent ({selectedAgentIds.length} 个)</label>
                <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto">
                  {agents.map(a => (
                    <button key={a.id} onClick={() => setSelectedAgentIds(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                      className={`p-2 rounded-lg text-left text-xs transition ${selectedAgentIds.includes(a.id) ? "bg-indigo-50 border-2 border-indigo-400" : "bg-gray-50 border border-gray-100"}`}>
                      {a.avatar} {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">取消</button>
              <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedAgentIds.length === 0 || loading} className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-40">{loading ? "创建中..." : "创建群组"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
