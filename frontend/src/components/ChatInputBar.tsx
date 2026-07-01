import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string, options: { model: string; provider: string; attachments?: File[] }) => void;
  onStop?: () => void;
  isLoading?: boolean;
  availableProviders?: { name: string; models: string[] }[];
}

/**
 * ChatInputBar — 智能对话输入栏
 * 支持模型选择、Provider切换、附件上传、流式停止
 */
export default function ChatInputBar({
  onSend,
  onStop,
  isLoading = false,
  availableProviders = [
    { name: 'OpenRouter', models: ['openrouter/auto', 'anthropic/claude-3.5-sonnet:free', 'deepseek/deepseek-chat:free'] },
    { name: 'Kimi', models: ['kimi-k1', 'kimi-moonshot-v1-128k'] },
    { name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
    { name: 'Anthropic', models: ['claude-3-5-sonnet-20241022'] },
    { name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
    { name: 'Ollama', models: ['llama3.2', 'qwen2.5', 'phi4'] },
  ],
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(availableProviders[0]?.name || 'OpenRouter');
  const [selectedModel, setSelectedModel] = useState(availableProviders[0]?.models[0] || '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentProvider = availableProviders.find(p => p.name === selectedProvider);

  useEffect(() => {
    if (currentProvider && !currentProvider.models.includes(selectedModel)) {
      setSelectedModel(currentProvider.models[0]);
    }
  }, [selectedProvider, currentProvider]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim(), {
      model: selectedModel,
      provider: selectedProvider,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  return (
    <div className="bg-[#12121a] border border-gray-800 rounded-xl p-3 space-y-2">
      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-400">
              <span>📎</span>
              <span className="max-w-[120px] truncate">{file.name}</span>
              <span className="text-gray-600">({(file.size / 1024).toFixed(0)}KB)</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="ml-1 text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Shift+Enter 换行, Enter 发送)"
          rows={1}
          className="flex-1 bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-indigo-500 outline-none resize-none min-h-[40px] max-h-[200px]"
        />
        <div className="flex flex-col gap-1">
          {isLoading ? (
            <button
              onClick={onStop}
              className="h-10 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <span>⏹</span>
              <span>停止</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="h-10 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
            >
              <span>➤</span>
              <span>发送</span>
            </button>
          )}
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 模型选择 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-800 rounded text-xs text-gray-400 transition-colors"
            >
              <span>🧠</span>
              <span>{selectedProvider}/{selectedModel}</span>
              <span>{showModelMenu ? '▲' : '▼'}</span>
            </button>

            {showModelMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto">
                {availableProviders.map(provider => (
                  <div key={provider.name}>
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-800/30">
                      {provider.name}
                    </div>
                    {provider.models.map(model => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedProvider(provider.name);
                          setSelectedModel(model);
                          setShowModelMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs ${
                          selectedProvider === provider.name && selectedModel === model
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-gray-400 hover:bg-gray-800/50'
                        }`}
                      >
                        {model}
                        {model.includes(':free') && <span className="ml-1 text-emerald-400 text-[10px]">免费</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 附件上传 */}
          <label className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-800 rounded text-xs text-gray-400 cursor-pointer transition-colors">
            <span>📎</span>
            <span>附件</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept=".txt,.md,.pdf,.json,.csv,.py,.js,.ts,.tsx"
            />
          </label>
        </div>

        <span className="text-[10px] text-gray-600">
          {text.length} 字符
        </span>
      </div>
    </div>
  );
}
