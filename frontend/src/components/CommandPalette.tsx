import { useState, useEffect, useCallback, useRef } from 'react';

interface CommandItem {
  id: string;
  title: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
  category: string;
}

/**
 * CommandPalette — 全局命令面板（Cmd+K / Ctrl+K）
 * 支持搜索命令、快捷键触发、最近使用
 */
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'home', title: '首页 Dashboard', shortcut: 'H', icon: '🏠', category: '导航', action: () => onNavigate('/') },
    { id: 'agents', title: 'Agent 管理', shortcut: 'A', icon: '🤖', category: '导航', action: () => onNavigate('/agents') },
    { id: 'dialog', title: '对话中心', shortcut: 'C', icon: '💬', category: '导航', action: () => onNavigate('/dialog') },
    { id: 'knowledge', title: '知识库', shortcut: 'K', icon: '📚', category: '导航', action: () => onNavigate('/knowledge-bases') },
    { id: 'tasks', title: '任务调度', shortcut: 'T', icon: '📋', category: '导航', action: () => onNavigate('/tasks') },
    { id: 'settings', title: '系统设置', shortcut: 'S', icon: '⚙️', category: '导航', action: () => onNavigate('/settings') },
    { id: 'apikeys', title: 'API Keys 管理', icon: '🔑', category: '设置', action: () => onNavigate('/apikeys') },
    { id: 'monitor', title: '监控面板', icon: '📊', category: '导航', action: () => onNavigate('/monitor') },
    { id: 'spend', title: '用量统计', icon: '💰', category: '导航', action: () => onNavigate('/spend') },
    { id: 'login', title: '退出登录', icon: '🚪', category: '账户', action: () => { localStorage.clear(); onNavigate('/login'); } },
    { id: 'theme', title: '切换主题', shortcut: 'D', icon: '🌓', category: '设置', action: () => { document.documentElement.classList.toggle('dark'); } },
    { id: 'ollama', title: 'Ollama 设置', icon: '🦙', category: '设置', action: () => onNavigate('/ollama') },
    { id: 'security', title: '安全中心', icon: '🛡️', category: '设置', action: () => onNavigate('/security') },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatItems = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) onClose(); // trigger toggle from parent
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
        onClose();
      }
    },
    [isOpen, flatItems, selectedIndex, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#12121a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <span className="text-gray-500 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索命令、页面、功能..."
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 outline-none text-sm"
          />
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-500 rounded border border-gray-700">ESC</kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              未找到 "{query}" 相关命令
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {category}
                </div>
                {items.map((cmd, idx) => {
                  const globalIdx = flatItems.indexOf(cmd);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-indigo-500/20 text-white' : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      <span className="text-lg">{cmd.icon}</span>
                      <span className="flex-1 text-sm">{cmd.title}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-500 rounded border border-gray-700">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
          <span>↑↓ 选择</span>
          <span>↵ 确认</span>
          <span className="flex-1" />
          <span>共 {commands.length} 个命令</span>
        </div>
      </div>
    </div>
  );
}
