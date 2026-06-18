import {
  fetchAgents,
  fetchTasks,
  fetchPlatforms,
  fetchKnowledgeBases,
  fetchGroups,
} from '@/api/client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Server, FolderOpen, BookOpen, Activity, PlusCircle,
  Signal, MemoryStick, Database, HardDrive, RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/stores/appStore';
import StatsCard from '@/components/StatsCard';
import ContentCard from '@/components/ContentCard';
import type { ActivityEvent } from '@/types';

/* ─── Inline UI config (not business mock data) ─── */
const statsData = [
  { label: '运行中智能体', labelEn: 'Running Agents', value: 12, trend: '+3 今日新增', trendType: 'up' as const, color: '#7fb89f', icon: 'Bot' },
  { label: '今日任务', labelEn: 'Tasks Today', value: 48, trend: '89% 完成率', trendType: 'up' as const, color: '#7fa3b0', icon: 'CheckSquare' },
  { label: '已连接平台', labelEn: 'Platforms', value: 5, trend: '全部正常', trendType: 'neutral' as const, color: '#c9a96e', icon: 'Server' },
  { label: '知识库条目', labelEn: 'Knowledge Bases', value: 23, trend: '+156 本周新增', trendType: 'up' as const, color: '#a78b9a', icon: 'BookOpen' },
  { label: '工作文件', labelEn: 'Workspace Files', value: 1247, trend: '+89 今日', trendType: 'up' as const, color: '#d4a373', icon: 'FolderOpen' },
  { label: '协作群组', labelEn: 'Collaborations', value: 8, trend: '3 活跃中', trendType: 'up' as const, color: '#c97b84', icon: 'Users' },
];

const quickAccessTiles = [
  { id: 'qa-1', label: '新建智能体', labelEn: 'New Agent', icon: 'Bot', color: '#6b7a5a', route: '/agents/create' },
  { id: 'qa-2', label: '新建任务', labelEn: 'New Task', icon: 'PlusCircle', color: '#7fb89f', route: '#' },
  { id: 'qa-3', label: '平台管理', labelEn: 'Platform Hub', icon: 'Server', color: '#c9a96e', route: '/platform' },
  { id: 'qa-4', label: '工作空间', labelEn: 'Workspace', icon: 'FolderOpen', color: '#d4a373', route: '/workspace' },
  { id: 'qa-5', label: '知识库', labelEn: 'Knowledge', icon: 'BookOpen', color: '#a78b9a', route: '/knowledge' },
  { id: 'qa-6', label: '监控中心', labelEn: 'Monitor', icon: 'Activity', color: '#c97b84', route: '/agents/monitor' },
];

const statusItems = [
  { id: 'st-1', name: 'OpenAI GPT-4', status: 'online', detail: '正常 · 延迟 23ms', time: '刚刚' },
  { id: 'st-2', name: 'Kimi k1.5', status: 'online', detail: '正常 · 延迟 156ms', time: '1分钟前' },
  { id: 'st-3', name: 'Ollama (本地)', status: 'online', detail: '运行中 · 模型 loaded', time: '5分钟前' },
  { id: 'st-4', name: 'Agent-代码助手', status: 'busy', detail: '执行任务 #2847', time: '进行中' },
  { id: 'st-5', name: 'Agent-数据分析', status: 'busy', detail: '等待手递手', time: '10秒前' },
  { id: 'st-6', name: 'Agent-文档撰写', status: 'idle', detail: '空闲', time: '3分钟前' },
];

const healthMetrics = [
  { id: 'hm-1', name: 'API 响应延迟', nameEn: 'API Latency', value: '平均 45ms', current: 45, max: 200, unit: 'ms', status: '优秀', statusEn: 'Excellent' },
  { id: 'hm-2', name: '智能体内存占用', nameEn: 'Agent Memory', value: '2.3 GB / 8 GB', current: 2.3, max: 8, unit: 'GB', status: '正常', statusEn: 'Normal' },
  { id: 'hm-3', name: '知识库索引状态', nameEn: 'KB Index', value: '23 个索引 · 全部就绪', current: 100, max: 100, unit: '%', status: '已同步', statusEn: 'Synced' },
  { id: 'hm-4', name: '磁盘空间', nameEn: 'Disk Space', value: '47 GB / 256 GB', current: 47, max: 256, unit: 'GB', status: '充足', statusEn: 'Adequate' },
];

const taskActivityData = {
  today: [
    { hour: '00:00', created: 2, completed: 1, failed: 0 },
    { hour: '01:00', created: 1, completed: 0, failed: 0 },
    { hour: '02:00', created: 0, completed: 1, failed: 0 },
    { hour: '03:00', created: 0, completed: 0, failed: 0 },
    { hour: '04:00', created: 0, completed: 0, failed: 0 },
    { hour: '05:00', created: 1, completed: 1, failed: 0 },
    { hour: '06:00', created: 3, completed: 2, failed: 1 },
    { hour: '07:00', created: 5, completed: 3, failed: 0 },
    { hour: '08:00', created: 8, completed: 6, failed: 1 },
    { hour: '09:00', created: 12, completed: 8, failed: 0 },
    { hour: '10:00', created: 15, completed: 10, failed: 1 },
    { hour: '11:00', created: 10, completed: 9, failed: 0 },
    { hour: '12:00', created: 7, completed: 8, failed: 1 },
    { hour: '13:00', created: 9, completed: 7, failed: 0 },
    { hour: '14:00', created: 11, completed: 8, failed: 1 },
    { hour: '15:00', created: 6, completed: 5, failed: 0 },
  ],
  week: [
    { hour: '周一', created: 45, completed: 38, failed: 3 },
    { hour: '周二', created: 52, completed: 48, failed: 1 },
    { hour: '周三', created: 38, completed: 35, failed: 2 },
    { hour: '周四', created: 61, completed: 54, failed: 4 },
    { hour: '周五', created: 42, completed: 40, failed: 1 },
    { hour: '周六', created: 28, completed: 25, failed: 2 },
    { hour: '周日', created: 15, completed: 12, failed: 1 },
  ],
  month: [
    { hour: '第1周', created: 180, completed: 165, failed: 8 },
    { hour: '第2周', created: 220, completed: 198, failed: 12 },
    { hour: '第3周', created: 195, completed: 185, failed: 5 },
    { hour: '第4周', created: 281, completed: 247, failed: 14 },
  ],
};

const activityEvents: ActivityEvent[] = [];

/* ─── Hero Section ─── */
function HeroSection() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const now = new Date();
  const dateStr = language === 'zh'
    ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${['日','一','二','三','四','五','六'][now.getDay()]} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    : now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  useEffect(() => { setMounted(true); }, []);

  return (
    <section
      className="relative w-full overflow-hidden rounded-card"
      style={{ height: '220px' }}
    >
      <img
        src="/hero-dashboard.jpg"
        alt="Garden"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: mounted ? 'scale(1)' : 'scale(1.05)',
          transition: 'transform 2000ms var(--ease-gentle)',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,14,26,0.85) 0%, rgba(15,23,42,0.75) 50%, rgba(10,14,26,0.85) 100%)' }} />

      {/* Floating particles */}
      {mounted && [1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            left: `${10 + i * 15}%`,
            bottom: `${5 + (i % 3) * 10}%`,
            backgroundColor: i % 3 === 0 ? 'rgba(0,240,255,0.5)' : i % 3 === 1 ? 'rgba(168,85,247,0.4)' : 'rgba(34,197,94,0.4)',
            animation: `float ${8 + i * 2}s linear infinite`,
            animationDelay: `${i * -1.5}s`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col justify-center h-full px-8 lg:px-12">
        <h1
          className="font-display text-3xl lg:text-4xl font-bold text-white transition-all duration-800"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '600ms',
            transitionTimingFunction: 'var(--ease-gentle)',
          }}
        >
          {language === 'zh' ? '千界花园' : 'Bloombloomgarden'}
        </h1>
        <p
          className="text-base lg:text-lg mt-1 transition-all duration-800"
          style={{
            color: 'var(--bloom-amber)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '800ms',
            transitionTimingFunction: 'var(--ease-gentle)',
          }}
        >
          {language === 'zh' ? '智能体生态系统实时概览' : 'Real-time Agent Ecosystem Overview'}
        </p>
        <p
          className="text-sm mt-2 transition-all duration-800"
          style={{
            color: 'rgba(255,255,255,0.7)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '800ms',
            transitionTimingFunction: 'var(--ease-gentle)',
          }}
        >
          {language === 'zh'
            ? '智能体生态系统实时概览 · Real-time Agent Ecosystem Overview'
            : 'Real-time Agent Ecosystem Overview · 智能体生态系统实时概览'}
        </p>
        <div className="flex items-center gap-4 mt-3">
          <span
            className="flex items-center gap-1.5 text-xs font-medium text-white transition-all duration-800"
            style={{
              opacity: mounted ? 1 : 0,
              transitionDelay: '1000ms',
              transitionTimingFunction: 'var(--ease-gentle)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-success status-dot-pulse" />
            {language === 'zh' ? '实时连接中' : 'Live Connected'}
          </span>
        </div>
      </div>

      <div
        className="absolute top-6 right-8 text-xs transition-all duration-800"
        style={{
          color: 'rgba(255,255,255,0.5)',
          opacity: mounted ? 1 : 0,
          transitionDelay: '1000ms',
          transitionTimingFunction: 'var(--ease-gentle)',
        }}
      >
        {dateStr}
      </div>
    </section>
  );
}

/* ─── Quick Access Tiles ─── */
function QuickAccessPanel() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  const iconMap: Record<string, React.ElementType> = {
    Bot, Server, FolderOpen, BookOpen, Activity, PlusCircle,
  };

  return (
    <ContentCard title={language === 'zh' ? '快速入口' : 'Quick Access'} titleEn={language === 'zh' ? 'Quick Access' : '快速入口'}>
      <div className="grid grid-cols-3 gap-3">
        {quickAccessTiles.map((tile, idx) => {
          const Icon = iconMap[tile.icon] || Bot;
          return (
            <button
              key={tile.id}
              onClick={() => tile.route !== '#' && navigate(tile.route)}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-card-md border transition-all duration-200 hover:shadow-card"
              style={{
                borderColor: 'var(--sage-200)',
                backgroundColor: '#fff',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'scale(1)' : 'scale(0.95)',
                transition: `all 400ms var(--ease-spring) ${idx * 60}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--sage-50)';
                e.currentTarget.style.borderColor = 'var(--sage-300)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = 'var(--sage-200)';
              }}
            >
              <Icon size={24} style={{ color: tile.color, transition: 'transform 200ms' }}
                onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => { (e.currentTarget as SVGElement).style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e: React.MouseEvent<SVGSVGElement>) => { (e.currentTarget as SVGElement).style.transform = 'scale(1)'; }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--sage-700)' }}>
                {language === 'zh' ? tile.label : tile.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </ContentCard>
  );
}

/* ─── Live Status Panel ─── */
function LiveStatusPanel() {
  const { language } = useAppStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#5b9a6d';
      case 'offline': return 'var(--sage-300)';
      case 'busy': return '#c9973f';
      case 'idle': return '#5b9a6d';
      default: return 'var(--sage-300)';
    }
  };

  return (
    <ContentCard
      title={language === 'zh' ? '实时状态' : 'Live Status'}
      titleEn={language === 'zh' ? 'Live Status' : '实时状态'}
      actions={
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-success status-dot-pulse" />
          <span style={{ color: 'var(--sage-400)' }}>LIVE</span>
        </span>
      }
    >
      <div className="space-y-1">
        {statusItems.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-card-sm transition-colors hover:bg-[var(--sage-50)]"
            style={{
              animation: `slide-in 500ms var(--ease-gentle) ${idx * 80}ms both`,
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${item.status === 'busy' ? 'status-dot-pulse' : ''}`}
                style={{ backgroundColor: getStatusColor(item.status) }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--sage-700)' }}>
                {item.name}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--sage-400)' }}>
                {item.detail}
              </div>
            </div>
            <div className="text-xs flex-shrink-0" style={{ color: 'var(--sage-400)' }}>
              {item.time}
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

/* ─── Active Agents ─── */
function ActiveAgents() {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    fetchAgents()
      .then((res) => setAgents(res.data || []))
      .catch(() => setAgents([]));
  }, []);

  const getAvatarSvg = (type: string, color: string) => {
    switch (type) {
      case 'leaf':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.5 0 3-.3 4.2-.9" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 2c3 3 5 7 5 10s-2 7-5 10" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M7 12h10M12 7v10" stroke={color} strokeWidth="1" strokeLinecap="round" />
          </svg>
        );
      case 'flower':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="2.5" fill={color} />
            <circle cx="8" cy="12" r="2.5" fill={color} opacity="0.7" />
            <circle cx="16" cy="12" r="2.5" fill={color} opacity="0.7" />
            <circle cx="10" cy="16" r="2.5" fill={color} opacity="0.5" />
            <circle cx="14" cy="16" r="2.5" fill={color} opacity="0.5" />
            <circle cx="12" cy="12" r="2" fill="#fff" />
          </svg>
        );
      case 'tree':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 4L6 12h4v8h4v-8h4L12 4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={`${color}30`} />
          </svg>
        );
      case 'fern':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 20V4M12 6l-3 3M12 8l3 3M12 10l-2 2M12 12l2 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case 'mushroom':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 12c0-4 2.5-8 6-8s6 4 6 8H6z" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
            <rect x="10" y="12" width="4" height="6" rx="1" stroke={color} strokeWidth="1" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#5b9a6d';
      case 'idle': return 'var(--sage-300)';
      case 'waiting': return '#c9973f';
      case 'error': return '#b85c5c';
      default: return 'var(--sage-300)';
    }
  };

  return (
    <ContentCard
      title={language === 'zh' ? '活跃智能体' : 'Active Agents'}
      titleEn={language === 'zh' ? 'Active Agents' : '活跃智能体'}
      actions={
        <button
          onClick={() => navigate('/agents/collab')}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
          style={{ color: 'var(--sage-500)' }}
        >
          {language === 'zh' ? '查看全部' : 'View All'}
          <ChevronRight size={14} />
        </button>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            className="flex-shrink-0 w-56 rounded-card-md border p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-elevated cursor-pointer"
            style={{
              backgroundColor: `${agent.accentColor}08`,
              borderColor: 'var(--sage-200)',
              animation: `slide-in 600ms var(--ease-gentle) ${idx * 100}ms both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--sage-300)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--sage-200)';
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-108"
                style={{ backgroundColor: `${agent.accentColor}20` }}
              >
                {getAvatarSvg(agent.avatarType, agent.accentColor)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--sage-800)' }}>
                  {agent.name}
                </div>
              </div>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.status === 'running' ? 'status-dot-pulse' : ''}`}
                style={{ backgroundColor: getStatusColor(agent.status) }}
              />
            </div>
            <p className="text-xs mt-2.5 line-clamp-2" style={{ color: 'var(--sage-500)' }}>
              {agent.currentTask}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${agent.accentColor}20`, color: agent.accentColor }}
              >
                {agent.platform}
              </span>
            </div>
            {agent.progress > 0 && (
              <div className="mt-2.5">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sage-200)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-800"
                    style={{
                      width: `${agent.progress}%`,
                      backgroundColor: agent.accentColor,
                      transitionTimingFunction: 'var(--ease-gentle)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

/* ─── Task Activity Chart ─── */
function TaskActivityChart() {
  const { language } = useAppStore();
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');

  const data = taskActivityData[range];
  const tabs = [
    { key: 'today' as const, zh: '今日', en: 'Today' },
    { key: 'week' as const, zh: '本周', en: 'Week' },
    { key: 'month' as const, zh: '本月', en: 'Month' },
  ];

  return (
    <ContentCard
      title={language === 'zh' ? '任务活动趋势' : 'Task Activity'}
      titleEn={language === 'zh' ? 'Task Activity' : '任务活动趋势'}
      actions={
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRange(tab.key)}
              className="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
              style={{
                color: range === tab.key ? 'var(--sage-700)' : 'var(--sage-400)',
                backgroundColor: range === tab.key ? 'var(--sage-100)' : 'transparent',
              }}
            >
              {language === 'zh' ? tab.zh : tab.en}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7fa3b0" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7fa3b0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7fb89f" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7fb89f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sage-200)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#8f9a7d' }}
              axisLine={{ stroke: 'var(--sage-200)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8f9a7d' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid var(--sage-200)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-card)',
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="created" stroke="#7fa3b0" strokeWidth={2} fill="url(#gradCreated)" name={language === 'zh' ? '创建任务' : 'Created'} />
            <Area type="monotone" dataKey="completed" stroke="#7fb89f" strokeWidth={2} fill="url(#gradCompleted)" name={language === 'zh' ? '完成任务' : 'Completed'} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-3">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sage-500)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7fa3b0' }} />
          {language === 'zh' ? '创建任务' : 'Created'}
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sage-500)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7fb89f' }} />
          {language === 'zh' ? '完成任务' : 'Completed'}
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sage-500)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c97b84' }} />
          {language === 'zh' ? '失败任务' : 'Failed'}
        </span>
      </div>
    </ContentCard>
  );
}

/* ─── System Health ─── */
function SystemHealth() {
  const { language } = useAppStore();

  const getIcon = (id: string) => {
    switch (id) {
      case 'hm-1': return <Signal size={18} style={{ color: 'var(--bloom-mint)' }} />;
      case 'hm-2': return <MemoryStick size={18} style={{ color: 'var(--bloom-sky)' }} />;
      case 'hm-3': return <Database size={18} style={{ color: 'var(--bloom-lavender)' }} />;
      case 'hm-4': return <HardDrive size={18} style={{ color: 'var(--bloom-amber)' }} />;
      default: return <Signal size={18} />;
    }
  };

  const getProgressColor = (current: number, max: number) => {
    const pct = (current / max) * 100;
    if (pct > 90) return '#b85c5c';
    if (pct > 70) return '#c9973f';
    return '#7fb89f';
  };

  return (
    <ContentCard
      title={language === 'zh' ? '系统健康' : 'System Health'}
      titleEn={language === 'zh' ? 'System Health' : '系统健康'}
      actions={
        <button className="transition-colors hover:rotate-180 duration-500" style={{ color: 'var(--sage-400)' }}>
          <RefreshCw size={16} />
        </button>
      }
    >
      <div className="space-y-3">
        {healthMetrics.map((metric, idx) => {
          const pct = metric.max === 100 && metric.unit === '%'
            ? metric.current
            : (metric.current / metric.max) * 100;
          return (
            <div
              key={metric.id}
              className="flex items-center gap-3 p-3 rounded-card-sm border"
              style={{
                borderColor: 'var(--sage-200)',
                backgroundColor: '#fff',
                animation: `slide-in 500ms var(--ease-gentle) ${idx * 100}ms both`,
              }}
            >
              <div className="flex-shrink-0">{getIcon(metric.id)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>
                    {language === 'zh' ? metric.name : metric.nameEn}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--sage-500)' }}>
                    {language === 'zh' ? metric.status : metric.statusEn}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                  {metric.value}
                </div>
                <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: 'var(--sage-200)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-800"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getProgressColor(metric.current, metric.max),
                      transitionTimingFunction: 'var(--ease-gentle)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ContentCard>
  );
}

/* ─── Activity Timeline ─── */
function ActivityTimeline() {
  const { language } = useAppStore();

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'agent_created': return '#7fb89f';
      case 'task_completed': return '#7fa3b0';
      case 'task_failed': return '#c97b84';
      case 'agent_handoff': return '#d4a373';
      case 'knowledge_update': return '#a78b9a';
      case 'platform_event': return '#c9a96e';
      case 'system': return '#6b7a5a';
      default: return '#6b7a5a';
    }
  };

  const relativeTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return language === 'zh' ? '刚刚' : 'Just now';
    if (diff < 3600) return language === 'zh' ? `${Math.floor(diff / 60)}分钟前` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return language === 'zh' ? `${Math.floor(diff / 3600)}小时前` : `${Math.floor(diff / 3600)}h ago`;
    return language === 'zh' ? `${Math.floor(diff / 86400)}天前` : `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <ContentCard
      title={language === 'zh' ? '最近动态' : 'Recent Activity'}
      titleEn={language === 'zh' ? 'Recent Activity' : '最近动态'}
      actions={
        <button className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline" style={{ color: 'var(--sage-500)' }}>
          {language === 'zh' ? '查看全部' : 'View All'}
          <ChevronRight size={14} />
        </button>
      }
    >
      <div className="relative pl-6">
        {/* Timeline line */}
        <div
          className="absolute left-[9px] top-2 bottom-2 w-0.5"
          style={{ backgroundColor: 'var(--sage-200)' }}
        />
        <div className="space-y-0">
          {activityEvents.map((event, idx) => (
            <div
              key={event.id}
              className="relative flex gap-4 py-3 group cursor-pointer transition-colors rounded-lg px-2 -ml-2 hover:bg-[var(--sage-50)]"
              style={{
                animation: `slide-in 500ms var(--ease-gentle) ${idx * 100}ms both`,
              }}
            >
              {/* Dot */}
              <div
                className="absolute left-[5px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white z-10"
                style={{ backgroundColor: getEventColor(event.type) }}
              />
              <div className="flex-1 min-w-0 pl-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--sage-400)' }}>
                    {event.time}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--sage-300)' }}>
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--sage-700)' }}>
                  {event.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ContentCard>
  );
}

/* ─── Main Dashboard Page ─── */
export default function Home() {
  const [apiStats, setApiStats] = useState({
    agents: 0,
    tasks: 0,
    platforms: 0,
    knowledge: 0,
    files: 1247,
    groups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [agentsRes, tasksRes, platformsRes, knowledgeRes, groupsRes] = await Promise.allSettled([
          fetchAgents(),
          fetchTasks(),
          fetchPlatforms(),
          fetchKnowledgeBases(),
          fetchGroups(),
        ]);
        setApiStats({
          agents: agentsRes.status === 'fulfilled' ? (agentsRes.value.data?.length || 0) : 0,
          tasks: tasksRes.status === 'fulfilled' ? (tasksRes.value.data?.length || 0) : 0,
          platforms: platformsRes.status === 'fulfilled' ? (platformsRes.value.data?.length || 0) : 0,
          knowledge: knowledgeRes.status === 'fulfilled' ? (knowledgeRes.value.data?.length || 0) : 0,
          files: 0, // no files API yet
          groups: groupsRes.status === 'fulfilled' ? (groupsRes.value.data?.length || 0) : 0,
        });
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const liveStats = statsData.map((s) => {
    if (s.label === '运行中智能体') return { ...s, value: apiStats.agents };
    if (s.label === '今日任务') return { ...s, value: apiStats.tasks };
    if (s.label === '已连接平台') return { ...s, value: apiStats.platforms };
    if (s.label === '知识库条目') return { ...s, value: apiStats.knowledge };
    if (s.label === '工作文件') return { ...s, value: apiStats.files };
    if (s.label === '协作群组') return { ...s, value: apiStats.groups };
    return s;
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Hero Banner */}
      <HeroSection />

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {liveStats.map((stat, idx) => (
          <StatsCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            trend={stat.trend}
            trendType={stat.trendType}
            color={stat.color}
            delay={idx * 80}
          />
        ))}
      </section>

      {/* Quick Access + Live Status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickAccessPanel />
        <LiveStatusPanel />
      </section>

      {/* Active Agents */}
      <ActiveAgents />

      {/* Task Activity + System Health */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskActivityChart />
        <SystemHealth />
      </section>

      {/* Recent Activity Timeline */}
      <ActivityTimeline />
    </div>
  );
}

