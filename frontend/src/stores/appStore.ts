import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';
type Language = 'zh' | 'en';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  read: boolean;
  timestamp: number;
}
interface AppState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  language: Language;
  notifications: NotificationItem[];
  searchOpen: boolean;
  unreadCount: number;

  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  setSearchOpen: (open: boolean) => void;
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem('theme') as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
};

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('language') as Language | null;
  if (saved === 'zh' || saved === 'en') return saved;
  return 'zh';
};

export const useAppStore = create<AppState>((set) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  language: getInitialLanguage(),
  notifications: [
    {
      id: '1',
      title: 'Agent-代码助手 完成任务',
      message: '代码审查任务 #2847 已完成',
      type: 'success',
      read: false,
      timestamp: Date.now() - 120000,
    },
    {
      id: '2',
      title: '平台连接已恢复',
      message: 'Ollama 本地服务连接已恢复',
      type: 'info',
      read: false,
      timestamp: Date.now() - 600000,
    },
    {
      id: '3',
      title: '任务失败警告',
      message: '任务 #2845 失败: API超时',
      type: 'warning',
      read: true,
      timestamp: Date.now() - 2940000,
    },
  ],
  searchOpen: false,
  unreadCount: 2,

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleLanguage: () =>
    set((state) => {
      const newLang = state.language === 'zh' ? 'en' : 'zh';
      localStorage.setItem('language', newLang);
      return { language: newLang };
    }),

  setLanguage: (language) => {
    localStorage.setItem('language', language);
    set({ language });
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: Date.now().toString(),
          timestamp: Date.now(),
        },
        ...state.notifications,
      ].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setSearchOpen: (open) => set({ searchOpen: open }),
}));
