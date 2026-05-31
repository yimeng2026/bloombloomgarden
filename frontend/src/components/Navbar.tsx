import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Moon, Sun, Globe } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import type { NotificationItem } from '@/types';

export default function Navbar() {
  const {
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    notifications,
    unreadCount,
    markAllRead,
    sidebarCollapsed,
  } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success': return 'bg-bloom-mint';
      case 'warning': return 'bg-bloom-amber';
      case 'error': return 'bg-bloom-rose';
      default: return 'bg-bloom-sky';
    }
  };

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <header
      className="fixed top-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 border-b transition-all duration-300"
      style={{
        height: 'var(--topbar-height)',
        left: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--sage-50)',
        borderColor: 'var(--sage-200)',
      }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <h1 className="font-display text-base lg:text-lg font-semibold truncate" style={{ color: 'var(--sage-800)' }}>
          {t('仪表盘', 'Dashboard')}
        </h1>
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-card-md border text-sm transition-all duration-300 focus-within:border-[var(--sage-500)] focus-within:shadow-sm cursor-pointer hover:bg-[var(--sage-50)]"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}
          title="Ctrl+K 打开命令面板"
        >
          <Search size={16} style={{ color: 'var(--sage-400)' }} />
          <span
            className="text-sm select-none"
            style={{ color: 'var(--sage-400)', minWidth: '180px' }}
          >
            {t('搜索智能体、任务、知识库...', 'Search agents, tasks, knowledge...')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)] font-mono"
          >
            Ctrl+K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
        {/* WebSocket status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md mr-1">
          <span className="w-2 h-2 rounded-full bg-success status-dot-pulse" />
          <span className="text-xs font-medium" style={{ color: 'var(--sage-500)' }}>
            {t('实时连接', 'Live')}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-card-sm flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{ color: 'var(--sage-600)' }}
          title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Language switcher */}
        <button
          onClick={toggleLanguage}
          className="w-9 h-9 rounded-card-sm flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-105"
          style={{ color: 'var(--sage-600)' }}
          title="Switch language"
        >
          <Globe size={16} />
          <span className="ml-0.5">{language === 'zh' ? '中' : 'EN'}</span>
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-9 h-9 rounded-card-sm flex items-center justify-center transition-all duration-200 hover:scale-105 relative"
            style={{ color: 'var(--sage-600)' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-80 rounded-card-md shadow-card-elevated overflow-hidden z-50"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--sage-800)' }}>
                  {t('通知', 'Notifications')}
                </span>
                <button
                  onClick={markAllRead}
                  className="text-xs transition-colors hover:underline"
                  style={{ color: 'var(--sage-500)' }}
                >
                  {t('全部已读', 'Mark all read')}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sage-400)' }}>
                    {t('暂无通知', 'No notifications')}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--sage-50)]"
                      style={{ borderColor: 'var(--sage-100)' }}
                    >
                      <div className={`w-1 self-stretch rounded-full ${getNotifColor(n.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--sage-800)' }}>
                          {n.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                          {n.message}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-info flex-shrink-0 mt-1" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ml-1 cursor-pointer"
          style={{ backgroundColor: 'var(--sage-500)' }}
        >
          G
        </div>
      </div>
    </header>
  );
}

