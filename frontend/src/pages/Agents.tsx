import { useState, useEffect } from 'react'
import { fetchAgents, deleteAgent } from '@/api/client';
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
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  type: string;
  provider: string;
  model: string;
  description: string;
  lastActive: string;
  messagesToday: number;
  tasksCompleted: number;
  uptime: string;
  tags: string[];
  accentColor: string;
}

const FALLBACK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: '代码助手',
    avatar: '💻',
    status: 'online',
    type: 'coding',
    provider: 'OpenAI',
    model: 'GPT-4',
    description: '擅长代码编写、调试和技术咨询',
    lastActive: '2分钟前',
    messagesToday: 156,
    tasksCompleted: 89,
    uptime: '99.8%',
    tags: ['代码', '调试', '审查'],
    accentColor: '#3B82F6',
  },
  {
    id: 'agent-2',
    name: '数据分析',
    avatar: '📊',
    status: 'busy',
    type: 'analysis',
    provider: 'Claude',
    model: 'Claude 3.5',
    description: '数据处理和可视化专家',
    lastActive: '5分钟前',
    messagesToday: 89,
    tasksCompleted: 67,
    uptime: '99.5%',
    tags: ['数据', '图表', '统计'],
    accentColor: '#10B981',
  },
  {
    id: 'agent-3',
    name: '文档撰写',
    avatar: '📝',
    status: 'online',
    type: 'writing',
    provider: 'Kimi',
    model: 'k1.5',
    description: '技术文档、论文和报告撰写',
    lastActive: '刚刚',
    messagesToday: 234,
    tasksCompleted: 120,
    uptime: '99.9%',
    tags: ['文档', '写作', '翻译'],
    accentColor: '#8B5CF6',
  },
];

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetchAgents();
        const data = res.data || [];
        setAgents(data.length > 0 ? data : FALLBACK_AGENTS);
      } catch (e) {
        if (!cancelled) setAgents(FALLBACK_AGENTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleChat = (agentId: string) => {
    navigate(`/chat?agentId=${agentId}`);
  };

  const filtered = agents.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const busyCount = agents.filter((a) => a.status === 'busy').length;

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

      <div className="flex gap-3">
        {[
          { label: '全部', value: agents.length, icon: LayoutGrid, color: 'bg-[var(--sage-500)]' },
          { label: '在线', value: onlineCount, icon: CheckCircle2, color: 'bg-green-500' },
          { label: '忙碌', value: busyCount, icon: Clock, color: 'bg-amber-500' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilter(stat.label === '全部' ? 'all' : stat.label === '在线' ? 'online' : 'busy')}
            className={`flex items-center gap-2 px-3 py-2 rounded-card-sm text-sm transition-colors ${
              (filter === 'all' && stat.label === '全部') ||
              (filter === 'online' && stat.label === '在线') ||
              (filter === 'busy' && stat.label === '忙碌')
                ? 'bg-[var(--sage-500)] text-white'
                : 'bg-white hover:bg-[var(--sage-50)]'
            }`}
          >
            <stat.icon className="w-4 h-4" />
            <span>{stat.label}</span>
            <span className="ml-1 font-bold">{stat.value}</span>
          </button>
        ))}
      </div>

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
        <div className="text-center py-16 text-[var(--sage-500)]">加载中...</div>
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
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: agent.accentColor + '20' }}
                  >
                    {agent.avatar}
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-50)] text-[var(--sage-500)]">
                  {agent.provider}
                </span>
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

              {/* Chat Button */}
              <button
                onClick={() => handleChat(agent.id)}
                className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-500)] text-white text-sm hover:bg-[var(--sage-600)] transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                开始对话
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">智能体</th>
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
                      <span className="text-lg">{agent.avatar}</span>
                      <div>
                        <div className="font-medium text-[var(--sage-800)]">{agent.name}</div>
                        <div className="text-[10px] text-[var(--sage-500)]">{agent.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        agent.status === 'online'
                          ? 'bg-green-500/10 text-green-600'
                          : agent.status === 'busy'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                      }`}
                    >
                      {agent.status === 'online' ? '在线' : agent.status === 'busy' ? '忙碌' : '离线'}
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
                      <button className="p-1 text-[var(--sage-400)] hover:text-red-500">
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
