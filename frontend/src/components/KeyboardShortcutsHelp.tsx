import { useEffect, useState } from 'react';

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: '全局',
    items: [
      { keys: ['Ctrl', 'K'], description: '打开命令面板' },
      { keys: ['Ctrl', '/'], description: '显示快捷键帮助' },
      { keys: ['Esc'], description: '关闭弹窗/取消操作' },
    ],
  },
  {
    title: '导航',
    items: [
      { keys: ['Ctrl', 'H'], description: '首页 Dashboard' },
      { keys: ['Ctrl', 'A'], description: 'Agent 管理' },
      { keys: ['Ctrl', 'C'], description: '对话中心' },
      { keys: ['Ctrl', 'T'], description: '任务调度' },
      { keys: ['Ctrl', 'S'], description: '系统设置' },
    ],
  },
  {
    title: '对话',
    items: [
      { keys: ['Enter'], description: '发送消息' },
      { keys: ['Shift', 'Enter'], description: '换行' },
      { keys: ['Ctrl', 'L'], description: '清空对话' },
    ],
  },
  {
    title: '设置',
    items: [
      { keys: ['Ctrl', 'D'], description: '切换主题' },
    ],
  },
];

/**
 * KeyboardShortcutsHelp — 键盘快捷键帮助面板
 * Ctrl+/ 触发，分组展示所有可用快捷键
 */
export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(o => !o);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60" onClick={() => setIsOpen(false)}>
      <div
        className="w-full max-w-lg bg-[#12121a] border border-gray-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-200">⌨️ 键盘快捷键</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg">×</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {SHORTCUTS.map(group => (
            <div key={group.title}>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{group.title}</h4>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-300">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-400 rounded border border-gray-700 font-mono">
                            {k}
                          </kbd>
                          {i < item.keys.length - 1 && <span className="text-gray-600">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-2 border-t border-gray-800 text-xs text-gray-500 text-center">
          按 Ctrl+/ 随时打开此面板
        </div>
      </div>
    </div>
  );
}
