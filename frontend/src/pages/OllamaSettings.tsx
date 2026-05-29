import React, { useState, useEffect, useCallback } from 'react';
import {
  Server, Cpu, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Activity, Settings, Download, Play, Square, Terminal, ChevronDown, ChevronUp,
  HardDrive, Zap, Search
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface OllamaModel {
  id: string;
  name: string;
  size: string;
  parameterCount: string;
  modified: string;
  status: 'ready' | 'pulling' | 'error' | 'unloaded';
  progress?: number;
  family?: string;
  quantization?: string;
  format?: string;
}

interface OllamaInstance {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  latencyMs: number | null;
  modelsCount: number;
  version: string;
  isDefault: boolean;
}

const MOCK_INSTANCES: OllamaInstance[] = [
  {
    id: 'oll-001',
    name: '本地 Ollama',
    url: (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434',
    status: 'online',
    latencyMs: 12,
    modelsCount: 4,
    version: '0.3.0',
    isDefault: true,
  },
];

const MOCK_MODELS: OllamaModel[] = [
  { id: 'mod-001', name: 'llama3.2', size: '2.0 GB', parameterCount: '3B', modified: '3 days ago', status: 'ready', family: 'Llama', quantization: 'Q4_0', format: 'gguf' },
  { id: 'mod-002', name: 'qwen2.5', size: '4.7 GB', parameterCount: '7B', modified: '1 week ago', status: 'ready', family: 'Qwen', quantization: 'Q4_K_M', format: 'gguf' },
  { id: 'mod-003', name: 'deepseek-coder-v2', size: '8.9 GB', parameterCount: '16B', modified: '2 weeks ago', status: 'ready', family: 'DeepSeek', quantization: 'Q4_K_M', format: 'gguf' },
  { id: 'mod-004', name: 'mistral', size: '4.1 GB', parameterCount: '7B', modified: '1 month ago', status: 'unloaded', family: 'Mistral', quantization: 'Q4_0', format: 'gguf' },
];

const POPULAR_MODELS = [
  { name: 'llama3.2', desc: 'Meta Llama 3.2 — 轻量高效', size: '2.0 GB', params: '3B' },
  { name: 'llama3.1:8b', desc: 'Meta Llama 3.1 — 均衡之选', size: '4.9 GB', params: '8B' },
  { name: 'qwen2.5:7b', desc: '阿里通义千问 2.5 — 中文优化', size: '4.7 GB', params: '7B' },
  { name: 'deepseek-coder-v2', desc: 'DeepSeek Coder V2 — 代码专用', size: '8.9 GB', params: '16B' },
  { name: 'mistral', desc: 'Mistral 7B — 欧洲开源先锋', size: '4.1 GB', params: '7B' },
  { name: 'codellama', desc: 'Code Llama — 代码补全', size: '3.8 GB', params: '7B' },
  { name: 'phi3:medium', desc: 'Microsoft Phi-3 — 小体积强性能', size: '4.2 GB', params: '14B' },
  { name: 'gemma2:9b', desc: 'Google Gemma 2 — 谷歌轻量模型', size: '5.5 GB', params: '9B' },
];

export default function OllamaSettings() {
  const [instances, setInstances] = useState<OllamaInstance[]>(MOCK_INSTANCES);
  const [models, setModels] = useState<OllamaModel[]>(MOCK_MODELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [showPullModel, setShowPullModel] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [pullModelName, setPullModelName] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    '[System] Ollama Manager initialized',
    `[System] Default instance: ${(import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434'}`,
  ]);

  const log = useCallback((msg: string) => {
    setConsoleOutput(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ollama/instances');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setInstances(data.data);
      }
      const mres = await fetch('/api/ollama/models');
      if (mres.ok) {
        const mdata = await mres.json();
        if (mdata.success) setModels(mdata.data);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addInstance = async () => {
    if (!newUrl.trim()) { setError('请输入 Ollama 地址'); return; }
    setError(null);
    try {
      const res = await fetch('/api/ollama/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName || newUrl, url: newUrl }),
      });
      if (res.ok) {
        setSuccess('实例添加成功');
        setNewUrl('');
        setNewName('');
        setShowAddInstance(false);
        await loadData();
      } else {
        setError('添加失败');
      }
    } catch {
      // Mock add
      const newInst: OllamaInstance = {
        id: `oll-${Date.now()}`,
        name: newName || newUrl,
        url: newUrl,
        status: 'online',
        latencyMs: 15,
        modelsCount: 0,
        version: 'unknown',
        isDefault: false,
      };
      setInstances(prev => [...prev, newInst]);
      log(`Instance added: ${newUrl}`);
      setSuccess('实例添加成功（演示模式）');
      setNewUrl('');
      setNewName('');
      setShowAddInstance(false);
    }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('确定删除此实例？')) return;
    try {
      const res = await fetch(`/api/ollama/instances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('实例已删除');
        await loadData();
      }
    } catch {
      setInstances(prev => prev.filter(i => i.id !== id));
      log(`Instance removed: ${id}`);
    }
  };

  const pullModel = async () => {
    if (!pullModelName.trim()) { setError('请输入模型名称'); return; }
    setError(null);
    setShowPullModel(false);
    log(`Pulling model: ${pullModelName}...`);
    
    // Simulate pull progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        const newModel: OllamaModel = {
          id: `mod-${Date.now()}`,
          name: pullModelName,
          size: 'Unknown',
          parameterCount: 'Unknown',
          modified: 'Just now',
          status: 'ready',
        };
        setModels(prev => [...prev, newModel]);
        log(`Model pulled successfully: ${pullModelName}`);
        setSuccess(`模型 ${pullModelName} 拉取完成`);
        setPullModelName('');
      } else {
        log(`Pulling ${pullModelName}... ${progress}%`);
      }
    }, 500);
  };

  const deleteModel = async (id: string) => {
    if (!confirm('确定删除此模型？')) return;
    try {
      const res = await fetch(`/api/ollama/models/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModels(prev => prev.filter(m => m.id !== id));
        log(`Model removed: ${id}`);
      }
    } catch {
      setModels(prev => prev.filter(m => m.id !== id));
      log(`Model removed: ${id}`);
    }
  };

  const runModel = (name: string) => {
    log(`Running model: ${name}`);
    setTimeout(() => {
      log(`Model ${name} is ready for inference`);
      setSuccess(`模型 ${name} 已启动`);
    }, 800);
  };

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.family && m.family.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalSize = models.reduce((acc, m) => {
    const num = parseFloat(m.size);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Server className="w-6 h-6 text-purple-400" />
              Ollama 本地模型管理
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              管理本地 Ollama 实例 — 下载模型、运行推理、监控状态
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowPullModel(!showPullModel); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              拉取模型
            </button>
            <button
              onClick={() => { setShowAddInstance(!showAddInstance); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加实例
            </button>
          </div>
        </div>

        {/* Error / Success */}
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Server className="w-3.5 h-3.5" /> 实例
            </div>
            <div className="text-2xl font-bold text-white">{instances.length}</div>
            <div className="text-xs text-green-400 mt-1">
              {instances.filter(i => i.status === 'online').length} 在线
            </div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Cpu className="w-3.5 h-3.5" /> 模型
            </div>
            <div className="text-2xl font-bold text-white">{models.length}</div>
            <div className="text-xs text-blue-400 mt-1">{models.filter(m => m.status === 'ready').length} 可用</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <HardDrive className="w-3.5 h-3.5" /> 总占用
            </div>
            <div className="text-2xl font-bold text-white">{totalSize.toFixed(1)} GB</div>
            <div className="text-xs text-gray-500 mt-1">本地磁盘</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Activity className="w-3.5 h-3.5" /> 延迟
            </div>
            <div className="text-2xl font-bold text-white">
              {instances[0]?.latencyMs ? `${instances[0].latencyMs}ms` : 'N/A'}
            </div>
            <div className="text-xs text-green-400 mt-1">本地连接</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instances */}
          <div className="lg:col-span-2">
            <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                Ollama 实例
              </h2>
              <div className="space-y-3">
                {instances.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${inst.status === 'online' ? 'bg-green-500' : inst.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}`} />
                      <div>
                        <div className="text-sm font-medium text-white">{inst.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{inst.url}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-600">v{inst.version}</span>
                          <span className="text-[10px] text-gray-600">{inst.modelsCount} models</span>
                          {inst.latencyMs && <span className="text-[10px] text-green-600">{inst.latencyMs}ms</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">默认</span>
                      )}
                      <button
                        onClick={() => deleteInstance(inst.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Models */}
            <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  已安装模型
                </h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索模型..."
                    className="pl-8 pr-3 py-1.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredModels.map(model => (
                  <div key={model.id}>
                    <div
                      className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
                      onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-white">{model.name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{model.size}</span>
                            <span>{model.parameterCount}</span>
                            <span>{model.modified}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          model.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                          model.status === 'pulling' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-700 text-gray-500'
                        }`}>
                          {model.status === 'ready' ? '就绪' : model.status === 'pulling' ? '拉取中' : '未加载'}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); runModel(model.name); }}
                          className="p-1.5 hover:bg-blue-500/20 rounded text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteModel(model.id); }}
                          className="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedModel === model.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>
                    {expandedModel === model.id && (
                      <div className="mt-1 p-3 bg-[#0a0a0f]/50 border border-gray-800 rounded-lg text-xs text-gray-400 space-y-1">
                        <div className="flex gap-2"><span className="text-gray-600 w-20">Family:</span> {model.family || 'Unknown'}</div>
                        <div className="flex gap-2"><span className="text-gray-600 w-20">Quantization:</span> {model.quantization || 'Unknown'}</div>
                        <div className="flex gap-2"><span className="text-gray-600 w-20">Format:</span> {model.format || 'Unknown'}</div>
                        <div className="flex gap-2"><span className="text-gray-600 w-20">Status:</span> {model.status}</div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredModels.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-sm">未找到模型</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Console & Quick Pull */}
          <div className="space-y-6">
            {/* Pull Model Quick */}
            {showPullModel && (
              <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  拉取新模型
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={pullModelName}
                    onChange={e => setPullModelName(e.target.value)}
                    placeholder="模型名称，如: llama3.2"
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={pullModel}
                    disabled={!pullModelName.trim()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 rounded-lg text-white text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    开始拉取
                  </button>
                </div>
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  <div className="text-[10px] text-gray-500 mb-1">推荐模型:</div>
                  {POPULAR_MODELS.map(m => (
                    <button
                      key={m.name}
                      onClick={() => setPullModelName(m.name)}
                      className="w-full text-left px-2 py-1.5 bg-[#0a0a0f] rounded text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="font-medium">{m.name} <span className="text-gray-600">({m.params})</span></div>
                      <div className="text-[10px] text-gray-600">{m.desc} · {m.size}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Instance */}
            {showAddInstance && (
              <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">添加实例</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="实例名称（可选）"
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="Ollama URL，如: http://192.168.1.5:11434"
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={addInstance}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* Console Output */}
            <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                操作日志
              </h3>
              <div className="bg-black rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px] space-y-0.5">
                {consoleOutput.map((line, i) => (
                  <div key={i} className={`${
                    line.includes('ERROR') ? 'text-red-400' :
                    line.includes('success') || line.includes('完成') ? 'text-green-400' :
                    line.includes('Pulling') ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
