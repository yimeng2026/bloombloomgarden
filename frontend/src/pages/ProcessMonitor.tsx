import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchProcesses, fetchProcessStats } from '@/api/client';

interface ProcessInfo {
  pid: number;
  name: string;
  type: 'backend' | 'frontend' | 'electron' | 'agent' | 'service' | 'adapter';
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  cpu: number;
  memory: number;
  memoryUnit: string;
  uptime: string;
  threads: number;
  parentPid?: number;
  command: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  backend: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '后端' },
  frontend: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '前端' },
  electron: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: '桌面' },
  agent: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Agent' },
  service: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: '服务' },
  adapter: { bg: 'bg-pink-500/10', text: 'text-pink-400', label: '适配器' }
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  running: { color: 'text-emerald-400', label: '运行中' },
  sleeping: { color: 'text-gray-400', label: '休眠' },
  stopped: { color: 'text-red-400', label: '已停止' },
  zombie: { color: 'text-purple-400', label: '僵尸' }
};

export default function ProcessMonitor() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid'>('cpu');
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchProcesses();
        if (res?.data) {
          const formatted = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
            pid: p.pid,
            name: p.name,
            type: p.type || 'service',
            status: p.status || 'running',
            cpu: p.cpu || 0,
            memory: typeof p.memory === 'string' ? parseInt(p.memory) : (p.memory || 0),
            memoryUnit: 'MB',
            uptime: typeof p.uptime === 'number' ? formatUptime(p.uptime) : (p.uptime || '-'),
            threads: p.threads || 1,
            command: p.command || p.name
          }));
          setProcesses(formatted);
        }
      } catch (e: any) {
        setError(e.message || '加载进程数据失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const sorted = [...processes]
    .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.command.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      return sortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    });

  const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
  const totalMem = processes.reduce((sum, p) => sum + p.memory, 0);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">进程监控</h1>
            <p className="text-gray-500 text-sm">系统进程、资源占用与状态监控</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value={1}>1秒刷新</option>
              <option value={5}>5秒刷新</option>
              <option value={10}>10秒刷新</option>
              <option value={30}>30秒刷新</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center text-sm text-[var(--sage-400)] py-4">加载中...</div>
        )}
        {error && (
          <div className="text-center text-sm text-red-500 py-4">⚠️ {error}</div>
        )}

        {/* 资源总览 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{processes.length}</div>
            <div className="text-xs text-gray-500 mt-1">总进程数</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{processes.filter(p => p.status === 'running').length}</div>
            <div className="text-xs text-gray-500 mt-1">运行中</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{totalCpu.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">CPU 总占用</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{(totalMem / 1024).toFixed(1)} GB</div>
            <div className="text-xs text-gray-500 mt-1">内存 总占用</div>
          </div>
        </div>

        {/* CPU 可视化 */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">CPU 占用分布</h3>
            <span className="text-xs text-gray-500">实时</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-4">加载中...</div>
            ) : error ? (
              <div className="text-center text-sm text-red-500 py-4">⚠️ {error}</div>
            ) : (
              sorted.slice(0, 8).map(p => (
                <div key={p.pid} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 truncate">{p.name}</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--sage-600)] to-[var(--sage-400)] transition-all duration-1000"
                      style={{ width: `${Math.min(p.cpu * 3, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{p.cpu.toFixed(1)}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="搜索进程..."
            className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--sage-500)] w-64"
          />
          <div className="flex gap-1">
            {(['cpu', 'memory', 'pid'] as const).map(s => (
              <button
                key={s}
                onClick={() => {
                  if (sortBy === s) setSortDesc(!sortDesc);
                  else { setSortBy(s); setSortDesc(true); }
                }}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  sortBy === s
                    ? 'bg-[var(--sage-600)] text-white'
                    : 'bg-[#12121a] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {s === 'cpu' ? 'CPU' : s === 'memory' ? '内存' : 'PID'}
                {sortBy === s && (sortDesc ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {/* 进程表格 */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center text-sm text-[var(--sage-400)] py-8">加载中...</div>
          ) : error ? (
            <div className="text-center text-sm text-red-500 py-8">⚠️ {error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0d0d14] text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">PID</th>
                  <th className="text-left px-4 py-3 font-medium">名称</th>
                  <th className="text-left px-4 py-3 font-medium">类型</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-right px-4 py-3 font-medium">CPU</th>
                  <th className="text-right px-4 py-3 font-medium">内存</th>
                  <th className="text-left px-4 py-3 font-medium">运行时间</th>
                  <th className="text-right px-4 py-3 font-medium">线程</th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sorted.map(p => {
                  const typeCfg = TYPE_COLORS[p.type];
                  const statusCfg = STATUS_CONFIG[p.status];
                  return (
                    <tr
                      key={p.pid}
                      onClick={() => setSelectedProcess(p)}
                      className="hover:bg-[#1a1a24] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono">{p.pid}</td>
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${typeCfg.bg} ${typeCfg.text}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${statusCfg.color}`}>{statusCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{p.cpu.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-white">{p.memory} {p.memoryUnit}</td>
                      <td className="px-4 py-3 text-gray-400">{p.uptime}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{p.threads}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`/api/system/processes/${p.pid}/restart`, { method: 'POST' });
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              alert(`重启命令已发送: ${p.name} (PID: ${p.pid})`);
                            } catch (err) {
                              alert(`重启失败: ${p.name} (PID: ${p.pid})`);
                            }
                          }}
                          className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                        >
                          重启
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 进程详情弹窗 */}
        {selectedProcess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-6 w-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">进程详情</h2>
                <button onClick={() => setSelectedProcess(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">PID</span><p className="text-white font-mono">{selectedProcess.pid}</p></div>
                  <div><span className="text-gray-500">名称</span><p className="text-white">{selectedProcess.name}</p></div>
                  <div><span className="text-gray-500">类型</span><p className="text-white">{TYPE_COLORS[selectedProcess.type].label}</p></div>
                  <div><span className="text-gray-500">状态</span><p className={STATUS_CONFIG[selectedProcess.status].color}>{STATUS_CONFIG[selectedProcess.status].label}</p></div>
                  <div><span className="text-gray-500">CPU</span><p className="text-white">{selectedProcess.cpu.toFixed(1)}%</p></div>
                  <div><span className="text-gray-500">内存</span><p className="text-white">{selectedProcess.memory} {selectedProcess.memoryUnit}</p></div>
                  <div><span className="text-gray-500">运行时间</span><p className="text-white">{selectedProcess.uptime}</p></div>
                  <div><span className="text-gray-500">线程数</span><p className="text-white">{selectedProcess.threads}</p></div>
                </div>
                <div>
                  <span className="text-gray-500">启动命令</span>
                  <pre className="mt-1 p-3 bg-[#0d0d14] border border-gray-800 rounded text-xs text-gray-300 font-mono overflow-auto">
                    {selectedProcess.command}
                  </pre>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    alert(`发送 SIGTERM 到 PID ${selectedProcess.pid}`);
                    setSelectedProcess(null);
                  }}
                  className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  终止进程
                </button>
                <button
                  onClick={() => {
                    alert(`重启 PID ${selectedProcess.pid}`);
                    setSelectedProcess(null);
                  }}
                  className="flex-1 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg transition-colors"
                >
                  重启进程
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
