import React, { useState, useEffect, useCallback } from 'react';
import { axisClient } from '../axis-migration';

interface ExternalPlatform {
  id: string;
  name: string;
  category: 'ai' | 'code' | 'search' | 'database' | 'office' | 'payment';
  icon: string;
  status: 'connected' | 'not_configured' | 'disconnected' | 'error';
  lastCallAt?: string;
  callCount?: number;
  avgResponseTime?: number;
  errorRate?: number;
  config?: PlatformConfig;
}

interface PlatformConfig {
  authType: 'apikey' | 'oauth' | 'bearer' | 'none';
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  retryCount?: number;
  proxy?: string;
}

const categories = [
  { key: 'all', label: '全部' },
  { key: 'ai', label: 'AI模型' },
  { key: 'code', label: '代码仓库' },
  { key: 'search', label: '搜索/数据库' },
  { key: 'office', label: '办公/通讯' },
  { key: 'payment', label: '支付' },
];

export const IntegrationManager: React.FC = () => {
  const [platforms, setPlatforms] = useState<ExternalPlatform[]>([]);
  const [filteredCategory, setFilteredCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState<ExternalPlatform | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState<PlatformConfig>({
    authType: 'apikey',
    timeout: 30,
    retryCount: 3,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axisClient.send(
        { x: 'web', y: 'platform', z: 'rest' },
        'read', 'platform',
        { type: 'external' }
      );
      setPlatforms(res.data?.platforms || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlatforms(); }, [loadPlatforms]);

  const filteredPlatforms = filteredCategory === 'all'
    ? platforms
    : platforms.filter(p => p.category === filteredCategory);

  const openConfig = (platform: ExternalPlatform) => {
    setSelectedPlatform(platform);
    setConfigForm(platform.config || { authType: 'apikey', timeout: 30, retryCount: 3 });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedPlatform) return;
    try {
      setLoading(true);
      await axisClient.send(
        { x: 'web', y: 'platform', z: 'rest' },
        'update', 'platform',
        { id: selectedPlatform.id, config: configForm }
      );
      await loadPlatforms();
      setIsConfigOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedPlatform) return;
    try {
      setLoading(true);
      const res = await axisClient.send(
        { x: 'web', y: 'platform', z: 'rest' },
        'invoke', 'platform',
        { id: selectedPlatform.id, action: 'health' }
      );
      alert(res.data?.healthy ? '连接成功' : '连接失败');
    } catch (err) {
      alert('测试失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlatform = async (platformId: string, enable: boolean) => {
    try {
      await axisClient.send(
        { x: 'web', y: 'platform', z: 'rest' },
        'update', 'platform',
        { id: platformId, enabled: enable }
      );
      await loadPlatforms();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#52c41a';
      case 'not_configured': return '#d9d9d9';
      case 'disconnected': return '#f5222d';
      case 'error': return '#faad14';
      default: return '#d9d9d9';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '已连接';
      case 'not_configured': return '未配置';
      case 'disconnected': return '已断开';
      case 'error': return '异常';
      default: return '未知';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>外部集成管理</h1>
        <span style={{ color: '#666', fontSize: '14px' }}>
          已连接 {platforms.filter(p => p.status === 'connected').length} / {platforms.length}
        </span>
      </div>

      {error && (
        <div style={{ padding: '10px', background: '#fff1f0', color: '#f5222d', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* 分类过滤 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilteredCategory(cat.key)}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: '4px',
              background: filteredCategory === cat.key ? '#4a90e2' : '#f0f0f0',
              color: filteredCategory === cat.key ? '#fff' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#666', padding: '20px' }}>加载中...</div>}

      {/* 平台卡片网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredPlatforms.map(platform => (
          <div key={platform.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {platform.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{platform.name}</div>
                  <div style={{
                    fontSize: '12px',
                    color: getStatusColor(platform.status),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getStatusColor(platform.status),
                      display: 'inline-block',
                    }} />
                    {getStatusText(platform.status)}
                  </div>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                <input
                  type="checkbox"
                  checked={platform.status === 'connected'}
                  onChange={(e) => handleTogglePlatform(platform.id, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: platform.status === 'connected' ? '#52c41a' : '#ccc',
                  borderRadius: '20px',
                  transition: '0.3s',
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '16px',
                    width: '16px',
                    left: platform.status === 'connected' ? '18px' : '2px',
                    bottom: '2px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: '0.3s',
                  }} />
                </span>
              </label>
            </div>

            {/* 统计信息 */}
            {platform.status === 'connected' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#666' }}>
                <div>调用: {platform.callCount || 0} 次</div>
                <div>响应: {platform.avgResponseTime || 0}ms</div>
                <div>错误率: {((platform.errorRate || 0) * 100).toFixed(2)}%</div>
                <div>上次: {platform.lastCallAt ? new Date(platform.lastCallAt).toLocaleTimeString() : 'N/A'}</div>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => openConfig(platform)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ⚙️ 配置
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await axisClient.send(
                      { x: 'web', y: 'platform', z: 'rest' },
                      'invoke', 'platform',
                      { id: platform.id, action: 'health' }
                    );
                    alert(res.data?.healthy ? '连接正常' : '连接异常');
                  } catch (err) {
                    alert('测试失败');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                🔍 测试
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 配置弹窗 */}
      {isConfigOpen && selectedPlatform && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>配置 {selectedPlatform.name}</h2>
              <button onClick={() => setIsConfigOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>认证方式</label>
                <select
                  value={configForm.authType}
                  onChange={e => setConfigForm({ ...configForm, authType: e.target.value as any })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="apikey">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="none">无需认证</option>
                </select>
              </div>

              {configForm.authType === 'apikey' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>API Key</label>
                  <input
                    type="password"
                    value={configForm.apiKey || ''}
                    onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    placeholder="输入 API Key"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
              )}

              {configForm.authType === 'oauth' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Client ID</label>
                    <input
                      type="text"
                      value={configForm.apiKey || ''}
                      onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Client Secret</label>
                    <input
                      type="password"
                      value={configForm.apiSecret || ''}
                      onChange={e => setConfigForm({ ...configForm, apiSecret: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                </>
              )}

              {configForm.authType === 'bearer' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Token</label>
                  <input
                    type="password"
                    value={configForm.apiKey || ''}
                    onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
              )}

              {/* AI模型特有配置 */}
              {selectedPlatform.category === 'ai' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>模型选择</label>
                  <select
                    value={configForm.model || ''}
                    onChange={e => setConfigForm({ ...configForm, model: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                  >
                    {selectedPlatform.id === 'kimi' && (
                      <>
                        <option value="moonshot-v1-8k">Moonshot v1 8k</option>
                        <option value="moonshot-v1-32k">Moonshot v1 32k</option>
                        <option value="moonshot-v1-128k">Moonshot v1 128k</option>
                      </>
                    )}
                    {selectedPlatform.id === 'openai' && (
                      <>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {selectedPlatform.id === 'claude' && (
                      <>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku">Claude 3 Haiku</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Base URL（可选）</label>
                <input
                  type="text"
                  value={configForm.baseUrl || ''}
                  onChange={e => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>超时时间（秒）</label>
                  <input
                    type="number"
                    value={configForm.timeout || 30}
                    onChange={e => setConfigForm({ ...configForm, timeout: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>重试次数</label>
                  <input
                    type="number"
                    value={configForm.retryCount || 3}
                    onChange={e => setConfigForm({ ...configForm, retryCount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>代理（可选）</label>
                <input
                  type="text"
                  value={configForm.proxy || ''}
                  onChange={e => setConfigForm({ ...configForm, proxy: e.target.value })}
                  placeholder="http://proxy.example.com:8080"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleTestConnection}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔍 测试连接
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setIsConfigOpen(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#4a90e2',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                保存并启用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationManager;
