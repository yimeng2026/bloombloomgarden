import { useState, useCallback, createContext, useContext, useEffect } from 'react';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px]">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const interval = setInterval(() => {
      setProgress(p => Math.max(0, p - 100 / (duration / 50)));
    }, 50);
    return () => clearInterval(interval);
  }, [toast.duration]);

  const iconMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const borderColor = {
    info: 'border-blue-500/50',
    success: 'border-emerald-500/50',
    warning: 'border-amber-500/50',
    error: 'border-red-500/50',
  };

  return (
    <div
      className={`relative bg-[#12121a] border ${borderColor[toast.type]} rounded-lg p-3 shadow-lg animate-in slide-in-from-right fade-in`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{iconMap[toast.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100">{toast.title}</p>
          {toast.message && <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-500 hover:text-gray-300 text-lg leading-none"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] bg-current opacity-30 rounded-b-lg" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
