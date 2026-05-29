import { useState, useRef, useEffect } from 'react';

interface QuickAction {
  label: string;
  icon: string;
  onClick: () => void;
  color: string;
}

/**
 * QuickActionsFAB — 浮动快捷操作按钮
 * 右下角常驻，点击展开快速创建入口
 */
export default function QuickActionsFAB({
  onNewAgent,
  onNewTask,
  onNewChat,
}: {
  onNewAgent: () => void;
  onNewTask: () => void;
  onNewChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const actions: QuickAction[] = [
    { label: '新建对话', icon: '💬', onClick: () => { onNewChat(); setOpen(false); }, color: 'bg-indigo-500 hover:bg-indigo-400' },
    { label: '新建Agent', icon: '🤖', onClick: () => { onNewAgent(); setOpen(false); }, color: 'bg-purple-500 hover:bg-purple-400' },
    { label: '新建任务', icon: '📋', onClick: () => { onNewTask(); setOpen(false); }, color: 'bg-emerald-500 hover:bg-emerald-400' },
  ];

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm shadow-lg transition-all ${a.color}`}
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl text-white transition-all duration-300 ${
          open ? 'bg-red-500 hover:bg-red-400 rotate-45' : 'bg-indigo-600 hover:bg-indigo-500'
        }`}
      >
        {open ? '×' : '+'}
      </button>
    </div>
  );
}
