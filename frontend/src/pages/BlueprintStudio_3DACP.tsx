import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Workflow, Plus, Play, Pause, Trash2, Edit3, Copy,
  ChevronRight, Layers, GitBranch, ArrowRightLeft, Zap,
  AlertTriangle, CheckCircle, Clock, RefreshCw, Search,
} from 'lucide-react';
import {
  fetchBlueprints, getBlueprint, createBlueprint,
  updateBlueprint, deleteBlueprint, executeBlueprint,
  pauseBlueprint, resumeBlueprint,
} from '@/api/client';

interface Blueprint {
  id: string;
  name: string;
  description?: string;
  mode: 'sequential' | 'parallel' | 'hierarchical' | 'dynamic';
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecution?: string;
}

interface BlueprintNode {
  id: string;
  type: 'agent' | 'group' | 'condition' | 'loop' | 'output';
  label: string;
  config?: Record<string, any>;
}

interface BlueprintEdge {
  from: string;
  to: string;
  condition?: string;
}

const MODE_CONFIG: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  sequential: { label: '顺序执行', icon: ArrowRightLeft, color: '#3b82f6', desc: '按顺序逐个执行节点' },
  parallel: { label: '并行执行', icon: Layers, color: '#10b981', desc: '所有节点同时执行' },
  hierarchical: { label: '层级执行', icon: GitBranch, color: '#f59e0b', desc: '按层级结构执行' },
  dynamic: { label: '动态编排', icon: Zap, color: '#8b5cf6', desc: '运行时动态调度' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  draft: { color: '#6b7280', label: '草稿', icon: Edit3 },
  active: { color: '#10b981', label: '运行中', icon: Play },
  paused: { color: '#f59e0b', label: '已暂停', icon: Pause },
  completed: { color: '#3b82f6', label: '已完成', icon: CheckCircle },
};

export default function BlueprintStudio() {
  const navigate = useNavigate();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    loadBlueprints();
  }, []);

  async function loadBlueprints() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchBlueprints();
      const list = res.data || [];
      // Normalize API response to Blueprint interface
      const normalized: Blueprint[] = list.map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description || '',
        mode: b.mode || 'sequential',
        nodes: b.nodes || [],
        edges: b.edges || [],
        status: b.status || 'draft',
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
        executionCount: b.executionCount || 0,
        lastExecution: b.lastExecution,
      }));
      setBlueprints(normalized);
    } catch (e: any) {
      console.error('Load blueprints failed:', e);
      setError(e?.message || '加载蓝图失败');
      setBlueprints([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = blueprints.filter((b) => {
    const matchSearch = search === '' || b.name.toLowerCase().includes(search.toLowerCase()) || (b.description || '').toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === 'all' || b.mode === modeFilter;
    return matchSearch && matchMode;
  });

  const handleExecute = async (id: string) => {
    try {
      setExecutingId(id);
      await executeBlueprint(id);
      await loadBlueprints();
    } catch (e: any) {
      setError(e?.message || '执行失败');
    } finally {
      setExecutingId(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseBlueprint(id);
      await loadBlueprints();
    } catch (e: any) {
      setError(e?.message || '暂停失败');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeBlueprint(id);
      await loadBlueprints();
    } catch (e: any) {
      setError(e?.message || '恢复失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此蓝图？')) return;
    try {
      await deleteBlueprint(id);
      await loadBlueprints();
    } catch (e: any) {
      setError(e?.message || '删除失败');
    }
  };

  const handleClone = async (blueprint: Blueprint) => {
    try {
      const payload = {
        name: `${blueprint.name} (副本)`,
        description: blueprint.description,
        mode: blueprint.mode,
        nodes: blueprint.nodes,
        edges: blueprint.edges,
      };
      await createBlueprint(payload);
      await loadBlueprints();
    } catch (e: any) {
      setError(e?.message || '克隆失败');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6 text-[var(--sage-500)]" />
            蓝图编排工作室
          </h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">
            编排Agent流水线 — 顺序 / 并行 / 层级 / 动态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadBlueprints}
            disabled={loading}
            className="p-2 text-[var(--sage-500)] hover:text-[var(--sage-700)] hover:bg-[var(--sage-100)] rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[var(--sage-500)] text-white rounded-lg text-sm hover:bg-[var(--sage-600)] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建蓝图
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 text-red-600 rounded-card px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '总蓝图', value: blueprints.length, icon: Workflow, color: 'text-blue-500' },
          { label: '运行中', value: blueprints.filter(b => b.status === 'active').length, icon: Play, color: 'text-green-500' },
          { label: '已暂停', value: blueprints.filter(b => b.status === 'paused').length, icon: Pause, color: 'text-yellow-500' },
          { label: '草稿', value: blueprints.filter(b => b.status === 'draft').length, icon: Edit3, color: 'text-gray-500' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--sage-500)]">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            placeholder="搜索蓝图..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部模式</option>
          <option value="sequential">顺序</option>
          <option value="parallel">并行</option>
          <option value="hierarchical">层级</option>
          <option value="dynamic">动态</option>
        </select>
      </div>

      {/* Blueprint List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--sage-500)]">加载蓝图中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-500)]">
          <Workflow className="w-10 h-10 mx-auto mb-2 text-[var(--sage-400)]" />
          <p>暂无蓝图</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-[var(--sage-500)] hover:text-[var(--sage-700)] underline">
            创建第一个蓝图
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((blueprint) => {
            const mode = MODE_CONFIG[blueprint.mode] || MODE_CONFIG.sequential;
            const ModeIcon = mode.icon;
            const status = STATUS_CONFIG[blueprint.status] || STATUS_CONFIG.draft;
            const StatusIcon = status.icon;
            return (
              <div key={blueprint.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mode.color}15` }}>
                      <ModeIcon className="w-5 h-5" style={{ color: mode.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{blueprint.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${mode.color}15`, color: mode.color }}>
                          {mode.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--sage-500)] mt-1">{blueprint.description || mode.desc}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--sage-500)]">
                        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {blueprint.nodes.length} 节点</span>
                        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> {blueprint.edges.length} 连接</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(blueprint.updatedAt).toLocaleDateString()}</span>
                        {blueprint.executionCount > 0 && (
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 执行 {blueprint.executionCount} 次</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {blueprint.status === 'draft' && (
                      <button
                        onClick={() => handleExecute(blueprint.id)}
                        disabled={executingId === blueprint.id}
                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="执行"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {blueprint.status === 'active' && (
                      <button
                        onClick={() => handlePause(blueprint.id)}
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="暂停"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {blueprint.status === 'paused' && (
                      <button
                        onClick={() => handleResume(blueprint.id)}
                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="恢复"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleClone(blueprint)}
                      className="p-2 text-[var(--sage-500)] hover:text-[var(--sage-700)] hover:bg-[var(--sage-100)] rounded-lg transition-colors"
                      title="克隆"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(blueprint.id)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateBlueprintModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            try {
              await createBlueprint(data);
              setShowCreate(false);
              await loadBlueprints();
            } catch (e: any) {
              setError(e?.message || '创建失败');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateBlueprintModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [mode, setMode] = useState<string>('sequential');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Plus className="w-5 h-5 text-[var(--sage-500)]" />
          新建蓝图
        </h2>
        <div>
          <label className="block text-sm text-[var(--sage-600)] mb-1">名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            placeholder="输入蓝图名称..."
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--sage-600)] mb-1">描述</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            rows={2}
            placeholder="描述此蓝图的功能..."
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--sage-600)] mb-1">执行模式</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MODE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mode === key
                      ? 'border-[var(--sage-500)] bg-[var(--sage-50)]'
                      : 'border-[var(--sage-200)] hover:border-[var(--sage-300)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className="text-xs text-[var(--sage-500)] mt-1">{config.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--sage-200)] rounded-lg text-sm hover:bg-[var(--sage-50)] transition-colors">
            取消
          </button>
          <button
            onClick={async () => {
              if (!name.trim()) return;
              setSubmitting(true);
              await onCreate({ name: name.trim(), description: desc.trim() || undefined, mode, nodes: [], edges: [] });
              setSubmitting(false);
            }}
            disabled={submitting || !name.trim()}
            className="flex-1 px-4 py-2 bg-[var(--sage-500)] text-white rounded-lg text-sm hover:bg-[var(--sage-600)] transition-colors disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
