import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'agent' | 'skill' | 'blueprint' | 'manual' | 'scheduled';
  assignee?: string;
  assigneeType: 'agent' | 'user' | 'system';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: number;
  dependencies: string[];
  tags: string[];
  result?: string;
  error?: string;
}

const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    title: '初始化Kimi集群',
    description: '配置并启动5个Kimi Code API端点的负载均衡器',
    status: 'completed',
    priority: 'high',
    type: 'agent',
    assignee: 'SYLVA',
    assigneeType: 'agent',
    createdAt: '2024-05-29T08:00:00Z',
    startedAt: '2024-05-29T08:00:05Z',
    completedAt: '2024-05-29T08:01:30Z',
    progress: 100,
    dependencies: [],
    tags: ['kimi', 'cluster', 'init'],
    result: '5个端点全部连接成功，负载均衡策略：round-robin'
  },
  {
    id: 'task-002',
    title: '3DACP协议适配器自检',
    description: '验证REST/SSE/WS/Internal/Bridge/External 6种适配器运行状态',
    status: 'running',
    priority: 'critical',
    type: 'skill',
    assignee: 'AgentZero',
    assigneeType: 'agent',
    createdAt: '2024-05-29T08:02:00Z',
    startedAt: '2024-05-29T08:02:10Z',
    progress: 65,
    dependencies: ['task-001'],
    tags: ['3dacp', 'adapter', 'health-check']
  },
  {
    id: 'task-003',
    title: '知识库文档索引更新',
    description: '对新增的上传文档进行向量索引和语义分块',
    status: 'pending',
    priority: 'medium',
    type: 'manual',
    assignee: '用户',
    assigneeType: 'user',
    createdAt: '2024-05-29T08:05:00Z',
    progress: 0,
    dependencies: [],
    tags: ['knowledge', 'index', 'embedding']
  },
  {
    id: 'task-004',
    title: '前端构建与部署',
    description: 'Vite生产构建、资源优化、Docker镜像打包',
    status: 'running',
    priority: 'high',
    type: 'blueprint',
    assignee: '系统',
    assigneeType: 'system',
    createdAt: '2024-05-29T08:10:00Z',
    startedAt: '2024-05-29T08:10:30Z',
    progress: 42,
    dependencies: ['task-002'],
    tags: ['build', 'deploy', 'frontend']
  },
  {
    id: 'task-005',
    title: 'OpenRouter API连通性测试',
    description: '验证OpenRouter免费模型列表和API响应',
    status: 'failed',
    priority: 'medium',
    type: 'skill',
    assignee: 'SYLVA',
    assigneeType: 'agent',
    createdAt: '2024-05-29T08:15:00Z',
    startedAt: '2024-05-29T08:15:10Z',
    completedAt: '2024-05-29T08:15:45Z',
    progress: 100,
    dependencies: [],
    tags: ['openrouter', 'api-test', 'llm'],
    error: 'API Key无效，返回401 Unauthorized。请检查key是否过期。'
  },
  {
    id: 'task-006',
    title: '每日增量备份',
    description: '自动执行知识库和Agent状态的增量备份',
    status: 'completed',
    priority: 'low',
    type: 'scheduled',
    assignee: '系统',
    assigneeType: 'system',
    createdAt: '2024-05-29T06:00:00Z',
    startedAt: '2024-05-29T06:00:01Z',
    completedAt: '2024-05-29T06:05:00Z',
    progress: 100,
    dependencies: [],
    tags: ['backup', 'scheduled', 'daily']
  },
  {
    id: 'task-007',
    title: 'Agent对话上下文清理',
    description: '清理超过30天的历史对话记录，释放内存',
    status: 'pending',
    priority: 'low',
    type: 'scheduled',
    assignee: 'AgentZero',
    assigneeType: 'agent',
    createdAt: '2024-05-29T08:20:00Z',
    progress: 0,
    dependencies: [],
    tags: ['cleanup', 'memory', 'maintenance']
  }
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: '待执行', color: 'text-gray-400', bg: 'bg-gray-500/10', icon: '⏳' },
  running: { label: '运行中', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '▶️' },
  completed: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '✅' },
  failed: { label: '失败', color: 'text-red-400', bg: 'bg-red-500/10', icon: '❌' },
  cancelled: { label: '已取消', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '🚫' }
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'text-gray-400', label: '低' },
  medium: { color: 'text-blue-400', label: '中' },
  high: { color: 'text-amber-400', label: '高' },
  critical: { color: 'text-red-400', label: '紧急' }
};

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  agent: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Agent任务' },
  skill: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: '技能执行' },
  blueprint: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: '流水线' },
  manual: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '手动' },
  scheduled: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: '定时' }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn('后端取消不可用，仅更新本地状态:', e);
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' as const, progress: 0 } : t));
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn('后端重试不可用，仅更新本地状态:', e);
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const, progress: 0, error: undefined } : t));
  };

  const handleCreate = async (title: string, description: string, priority: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      status: 'pending',
      priority: priority as any,
      type: 'manual',
      assignee: '用户',
      assigneeType: 'user',
      createdAt: new Date().toISOString(),
      progress: 0,
      dependencies: [],
      tags: ['manual']
    };
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.data) { setTasks(prev => [data.data, ...prev]); setShowCreateModal(false); return; }
    } catch (e) {
      console.warn('后端任务创建不可用，使用本地模拟:', e);
    }
    setTasks(prev => [newTask, ...prev]);
    setShowCreateModal(false);
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">深度任务管理</h1>
              <p className="text-gray-500 text-sm">Agent任务、流水线执行与调度中心</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建任务
            </button>
          </div>

          {/* 统计 */}
          <div className="flex gap-4 mt-4">
            {(['pending', 'running', 'completed', 'failed'] as const).map(s => {
              const count = tasks.filter(t => t.status === s).length;
              const cfg = STATUS_CONFIG[s];
              return (
                <div
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    statusFilter === s ? cfg.bg + ' ring-1' : 'bg-[#12121a]'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span className={`text-sm ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 任务列表 */}
          <div className="flex-1 overflow-auto p-6">
            {/* 筛选 */}
            <div className="flex items-center gap-4 mb-4">
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="all">全部优先级</option>
                <option value="critical">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>

            <div className="space-y-2">
              {filtered.map(task => {
                const status = STATUS_CONFIG[task.status];
                const priority = PRIORITY_CONFIG[task.priority];
                const type = TYPE_CONFIG[task.type];
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-4 bg-[#12121a] border rounded-lg cursor-pointer transition-all ${
                      selectedTask?.id === task.id
                        ? 'border-[var(--sage-500)] ring-1 ring-[var(--sage-500)]/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={status.color}>{status.icon}</span>
                        <h3 className="text-white font-medium">{task.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${type.bg} ${type.color}`}>{type.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${priority.color}`}>{priority.label}</span>
                        {task.status === 'running' && (
                          <span className="text-xs text-blue-400">{task.progress}%</span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>👤 {task.assignee}</span>
                      <span>🕐 {new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                      {task.dependencies.length > 0 && (
                        <span>🔗 依赖 {task.dependencies.length} 个</span>
                      )}
                    </div>
                    {task.status === 'running' && (
                      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--sage-500)] transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                    {task.status === 'failed' && task.error && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                        {task.error}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>暂无匹配任务</p>
                </div>
              )}
            </div>
          </div>

          {/* 详情面板 */}
          {selectedTask && (
            <div className="w-96 border-l border-gray-800 bg-[#0d0d14] p-6 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">任务详情</h2>
                <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-gray-500">任务ID</span>
                  <p className="text-white text-sm font-mono">{selectedTask.id}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">标题</span>
                  <p className="text-white text-sm">{selectedTask.title}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">描述</span>
                  <p className="text-gray-300 text-sm">{selectedTask.description}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">状态</span>
                  <p className={`text-sm ${STATUS_CONFIG[selectedTask.status].color}`}>
                    {STATUS_CONFIG[selectedTask.status].icon} {STATUS_CONFIG[selectedTask.status].label}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">优先级</span>
                  <p className={`text-sm ${PRIORITY_CONFIG[selectedTask.priority].color}`}>
                    {PRIORITY_CONFIG[selectedTask.priority].label}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">类型</span>
                  <p className={`text-sm ${TYPE_CONFIG[selectedTask.type].color}`}>{TYPE_CONFIG[selectedTask.type].label}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">执行者</span>
                  <p className="text-white text-sm">{selectedTask.assignee} ({selectedTask.assigneeType})</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">创建时间</span>
                  <p className="text-white text-sm">{new Date(selectedTask.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                {selectedTask.startedAt && (
                  <div>
                    <span className="text-xs text-gray-500">开始时间</span>
                    <p className="text-white text-sm">{new Date(selectedTask.startedAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}
                {selectedTask.completedAt && (
                  <div>
                    <span className="text-xs text-gray-500">完成时间</span>
                    <p className="text-white text-sm">{new Date(selectedTask.completedAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500">进度</span>
                  <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--sage-500)]" style={{ width: `${selectedTask.progress}%` }} />
                  </div>
                  <p className="text-right text-xs text-gray-400 mt-1">{selectedTask.progress}%</p>
                </div>
                {selectedTask.dependencies.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">依赖任务</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.dependencies.map(d => (
                        <span key={d} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTask.result && (
                  <div>
                    <span className="text-xs text-gray-500">执行结果</span>
                    <div className="mt-1 p-2 bg-[#12121a] border border-gray-800 rounded text-sm text-emerald-400">
                      {selectedTask.result}
                    </div>
                  </div>
                )}
                {selectedTask.error && (
                  <div>
                    <span className="text-xs text-gray-500">错误信息</span>
                    <div className="mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                      {selectedTask.error}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                {selectedTask.status === 'running' && (
                  <button
                    onClick={() => handleCancel(selectedTask.id)}
                    className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    取消任务
                  </button>
                )}
                {selectedTask.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(selectedTask.id)}
                    className="flex-1 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg transition-colors"
                  >
                    重试
                  </button>
                )}
                {selectedTask.status === 'pending' && (
                  <button
                    onClick={() => {
                      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'running' as const, startedAt: new Date().toISOString() } : t));
                    }}
                    className="flex-1 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg transition-colors"
                  >
                    开始执行
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建任务弹窗 */}
      {showCreateModal && (
        <CreateTaskModal onCreate={handleCreate} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateTaskModal({ onCreate, onClose }: { onCreate: (t: string, d: string, p: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#12121a] border border-gray-800 rounded-lg p-6 w-[400px]">
        <h2 className="text-white font-bold mb-4">新建任务</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">任务标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入任务标题..."
              className="w-full px-3 py-2 bg-[#0d0d14] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--sage-500)]"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">任务描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="输入任务描述..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0d0d14] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--sage-500)] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">优先级</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d14] border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="critical">紧急</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => { if (title.trim()) onCreate(title, description, priority); }}
            disabled={!title.trim()}
            className="flex-1 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
