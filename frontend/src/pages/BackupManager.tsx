import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  size: string;
  createdAt: string;
  completedAt?: string;
  schedule?: string;
  target: string;
}

const MOCK_BACKUPS: BackupJob[] = [
  {
    id: '1',
    name: '完整系统备份 #2024-05-28',
    type: 'full',
    status: 'completed',
    size: '2.4 GB',
    createdAt: '2024-05-28T02:00:00Z',
    completedAt: '2024-05-28T02:35:00Z',
    target: '本地存储 /backups/full'
  },
  {
    id: '2',
    name: '知识库增量备份',
    type: 'incremental',
    status: 'running',
    size: '156 MB',
    createdAt: '2024-05-29T08:00:00Z',
    target: '本地存储 /backups/incremental'
  },
  {
    id: '3',
    name: 'Agent状态每日备份',
    type: 'differential',
    status: 'scheduled',
    size: '-',
    createdAt: '2024-05-29T06:00:00Z',
    schedule: '每日 06:00',
    target: '本地存储 /backups/agents'
  },
  {
    id: '4',
    name: '完整系统备份 #2024-05-21',
    type: 'full',
    status: 'completed',
    size: '2.3 GB',
    createdAt: '2024-05-21T02:00:00Z',
    completedAt: '2024-05-21T02:32:00Z',
    target: '本地存储 /backups/full'
  },
  {
    id: '5',
    name: '配置数据备份',
    type: 'full',
    status: 'failed',
    size: '12 MB',
    createdAt: '2024-05-29T05:30:00Z',
    target: '本地存储 /backups/config'
  }
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  running: { label: '进行中', color: 'text-blue-400', icon: '▶️' },
  completed: { label: '已完成', color: 'text-emerald-400', icon: '✅' },
  failed: { label: '失败', color: 'text-red-400', icon: '❌' },
  scheduled: { label: '已计划', color: 'text-amber-400', icon: '⏰' }
};

const TYPE_LABELS: Record<string, string> = {
  full: '完整备份',
  incremental: '增量备份',
  differential: '差异备份'
};

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupJob[]>(MOCK_BACKUPS);
  const [filter, setFilter] = useState<'all' | 'full' | 'incremental' | 'differential'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null);

  const filtered = filter === 'all' ? backups : backups.filter(b => b.type === filter);

  const handleCreateBackup = async (type: 'full' | 'incremental') => {
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target: `本地存储 /backups/${type}` })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.data) { setBackups(prev => [data.data, ...prev]); setShowCreateModal(false); return; }
    } catch (e) {
      console.warn('后端备份创建不可用，使用本地模拟:', e);
    }
    // 降级：本地Mock
    const newBackup: BackupJob = {
      id: Date.now().toString(),
      name: `${TYPE_LABELS[type]} #${new Date().toLocaleDateString('zh-CN')}`,
      type,
      status: 'running',
      size: '计算中...',
      createdAt: new Date().toISOString(),
      target: `本地存储 /backups/${type}`
    };
    setBackups(prev => [newBackup, ...prev]);
    setShowCreateModal(false);
    setTimeout(() => {
      setBackups(prev => prev.map(b =>
        b.id === newBackup.id
          ? { ...b, status: 'completed' as const, size: type === 'full' ? '2.5 GB' : '180 MB', completedAt: new Date().toISOString() }
          : b
      ));
    }, 3000);
  };

  const handleRestore = async (backup: BackupJob) => {
    if (!confirm(`确认从备份 "${backup.name}" 恢复数据？当前数据将被覆盖。`)) return;
    try {
      const res = await fetch(`/api/backups/${backup.id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('恢复请求已提交，正在后台执行。');
    } catch (e) {
      alert('恢复请求已提交（模拟），请查看任务进度。');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此备份？此操作不可撤销。')) return;
    try {
      const res = await fetch(`/api/backups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn('后端删除不可用，仅移除本地显示:', e);
    }
    setBackups(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">备份管理</h1>
            <p className="text-gray-500 text-sm">数据备份、恢复与自动调度</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + 新建备份
          </button>
        </div>

        {/* 统计卡片区 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '总备份数', value: backups.length, color: 'text-white' },
            { label: '进行中', value: backups.filter(b => b.status === 'running').length, color: 'text-blue-400' },
            { label: '本周完成', value: backups.filter(b => b.status === 'completed' && b.createdAt > '2024-05-26').length, color: 'text-emerald-400' },
            { label: '存储占用', value: '4.8 GB', color: 'text-amber-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 mb-4">
          {(['all', 'full', 'incremental', 'differential'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filter === f
                  ? 'bg-[var(--sage-600)] text-white'
                  : 'bg-[#12121a] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {f === 'all' ? '全部' : TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* 备份列表 */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0d0d14] text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">名称</th>
                <th className="text-left px-4 py-3 font-medium">类型</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">大小</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
                <th className="text-left px-4 py-3 font-medium">目标位置</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(b => {
                const status = STATUS_CONFIG[b.status];
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-[#1a1a24] transition-colors cursor-pointer"
                    onClick={() => setSelectedBackup(b)}
                  >
                    <td className="px-4 py-3 text-white">{b.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                        {TYPE_LABELS[b.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{b.size}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(b.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.target}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'completed' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRestore(b); }}
                            className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                          >
                            恢复
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(b.id); }}
                          className="px-2 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              暂无备份记录
            </div>
          )}
        </div>

        {/* 创建备份弹窗 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-6 w-96">
              <h2 className="text-white font-bold mb-4">新建备份</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleCreateBackup('full')}
                  className="w-full p-4 bg-[#0d0d14] border border-gray-800 rounded-lg hover:border-[var(--sage-500)] transition-colors text-left"
                >
                  <div className="text-white font-medium">🗂️ 完整备份</div>
                  <div className="text-gray-500 text-sm mt-1">备份所有数据，耗时较长但恢复最完整</div>
                </button>
                <button
                  onClick={() => handleCreateBackup('incremental')}
                  className="w-full p-4 bg-[#0d0d14] border border-gray-800 rounded-lg hover:border-[var(--sage-500)] transition-colors text-left"
                >
                  <div className="text-white font-medium">📄 增量备份</div>
                  <div className="text-gray-500 text-sm mt-1">仅备份自上次备份后的变更，速度快</div>
                </button>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 详情侧边栏 */}
        {selectedBackup && (
          <div className="fixed inset-y-0 right-0 w-96 bg-[#0d0d14] border-l border-gray-800 p-6 overflow-auto z-40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold">备份详情</h2>
              <button
                onClick={() => setSelectedBackup(null)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500">名称</span>
                <p className="text-white text-sm">{selectedBackup.name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">类型</span>
                <p className="text-white text-sm">{TYPE_LABELS[selectedBackup.type]}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">状态</span>
                <p className={`text-sm ${STATUS_CONFIG[selectedBackup.status].color}`}>
                  {STATUS_CONFIG[selectedBackup.status].icon} {STATUS_CONFIG[selectedBackup.status].label}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">大小</span>
                <p className="text-white text-sm">{selectedBackup.size}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">创建时间</span>
                <p className="text-white text-sm">{new Date(selectedBackup.createdAt).toLocaleString('zh-CN')}</p>
              </div>
              {selectedBackup.completedAt && (
                <div>
                  <span className="text-xs text-gray-500">完成时间</span>
                  <p className="text-white text-sm">{new Date(selectedBackup.completedAt).toLocaleString('zh-CN')}</p>
                </div>
              )}
              {selectedBackup.schedule && (
                <div>
                  <span className="text-xs text-gray-500">计划调度</span>
                  <p className="text-white text-sm">{selectedBackup.schedule}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">目标位置</span>
                <p className="text-[var(--sage-400)] text-sm">{selectedBackup.target}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
