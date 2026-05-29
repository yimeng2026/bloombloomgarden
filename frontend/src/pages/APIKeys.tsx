import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Eye, EyeOff, Globe, Bot, ChevronDown, ChevronUp, Search, Shield,
  Activity, Server, Cpu, Lock, Zap
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface ProviderConfig {
  id: string;
  name: string;
  category: string;
  defaultModel: string;
  availableModels: string[];
  baseUrl: string;
  authType: string;
  supportsVision: boolean;
  supportsFunctions: boolean;
  requiresUserAgent?: boolean;
}

interface StoredKey {
  id: string;
  provider: string;
  providerName: string;
  displayName: string;
  maskedKey: string;
  baseUrl?: string;
  isActive: boolean;
  isValid: boolean | null;
  lastTestedAt: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  commercial: <Globe className="w-4 h-4 text-blue-400" />,
  open_source: <Bot className="w-4 h-4 text-green-400" />,
  local: <Server className="w-4 h-4 text-purple-400" />,
  aggregator: <Cpu className="w-4 h-4 text-orange-400" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  commercial: '商用',
  open_source: '开源',
  local: '本地',
  aggregator: '聚合',
};

export default function APIKeysPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [bulkTesting, setBulkTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [providersRes, keysRes] = await Promise.all([
        fetch('/api/apikeys/providers'),
        fetch('/api/apikeys'),
      ]);
      const providersData = await providersRes.json();
      const keysData = await keysRes.json();
      if (providersData.success) setProviders(providersData.data);
      if (keysData.success) setKeys(keysData.data);
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 保存密钥
  const saveKey = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) {
      setError('请选择提供商并输入 API Key');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKeyInput.trim(),
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('密钥保存成功');
        setApiKeyInput('');
        setSelectedProvider('');
        setShowAdd(false);
        await loadData();
        // 自动测试
        await testKey(data.data.id);
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 测试密钥
  const testKey = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/apikeys/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setKeys(prev => prev.map(k =>
          k.id === id
            ? { ...k, isValid: data.data.success, lastTestedAt: new Date().toISOString(), latencyMs: data.data.latencyMs, errorMessage: data.data.success ? null : data.data.message }
            : k
        ));
        if (data.data.success) {
          setSuccess(`测试通过 — ${data.data.latencyMs}ms`);
        } else {
          setError(`测试失败: ${data.data.message}`);
        }
      }
    } catch (err: any) {
      setError(`测试出错: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  // 批量测试
  const testAll = async () => {
    setBulkTesting(true);
    try {
      const res = await fetch('/api/apikeys/test-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // 刷新列表
        await loadData();
        const passed = data.data.filter((r: any) => r.success).length;
        const failed = data.data.length - passed;
        setSuccess(`批量测试完成 — ${passed} 通过, ${failed} 失败`);
      }
    } catch (err: any) {
      setError(`批量测试出错: ${err.message}`);
    } finally {
      setBulkTesting(false);
    }
  };

  // 删除密钥
  const deleteKey = async (id: string) => {
    if (!confirm('确定删除此密钥？')) return;
    try {
      const res = await fetch(`/api/apikeys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('密钥已删除');
        await loadData();
      }
    } catch (err: any) {
      setError(`删除失败: ${err.message}`);
    }
  };

  // 切换激活
  const toggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/apikeys/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setKeys(prev => prev.map(k =>
          k.id === id ? { ...k, isActive: !k.isActive } : k
        ));
      }
    } catch (err) {
      setError('切换状态失败');
    }
  };

  const filteredKeys = keys.filter(k =>
    k.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProviders = providers.filter(p =>
    !keys.some(k => k.provider === p.id)
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-yellow-400" />
              API 密钥管理
            </h1>
            <p className="text-gray-500 text-sm mt-1">选择提供商 → 填写密钥 → 一键测试 → 直接使用</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={testAll}
              disabled={bulkTesting || keys.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-white text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${bulkTesting ? 'animate-spin' : ''}`} />
              {bulkTesting ? '批量测试中...' : '批量测试'}
            </button>
            <button
              onClick={() => { setShowAdd(!showAdd); setError(null); setSuccess(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加密钥
            </button>
          </div>
        </div>

        {/* 提示信息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* 添加表单 */}
        {showAdd && (
          <div className="mb-6 bg-[#12121a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              添加新密钥
            </h3>
            <div className="space-y-4">
              {/* 提供商选择 */}
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">选择提供商</label>
                {filteredProviders.length === 0 ? (
                  <p className="text-gray-600 text-sm">所有支持的提供商都已配置密钥</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProviders.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProvider(p.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          selectedProvider === p.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-800 hover:border-gray-700 hover:bg-gray-800/30'
                        }`}
                      >
                        <div className="mt-0.5">{CATEGORY_ICONS[p.category] || <Globe className="w-4 h-4 text-gray-400" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm text-gray-200">{p.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">{CATEGORY_LABELS[p.category] || p.category}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">默认模型: {p.defaultModel}</p>
                          <div className="flex gap-1.5 mt-1">
                            {p.supportsVision && <span className="text-[10px] text-purple-400">👁 视觉</span>}
                            {p.supportsFunctions && <span className="text-[10px] text-green-400">🔧 工具</span>}
                            {p.requiresUserAgent && <span className="text-[10px] text-yellow-400">⚠️ UA</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* API Key 输入 */}
              {selectedProvider && (
                <>
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">
                      输入 API Key
                      {providers.find(p => p.id === selectedProvider)?.requiresUserAgent && (
                        <span className="text-yellow-400 text-xs ml-2">（此平台需要特殊 User-Agent，系统已自动处理）</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        placeholder={`${providers.find(p => p.id === selectedProvider)?.name} API Key...`}
                        className="w-full bg-[#0a0a0f] border border-gray-800 rounded-lg px-4 py-3 pr-12 text-sm text-gray-200 placeholder-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                      密钥将使用 AES-256-GCM 加密存储，仅用于调用 LLM API
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveKey}
                      disabled={!apiKeyInput.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      保存并自动测试
                    </button>
                    <button
                      onClick={() => { setShowAdd(false); setSelectedProvider(''); setApiKeyInput(''); setError(null); }}
                      className="px-4 py-2.5 border border-gray-800 rounded-lg text-gray-400 hover:bg-gray-800 text-sm transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 搜索和统计 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1 bg-[#12121a] border border-gray-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索提供商或密钥..."
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-700 outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> {keys.filter(k => k.isValid === true).length} 正常</span>
            <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" /> {keys.filter(k => k.isValid === false).length} 异常</span>
            <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-400" /> {keys.filter(k => k.isValid === null).length} 未测</span>
          </div>
        </div>

        {/* 密钥列表 */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>加载中...</p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-20 text-gray-600 bg-[#12121a] border border-gray-800 rounded-xl">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无密钥</p>
            <p className="text-sm mt-1">点击右上角「添加密钥」开始配置</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKeys.map(key => {
              const isExpanded = expandedKey === key.id;
              return (
                <div
                  key={key.id}
                  className={`bg-[#12121a] border rounded-xl overflow-hidden transition-all ${
                    key.isValid === false ? 'border-red-800/50' :
                    key.isValid === true ? 'border-green-800/50' :
                    'border-gray-800'
                  }`}
                >
                  {/* 主行 */}
                  <div className="flex items-center gap-4 p-4">
                    {/* 状态指示 */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0">
                      {key.isValid === true && <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />}
                      {key.isValid === false && <div className="w-full h-full rounded-full bg-red-400" />}
                      {key.isValid === null && <div className="w-full h-full rounded-full bg-gray-600" />}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-200">{key.displayName}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded">{key.provider}</span>
                        {!key.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-600 rounded">已停用</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Key className="w-3 h-3" /> {key.maskedKey}</span>
                        {key.latencyMs && <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {key.latencyMs}ms</span>}
                        {key.lastTestedAt && (
                          <span>测试于 {new Date(key.lastTestedAt).toLocaleString('zh-CN')}</span>
                        )}
                      </div>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testKey(key.id)}
                        disabled={testing === key.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${testing === key.id ? 'animate-spin' : ''}`} />
                        {testing === key.id ? '测试中' : '测试'}
                      </button>

                      <button
                        onClick={() => toggleActive(key.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          key.isActive
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                        }`}
                      >
                        {key.isActive ? '已启用' : '已停用'}
                      </button>

                      <button
                        onClick={() => setExpandedKey(isExpanded ? null : key.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => deleteKey(key.id)}
                        className="p-1.5 text-red-400/50 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
                      {key.errorMessage && (
                        <div className="mb-3 p-2.5 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {key.errorMessage}
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-0.5">提供商 ID</p>
                          <p className="text-gray-400 font-mono">{key.provider}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">状态</p>
                          <p className={key.isValid === true ? 'text-green-400' : key.isValid === false ? 'text-red-400' : 'text-gray-500'}>
                            {key.isValid === true ? '连通正常' : key.isValid === false ? '连通异常' : '未测试'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">最后测试</p>
                          <p className="text-gray-400">{key.lastTestedAt ? new Date(key.lastTestedAt).toLocaleString('zh-CN') : '从未'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">延迟</p>
                          <p className="text-gray-400">{key.latencyMs ? `${key.latencyMs}ms` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
