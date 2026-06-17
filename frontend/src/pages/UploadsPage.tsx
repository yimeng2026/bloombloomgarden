import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, File, X, Loader2, CheckCircle, AlertCircle, AlertTriangle,
  FolderOpen, Search, Filter, Grid, List, Link as LinkIcon,
  Database, Trash2, RefreshCw, ChevronDown, ChevronRight,
  FileText, Image, Code, Music, Video, Archive, FileSpreadsheet
} from 'lucide-react';
import { fetchKnowledgeBases, uploadFile } from '@/api/client';

// ===================== 类型定义 =====================
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  uploadedAt: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  errorMessage?: string;
  extractedText?: string;
  metadata?: Record<string, any>;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
}

// ===================== 工具函数 =====================
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-purple-400" />;
  if (type.startsWith('video/')) return <Video className="w-5 h-5 text-red-400" />;
  if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-400" />;
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="w-5 h-5 text-yellow-400" />;
  if (type.includes('csv') || type.includes('excel') || type.includes('sheet')) return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
  if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.includes('html') || type.includes('css')) return <Code className="w-5 h-5 text-blue-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

// ===================== Mock data =====================
// Removed: MOCK_KB and MOCK_FILES — now loaded from real APIs

// ===================== 主组件 =====================
export default function UploadsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKb, setSelectedKb] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showKbSelector, setShowKbSelector] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // 加载真实知识库列表
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchKnowledgeBases()
      .then((res: any) => {
        if (!cancelled) {
          const data = res.data || res;
          setKbs(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError('加载知识库失败: ' + (err.message || '未知错误'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // 注意：client.ts 中暂无 fetchUploads / fetchFiles API，文件列表保持为空
  // 等后端提供 /uploads GET 接口后，可在此添加第二个 useEffect 加载文件列表

  // ===================== 拖拽处理 =====================
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...droppedFiles]);
      setShowKbSelector(true);
    }
  }, []);

  // ===================== 文件上传逻辑 =====================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setPendingFiles(prev => [...prev, ...selected]);
      setShowKbSelector(true);
    }
  };

  const confirmUpload = (kbId: string) => {
    const kb = kbs.find(k => k.id === kbId);
    const newFiles: UploadedFile[] = pendingFiles.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date().toLocaleString('zh-CN'),
      knowledgeBaseId: kbId,
      knowledgeBaseName: kb?.name,
    }));

    setFiles(prev => [...newFiles, ...prev]);
    setPendingFiles([]);
    setShowKbSelector(false);

    // 模拟上传进度
    newFiles.forEach(file => {
      simulateUploadProgress(file.id);
    });
  };

  const simulateUploadProgress = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            return { ...f, progress: 100, status: 'processing' };
          }
          return f;
        }));
        // 模拟处理完成
        setTimeout(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === fileId) {
              return { ...f, status: 'completed' };
            }
            return f;
          }));
        }, 2000);
      } else {
        setFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            return { ...f, progress };
          }
          return f;
        }));
      }
    }, 500);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryFile = (fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, status: 'uploading', progress: 0, errorMessage: undefined };
      }
      return f;
    }));
    simulateUploadProgress(fileId);
  };

  // ===================== 过滤与搜索 =====================
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKb = !selectedKb || file.knowledgeBaseId === selectedKb;
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
    return matchesSearch && matchesKb && matchesStatus;
  });

  const stats = {
    total: files.length,
    uploading: files.filter(f => f.status === 'uploading').length,
    processing: files.filter(f => f.status === 'processing').length,
    completed: files.filter(f => f.status === 'completed').length,
    error: files.filter(f => f.status === 'error').length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };

  // ===================== 渲染 =====================
  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-gray-100 p-6"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-blue-400 m-4 rounded-2xl">
          <div className="text-center">
            <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-bounce" />
            <p className="text-2xl font-bold text-white">释放以上传文件</p>
            <p className="text-gray-400 mt-2">支持批量拖拽上传</p>
          </div>
        </div>
      )}

      {/* 知识库选择弹窗 */}
      {showKbSelector && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">选择目标知识库</h3>
            <p className="text-sm text-gray-400 mb-4">
              待上传 {pendingFiles.length} 个文件 ({formatBytes(pendingFiles.reduce((s, f) => s + f.size, 0))})
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {kbs.map(kb => (
                <button
                  key={kb.id}
                  onClick={() => confirmUpload(kb.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-800 hover:border-blue-500 hover:bg-blue-500/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="font-medium">{kb.name}</p>
                      <p className="text-xs text-gray-500">{kb.description} · {kb.documentCount} 篇文档</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowKbSelector(false); setPendingFiles([]); }}
              className="mt-4 w-full py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 页面头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">📤 上传管理中心</h1>
        <p className="text-gray-500 text-sm">管理文档上传、知识库关联与处理状态</p>
      </div>

      {loading && (
        <div className="card p-6 text-center">
          <Loader2 className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2 animate-spin" />
          <p className="text-sm text-[var(--sage-400)]">加载中...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="总文件数" value={stats.total} icon={<File className="w-4 h-4" />} color="blue" />
        <StatCard label="上传中" value={stats.uploading} icon={<Loader2 className="w-4 h-4 animate-spin" />} color="yellow" />
        <StatCard label="处理中" value={stats.processing} icon={<RefreshCw className="w-4 h-4 animate-spin" />} color="purple" />
        <StatCard label="已完成" value={stats.completed} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatCard label="失败" value={stats.error} icon={<AlertCircle className="w-4 h-4" />} color="red" />
        <StatCard label="总容量" value={formatBytes(stats.totalSize)} icon={<Archive className="w-4 h-4" />} color="gray" />
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-[#12121a] border border-gray-800 rounded-xl p-4">
        {/* 上传按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          上传文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* 搜索 */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索文件名..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-600"
          />
        </div>

        {/* 知识库筛选 */}
        <select
          value={selectedKb}
          onChange={e => setSelectedKb(e.target.value)}
          className="bg-[#1a1a2e] border border-gray-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全部知识库</option>
          {kbs.map(kb => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1a1a2e] border border-gray-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="uploading">上传中</option>
          <option value="processing">处理中</option>
          <option value="completed">已完成</option>
          <option value="error">失败</option>
        </select>

        {/* 视图切换 */}
        <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:bg-gray-800'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:bg-gray-800'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <FolderOpen className="w-12 h-12 mx-auto mb-4" />
          <p>暂无文件</p>
          <p className="text-sm mt-1">拖拽文件到此处或点击上传按钮</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className={`bg-[#12121a] border rounded-xl overflow-hidden transition-all ${
                file.status === 'error' ? 'border-red-800/50' : 'border-gray-800'
              }`}
            >
              {/* 主行 */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#1a1a2e]"
                onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{formatBytes(file.size)}</span>
                    <span>·</span>
                    <span>{file.uploadedAt}</span>
                    {file.knowledgeBaseName && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-blue-400">
                          <Database className="w-3 h-3" />
                          {file.knowledgeBaseName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 状态标签 */}
                <StatusBadge status={file.status} />

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  {file.status === 'error' && (
                    <button
                      onClick={e => { e.stopPropagation(); retryFile(file.id); }}
                      className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-400"
                      title="重试"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(file.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedFile === file.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>

              {/* 进度条（上传中/处理中） */}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="px-4 pb-3">
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        file.status === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {file.status === 'uploading' ? `上传中 ${Math.round(file.progress)}%` : 'AI处理中...'}
                  </p>
                </div>
              )}

              {/* 错误信息 */}
              {file.status === 'error' && file.errorMessage && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {file.errorMessage}
                  </p>
                </div>
              )}

              {/* 展开详情 */}
              {expandedFile === file.id && (
                <div className="px-4 pb-4 border-t border-gray-800/50 mt-2 pt-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">文件ID</p>
                      <p className="font-mono text-xs">{file.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">MIME类型</p>
                      <p className="font-mono text-xs">{file.type}</p>
                    </div>
                    {file.extractedText && (
                      <div className="col-span-2">
                        <p className="text-gray-500 mb-1">提取文本预览</p>
                        <div className="bg-[#0a0a0f] rounded-lg p-3 text-xs text-gray-400 max-h-32 overflow-y-auto font-mono">
                          {file.extractedText.substring(0, 500)}
                          {file.extractedText.length > 500 && '...'}
                        </div>
                      </div>
                    )}
                    {file.metadata && (
                      <div className="col-span-2">
                        <p className="text-gray-500 mb-1">元数据</p>
                        <div className="bg-[#0a0a0f] rounded-lg p-3 text-xs font-mono">
                          {Object.entries(file.metadata).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-gray-600">{k}:</span>
                              <span className="text-gray-400">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Grid视图
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className={`bg-[#12121a] border rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-all ${
                file.status === 'error' ? 'border-red-800/50' : 'border-gray-800'
              }`}
              onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-[#1a1a2e] rounded-lg">
                  {getFileIcon(file.type)}
                </div>
                <StatusBadge status={file.status} />
              </div>
              <p className="font-medium text-sm truncate mb-1">{file.name}</p>
              <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              {file.knowledgeBaseName && (
                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  {file.knowledgeBaseName}
                </p>
              )}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="mt-3">
                  <div className="w-full bg-gray-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        file.status === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== 子组件 =====================
function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UploadedFile['status'] }) {
  const config: Record<string, { text: string; className: string }> = {
    uploading: { text: '上传中', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    processing: { text: '处理中', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    completed: { text: '已完成', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    error: { text: '失败', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };

  const { text, className } = config[status];

  return (
    <span className={`px-2 py-1 rounded-md text-xs border ${className}`}>
      {text}
    </span>
  );
}
