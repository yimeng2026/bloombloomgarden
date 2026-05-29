import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

interface RegistryNode {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'bridge' | 'adapter' | 'gateway';
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  axisX: number;
  axisY: number;
  axisZ: number;
  protocol: string;
  endpoint: string;
  version: string;
  lastHeartbeat: string;
  healthScore: number;
  description: string;
  tags: string[];
}

const MOCK_NODES: RegistryNode[] = [
  { id: 'node-001', name: 'DialogService', type: 'internal', status: 'active', axisX: 1, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://dialog', version: '1.2.0', lastHeartbeat: '2024-05-29T08:45:00Z', healthScore: 98, description: '对话管理服务，处理用户与Agent的会话', tags: ['core', 'dialog'] },
  { id: 'node-002', name: 'AgentService', type: 'internal', status: 'active', axisX: 2, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://agent', version: '2.0.1', lastHeartbeat: '2024-05-29T08:45:02Z', healthScore: 97, description: 'Agent生命周期管理', tags: ['core', 'agent'] },
  { id: 'node-003', name: 'KnowledgeService', type: 'internal', status: 'active', axisX: 3, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://knowledge', version: '1.5.0', lastHeartbeat: '2024-05-29T08:45:01Z', healthScore: 96, description: '知识库与文档管理', tags: ['core', 'knowledge'] },
  { id: 'node-004', name: 'GroupService', type: 'internal', status: 'active', axisX: 4, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://group', version: '1.1.0', lastHeartbeat: '2024-05-29T08:45:03Z', healthScore: 95, description: '多Agent群组编排', tags: ['core', 'group'] },
  { id: 'node-005', name: 'SkillService', type: 'internal', status: 'active', axisX: 5, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://skill', version: '1.3.0', lastHeartbeat: '2024-05-29T08:44:58Z', healthScore: 99, description: '技能发现与执行', tags: ['core', 'skill'] },
  { id: 'node-006', name: 'PlatformService', type: 'internal', status: 'active', axisX: 6, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://platform', version: '1.0.2', lastHeartbeat: '2024-05-29T08:45:00Z', healthScore: 94, description: '平台管理与集成', tags: ['core', 'platform'] },
  { id: 'node-007', name: 'InterventionService', type: 'internal', status: 'active', axisX: 7, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://intervention', version: '1.0.0', lastHeartbeat: '2024-05-29T08:45:01Z', healthScore: 100, description: '人工干预与Agent接管', tags: ['core', 'intervention'] },
  { id: 'node-008', name: 'BlueprintService', type: 'internal', status: 'active', axisX: 8, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://blueprint', version: '1.2.0', lastHeartbeat: '2024-05-29T08:45:02Z', healthScore: 93, description: 'Agent流水线编排', tags: ['core', 'blueprint'] },
  { id: 'node-009', name: 'RESTAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 2, axisZ: 0, protocol: 'REST', endpoint: '/api/v1', version: '2.1.0', lastHeartbeat: '2024-05-29T08:45:00Z', healthScore: 98, description: 'RESTful HTTP API适配器', tags: ['adapter', 'rest'] },
  { id: 'node-010', name: 'SSEAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 3, axisZ: 0, protocol: 'SSE', endpoint: '/api/stream', version: '1.0.0', lastHeartbeat: '2024-05-29T08:45:01Z', healthScore: 97, description: 'Server-Sent Events流适配器', tags: ['adapter', 'sse'] },
  { id: 'node-011', name: 'WSAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 4, axisZ: 0, protocol: 'WS', endpoint: 'ws://localhost:3002', version: '1.1.0', lastHeartbeat: '2024-05-29T08:45:02Z', healthScore: 96, description: 'WebSocket实时通信适配器', tags: ['adapter', 'ws'] },
  { id: 'node-012', name: 'DiscordBridge', type: 'bridge', status: 'active', axisX: 0, axisY: 5, axisZ: 1, protocol: 'Bridge', endpoint: 'wss://gateway.discord.gg', version: '1.0.0', lastHeartbeat: '2024-05-29T08:44:55Z', healthScore: 85, description: 'Discord消息桥接', tags: ['bridge', 'discord'] },
  { id: 'node-013', name: 'GitHubBridge', type: 'bridge', status: 'active', axisX: 0, axisY: 6, axisZ: 1, protocol: 'Bridge', endpoint: 'https://api.github.com', version: '1.0.0', lastHeartbeat: '2024-05-29T08:45:00Z', healthScore: 92, description: 'GitHub事件桥接', tags: ['bridge', 'github'] },
  { id: 'node-014', name: 'KimiCodeProvider', type: 'external', status: 'active', axisX: 0, axisY: 7, axisZ: 2, protocol: 'External', endpoint: 'https://api.kimi.moonshot.cn', version: 'v1', lastHeartbeat: '2024-05-29T08:45:03Z', healthScore: 88, description: 'Kimi Code LLM服务', tags: ['external', 'llm', 'kimi'] },
  { id: 'node-015', name: 'OpenRouterProvider', type: 'external', status: 'active', axisX: 0, axisY: 8, axisZ: 2, protocol: 'External', endpoint: 'https://openrouter.ai/api', version: 'v1', lastHeartbeat: '2024-05-29T08:45:01Z', healthScore: 90, description: 'OpenRouter多模型聚合', tags: ['external', 'llm', 'openrouter'] },
  { id: 'node-016', name: 'AxisGateway', type: 'gateway', status: 'active', axisX: 0, axisY: 0, axisZ: 0, protocol: 'Gateway', endpoint: '0.0.0.0:3001', version: '3.0.0', lastHeartbeat: '2024-05-29T08:45:00Z', healthScore: 99, description: '3DACP统一网关', tags: ['gateway', 'core'] },
];

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  internal: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '内部服务' },
  external: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: '外部集成' },
  bridge: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: '桥接' },
  adapter: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '适配器' },
  gateway: { color: 'text-red-400', bg: 'bg-red-500/10', label: '网关' }
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: 'text-emerald-400', label: '活跃' },
  inactive: { color: 'text-gray-400', label: '离线' },
  maintenance: { color: 'text-amber-400', label: '维护' },
  deprecated: { color: 'text-red-400', label: '废弃' }
};

export default function RegistryView() {
  const [nodes] = useState<RegistryNode[]>(MOCK_NODES);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<RegistryNode | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'axis'>('list');

  const filtered = nodes.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (filter && !n.name.toLowerCase().includes(filter.toLowerCase()) && !n.description.includes(filter)) return false;
    return true;
  });

  const healthColor = (score: number) => {
    if (score >= 95) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">节点注册中心</h1>
              <p className="text-gray-500 text-sm">3DACP 全节点注册、发现与健康管理</p>
            </div>
            <div className="flex items-center gap-2">
              {(['list', 'grid', 'axis'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === m
                      ? 'bg-[var(--sage-600)] text-white'
                      : 'bg-[#12121a] text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {m === 'list' ? '☰ 列表' : m === 'grid' ? '⊞ 网格' : '3D 坐标'}
                </button>
              ))}
            </div>
          </div>

          {/* 统计 */}
          <div className="flex gap-4 mt-4">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const count = nodes.filter(n => n.type === type).length;
              return (
                <div key={type} className="flex items-center gap-2 px-3 py-2 bg-[#12121a] rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${cfg.bg.replace('/10', '')}`} />
                  <span className={`text-sm ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 主内容区 */}
          <div className="flex-1 overflow-auto p-6">
            {/* 筛选栏 */}
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="搜索节点..."
                className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--sage-500)] w-64"
              />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="all">全部类型</option>
                <option value="internal">内部服务</option>
                <option value="external">外部集成</option>
                <option value="bridge">桥接</option>
                <option value="adapter">适配器</option>
                <option value="gateway">网关</option>
              </select>
            </div>

            {/* 列表视图 */}
            {viewMode === 'list' && (
              <div className="bg-[#12121a] border border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d0d14] text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">节点</th>
                      <th className="text-left px-4 py-3 font-medium">类型</th>
                      <th className="text-left px-4 py-3 font-medium">状态</th>
                      <th className="text-left px-4 py-3 font-medium">3D坐标</th>
                      <th className="text-left px-4 py-3 font-medium">协议</th>
                      <th className="text-right px-4 py-3 font-medium">健康</th>
                      <th className="text-left px-4 py-3 font-medium">版本</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtered.map(n => {
                      const typeCfg = TYPE_CONFIG[n.type];
                      const statusCfg = STATUS_CONFIG[n.status];
                      return (
                        <tr
                          key={n.id}
                          onClick={() => setSelectedNode(n)}
                          className="hover:bg-[#1a1a24] transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-white font-medium">{n.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{n.description}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${typeCfg.bg} ${typeCfg.color}`}>
                              {typeCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${statusCfg.color}`}>{statusCfg.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-[var(--sage-400)]">
                              ({n.axisX}, {n.axisY}, {n.axisZ})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{n.protocol}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${healthColor(n.healthScore)}`}>{n.healthScore}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{n.version}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 网格视图 */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-3 gap-4">
                {filtered.map(n => {
                  const typeCfg = TYPE_CONFIG[n.type];
                  const statusCfg = STATUS_CONFIG[n.status];
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className="bg-[#12121a] border border-gray-800 rounded-lg p-4 hover:border-[var(--sage-500)]/50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{n.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${typeCfg.bg} ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{n.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className={statusCfg.color}>{statusCfg.label}</span>
                        <span className={`font-bold ${healthColor(n.healthScore)}`}>{n.healthScore} 健康</span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-500">
                        ({n.axisX}, {n.axisY}, {n.axisZ}) · {n.protocol}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3D坐标视图 */}
            {viewMode === 'axis' && (
              <div className="bg-[#12121a] border border-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div className="p-3 bg-[#0d0d14] rounded">
                    <div className="text-xs text-gray-500">X轴 (前端平台)</div>
                    <div className="text-lg font-bold text-blue-400">{nodes.filter(n => n.axisX > 0).length}</div>
                  </div>
                  <div className="p-3 bg-[#0d0d14] rounded">
                    <div className="text-xs text-gray-500">Y轴 (后端服务)</div>
                    <div className="text-lg font-bold text-purple-400">{nodes.filter(n => n.axisY > 0).length}</div>
                  </div>
                  <div className="p-3 bg-[#0d0d14] rounded">
                    <div className="text-xs text-gray-500">Z轴 (子工具)</div>
                    <div className="text-lg font-bold text-emerald-400">{nodes.filter(n => n.axisZ > 0).length}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {filtered.map(n => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className="flex items-center gap-4 p-3 bg-[#0d0d14] rounded hover:bg-[#1a1a24] cursor-pointer transition-colors"
                    >
                      <div className="w-20 text-xs font-mono text-gray-500">
                        X:{n.axisX} Y:{n.axisY} Z:{n.axisZ}
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{
                        backgroundColor: n.axisX > 0 ? '#60a5fa' : n.axisY > 0 ? '#c084fc' : '#34d399'
                      }} />
                      <div className="flex-1">
                        <span className="text-white text-sm font-medium">{n.name}</span>
                        <span className="text-gray-500 text-xs ml-2">{n.protocol}</span>
                      </div>
                      <span className={`text-xs ${healthColor(n.healthScore)}`}>{n.healthScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 详情面板 */}
          {selectedNode && (
            <div className="w-80 border-l border-gray-800 bg-[#0d0d14] p-6 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">节点详情</h2>
                <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-gray-500">节点ID</span>
                  <p className="text-white text-sm font-mono">{selectedNode.id}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">名称</span>
                  <p className="text-white text-sm">{selectedNode.name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">描述</span>
                  <p className="text-gray-300 text-sm">{selectedNode.description}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">3D坐标</span>
                  <p className="text-[var(--sage-400)] text-sm font-mono">
                    X={selectedNode.axisX}, Y={selectedNode.axisY}, Z={selectedNode.axisZ}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">协议</span>
                  <p className="text-white text-sm">{selectedNode.protocol}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">端点</span>
                  <p className="text-[var(--sage-400)] text-sm font-mono">{selectedNode.endpoint}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">版本</span>
                  <p className="text-white text-sm">{selectedNode.version}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">健康分数</span>
                  <p className={`text-sm font-bold ${healthColor(selectedNode.healthScore)}`}>{selectedNode.healthScore}/100</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">最后心跳</span>
                  <p className="text-white text-sm">{new Date(selectedNode.lastHeartbeat).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">标签</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
