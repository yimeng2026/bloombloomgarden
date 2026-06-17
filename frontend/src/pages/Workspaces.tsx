import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Plus, Trash2, Edit3, Users, Folder, ChevronRight, Star,
  Clock, Activity, Search, ArrowRight, CheckCircle, AlertTriangle,
  Lock, Globe, Zap
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { fetchWorkspaces } from '../api/client';

interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  members: number;
  agents: number;
  tasks: number;
  lastActivity: string;
  isStarred: boolean;
  isPublic: boolean;
  owner: string;
  tags: string[];
}

interface ActivityLog {
  id: string;
  workspaceId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

const COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
];

export default function Workspaces() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('0');
  const [newPublic, setNewPublic] = useState(false);

  // Load from API
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWorkspaces()
      .then((data: any) => {
        if (!cancelled) {
          const list = (data?.data || []).map((w: any) => ({
            id: w.id,
            name: w.name,
            description: w.description || '无描述',
            color: w.color || '0',
            icon: w.icon || 'Folder',
            members: w.members || 0,
            agents: w.agents || 0,
            tasks: w.tasks || 0,
            lastActivity: w.lastActivity || w.last_activity || new Date().toISOString(),
            isStarred: w.isStarred || false,
            isPublic: w.isPublic || false,
            owner: w.owner || 'unknown',
            tags: w.tags || [],
          }))
          setWorkspaces(list)
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载工作空间失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = workspaces.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleStar = async (id: string) => {
    try {
      await fetch(`/api/workspaces/${id}/star`, { method: 'PATCH' });
      setWorkspaces(prev => prev.map(w =>
        w.id === id ? { ...w, isStarred: !w.isStarred } : w
      ));
    } catch (err: any) {
      setError('收藏操作失败: ' + (err.message || '网络错误'));
    }
  };

  const deleteWorkspace = async (id: string) => {
    if (!confirm('确定删除此工作空间？此操作不可恢复。')) return;
    try {
      await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      setWorkspaces(prev => prev.filter(w => w.id !== id));
      setSuccess('工作空间已删除');
    } catch (err: any) {
      setError('删除失败: ' + (err.message || '网络错误'));
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setError('请输入工作空间名称'); return; }

    const ws: Workspace = {
      id: `ws-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || '无描述',
      color: newColor,
      icon: 'Folder',
      members: 1,
      agents: 0,
      tasks: 0,
      lastActivity: new Date().toISOString(),
      isStarred: false,
      isPublic: newPublic,
      owner: 'current-user',
      tags: [],
    };

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ws),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setWorkspaces(prev => [data.data, ...prev]);
        } else {
          setWorkspaces(prev => [ws, ...prev]);
        }
        setNewName('');
        setNewDesc('');
        setNewColor('0');
        setNewPublic(false);
        setShowCreate(false);
        setSuccess('工作空间创建成功');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '创建失败');
      }
    } catch (err: any) {
      setError('创建失败: ' + (err.message || '网络错误'));
    }
  };

  const enterWorkspace = (id: string) => {
    navigate(`/workspaces/${id}`);
  };

  const colorStyle = (idx: string) => COLORS[parseInt(idx) % COLORS.length];

  const starred = filtered.filter(w => w.isStarred);
  const normal = filtered.filter(w => !w.isStarred);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layout className="w-6 h-6 text-blue-400" />
              工作空间
            </h1>
            <p className="text-gray-500 text-sm mt-1">管理项目工作区 — 组织智能体、任务和协作者</p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建工作空间
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-700 border-t-gray-500 rounded-full animate-spin" />
              <span className="text-sm">加载工作空间...</span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索工作空间..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">工作空间</div>
            <div className="text-2xl font-bold text-white">{workspaces.length}</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">收藏</div>
            <div className="text-2xl font-bold text-yellow-400">{workspaces.filter(w => w.isStarred).length}</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">智能体</div>
            <div className="text-2xl font-bold text-purple-400">{workspaces.reduce((a, w) => a + w.agents, 0)}</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">任务</div>
            <div className="text-2xl font-bold text-green-400">{workspaces.reduce((a, w) => a + w.tasks, 0)}</div>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <form onSubmit={createWorkspace} className="mb-6 bg-[#12121a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">创建工作空间</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="输入工作空间名称"
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">颜色主题</label>
                <div className="flex gap-2">
                  {COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewColor(String(i))}
                      className={`w-8 h-8 rounded-lg ${c.bg} border-2 transition-all ${newColor === String(i) ? c.border : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1.5 block">描述</label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="简短描述工作空间的用途"
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={e => setNewPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-[#0a0a0f] text-blue-600"
                />
                <span className="text-sm text-gray-400">公开工作空间</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspaces List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Starred */}
            {starred.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  收藏的工作空间
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {starred.map(ws => {
                    const c = colorStyle(ws.color);
                    return (
                      <div
                        key={ws.id}
                        className="group relative bg-[#12121a] border border-gray-800 hover:border-gray-700 rounded-xl p-4 cursor-pointer transition-all"
                        onClick={() => enterWorkspace(ws.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                            <Folder className={`w-5 h-5 ${c.text}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); toggleStar(ws.id); }}
                              className="p-1 hover:bg-yellow-500/20 rounded text-yellow-400"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                              className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{ws.name}</h3>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ws.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.members}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {ws.agents}</span>
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {ws.tasks}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {ws.isPublic ? <Globe className="w-3 h-3 text-gray-600" /> : <Lock className="w-3 h-3 text-gray-600" />}
                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Normal */}
            {normal.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-400" />
                  全部工作空间
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {normal.map(ws => {
                    const c = colorStyle(ws.color);
                    return (
                      <div
                        key={ws.id}
                        className="group relative bg-[#12121a] border border-gray-800 hover:border-gray-700 rounded-xl p-4 cursor-pointer transition-all"
                        onClick={() => enterWorkspace(ws.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                            <Folder className={`w-5 h-5 ${c.text}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); toggleStar(ws.id); }}
                              className="p-1 hover:bg-yellow-500/20 rounded text-gray-600 hover:text-yellow-400"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                              className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{ws.name}</h3>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ws.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.members}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {ws.agents}</span>
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {ws.tasks}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {ws.isPublic ? <Globe className="w-3 h-3 text-gray-600" /> : <Lock className="w-3 h-3 text-gray-600" />}
                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filtered.length === 0 && !loading && (
              <div className="text-center text-sm text-gray-400">
                暂无数据
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4 h-fit">
            <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              最近活动
            </h2>
            <div className="space-y-3">
              {activities.map(act => {
                const ws = workspaces.find(w => w.id === act.workspaceId);
                return (
                  <div key={act.id} className="flex items-start gap-3 p-2 hover:bg-[#0a0a0f] rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-300">
                        <span className="font-medium">{act.actor}</span>
                        {' '}{act.action}{' '}
                        {ws && <span className="text-blue-400">{ws.name}</span>}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{act.details}</div>
                      <div className="text-[10px] text-gray-700 mt-0.5">
                        {new Date(act.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
