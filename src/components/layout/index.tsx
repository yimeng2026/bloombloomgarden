"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  Network,
  MessageSquare,
  Plus,
  ChevronRight,
  Flower2,
  Activity,
  Layers,
  LayoutGrid,
  ClipboardList,
  BookOpen,
  FolderOpen,
  Settings,
  Link2,
  Globe,
  Puzzle,
  Wallet,
  Clock,
  Server,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "仪表盘" },
  { href: "/workbench", icon: LayoutGrid, label: "工作台" },
  { href: "/agents", icon: Bot, label: "智能体" },
  { href: "/tasks", icon: ClipboardList, label: "任务" },
  { href: "/groups", icon: Users, label: "协作组" },
  { href: "/knowledge", icon: BookOpen, label: "知识库" },
  { href: "/swarm", icon: Network, label: "蜂群" },
  { href: "/canvas", icon: Layers, label: "画布" },
  { href: "/workspace", icon: FolderOpen, label: "工作空间" },
  { href: "/chat", icon: MessageSquare, label: "聊天" },
  { href: "/channels", icon: Globe, label: "通道" },
  { href: "/plugins", icon: Puzzle, label: "插件" },
  { href: "/workflows", icon: Link2, label: "工作流" },
  { href: "/company", icon: Server, label: "公司" },
  { href: "/costs", icon: Wallet, label: "成本" },
  { href: "/cron", icon: Clock, label: "定时" },
  { href: "/monitor", icon: Activity, label: "监控" },
  { href: "/settings", icon: Settings, label: "设置" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          <Flower2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-slate-800 text-sm truncate">
            BloomGarden
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Create Button */}
      <div className="p-3 border-t border-slate-200">
        <Link
          href="/agents/create"
          className={`flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium transition-all hover:shadow-lg ${
            collapsed ? "w-10 h-10 justify-center" : "w-full px-4 py-2.5 text-sm"
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>创建智能体</span>}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-300 ${
            collapsed ? "" : "rotate-180"
          }`}
        />
      </button>
    </aside>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          {currentTime.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">运行中</span>
        </div>
      </div>
    </header>
  );
}
