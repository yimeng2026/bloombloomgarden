import React, { useState, useRef, useEffect } from 'react';
import {
  User, Bot, Send, RotateCcw, Hand, MessageSquare,
  ChevronDown, ChevronUp, Clock, CheckCircle, AlertTriangle,
  X, Zap, Eye
} from 'lucide-react';

// ===================== 类型定义 =====================
interface TakeoverMessage {
  id: string;
  role: 'system' | 'human' | 'agent' | 'instruction';
  content: string;
  timestamp: string;
  mode: 'replace' | 'direct' | 'guide';
}

interface TakeoverSession {
  id: string;
  agentId: string;
  agentName: string;
  status: 'requested' | 'active' | 'releasing' | 'completed';
  mode: 'replace' | 'direct' | 'guide';
  reason: string;
  messages: TakeoverMessage[];
  startedAt: string;
}

// ===================== Mock数据 =====================
const MOCK_SESSION: TakeoverSession = {
  id: 'takeover-001',
  agentId: 'agent-dev-03',
  agentName: '开发工程师-Beta',
  status: 'active',
  mode: 'guide',
  reason: 'Agent卡在循环依赖分析超过5分钟，自动触发人工接管请求',
  startedAt: '2026-05-28 15:32:18',
  messages: [
    {
      id: 'm-1', role: 'system', content: '开发工程师-Beta 在分析循环依赖时卡住，已自动请求人工接管',
      timestamp: '2026-05-28 15:32:18', mode: 'guide'
    },
    {
      id: 'm-2', role: 'agent', content: '我发现模块A依赖模块B，模块B依赖模块C，模块C又依赖模块A...我需要人类帮助判断这是否是设计缺陷还是正常的循环引用。',
      timestamp: '2026-05-28 15:32:20', mode: 'guide'
    },
    {
      id: 'm-3', role: 'instruction', content: '[人类指导] 检查是否是接口层依赖而非实现层依赖。如果是接口层循环，这是可接受的；如果是实现层循环，需要重构。',
      timestamp: '2026-05-28 15:33:05', mode: 'guide'
    },
  ],
};

// ===================== 主组件 =====================
interface Props {
  session?: TakeoverSession;
  onRelease?: (summary: string) => void;
}

export default function HumanTakeoverPanel({ session = MOCK_SESSION, onRelease }: Props) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'replace' | 'direct' | 'guide'>(session.mode);
  const [messages, setMessages] = useState<TakeoverMessage[]>(session.messages);
  const [showContext, setShowContext] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [summary, setSummary] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMsg: TakeoverMessage = {
      id: `m-${Date.now()}`,
      role: mode === 'direct' ? 'human' : 'instruction',
      content: mode === 'direct' ? input : `[${mode === 'replace' ? '代Agent回复' : '人类指导'}] ${input}`,
      timestamp: new Date().toLocaleString('zh-CN'),
      mode,
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');

    // 模拟Agent响应
    if (mode === 'guide') {
      setTimeout(() => {
        const agentReply: TakeoverMessage = {
          id: `m-${Date.now()}-r`,
          role: 'agent',
          content: '收到指导，我将继续执行并根据您的建议调整方向。',
          timestamp: new Date().toLocaleString('zh-CN'),
          mode: 'guide',
        };
        setMessages(prev => [...prev, agentReply]);
      }, 1000);
    }
  };

  const handleRelease = () => {
    if (!summary.trim()) return;
    setReleasing(true);
    setTimeout(() => {
      onRelease?.(summary);
      setReleasing(false);
    }, 1000);
  };

  const modeConfig = {
    replace: { label: '代Agent回复', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <RotateCcw className="w-3 h-3" /> },
    direct: { label: '直接回复', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <MessageSquare className="w-3 h-3" /> },
    guide: { label: '指导Agent', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: <Zap className="w-3 h-3" /> },
  };

  return (
    <div className="w-[420px] bg-[#12121a] border-l border-gray-800 h-full flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-gray-200">人工接管</h3>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            session.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          }`}>
            {session.status === 'active' ? '接管中' : session.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Bot className="w-3 h-3" />
          <span>{session.agentName}</span>
          <span>·</span>
          <span>ID: {session.agentId}</span>
        </div>
        <div className="mt-2 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
          <p className="text-xs text-yellow-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {session.reason}
          </p>
        </div>
      </div>

      {/* 模式切换 */}
      <div className="px-4 py-2 border-b border-gray-800">
        <div className="flex gap-2">
          {(Object.keys(modeConfig) as Array<keyof typeof modeConfig>).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                mode === m ? modeConfig[m].color : 'text-gray-500 border-gray-800 hover:border-gray-700'
              }`}
            >
              {modeConfig[m].icon}
              {modeConfig[m].label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          {mode === 'replace' && '以Agent身份直接发送消息，Agent将暂停并接收您的回复作为其输出'}
          {mode === 'direct' && '以人类身份直接参与对话，其他Agent将看到您的消息'}
          {mode === 'guide' && '向Agent发出指令和建议，Agent将继续自主执行但遵循您的方向'}
        </p>
      </div>

      {/* 消息区域 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {showContext && messages.map(msg => (
          <div key={msg.id} className={`${
            msg.role === 'system' ? 'bg-gray-800/30 text-gray-400' :
            msg.role === 'human' ? 'bg-blue-500/10 border-l-2 border-blue-500' :
            msg.role === 'instruction' ? 'bg-green-500/10 border-l-2 border-green-500' :
            'bg-[#0a0a0f] border border-gray-800'
          } rounded-lg p-3`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {msg.role === 'system' && <Clock className="w-3 h-3" />}
              {msg.role === 'human' && <User className="w-3 h-3 text-blue-400" />}
              {msg.role === 'instruction' && <Zap className="w-3 h-3 text-green-400" />}
              {msg.role === 'agent' && <Bot className="w-3 h-3 text-gray-400" />}
              <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
              {msg.role === 'instruction' && (
                <span className="text-[10px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded">
                  {modeConfig[msg.mode].label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-300 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={`按 Shift+Enter 发送 (${modeConfig[mode].label})...`}
            className="flex-1 bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 resize-none h-20 outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-white transition-colors self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 释放区域 */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">释放Agent前请填写交接摘要</p>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="描述接管期间的处理结果和后续建议..."
          className="w-full bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 resize-none h-16 outline-none focus:border-green-500 mb-2"
        />
        <button
          onClick={handleRelease}
          disabled={!summary.trim() || releasing}
          className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {releasing ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {releasing ? '交接中...' : '释放Agent控制权'}
        </button>
      </div>
    </div>
  );
}
