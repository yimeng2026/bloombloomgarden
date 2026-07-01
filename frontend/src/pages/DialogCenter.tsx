import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Send,
  Paperclip,
  X,
  PanelRightOpen,
  PanelRightClose,
  Globe,
  Trash2,
  Pause,
  Lock,
  RotateCcw,
  Settings,
  Bot,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { fetchDialogs, createDialog, deleteDialog } from '../api/client';
import { useToast } from '../components/ToastProvider';

/* ─────────────────────────── types ─────────────────────────── */

type AgentStatus = 'active' | 'paused' | 'error';

interface ContextFile {
  name: string;
  editedAt: string;
}

interface ContextItem {
  id: string;
  label: string;
  type: 'folder' | 'file';
  children?: ContextFile[];
}

interface MockAgent {
  id: string;
  name: string;
  status: AgentStatus;
  model: string;
  provider: string;
  knowledgeBases: string[];
  initial: string;
  gradient: string;
  contextItems: ContextItem[];
  recentMessages: number;
}

interface Message {
  id: string;
  agentId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  attachments?: { name: string; size: string }[];
}

interface RecentAction {
  description: string;
  timestamp: string;
  color: string;
}

interface Dialog {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  model?: string;
  provider?: string;
  knowledgeBases?: string[];
  contextItems?: ContextItem[];
  recentMessages?: number;
  [key: string]: any;
}

function adaptDialogToAgent(dialog: Dialog): MockAgent {
  const name = dialog.title || dialog.name || '未命名对话';
  const initial = name.charAt(0).toUpperCase();
  const gradients = [
    'linear-gradient(135deg, #38BDF8, #0EA5E9)',
    'linear-gradient(135deg, #A78BFA, #7C3AED)',
    'linear-gradient(135deg, #F472B6, #DB2777)',
    'linear-gradient(135deg, #4ADE80, #16A34A)',
    'linear-gradient(135deg, #FB7185, #E11D48)',
    'linear-gradient(135deg, #FBBF24, #D97706)',
  ];
  const gradient = gradients[dialog.id.length % gradients.length];
  return {
    id: dialog.id,
    name,
    status: (dialog.status as AgentStatus) || 'active',
    model: dialog.model || '通用模型',
    provider: dialog.provider || '本地',
    knowledgeBases: dialog.knowledgeBases || [],
    initial,
    gradient,
    contextItems: dialog.contextItems || [],
    recentMessages: dialog.recentMessages || 0,
  };
}

const recentActions: RecentAction[] = [
  { description: '创建了任务 #1242', timestamp: '2分钟前', color: '#4ADE80' },
  { description: '修改了 main.py', timestamp: '15分钟前', color: '#38BDF8' },
  { description: '调用了 OpenAI API', timestamp: '30分钟前', color: '#A78BFA' },
  { description: '完成了代码审查', timestamp: '1小时前', color: '#4ADE80' },
  { description: '上传了 utils.py', timestamp: '2小时前', color: '#FBBF24' },
];

/* ──────────────────── sub-components ──────────────────── */

function StatusBadge({ status, size = 'md' }: { status: AgentStatus; size?: 'sm' | 'md' }) {
  const config = {
    active: { bg: 'rgba(74,222,128,0.12)', text: '#4ADE80', border: 'rgba(74,222,128,0.3)', label: 'Active' },
    paused: { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24', border: 'rgba(251,191,36,0.3)', label: 'Paused' },
    error: { bg: 'rgba(251,113,133,0.12)', text: '#FB7185', border: 'rgba(251,113,133,0.3)', label: 'Error' },
  };
  const c = config[status];
  const isSmall = size === 'sm';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        padding: isSmall ? '1px 7px' : '2px 10px',
        fontSize: isSmall ? '11px' : '12px',
        height: isSmall ? '20px' : '24px',
      }}
    >
      {status === 'active' && (
        <span
          className="rounded-full animate-pulse-dot"
          style={{ width: isSmall ? '6px' : '8px', height: isSmall ? '6px' : '8px', background: c.text }}
        />
      )}
      {c.label}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent-blue"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/* ──────────────────── main page ──────────────────── */

export default function DialogCenter() {
  const toast = useToast();
  const { addToast } = toast;
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = useMemo(() => {
    const dialog = dialogs.find((d) => d.id === selectedAgentId);
    if (!dialog) {
      return {
        id: '',
        name: '未选择对话',
        status: 'active' as AgentStatus,
        model: '—',
        provider: '—',
        knowledgeBases: [],
        initial: '?',
        gradient: 'linear-gradient(135deg, #38BDF8, #0EA5E9)',
        contextItems: [],
        recentMessages: 0,
      };
    }
    return adaptDialogToAgent(dialog);
  }, [dialogs, selectedAgentId]);

  // 加载真实对话列表
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchDialogs();
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (!mounted) return;
        setDialogs(list);
        if (list.length > 0) {
          setSelectedAgentId(list[0].id);
          setExpandedAgents(new Set([list[0].id]));
        }
      } catch (err) {
        console.error('加载对话失败:', err);
        addToast({ type: 'error', title: '加载失败', message: '无法获取对话列表' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [addToast]);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleExpand = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const handleCreateDialog = useCallback(async () => {
    try {
      const res = await createDialog({ title: '新对话' });
      const newDialog = res?.data || res;
      addToast({ type: 'success', title: '创建成功', message: '新对话已创建' });
      // 刷新列表
      const refreshRes = await fetchDialogs();
      const list = Array.isArray(refreshRes) ? refreshRes : (refreshRes?.data || []);
      setDialogs(list);
      if (newDialog?.id) {
        setSelectedAgentId(newDialog.id);
        setExpandedAgents(new Set([newDialog.id]));
      } else if (list.length > 0) {
        setSelectedAgentId(list[list.length - 1].id);
        setExpandedAgents(new Set([list[list.length - 1].id]));
      }
    } catch (err) {
      console.error('创建对话失败:', err);
      addToast({ type: 'error', title: '创建失败', message: '无法创建对话' });
    }
  }, [addToast]);

  const handleDeleteDialog = useCallback(async (id: string) => {
    try {
      await deleteDialog(id);
      addToast({ type: 'success', title: '删除成功', message: '对话已删除' });
      setDialogs((prev) => prev.filter((d) => d.id !== id));
      if (selectedAgentId === id) {
        setSelectedAgentId('');
        setMessages([]);
      }
    } catch (err) {
      console.error('删除对话失败:', err);
      addToast({ type: 'error', title: '删除失败', message: '无法删除对话' });
    }
  }, [selectedAgentId, addToast]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (!selectedAgentId) {
      addToast({ type: 'warning', title: '提示', message: '请先选择对话' });
      return;
    }

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      agentId: selectedAgentId,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setAttachments([]);
    addToast({ type: 'info', title: '提示', message: '消息发送功能需后端支持消息API', duration: 3000 });
  }, [inputText, attachments, selectedAgentId, addToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const newAttachments = files.map((f) => ({ name: f.name, size: `${(f.size / 1024).toFixed(1)}KB` }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newAttachments = files.map((f) => ({ name: f.name, size: `${(f.size / 1024).toFixed(1)}KB` }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  return (
    <div className="flex h-full" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {/* ========== Column 1: Dialog List (260px) ========== */}
      <div
        className="w-[260px] shrink-0 flex flex-col overflow-hidden"
        style={{
          background: '#0E1215',
          borderRight: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <div className="px-4 h-12 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
          <span className="text-sm font-semibold text-text-primary">对话列表</span>
          <button
            onClick={handleCreateDialog}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.04]"
            title="创建对话"
          >
            <Plus size={14} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && dialogs.length === 0 && (
            <div className="flex items-center justify-center py-8 text-text-tertiary">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-xs">加载中...</span>
            </div>
          )}

          {!loading && dialogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-text-tertiary">
              <Bot size={28} className="mb-2 opacity-30" />
              <p className="text-xs text-center">暂无对话</p>
              <p className="text-[10px] text-center mt-1 opacity-60">点击上方 + 创建新对话</p>
            </div>
          )}

          {dialogs.map((dialog, index) => {
            const agent = adaptDialogToAgent(dialog);
            const isExpanded = expandedAgents.has(agent.id);
            const isSelected = selectedAgentId === agent.id;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
              >
                {/* Agent header row */}
                <button
                  className="w-full flex items-center gap-2 px-3 h-10 transition-all duration-200 relative group"
                  style={{
                    background: isSelected ? 'rgba(56,189,248,0.06)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #38BDF8' : '2px solid transparent',
                  }}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  {/* Expand toggle */}
                  <span
                    className="shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(agent.id);
                    }}
                  >
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-block"
                    >
                      <ChevronRight size={14} className="text-text-tertiary" />
                    </motion.span>
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: agent.gradient, color: '#0A0C0E' }}
                  >
                    {agent.initial}
                  </div>

                  {/* Name */}
                  <span
                    className="text-sm font-medium truncate flex-1 text-left"
                    style={{ color: isSelected ? '#E8ECF0' : '#E8ECF0' }}
                  >
                    {agent.name}
                  </span>

                  {/* Status dot */}
                  {agent.status === 'active' && (
                    <span className="w-2 h-2 rounded-full animate-pulse-dot shrink-0" style={{ background: '#4ADE80' }} />
                  )}

                  {/* Mini status badge */}
                  <StatusBadge status={agent.status} size="sm" />
                </button>

                {/* Expanded context tree */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className="overflow-hidden"
                    >
                      <div className="pl-9 pr-3 pb-2 space-y-1">
                        {agent.contextItems.map((item) => (
                          <div key={item.id}>
                            <div className="flex items-center gap-2 py-1">
                              <FolderOpen size={12} className="text-accent-amber" />
                              <span className="text-xs text-text-secondary">{item.label}</span>
                            </div>
                            {item.children?.map((file, fi) => (
                              <div
                                key={fi}
                                className="flex items-center gap-2 py-1 pl-4 group cursor-pointer"
                              >
                                <FileText size={11} className="text-text-tertiary group-hover:text-accent-blue transition-colors" />
                                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-text-tertiary ml-auto">{file.editedAt}</span>
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Recent messages count */}
                        <div className="flex items-center gap-2 py-1 pl-4">
                          <span
                            className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium"
                            style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}
                          >
                            {agent.recentMessages}
                          </span>
                          <span className="text-xs text-text-secondary">最近消息</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ========== Column 2: Chat Area (flex) ========== */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center"
              style={{
                background: 'rgba(56,189,248,0.05)',
                border: '2px dashed #38BDF8',
                borderRadius: '8px',
                margin: '8px',
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleDrop(e); }}
            >
              <div className="text-center">
                <Paperclip size={32} className="text-accent-blue mx-auto mb-2" />
                <p className="text-sm text-text-secondary">拖放文件到此处上传</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Header */}
        <div
          className="h-12 shrink-0 flex items-center justify-between px-6"
          style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}
        >
          {/* Left: Agent selector */}
          <div className="relative">
            <button
              onClick={() => setShowAgentDropdown(!showAgentDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: selectedAgent.gradient, color: '#0A0C0E' }}
              >
                {selectedAgent.initial}
              </div>
              <span className="text-sm font-medium text-text-primary">{selectedAgent.name}</span>
              {selectedAgent.id && <StatusBadge status={selectedAgent.status} size="sm" />}
              <ChevronDown size={14} className="text-text-tertiary" />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showAgentDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAgentDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-52 rounded-lg z-20 overflow-hidden"
                    style={{
                      background: 'rgba(19,23,26,0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                  >
                    {dialogs.length === 0 && (
                      <div className="px-3 py-2 text-xs text-text-tertiary">暂无对话</div>
                    )}
                    {dialogs.map((dialog) => {
                      const agent = adaptDialogToAgent(dialog);
                      return (
                        <button
                          key={agent.id}
                          className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent-blue/8 text-left"
                          style={{
                            background: agent.id === selectedAgentId ? 'rgba(56,189,248,0.08)' : 'transparent',
                          }}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setShowAgentDropdown(false);
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                            style={{ background: agent.gradient, color: '#0A0C0E' }}
                          >
                            {agent.initial}
                          </div>
                          <span className="text-sm text-text-primary flex-1">{agent.name}</span>
                          {agent.id === selectedAgentId && <Check size={12} className="text-accent-blue" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Hint */}
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Globe size={12} />
            <span>所有对话上下文已聚合</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInfoPanelOpen(!infoPanelOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04]"
            >
              {infoPanelOpen ? (
                <PanelRightClose size={16} className="text-text-secondary" />
              ) : (
                <PanelRightOpen size={16} className="text-text-secondary" />
              )}
            </button>
            <button
              onClick={() => selectedAgentId && handleDeleteDialog(selectedAgentId)}
              disabled={!selectedAgentId}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative"
        >
          <AnimatePresence>
            {messages
              .filter((m) => m.agentId === selectedAgentId || m.role === 'system')
              .map((msg, index) => {
                if (msg.role === 'system') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs italic py-1"
                      style={{ color: '#4A5562' }}
                    >
                      {msg.content}
                    </motion.div>
                  );
                }

                if (msg.role === 'user') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className="flex justify-end"
                    >
                      <div
                        className="max-w-[70%] px-4 py-3"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56,189,248,0.2)',
                          borderRadius: '12px 12px 2px 12px',
                        }}
                      >
                        <p className="text-sm text-text-primary leading-relaxed">{msg.content}</p>
                        {msg.attachments?.map((att, ai) => (
                          <div
                            key={ai}
                            className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                            style={{ background: 'rgba(56,189,248,0.15)' }}
                          >
                            <FileText size={12} className="text-accent-blue" />
                            <span className="text-xs text-text-primary">{att.name}</span>
                            <span className="text-[10px] text-text-tertiary">{att.size}</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-text-tertiary text-right mt-1">{msg.timestamp} ✓</p>
                      </div>
                    </motion.div>
                  );
                }

                // Agent message
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    className="flex gap-3"
                  >
                    {/* Agent avatar */}
                    <div className="shrink-0 pt-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: selectedAgent.gradient, color: '#0A0C0E' }}
                      >
                        {selectedAgent.initial}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Agent name + time */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-text-secondary">{selectedAgent.name}</span>
                        <span className="text-[11px] text-text-tertiary">{msg.timestamp}</span>
                      </div>

                      {/* Bubble */}
                      <div
                        className="max-w-[80%] px-4 py-3"
                        style={{
                          background: '#13171A',
                          border: '1px solid rgba(148,163,184,0.08)',
                          borderRadius: '2px 12px 12px 12px',
                        }}
                      >
                        <div className="text-sm text-text-primary leading-7 whitespace-pre-wrap">
                          {msg.content.split('```').map((part, i) => {
                            if (i % 2 === 1) {
                              // Code block
                              const lines = part.split('\n');
                              const lang = lines[0]?.trim() || '';
                              const code = lines.slice(1).join('\n');
                              return (
                                <div
                                  key={i}
                                  className="my-2 relative rounded-lg overflow-hidden"
                                  style={{
                                    background: '#0A0C0E',
                                    border: '1px solid rgba(148,163,184,0.1)',
                                  }}
                                >
                                  {lang && (
                                    <div className="flex items-center justify-between px-3 py-1" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                      <span className="text-xs text-text-tertiary">{lang}</span>
                                      <button className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">
                                        复制
                                      </button>
                                    </div>
                                  )}
                                  <pre className="p-3 overflow-x-auto">
                                    <code className="font-jetbrains-mono text-[13px] text-accent-blue leading-relaxed">
                                      {code}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: selectedAgent.gradient, color: '#0A0C0E' }}
              >
                {selectedAgent.initial}
              </div>
              <div
                className="px-4 py-2"
                style={{
                  background: '#13171A',
                  border: '1px solid rgba(148,163,184,0.08)',
                  borderRadius: '2px 12px 12px 12px',
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* 空状态提示 */}
          {messages.filter((m) => m.agentId === selectedAgentId || m.role === 'system').length === 0 && !isTyping && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary pointer-events-none">
              <Bot size={48} className="mb-3 opacity-20" />
              <p className="text-sm">选择对话查看消息</p>
              <p className="text-xs mt-1 opacity-50">消息发送功能需后端支持消息API</p>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          className="shrink-0 px-4 py-3"
          style={{
            background: '#13171A',
            borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          }}
        >
          {/* Attachment chips */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-wrap gap-2 mb-2 overflow-hidden"
              >
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.15)' }}
                  >
                    <FileText size={11} className="text-accent-blue" />
                    <span className="text-xs text-text-primary">{att.name}</span>
                    <span className="text-[10px] text-text-tertiary">{att.size}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-1 hover:text-accent-rose transition-colors"
                    >
                      <X size={11} className="text-text-tertiary" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            {/* File attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-white/[0.04] mb-1"
            >
              <Paperclip size={16} className="text-text-secondary" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgentId ? `输入消息给 ${selectedAgent.name}...` : '请先选择对话...'}
              disabled={!selectedAgentId}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none min-h-[40px] max-h-[200px] disabled:opacity-50"
              style={{
                background: '#0A0C0E',
                border: '1px solid rgba(148,163,184,0.12)',
              }}
              onFocus={(e) => {
                if (selectedAgentId) e.currentTarget.style.borderColor = '#38BDF8';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)';
              }}
              rows={1}
            />

            {/* Send button */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleSend}
              disabled={!selectedAgentId}
              className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 mb-1 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: (inputText.trim() || attachments.length > 0) && selectedAgentId ? '#38BDF8' : '#22292E',
                boxShadow: (inputText.trim() || attachments.length > 0) && selectedAgentId ? '0 0 16px rgba(56,189,248,0.3)' : 'none',
              }}
            >
              <Send size={14} style={{ color: (inputText.trim() || attachments.length > 0) && selectedAgentId ? '#0A0C0E' : '#4A5562' }} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ========== Column 3: Info Panel (280px) ========== */}
      <AnimatePresence>
        {infoPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="shrink-0 overflow-hidden"
          >
            <div
              className="w-[280px] h-full flex flex-col overflow-y-auto"
              style={{
                background: '#0E1215',
                borderLeft: '1px solid rgba(148, 163, 184, 0.08)',
              }}
            >
              {/* Agent Info Card */}
              <div className="flex flex-col items-center pt-8 pb-6 px-5" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3"
                  style={{ background: selectedAgent.gradient, color: '#0A0C0E' }}
                >
                  {selectedAgent.initial}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">{selectedAgent.name}</h3>
                <code className="text-[11px] font-jetbrains-mono text-text-tertiary mb-3">{selectedAgent.id || '—'}</code>
                {selectedAgent.id && <StatusBadge status={selectedAgent.status} />}
              </div>

              {/* Configuration Summary */}
              <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                <h4
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#4A5562', letterSpacing: '0.05em' }}
                >
                  配置概览
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-1.5">
                    <Bot size={14} className="text-text-tertiary shrink-0" />
                    <span className="text-[13px] text-text-secondary">大模型</span>
                    <span className="text-[13px] text-text-primary ml-auto">{selectedAgent.model}</span>
                  </div>
                  <div className="flex items-center gap-2 py-1.5">
                    <Globe size={14} className="text-text-tertiary shrink-0" />
                    <span className="text-[13px] text-text-secondary">提供商</span>
                    <span className="text-[13px] text-text-primary ml-auto">{selectedAgent.provider}</span>
                  </div>
                  <div className="flex items-center gap-2 py-1.5">
                    <FileText size={14} className="text-text-tertiary shrink-0" />
                    <span className="text-[13px] text-text-secondary">知识库</span>
                    <span className="text-[13px] text-text-primary ml-auto text-right">
                      {selectedAgent.knowledgeBases.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Actions */}
              <div className="px-5 py-4 space-y-3 flex-1">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#4A5562', letterSpacing: '0.05em' }}
                >
                  最近活动
                </h4>

                <div className="space-y-3">
                  {recentActions.map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08, duration: 0.25 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{ background: action.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-text-secondary">{action.description}</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{action.timestamp}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-5 py-4 flex items-center justify-center gap-2" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.04] hover:border hover:border-border-dim/20 border border-transparent">
                  <Pause size={15} className="text-text-secondary" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.04] hover:border hover:border-border-dim/20 border border-transparent">
                  <Lock size={15} className="text-text-secondary" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.04] hover:border hover:border-border-dim/20 border border-transparent">
                  <RotateCcw size={15} className="text-text-secondary" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.04] hover:border hover:border-border-dim/20 border border-transparent">
                  <Settings size={15} className="text-text-secondary" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
