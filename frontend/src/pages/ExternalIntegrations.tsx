import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchExternalIntegrations, fetchExternalStats } from '@/api/client';

interface ExternalPlatform {
  id: string;
  name: string;
  category: 'social' | 'dev' | 'cloud' | 'ai' | 'storage' | 'comm';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  icon: string;
  description: string;
  endpoint?: string;
  lastSync?: string;
  features: string[];
  configFields: { key: string; label: string; type: string; required: boolean }[];
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  social: { label: '社交媒体', icon: '🌐' },
  dev: { label: '开发工具', icon: '💻' },
  cloud: { label: '云服务', icon: '☁️' },
  ai: { label: 'AI平台', icon: '🧠' },
  storage: { label: '存储', icon: '💾' },
  comm: { label: '通讯', icon: '📡' }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: '已连接', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  disconnected: { label: '未连接', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  error: { label: '错误', color: 'text-red-400', bg: 'bg-red-500/10' },
  pending: { label: '配置中', color: 'text-amber-400', bg: 'bg-amber-500/10' }
};

export default function ExternalIntegrations() {
  const [platforms, setPlatforms] = useState<ExternalPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<ExternalPlatform | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [intRes, stRes] = await Promise.allSettled([
          fetchExternalIntegrations(),
          fetchExternalStats(),
        ]);
        if (intRes.status === 'fulfilled' && intRes.value?.data) {
          setPlatforms(Array.isArray(intRes.value.data) ? intRes.value.data : []);
        }
      } catch (e: any) {
        setError(e.message || '加载外部集成数据失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = categoryFilter === 'all'
    ? platforms
    : platforms.filter(p => p.category === categoryFilter);

  const handleTestConnection = async () => {
    if (!selectedPlatform) return;
    setIsTesting(true);
    try {
      const res = await fetch('/api/external/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: selectedPlatform.id, config: configValues })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.data?.success) {
        alert('连接测试通过！API响应正常。');
      } else {
        alert(`连接测试失败: ${data.data?.error || '未知错误'}`);
      }
    } catch (e) {
      alert('连接测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedPlatform) return;
    try {
      const res = await fetch(`/api/external/${selectedPlatform.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configValues)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('配置已保存');
      setSelectedPlatform(null);
    } catch (e) {
      alert('配置保存失败');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">外部平台集成</h1>
            <p className="text-gray-500 text-sm">第三方平台连接与统一消息桥接</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400">● 已连接 {platforms.filter(p => p.status === 'connected').length}</span>
            <span className="text-gray-400">● 未连接 {platforms.filter(p => p.status === 'disconnected').length}</span>
            <span className="text-red-400">● 异常 {platforms.filter(p => p.status === 'error').length}</span>
          </div>
        </div>

        {/* 类别筛选 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              categoryFilter === 'all'
                ? 'bg-[var(--sage-600)] text-white'
                : 'bg-[#12121a] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            全部
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                categoryFilter === key
                  ? 'bg-[var(--sage-600)] text-white'
                  : 'bg-[#12121a] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>

        {/* 平台卡片网格 */}
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => {
            const status = STATUS_CONFIG[p.status];
            const cat = CATEGORY_LABELS[p.category];
            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPlatform(p);
                  setConfigValues({});
                }}
                className="bg-[#12121a] border border-gray-800 rounded-lg p-4 hover:border-[var(--sage-500)]/50 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <h3 className="text-white font-medium">{p.name}</h3>
                      <span className="text-xs text-gray-500">{cat.icon} {cat.label}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{p.description}</p>
                {p.endpoint && (
                  <p className="text-xs text-[var(--sage-500)] mb-2 font-mono truncate">{p.endpoint}</p>
                )}
                {p.lastSync && (
                  <p className="text-xs text-gray-500 mb-3">
                    最后同步: {new Date(p.lastSync).toLocaleString('zh-CN')}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {p.features.map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 配置弹窗 */}
        {selectedPlatform && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121a] border border-gray-800 rounded-lg p-6 w-[480px] max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedPlatform.icon}</span>
                  <div>
                    <h2 className="text-white font-bold">{selectedPlatform.name} 配置</h2>
                    <p className="text-gray-500 text-sm">{selectedPlatform.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlatform(null)}
                  className="text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedPlatform.configFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm text-gray-400 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={configValues[field.key] || ''}
                      onChange={e => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={`输入${field.label}...`}
                      className="w-full px-3 py-2 bg-[#0d0d14] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--sage-500)]"
                    />
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex-1 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isTesting ? '测试中...' : '🔌 测试连接'}
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg transition-colors"
                  >
                    💾 保存配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
