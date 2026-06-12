import { useState, useEffect } from 'react'
import { fetchAgents, deleteAgent, fetchAgentStats } from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  LayoutGrid,
  Table2,
  CheckCircle2,
  Clock,
  Brain,
  Pencil,
  Trash2,
  MessageSquare,
  Code,
  PenTool,
  BarChart3,
  Palette,
  Search,
  Briefcase,
  Eye,
  Building2,
  TestTube,
  Server,
  Headphones,
  Shield,
  Scale,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Megaphone,
  Sparkles,
  LayoutList,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

/* ── Type Icon & Color Maps ─────────────────────────────────────── */

const typeIconMap: Record<string, React.ElementType> = {
  coding: Code,
  writing: PenTool,
  analysis: BarChart3,
  creative: Palette,
  research: Search,
  business: Briefcase,
  reviewer: Eye,
  architect: Building2,
  qa: TestTube,
  devops: Server,
  'customer-service': Headphones,
  security: Shield,
  legal: Scale,
  medical: HeartPulse,
  education: GraduationCap,
  entertainment: Gamepad2,
  marketing: Megaphone,
  general: Sparkles,
};

const typeColorMap: Record<string, string> = {
  coding: '#3B82F6',
  writing: '#8B5CF6',
  analysis: '#10B981',
  creative: '#F59E0B',
  research: '#6366F1',
  business: '#64748B',
  reviewer: '#EC4899',
  architect: '#0EA5E9',
  qa: '#EF4444',
  devops: '#14B8A6',
  'customer-service': '#F97316',
  security: '#DC2626',
  legal: '#7C3AED',
  medical: '#06B6D4',
  education: '#FBBF24',
  entertainment: '#D946EF',
  marketing: '#FB923C',
  general: '#6B7280',
};

const typeNameMap: Record<string, string> = {
  coding: '编程',
  writing: '写作',
  analysis: '分析',
  creative: '创意',
  research: '研究',
  business: '商业',
  reviewer: '审查',
  architect: '架构',
  qa: '测试',
  devops: 'DevOps',
  'customer-service': '客服',
  security: '安全',
  legal: '法律',
  medical: '医疗',
  education: '教育',
  entertainment: '娱乐',
  marketing: '营销',
  general: '通用',
};

/* ── Status Map ─────────────────────────────────────────────────── */

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '在线', color: 'text-green-600', bg: 'bg-green-500/10' },
  paused: { label: '离线', color: 'text-[var(--sage-500)]', bg: 'bg-[var(--sage-100)]' },
  error: { label: '忙碌', color: 'text-amber-600', bg: 'bg-amber-500/10' },
  isolated: { label: '忙碌', color: 'text-amber-600', bg: 'bg-amber-500/10' },
  online: { label: '在线', color: 'text-green-600', bg: 'bg-green-500/10' },
  offline: { label: '离线', color: 'text-[var(--sage-500)]', bg: 'bg-[var(--sage-100)]' },
  busy: { label: '忙碌', color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

/* ── Display Agent Interface ─────────────────────────────────────── */

interface DisplayAgent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  type: string;
  typeLabel: string;
  provider: string;
  model: string;
  description: string;
  messagesToday: number;
  tasksCompleted: number;
  uptime: string;
  tags: string[];
  accentColor: string;
  iconName: string;
  lastActive: string;
  avatar: string;
}

interface AgentStats {
  total: number;
  online: number;
  offline: number;
  busy: number;
  byType?: Record<string, number>;
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<DisplayAgent[]>([]);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats>({ total: 0, online: 0, offline: 0, busy: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetchAgents();
        const data = res.data || res || [];
        const mapped = (Array.isArray(data) ? data : []).map(mapBackendToDisplay);
        if (!cancelled) setAgents(mapped);
      } catch (e) {
        console.error('Failed to load agents:', e);
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        setStatsLoading(true);
        const res = await fetchAgentStats();
        const data = res.data || res || {};
        setStats({
          total: data.total || 0,
          online: data.online || data.active || 0,
          offline: data.offline || data.paused || 0,
          busy: data.busy || data.error || 0,
          byType: data.byType || {},
        });
      } catch (e) {
        console.error('Failed to load agent stats:', e);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleChat = (agentId: string) => {
    navigate(`/chat?agentId=${agentId}`);
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('确定删除此智能体？')) return;
    try {
      await deleteAgent(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (e) {
      console.error('Failed to delete agent:', e);
      alert('删除失败');
    }
  };

  const filtered = agents.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const busyCount = agents.filter((a) => a.status === 'busy').length;
  const offlineCount = agents.filter((a) => a.status === 'offline').length;

  // Unique types for filter
  const typeOptions = Array.from(new Set(agents.map(a => a.type))).filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">智能体列表</h1>
          <p className="text-[var(--sage-500)] mt-1 text-sm">
            {agents.length} 个智能体 · {onlineCount} 在线 · {busyCount} 忙碌
          </p>
        </div>
        <Link to="/agents/create" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建智能体
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '全部', value: statsLoading ? '—' : stats.total, icon: LayoutGrid, color: 'bg-[var(--sage-500)]' },
          { label: '在线', value: statsLoading ? '—' : stats.online, icon: CheckCircle2, color: 'bg-green-500' },
          { label: '忙碌', value: statsLoading ? '—' : stats.busy, icon: Clock, color: 'bg-amber-500' },
          { label: '离线', value: statsLoading ? '—' : stats.offline, icon: LayoutList, color: 'bg-[var(--sage-400)]' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(stat.label === '全部' ? 'all' : stat.label === '在线' ? 'online' : stat.label === '忙碌' ? 'busy' : 'offline')}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-sm transition-colors ${
              (statusFilter === 'all' && stat.label === '全部') ||
              (statusFilter === 'online' && stat.label === '在线') ||
              (statusFilter === 'busy' && stat.label === '忙碌') ||
              (statusFilter === 'offline' && stat.label === '离线')
                ? 'bg-white shadow-md ring-1 ring-[var(--sage-200)]'
                : 'bg-white hover:bg-[var(--sage-50)]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color} text-white`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-[var(--sage-500)]">{stat.label}</div>
              <div className="text-lg font-bold text-[var(--sage-800)]">{stat.value}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Type Filter */}
      {typeOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--sage-500)] mr-1">按类型筛选:</span>
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              typeFilter === 'all'
                ? 'bg-[var(--sage-500)] text-white'
                : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
            }`}
          >
            全部
          </button>
          {typeOptions.map((type) => {
            const color = typeColorMap[type] || '#6B7280';
            const label = typeNameMap[type] || type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  typeFilter === type
                    ? 'text-white'
                    : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
                }`}
                style={typeFilter === type ? { backgroundColor: color } : {}}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            placeholder="搜索智能体..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <div className="flex bg-white rounded-card-sm border overflow-hidden" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-[var(--sage-500)] text-white' : 'text-[var(--sage-500)]'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-2 ${view === 'table' ? 'bg-[var(--sage-500)] text-white' : 'text-[var(--sage-500)]'}`}
          >
            <Table2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--sage-500)]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Brain className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无智能体</p>
          <Link to="/agents/create" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            创建第一个智能体
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent, idx) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: agent.accentColor + '25' }}
                  >
                    {(() => {
                      const IconComponent = (LucideIcons as any)[agent.iconName] || Sparkles;
                      return <IconComponent className="w-5 h-5" style={{ color: agent.accentColor }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--sage-800)]">{agent.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'online'
                            ? 'bg-green-500'
                            : agent.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-[var(--sage-300)]'
                        }`}
                      />
                      <span className="text-xs text-[var(--sage-500)]">
                        {agent.status === 'online' ? '在线' : agent.status === 'busy' ? '忙碌' : '离线'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-50)] text-[var(--sage-500)]">
                    {agent.provider}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: agent.accentColor }}
                  >
                    {agent.typeLabel}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--sage-500)] mb-3">{agent.description}</p>

              <div className="flex flex-wrap gap-1 mb-3">
                {(agent.tags || []).map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-50)] text-[var(--sage-500)]">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className="bg-[var(--sage-50)] rounded-card-sm p-1.5">
                  <div className="font-bold text-[var(--sage-800)]">{agent.messagesToday}</div>
                  <div className="text-[10px] text-[var(--sage-500)]">今日消息</div>
                </div>
                <div className="bg-[var(--sage-50)] rounded-card-sm p-1.5">
                  <div className="font-bold text-[var(--sage-800)]">{agent.tasksCompleted}</div>
                  <div className="text-[10px] text-[var(--sage-500)]">完成任务</div>
                </div>
                <div className="bg-[var(--sage-50)] rounded-card-sm p-1.5">
                  <div className="font-bold text-[var(--sage-800)]">{agent.uptime}</div>
                  <div className="text-[10px] text-[var(--sage-500)]">可用率</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--sage-500)]">
                <span>最后活跃: {agent.lastActive}</span>
                <span>{agent.model}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleChat(agent.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-500)] text-white text-sm hover:bg-[var(--sage-600)] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  对话
                </button>
                <button className="p-2 text-[var(--sage-400)] hover:text-[var(--sage-600)] rounded-lg hover:bg-[var(--sage-100)] transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="p-2 text-[var(--sage-400)] hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">智能体</th>
                <th className="text-left px-4 py-3 font-medium">类型</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">提供商</th>
                <th className="text-left px-4 py-3 font-medium">今日消息</th>
                <th className="text-left px-4 py-3 font-medium">任务</th>
                <th className="text-left px-4 py-3 font-medium">可用率</th>
                <th className="text-left px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr key={agent.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: agent.accentColor + '20' }}
                      >
                        {(() => {
                          const IconComponent = (LucideIcons as any)[agent.iconName] || Sparkles;
                          return <IconComponent className="w-4 h-4" style={{ color: agent.accentColor }} />;
                        })()}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--sage-800)]">{agent.name}</div>
                        <div className="text-[10px] text-[var(--sage-500)]">{agent.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: agent.accentColor }}
                    >
                      {agent.typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        statusMap[agent.status]?.bg || 'bg-[var(--sage-100)]'
                      } ${statusMap[agent.status]?.color || 'text-[var(--sage-500)]'}`}
                    >
                      {statusMap[agent.status]?.label || agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--sage-500)]">{agent.provider}</td>
                  <td className="px-4 py-3">{agent.messagesToday}</td>
                  <td className="px-4 py-3">{agent.tasksCompleted}</td>
                  <td className="px-4 py-3">{agent.uptime}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleChat(agent.id)}
                        className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]"
                        title="对话"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="p-1 text-[var(--sage-400)] hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Backend Data Mapping ─────────────────────────────────────────── */

function mapBackendToDisplay(raw: any): DisplayAgent {
  const type = raw.agentType || raw.type || 'general';
  const color = raw.color || typeColorMap[type] || '#6B7280';
  
  // Map type to icon name string (e.g. 'coding' -> 'Code')
  const typeToIconName: Record<string, string> = {
    coding: 'Code',
    writing: 'PenTool',
    analysis: 'BarChart3',
    creative: 'Palette',
    research: 'Search',
    business: 'Briefcase',
    reviewer: 'Eye',
    architect: 'Building2',
    qa: 'TestTube',
    devops: 'Server',
    'customer-service': 'Headphones',
    security: 'Shield',
    legal: 'Scale',
    medical: 'HeartPulse',
    education: 'GraduationCap',
    entertainment: 'Gamepad2',
    marketing: 'Megaphone',
    general: 'Sparkles',
  };
  const resolvedIconName = raw.icon || typeToIconName[type] || 'Sparkles';

  // Status mapping: backend status -> display status
  let status: 'online' | 'offline' | 'busy' = 'offline';
  const rawStatus = raw.status;
  if (rawStatus === 'active' || rawStatus === 'online' || rawStatus === 'running') status = 'online';
  else if (rawStatus === 'error' || rawStatus === 'isolated' || rawStatus === 'busy') status = 'busy';
  else if (rawStatus === 'paused' || rawStatus === 'offline' || rawStatus === 'idle') status = 'offline';

  // Stats from backend stats JSON
  const stats = raw.stats || {};
  const messagesToday = stats.messagesToday || stats.messages || stats.messageCount || 0;
  const tasksCompleted = stats.tasksCompleted || stats.tasks || stats.taskCount || 0;
  const uptime = stats.uptime || stats.availability || '—';
  const lastActive = stats.lastActive || raw.lastActive || '—';

  return {
    id: raw.id,
    name: raw.name || '未命名',
    status,
    type,
    typeLabel: typeNameMap[type] || type,
    provider: raw.platformId || raw.provider || raw.platform || '—',
    model: raw.config?.model || raw.model || '—',
    description: raw.description || '—',
    messagesToday,
    tasksCompleted,
    uptime: typeof uptime === 'number' ? `${uptime}%` : String(uptime),
    tags: (raw.capabilities || raw.tags || []),
    accentColor: color,
    iconName: resolvedIconName,
    lastActive,
    avatar: raw.avatar || '💻',
  };
}
