import { useState } from 'react';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  tokenCount?: { prompt: number; completion: number };
  attachments?: { name: string; type: string; size: number }[];
}

/**
 * AgentMessageBubble — Agent 对话消息气泡
 * 支持 reasoning_content（思维链）折叠、代码复制、Token 用量展示
 */
export default function AgentMessageBubble({ message }: { message: AgentMessage }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 简单的代码块检测（```...```）
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\w]*\n?[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```[\w]*\n?/, '').replace(/```$/, '');
        return (
          <div key={i} className="relative my-2">
            <div className="flex items-center justify-between px-3 py-1 bg-[#1a1a2e] rounded-t-lg border border-gray-700 border-b-0">
              <span className="text-xs text-gray-500">代码</span>
              <button
                onClick={handleCopy}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                {copied ? '✅ 已复制' : '📋 复制'}
              </button>
            </div>
            <pre className="bg-[#0f0f1a] p-3 rounded-b-lg border border-gray-700 overflow-x-auto text-sm text-gray-300 font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <p key={i} className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{part}</p>;
    });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 bg-gray-800/50 rounded-full text-xs text-gray-500">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
        isUser ? 'bg-indigo-600' : 'bg-purple-600'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* 消息体 */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-left rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600/20 border border-indigo-500/30'
            : 'bg-[#12121a] border border-gray-800'
        }`}>
          {/* reasoning_content（思维链）*/}
          {message.reasoningContent && (
            <div className="mb-2">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1"
              >
                <span>{showReasoning ? '▼' : '▶'}</span>
                <span>思维链 ({message.reasoningContent.length} 字符)</span>
              </button>
              {showReasoning && (
                <div className="bg-[#0a0a0f] border border-gray-800 rounded-lg p-2 text-xs text-gray-500 font-mono whitespace-pre-wrap">
                  {message.reasoningContent}
                </div>
              )}
            </div>
          )}

          {/* 内容 */}
          {renderContent(message.content)}

          {/* 附件 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-400">
                  <span>📎</span>
                  <span>{att.name}</span>
                  <span className="text-gray-600">({(att.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 元信息 */}
        <div className={`flex items-center gap-2 mt-1 text-[10px] text-gray-600 ${isUser ? 'justify-end' : ''}`}>
          <span>{message.timestamp.toLocaleTimeString('zh-CN')}</span>
          {message.model && <span>· {message.model}</span>}
          {message.provider && <span>· {message.provider}</span>}
          {message.tokenCount && (
            <span>· {message.tokenCount.completion} tokens</span>
          )}
          {!isUser && (
            <button onClick={handleCopy} className="hover:text-gray-400">
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
