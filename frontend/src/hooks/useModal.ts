import { useState, useCallback } from 'react';

interface ModalState<T = any> {
  isOpen: boolean;
  data?: T;
}

/**
 * useModal — 通用弹窗状态管理 Hook
 * 支持数据透传、打开/关闭/切换
 */
export function useModal<T = any>() {
  const [state, setState] = useState<ModalState<T>>({ isOpen: false });

  const open = useCallback((data?: T) => {
    setState({ isOpen: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false });
  }, []);

  const toggle = useCallback((data?: T) => {
    setState(prev => ({ isOpen: !prev.isOpen, data }));
  }, []);

  return { isOpen: state.isOpen, data: state.data, open, close, toggle };
}

/**
 * useLocalStorage — 带类型安全的 localStorage Hook
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [stored, setValue] as const;
}

/**
 * useDebounce — 防抖 Hook
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useState(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  });

  return debounced;
}
