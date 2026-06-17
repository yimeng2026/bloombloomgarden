import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { aiSearch } from '@/api/client';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'knowledge_base' | 'agent_memory' | 'document' | 'conversation';
  relevanceScore: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface SearchFilters {
  sourceTypes: string[];
  dateRange: 'all' | 'today' | 'week' | 'month';
  minScore: number;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  knowledge_base: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: '知识库' },
  agent_memory: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Agent记忆' },
  document: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '文档' },
  conversation: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '会话' }
};

export default function AiSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    sourceTypes: [],
    dateRange: 'all',
    minScore: 0.5
  });
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    '3DACP协议消息格式',
    'Kimi Code API配置',
    'Agent干预机制',
    '负载均衡策略'
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setSelectedResult(null);
    setSearchError(null);

    try {
      const data = await aiSearch(query);
      const searchResults = data?.data?.results || data?.data || data || [];
      let filtered = Array.isArray(searchResults) ? searchResults : [];
      if (filters.sourceTypes.length > 0) {
        filtered = filtered.filter((r: SearchResult) => filters.sourceTypes.includes(r.sourceType));
      }
      filtered = filtered.filter((r: SearchResult) => r.relevanceScore >= filters.minScore);
      filtered.sort((a: SearchResult, b: SearchResult) => b.relevanceScore - a.relevanceScore);
      setResults(filtered);
    } catch (e: any) {
      setSearchError(e.message || '搜索失败');
      setResults([]);
    } finally {
      setIsSearching(false);
    }

    if (!searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev].slice(0, 10));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleSourceType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      sourceTypes: prev.sourceTypes.includes(type)
        ? prev.sourceTypes.filter(t => t !== type)
        : [...prev.sourceTypes, type]
    }));
  };

  const scoreColor = (score: number) => {
    if (score >= 0.9) return 'text-emerald-400';
    if (score >= 0.8) return 'text-blue-400';
    if (score >= 0.7) return 'text-amber-400';
    return 'text-gray-400';
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex">
        {/* 主搜索区 */}
        <div className="flex-1 flex flex-col">
          {/* 顶部搜索栏 */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold text-white mb-1">AI语义搜索</h1>
            <p className="text-gray-500 text-sm mb-4">跨知识库、Agent记忆、文档和会话的智能检索</p>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入搜索内容，支持自然语言查询..."
                  className="w-full px-4 py-3 bg-[#12121a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--sage-500)] transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="px-6 py-3 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    搜索中
                  </>
                ) : (
                  <>🔍 搜索</>
                )}
              </button>
            </div>

            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs text-gray-500 py-1">历史：</span>
                {searchHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(h); }}
                    className="text-xs px-2 py-1 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 结果列表 */}
          <div className="flex-1 overflow-auto p-6">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4 opacity-50">🔍</div>
                <p className="text-lg">输入关键词开始语义搜索</p>
                <p className="text-sm mt-2">支持跨知识库、Agent记忆、文档和会话检索</p>
              </div>
            ) : isSearching ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-8 h-8 border-2 border-gray-700 border-t-[var(--sage-500)] rounded-full animate-spin mb-4" />
                <p>正在检索向量数据库...</p>
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4 opacity-50">⚠️</div>
                <p className="text-lg text-red-400">{searchError}</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4 opacity-50">🌫️</div>
                <p className="text-lg">未找到匹配结果</p>
                <p className="text-sm mt-2">尝试调整关键词或放宽筛选条件</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>找到 {results.length} 条结果</span>
                  <span>按相关性排序</span>
                </div>
                {results.map(r => {
                  const colors = SOURCE_COLORS[r.sourceType];
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResult(r)}
                      className={`p-4 bg-[#12121a] border rounded-lg cursor-pointer transition-all ${
                        selectedResult?.id === r.id
                          ? 'border-[var(--sage-500)] ring-1 ring-[var(--sage-500)]/20'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-medium flex items-center gap-2">
                          {r.title}
                          <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                            {colors.label}
                          </span>
                        </h3>
                        <span className={`text-sm font-mono ${scoreColor(r.relevanceScore)}`}>
                          {(r.relevanceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-2">{r.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>📁 {r.source}</span>
                        <span>🕐 {new Date(r.timestamp).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 右侧详情面板 */}
        <div className="w-96 border-l border-gray-800 bg-[#0d0d14] p-6 overflow-auto">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">筛选条件</h2>

          {/* 来源类型 */}
          <div className="mb-6">
            <h3 className="text-white text-sm font-medium mb-2">来源类型</h3>
            <div className="space-y-2">
              {Object.entries(SOURCE_COLORS).map(([type, colors]) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.sourceTypes.includes(type)}
                    onChange={() => toggleSourceType(type)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[var(--sage-500)] focus:ring-[var(--sage-500)]"
                  />
                  <span className={`text-sm ${colors.text}`}>{colors.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 时间范围 */}
          <div className="mb-6">
            <h3 className="text-white text-sm font-medium mb-2">时间范围</h3>
            <select
              value={filters.dateRange}
              onChange={e => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full px-3 py-2 bg-[#12121a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[var(--sage-500)]"
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">最近7天</option>
              <option value="month">最近30天</option>
            </select>
          </div>

          {/* 最低相似度 */}
          <div className="mb-6">
            <h3 className="text-white text-sm font-medium mb-2">
              最低相似度: {(filters.minScore * 100).toFixed(0)}%
            </h3>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore * 100}
              onChange={e => setFilters(prev => ({ ...prev, minScore: Number(e.target.value) / 100 }))}
              className="w-full accent-[var(--sage-500)]"
            />
          </div>

          {/* 选中详情 */}
          {selectedResult && (
            <>
              <div className="border-t border-gray-800 my-4" />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">详情</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">标题</span>
                  <p className="text-white text-sm">{selectedResult.title}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">完整内容</span>
                  <p className="text-gray-300 text-sm mt-1 leading-relaxed">{selectedResult.content}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">来源</span>
                  <p className="text-[var(--sage-400)] text-sm">{selectedResult.source}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">元数据</span>
                  <pre className="text-xs text-gray-400 bg-[#12121a] p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedResult.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
