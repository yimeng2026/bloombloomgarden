import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

interface AgentContext {
  agentId: string;
  agentName: string;
  systemPrompt: string;
  history: { role: string; content: string; timestamp: string }[];
  toolCalls: { tool: string; input: any; output: any; timestamp: string }[];
  knowledgeRefs: string[];
  tokenUsage: { prompt: number; completion: number; total: number };
  model: string;
  status: string;
}

export default function AgentContextPage() {
  const [contexts, setContexts] = useState<AgentContext[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ history: true, tools: false, knowledge: false, tokens: false });

  useEffect(() => {
    fetchContexts();
  }, []);

  const fetchContexts = async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const agents = data.data || data;
      // 为每个Agent获取上下文
      const full = await Promise.all(agents.map(async (a: any) => {
        try {
          const r = await fetch(`/api/agents/${a.id}/context`);
          const d = await r.json();
          return { agentId: a.id, agentName: a.name, model: a.model, status: a.status, ...d.data };
        } catch (e) {
          return mockContext(a);
        }
      }));
      setContexts(full);
    } catch (e) {
      console.warn('获取Agent上下文失败:', e);
      setContexts([
        mockContext({ id: 'agent-1', name: '产品经理-Alpha', model: 'kimi-code', status: 'idle' }),
        mockContext({ id: 'agent-2', name: '架构师-Beta', model: 'deepseek', status: 'busy' }),
        mockContext({ id: 'agent-3', name: '开发-Gamma', model: 'qwen', status: 'idle' }),
      ]);
    }
  };

  const mockContext = (a: any): AgentContext => ({
    agentId: a.id,
    agentName: a.name,
    model: a.model,
    status: a.status,
    systemPrompt: `你是${a.name}，一位专业的AI助手...`,
    history: [
      { role: 'user', content: '请分析这个需求', timestamp: new Date().toISOString() },
      { role: 'assistant', content: '经过分析，我认为...', timestamp: new Date().toISOString() },
    ],
    toolCalls: [],
    knowledgeRefs: ['kb-1'],
    tokenUsage: { prompt: 120, completion: 340, total: 460 },
  });

  const active = contexts.find(c => c.agentId === selected) || contexts[0];

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex">
        {/* 左侧Agent列表 */}
        <div className="w-64 border-r border-gray-800 p-4 overflow-auto">
          <h2 className="text-sm font-bold text-white mb-4">Agent 上下文</h2>
          <div className="space-y-2">
            {contexts.map(c => (
              <button
                key={c.agentId}
                onClick={() => setSelected(c.agentId)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected === c.agentId ? 'bg-[var(--sage-600)]/20 text-white border border-[var(--sage-600)]/30' : 'text-gray-400 hover:bg-[#1a1a24] hover:text-white'
                }`}
              >
                <div className="font-medium truncate">{c.agentName}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.model} · {c.tokenUsage.total} tokens</div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧详情 */}
        {active && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white">{active.agentName}</h1>
              <p className="text-gray-500 text-sm">{active.model} · 状态: {active.status} · ID: {active.agentId}</p>
            </div>

            {/* System Prompt */}
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-white mb-2">System Prompt</h3>
              <pre className="text-xs text-gray-400 bg-[#0d0d14] rounded p-3 overflow-auto max-h-[150px]">{active.systemPrompt}</pre>
            </div>

            {/* 历史消息 */}
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-4">
              <button
                onClick={() => setExpanded(p => ({ ...p, history: !p.history }))}
                className="flex items-center justify-between w-full text-sm font-medium text-white"
              >
                <span>历史消息 ({active.history.length})</span>
                <span className="text-gray-500">{expanded.history ? '▼' : '▶'}</span>
              </button>
              {expanded.history && (
                <div className="mt-3 space-y-2">
                  {active.history.map((h, i) => (
                    <div key={i} className={`text-sm p-3 rounded ${h.role === 'user' ? 'bg-blue-500/10 text-blue-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                      <div className="text-xs text-gray-500 mb-1">{h.role} · {new Date(h.timestamp).toLocaleTimeString()}</div>
                      <div className="text-white">{h.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 工具调用 */}
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-4">
              <button
                onClick={() => setExpanded(p => ({ ...p, tools: !p.tools }))}
                className="flex items-center justify-between w-full text-sm font-medium text-white"
              >
                <span>工具调用 ({active.toolCalls.length})</span>
                <span className="text-gray-500">{expanded.tools ? '▼' : '▶'}</span>
              </button>
              {expanded.tools && (
                <div className="mt-3 text-sm text-gray-400">
                  {active.toolCalls.length === 0 ? '暂无工具调用记录' : active.toolCalls.map((t, i) => (
                    <div key={i} className="bg-[#0d0d14] rounded p-2 mb-2">
                      <div className="text-white">{t.tool}</div>
                      <div className="text-xs">{JSON.stringify(t.input)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Token用量 */}
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
              <button
                onClick={() => setExpanded(p => ({ ...p, tokens: !p.tokens }))}
                className="flex items-center justify-between w-full text-sm font-medium text-white"
              >
                <span>Token 用量</span>
                <span className="text-gray-500">{expanded.tokens ? '▼' : '▶'}</span>
              </button>
              {expanded.tokens && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="bg-[#0d0d14] rounded p-3 text-center">
                    <div className="text-lg font-bold text-white">{active.tokenUsage.prompt}</div>
                    <div className="text-xs text-gray-500">Prompt</div>
                  </div>
                  <div className="bg-[#0d0d14] rounded p-3 text-center">
                    <div className="text-lg font-bold text-white">{active.tokenUsage.completion}</div>
                    <div className="text-xs text-gray-500">Completion</div>
                  </div>
                  <div className="bg-[#0d0d14] rounded p-3 text-center">
                    <div className="text-lg font-bold text-emerald-400">{active.tokenUsage.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
