import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff, Trash2,
  Clock, Globe, Lock, AlertTriangle, CheckCircle, Search, Filter,
  ChevronDown, ChevronUp, Activity, User, FileText, Ban, RefreshCw
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { fetchSecurityLogs, fetchSecurityMetrics, fetchSecurityAudit } from '@/api/client';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  targetType: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
  ip?: string;
  userAgent?: string;
}

interface ApiKeyAudit {
  id: string;
  provider: string;
  providerName: string;
  keyShort: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  isValid: boolean | null;
  riskLevel: 'low' | 'medium' | 'high';
  rotationDue: boolean;
}

interface AccessRule {
  id: string;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
  scope: string;
}

const STATUS_ICON = {
  success: <ShieldCheck className="w-4 h-4 text-green-400" />,
  failure: <ShieldAlert className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
};

const STATUS_BG = {
  success: 'bg-green-500/10 border-green-500/20',
  failure: 'bg-red-500/10 border-red-500/20',
  warning: 'bg-yellow-500/10 border-yellow-500/20',
};

const RISK_COLOR = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

export default function SecurityCenter() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [keys, setKeys] = useState<ApiKeyAudit[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'keys' | 'rules'>('logs');
  const [showKeyDetails, setShowKeyDetails] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [logsRes, metricsRes, auditRes] = await Promise.allSettled([
          fetchSecurityLogs(),
          fetchSecurityMetrics(),
          fetchSecurityAudit(),
        ]);
        if (logsRes.status === 'fulfilled') {
          setLogs(logsRes.value?.data || logsRes.value || []);
        }
        if (metricsRes.status === 'fulfilled') {
          const data = metricsRes.value?.data || metricsRes.value || {};
          setKeys(data.keys || []);
        }
        if (auditRes.status === 'fulfilled') {
          const data = auditRes.value?.data || auditRes.value || {};
          setRules(data.rules || []);
        }
      } catch (e: any) {
        setError(e.message || '加载安全数据失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalLogs: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failures: logs.filter(l => l.status === 'failure').length,
    warnings: logs.filter(l => l.status === 'warning').length,
    activeKeys: keys.filter(k => k.isActive).length,
    atRisk: keys.filter(k => k.riskLevel === 'high' || k.rotationDue).length,
    totalRules: rules.length,
    blockedAttempts: logs.filter(l => l.action.includes('UNAUTHORIZED') || l.status === 'failure').length,
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    if (hrs < 24) return `${hrs}小时前`;
    return `${days}天前`;
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-400" />
              安全中心
            </h1>
            <p className="text-gray-500 text-sm mt-1">审计日志、API密钥风险评估、访问权限管理</p>
          </div>
          <div className="flex items-center gap-2">
            {stats.atRisk > 0 && (
              <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.atRisk} 个密钥需要轮换
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Activity className="w-3.5 h-3.5" /> 审计事件</div>
            <div className="text-2xl font-bold text-white">{stats.totalLogs}</div>
            <div className="text-xs text-green-400 mt-1">{stats.success} 成功</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><ShieldAlert className="w-3.5 h-3.5" /> 异常</div>
            <div className="text-2xl font-bold text-white">{stats.failures + stats.warnings}</div>
            <div className="text-xs text-red-400 mt-1">{stats.blockedAttempts} 被拦截</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><KeyRound className="w-3.5 h-3.5" /> 活跃密钥</div>
            <div className="text-2xl font-bold text-white">{stats.activeKeys}</div>
            <div className="text-xs text-yellow-400 mt-1">{stats.atRisk} 待轮换</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Lock className="w-3.5 h-3.5" /> 权限规则</div>
            <div className="text-2xl font-bold text-white">{stats.totalRules}</div>
            <div className="text-xs text-blue-400 mt-1">覆盖 4 种角色</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[#12121a] border border-gray-800 rounded-lg w-fit">
          {[
            { id: 'logs' as const, label: '审计日志', icon: FileText },
            { id: 'keys' as const, label: '密钥审计', icon: KeyRound },
            { id: 'rules' as const, label: '权限规则', icon: Lock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Audit Logs Tab */}
        {activeTab === 'logs' && (
          <>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索审计日志..."
                  className="w-full pl-10 pr-4 py-2 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="success">成功</option>
                <option value="failure">失败</option>
                <option value="warning">警告</option>
              </select>
            </div>

            {/* Logs List */}
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div key={log.id}>
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-gray-700 ${STATUS_BG[log.status]}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="mt-0.5">{STATUS_ICON[log.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-300">{log.actor}</span>
                        <span className="text-xs text-gray-500">{log.action}</span>
                        <span className="text-xs text-blue-400 truncate">{log.target}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{log.details}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[11px] text-gray-600">{timeAgo(log.timestamp)}</div>
                      {expandedLog === log.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                    </div>
                  </div>
                  {expandedLog === log.id && (
                    <div className="mt-1 p-3 bg-[#0a0a0f] border border-gray-800 rounded-lg text-xs text-gray-400 space-y-1 font-mono">
                      <div><span className="text-gray-600">ID:</span> {log.id}</div>
                      <div><span className="text-gray-600">Timestamp:</span> {new Date(log.timestamp).toLocaleString('zh-CN')}</div>
                      <div><span className="text-gray-600">Actor:</span> {log.actor}</div>
                      <div><span className="text-gray-600">Action:</span> {log.action}</div>
                      <div><span className="text-gray-600">Target:</span> {log.target} ({log.targetType})</div>
                      {log.ip && <div><span className="text-gray-600">IP:</span> {log.ip}</div>}
                      {log.userAgent && <div><span className="text-gray-600">UA:</span> {log.userAgent}</div>}
                      <div><span className="text-gray-600">Status:</span> <span className={log.status === 'success' ? 'text-green-400' : log.status === 'failure' ? 'text-red-400' : 'text-yellow-400'}>{log.status.toUpperCase()}</span></div>
                      <div><span className="text-gray-600">Details:</span> {log.details}</div>
                    </div>
                  )}
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>未找到匹配的审计日志</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Keys Audit Tab */}
        {activeTab === 'keys' && (
          <div className="bg-[#12121a] border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">API密钥安全审计</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">风险等级:</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" />低</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-yellow-500" />中</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" />高</span>
              </div>
            </div>
            <div className="divide-y divide-gray-800">
              {keys.map(key => (
                <div key={key.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${key.riskLevel === 'low' ? 'bg-green-500' : key.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium text-white">{key.providerName}</span>
                      <span className="text-xs font-mono text-gray-500">{key.keyShort}</span>
                      {!key.isActive && <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">已停用</span>}
                      {key.rotationDue && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">需轮换</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowKeyDetails(showKeyDetails === key.id ? null : key.id)}
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        {showKeyDetails === key.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />创建于 {new Date(key.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" />使用 {key.usageCount} 次</span>
                    {key.lastUsedAt && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />最后使用 {timeAgo(key.lastUsedAt)}</span>}
                    <span className={`font-medium ${RISK_COLOR[key.riskLevel]}`}>风险: {key.riskLevel === 'low' ? '低' : key.riskLevel === 'medium' ? '中' : '高'}</span>
                  </div>
                  {showKeyDetails === key.id && (
                    <div className="mt-3 p-3 bg-[#0a0a0f] rounded-lg text-xs text-gray-400 space-y-1 font-mono">
                      <div><span className="text-gray-600">Key ID:</span> {key.id}</div>
                      <div><span className="text-gray-600">Provider:</span> {key.provider}</div>
                      <div><span className="text-gray-600">Status:</span> {key.isActive ? 'Active' : 'Inactive'} / {key.isValid === true ? 'Valid' : key.isValid === false ? 'Invalid' : 'Untested'}</div>
                      <div><span className="text-gray-600">Usage:</span> {key.usageCount} calls</div>
                      <div><span className="text-gray-600">Age:</span> {Math.floor((Date.now() - new Date(key.createdAt).getTime()) / 86400000)} days</div>
                      {key.rotationDue && (
                        <div className="text-red-400 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          此密钥已超过 90 天建议轮换周期，请更新密钥以降低泄露风险。
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="bg-[#12121a] border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">访问控制规则</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium p-3">角色</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">资源</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">操作</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">范围</th>
                    <th className="text-left text-xs text-gray-500 font-medium p-3">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-[#0a0a0f] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-white text-xs">{rule.role}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-400">{rule.resource}</td>
                      <td className="p-3 text-xs text-gray-400 font-mono">{rule.action}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{rule.scope}</span>
                      </td>
                      <td className="p-3">
                        {rule.allowed ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" /> 允许
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Ban className="w-3.5 h-3.5" /> 拒绝
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
