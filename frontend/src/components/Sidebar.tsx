import React from 'react'
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  FolderOpen,
  BookOpen,
  Bot,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Brain,
  Wrench,
  Cpu,
  Workflow,
  Calendar,
  Webhook,
  FlaskConical,
  Shield,
  HardDrive,
  Files,
  Layers,
  Box,
  Users,
  Palette,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route?: string;
  children?: { id: string; label: string; route: string }[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, route: '/dashboard' },
  { id: 'platform', label: '平台管理', icon: Server, route: '/platform' },
  { id: 'blueprints', label: '蓝图编排', icon: Workflow, route: '/blueprints' },
  { id: 'ecosystem',  label: '3D生态坐标系', icon: Box, route: '/ecosystem' },
  { id: 'workspace', label: '工作空间', icon: FolderOpen, route: '/workspace' },
  { id: 'files', label: '文件浏览', icon: Files, route: '/files' },
  { id: 'knowledge', label: '知识库', icon: BookOpen, route: '/knowledge' },
  { id: 'memory', label: '记忆库', icon: Brain, route: '/memory' },
  {
    id: 'agents',
    label: '智能体',
    icon: Bot,
    children: [
      { id: 'list',   label: '列表', route: '/agents' },
      { id: 'create', label: '创建', route: '/agents/create' },
      { id: 'swarm',  label: '蜂群', route: '/swarm' },
    ],
  },
  {
    id: 'chat',
    label: '通讯',
    icon: MessageSquare,
    children: [
      { id: 'chat', label: '聊天', route: '/chat' },
      { id: 'chat-accounts', label: '聊天账号', route: '/chat-accounts' },
      { id: 'channels', label: '频道', route: '/channels' },
      { id: 'sessions', label: '会话', route: '/sessions' },
      { id: 'dialog-center', label: '对话中心', route: '/dialog-center' },
      { id: 'tasks', label: '任务', route: '/tasks' },
    ],
  },
  {
    id: 'monitor',
    label: '监控中心',
    icon: Activity,
    children: [
      { id: 'monitoring', label: '系统监控', route: '/monitoring' },
      { id: 'context', label: '上下文', route: '/context' },
    ],
  },
  {
    id: 'tools',
    label: '工具',
    icon: Wrench,
    children: [
      { id: 'skills', label: '技能库', route: '/skills' },
      { id: 'model-browser', label: '模型浏览器', route: '/model-browser' },
      { id: 'workflows', label: '工作流', route: '/workflows' },
      { id: 'scheduler', label: '调度器', route: '/scheduler' },
      { id: 'webhooks', label: 'Webhooks', route: '/webhooks' },
    ],
  },
  { id: 'admin', label: '管理面板', icon: Shield, route: '/admin' },
  { id: 'settings', label: '设置', icon: Settings, route: '/settings' },
];

function VineDecoration() {
  return (
    <svg
      className="absolute left-0 top-0 w-4 h-full pointer-events-none opacity-30"
      style={{ color: 'var(--sage-300)' }}
      viewBox="0 0 16 800"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M8 0 Q12 50 8 100 Q4 150 8 200 Q12 250 8 300 Q4 350 8 400 Q12 450 8 500 Q4 550 8 600 Q12 650 8 700 Q4 750 8 800"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8" cy="80" r="2" fill="currentColor" />
      <circle cx="6" cy="180" r="1.5" fill="currentColor" />
      <circle cx="10" cy="280" r="2" fill="currentColor" />
      <circle cx="7" cy="380" r="1.5" fill="currentColor" />
      <circle cx="11" cy="480" r="2" fill="currentColor" />
      <circle cx="6" cy="580" r="1.5" fill="currentColor" />
      <circle cx="9" cy="680" r="2" fill="currentColor" />
    </svg>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, language } = useAppStore();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    agents: true,
    platform: false,
    chat: false,
    monitor: false,
    tools: false,
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (route?: string) => {
    if (!route) return false;
    return location.pathname === route;
  };

  const isChildActive = (children?: { route: string }[]) => {
    if (!children) return false;
    return children.some((c) => location.pathname === c.route);
  };

  const t = (zh: string) => zh;

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex flex-col border-r transition-all duration-400"
      style={{
        width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--sage-50)',
        borderColor: 'var(--sage-200)',
        transitionTimingFunction: 'var(--ease-gentle)',
      }}
    >
      <VineDecoration />

      {/* Logo area */}
      <div className="flex items-center justify-between px-4 border-b flex-shrink-0" style={{ height: 'var(--topbar-height)', borderColor: 'var(--sage-200)' }}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
              <path d="M16 4C12 8 8 12 8 16C8 20 12 24 16 24" stroke="var(--sage-600)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M16 8C14 10 12 12 12 14.5C12 17 14 19 16 19" stroke="var(--sage-500)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M16 12C15.5 13 15 13.8 15 14.5C15 15.2 15.5 16 16 16" stroke="var(--bloom-mint)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="16" cy="4" r="2" fill="var(--sage-500)" />
              <circle cx="8" cy="16" r="1.5" fill="var(--bloom-mint)" opacity="0.6" />
              <circle cx="16" cy="24" r="1.5" fill="var(--sage-400)" opacity="0.6" />
            </svg>
            <div className="overflow-hidden">
              <div className="font-display text-sm font-bold truncate" style={{ color: 'var(--sage-800)' }}>
                Bloombloomgarden
              </div>
              <div className="text-[10px] font-medium -mt-0.5 truncate" style={{ color: 'var(--sage-400)' }}>
                {language === 'zh' ? '千界花园' : 'Garden'}
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="mx-auto">
            <path d="M16 4C12 8 8 12 8 16C8 20 12 24 16 24" stroke="var(--sage-600)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M16 8C14 10 12 12 12 14.5C12 17 14 19 16 19" stroke="var(--sage-500)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="4" r="2" fill="var(--sage-500)" />
          </svg>
        )}
        <button
          onClick={toggleSidebar}
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[var(--sage-100)]"
          style={{ color: 'var(--sage-400)' }}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const active = isActive(item.route) || (hasChildren && isChildActive(item.children));

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleGroup(item.id);
                  } else if (item.route) {
                    navigate(item.route);
                  }
                }}
                className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-card-sm transition-all duration-200 w-[calc(100%-24px)]"
                style={{
                  backgroundColor: active ? 'var(--sage-500)' : 'transparent',
                  color: active ? '#fff' : 'var(--sage-600)',
                }}
                title={sidebarCollapsed ? t(item.label) : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">{t(item.label)}</span>
                    {hasChildren && (
                      <span className="flex-shrink-0 transition-transform duration-200" style={{ transform: expandedGroups[item.id] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                        <ChevronDown size={14} />
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Submenu */}
              {hasChildren && expandedGroups[item.id] && !sidebarCollapsed && (
                <div className="ml-6 mt-0.5 space-y-0.5 overflow-hidden">
                  {item.children?.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => navigate(child.route)}
                      className="flex items-center gap-2 px-3 py-2 rounded-card-sm transition-all duration-200 w-[calc(100%-12px)] text-sm"
                      style={{
                        backgroundColor: isActive(child.route) ? 'var(--sage-500)' : 'transparent',
                        color: isActive(child.route) ? '#fff' : 'var(--sage-500)',
                      }}
                    >
                      <ChevronRight size={12} className="flex-shrink-0" />
                      <span>{t(child.label)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick actions */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={() => navigate('/agents/create')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
          >
            <Plus size={16} />
            <span>{t('新建智能体')}</span>
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
          >
            <Plus size={16} />
            <span>{t('新建任务')}</span>
          </button>
        </div>
      )}
    </aside>
  );
}

