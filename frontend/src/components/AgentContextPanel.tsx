import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Terminal, MessageSquare,
  Wrench, BookOpen, BarChart3, Clock, BrainCircuit,
  User, Bot, AlertTriangle, RefreshCw
} from 'lucide-react';

interface AgentContext {
  agentId: string;
  agentName: string;
  role: string;
  systemPrompt: string;
  messages: { role: 'user' | 'assistant' | 'tool'; content: string; timestamp: string; toolCall?: string }[];
  toolCalls: { name: string; input: any; output?: any; status: 'pending' | 'success' | 'error' }[];
  knowledgeRefs: { id: string; title: string; relevance: number }[];
  tokenUsage: { used: number; limit: number; };
}

// ===================== API 获取 hook =====================
function useAgentContext(agentId: string | undefined) {
  const [context, setContext] = useState<AgentContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchContext = async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/context`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setContext(json.data);
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
      } else {
        throw new Error(json.error || 'Invalid response');
      }
    } catch (err: any) {
      setError(err.message);
      // 失败时回退到 mock
      setContext(getMockContext(agentId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [agentId]);

  return { context, loading, error, lastUpdate, refresh: fetchContext };
}

function getMockContext(agentId: string): AgentContext {
  return {
    agentId,
    agentName: `Agent-${agentId.slice(-4)}`,
    role: 'unknown',
    systemPrompt: '暂无系统提示配置',
    messages: [],
    toolCalls: [],
    knowledgeRefs: [],
    tokenUsage: { used: 0, limit: 8192 },
  };
}

// ===================== 主组件 =====================
interface Props {
  agentId?: string;
  compact?: boolean;
}

export default function AgentContextPanel({ agentId, compact = false }: Props) {
  const { context, loading, error, lastUpdate, refresh } = useAgentContext(agentId);
  const [expandedSections, setExpandedSections] = useState<string[]>(['systemPrompt', 'messages']);

  if (loading && !context) {
    return (
      <div className="w-80 bg-[#12121a] border-l border-gray-800 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">加载上下文...</p>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="w-80 bg-[#12121a] border-l border-gray-800 h-full flex items-center justify-center">
        <p className="text-xs text-gray-500">未选择 Agent</p>
      </div>
    );
  }

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const sections = [
    {
      id: 'systemPrompt',
      title: 'System Prompt',
      icon: <Terminal className="w-4 h-4 text-purple-400" />,
      content: (
        <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-[#0a0a0f] rounded-lg p-3 font-mono leading-relaxed max-h-48 overflow-y-auto">
          {context.systemPrompt}
        </pre>
      ),
    },
    {
      id: 'messages',
      title: `历史消息 (${context.messages.length})`,
      icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
      content: (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {context.messages.map((msg, idx) => (
            <div key={idx} className={`p-2.5 rounded-lg text-xs ${
              msg.role === 'user' ? 'bg-blue-500/10 border-l-2 border-blue-500' :
              msg.role === 'tool' ? 'bg-yellow-500/10 border-l-2 border-yellow-500' :
              'bg-gray-800/50 border-l-2 border-green-500'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.role === 'user' ? <User className="w-3 h-3 text-blue-400" /> :
                 msg.role === 'tool' ? <Wrench className="w-3 h-3 text-yellow-400" /> :
                 <Bot className="w-3 h-3 text-green-400" />}
                <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                {msg.toolCall && (
                  <span className="text-[10px] px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                    🔧 {msg.toolCall}
                  </span>
                )}
              </div>
              <p className="text-gray-300">{msg.content || `[调用工具: ${msg.toolCall}]`}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'toolCalls',
      title: `工具调用 (${context.toolCalls.length})`,
      icon: <Wrench className="w-4 h-4 text-yellow-400" />,
      content: (
        <div className="space-y-2">
          {context.toolCalls.map((tc, idx) => (
            <div key={idx} className="bg-[#0a0a0f] rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-yellow-400">{tc.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  tc.status === 'success' ? 'bg-green-500/20 text-green-400' :
                  tc.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {tc.status === 'success' ? '✓' : tc.status === 'pending' ? '⏳' : '✗'} {tc.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-600 mb-0.5">Input</p>
                  <pre className="text-gray-500 font-mono text-[10px]">{JSON.stringify(tc.input, null, 1)}</pre>
                </div>
                {tc.output && (
                  <div>
                    <p className="text-gray-600 mb-0.5">Output</p>
                    <pre className="text-gray-500 font-mono text-[10px]">{JSON.stringify(tc.output, null, 1)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'knowledge',
      title: `知识库引用 (${context.knowledgeRefs.length})`,
      icon: <BookOpen className="w-4 h-4 text-green-400" />,
      content: (
        <div className="space-y-1.5">
          {context.knowledgeRefs.map((ref, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-[#0a0a0f] rounded-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-300">{ref.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${ref.relevance * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{(ref.relevance * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'tokens',
      title: 'Token 用量',
      icon: <BarChart3 className="w-4 h-4 text-pink-400" />,
      warning: context.tokenUsage.used / context.tokenUsage.limit > 0.9,
      content: (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">
              {context.tokenUsage.used.toLocaleString()} / {context.tokenUsage.limit.toLocaleString()}
            </span>
            <span className={`font-mono ${
              context.tokenUsage.used / context.tokenUsage.limit > 0.9 ? 'text-red-400' :
              context.tokenUsage.used / context.tokenUsage.limit > 0.7 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {((context.tokenUsage.used / context.tokenUsage.limit) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                context.tokenUsage.used / context.tokenUsage.limit > 0.9 ? 'bg-red-500' :
                context.tokenUsage.used / context.tokenUsage.limit > 0.7 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${(context.tokenUsage.used / context.tokenUsage.limit) * 100}%` }}
            />
          </div>
          {context.tokenUsage.used / context.tokenUsage.limit > 0.9 && (
            <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>Token即将耗尽，建议清理历史消息</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  if (compact) {
    return (
      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">{context.agentName}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">{context.role}</span>
        </div>
        <div className="space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => toggleSection(s.id)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 text-left"
            >
              <div className="flex items-center gap-2">
                {s.icon}
                <span className="text-xs text-gray-400">{s.title}</span>
              </div>
              <div className="flex items-center gap-1">
                {s.warning && <AlertTriangle className="w-3 h-3 text-red-400" />}
                {expandedSections.includes(s.id) ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#12121a] border-l border-gray-800 h-full overflow-y-auto">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-gray-200">Agent 上下文</h3>
          </div>
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-blue-400 transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {error && (
          <div className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1 mb-1">
            API 错误: {error}（已回退到本地缓存）
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">{context.agentName}</p>
            <p className="text-[10px] text-gray-500">ID: {context.agentId} · {context.role}</p>
          </div>
        </div>
      </div>

      {/* 折叠区域 */}
      <div className="p-2 space-y-1">
        {sections.map(section => (
          <div key={section.id} className={`border border-gray-800 rounded-lg overflow-hidden ${section.warning ? 'border-red-800/30' : ''}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full flex items-center justify-between p-3 hover:bg-gray-800/30 transition-colors ${section.warning ? 'bg-red-500/5' : ''}`}
            >
              <div className="flex items-center gap-2">
                {section.icon}
                <span className="text-sm text-gray-300">{section.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {section.warning && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>
            {expandedSections.includes(section.id) && (
              <div className="px-3 pb-3">{section.content}</div>
            )}
          </div>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="p-3 border-t border-gray-800 mt-auto">
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <Clock className="w-3 h-3" />
          <span>最后更新: {lastUpdate || new Date().toLocaleTimeString('zh-CN')}</span>
          {loading && <span className="text-blue-400">· 刷新中...</span>}
        </div>
      </div>
    </div>
  );
}
