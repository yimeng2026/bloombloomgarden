import { useState, useRef } from 'react';
import { useToast } from './ToastProvider';

/**
 * ConfigImportExport — 配置导入/导出面板
 * 支持 JSON 配置导出、拖拽导入、验证与合并
 */
export default function ConfigImportExport() {
  const [exportInclude, setExportInclude] = useState({
    apiKeys: true,
    agents: true,
    settings: true,
    knowledgeBases: false,
    blueprints: true,
  });
  const [importPreview, setImportPreview] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleExport = () => {
    const config: Record<string, any> = {};
    if (exportInclude.apiKeys) config.apiKeys = { /* mock */ providers: ['openai', 'anthropic', 'deepseek'] };
    if (exportInclude.agents) config.agents = { /* mock */ count: 5, templates: ['developer', 'pm'] };
    if (exportInclude.settings) config.settings = { theme: 'dark', language: 'zh-CN' };
    if (exportInclude.knowledgeBases) config.knowledgeBases = { /* mock */ };
    if (exportInclude.blueprints) config.blueprints = { /* mock */ pipelines: 3 };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trg-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.addToast({ type: 'success', title: '配置已导出', message: 'trg-config-xxx.json 已下载' });
  };

  const handleFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.addToast({ type: 'error', title: '格式错误', message: '仅支持 .json 文件' });
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setImportPreview(data);
        toast.addToast({ type: 'success', title: '配置已读取', message: '预览后点击导入即可应用' });
      } catch {
        toast.addToast({ type: 'error', title: '解析失败', message: '无效的 JSON 格式' });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importPreview) return;
    // 模拟导入成功
    toast.addToast({ type: 'success', title: '配置导入成功', message: `${Object.keys(importPreview).length} 项配置已合并` });
    setImportPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* 导出 */}
      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">📤 导出配置</h4>
        <div className="space-y-2 mb-4">
          {Object.entries(exportInclude).map(([key, checked]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setExportInclude(prev => ({ ...prev, [key]: e.target.checked }))}
                className="accent-indigo-500 w-4 h-4"
              />
              <span className="text-sm text-gray-400 capitalize">
                {key === 'apiKeys' ? 'API Keys' : key === 'knowledgeBases' ? '知识库' : key === 'blueprints' ? '蓝图编排' : key}
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          导出为 JSON
        </button>
      </div>

      {/* 导入 */}
      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">📥 导入配置</h4>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-sm text-gray-400">拖拽 .json 文件到此处，或点击上传</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {importPreview && (
          <div className="mt-4">
            <div className="bg-[#0a0a0f] rounded-lg p-3 mb-3 max-h-[200px] overflow-y-auto">
              <pre className="text-xs text-gray-400">{JSON.stringify(importPreview, null, 2)}</pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
              >
                确认导入
              </button>
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
