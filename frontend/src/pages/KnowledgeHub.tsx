
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FileText,
  Search,
  Plus,
  Download,
  RefreshCw,
  MoreVertical,
  Settings,
  Trash2,
  Edit3,
  Eye,
  Upload,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderOpen,
  Filter,
  Grid3x3,
  List,
  File,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Loader2,
  Zap,
  Database,
  Layers,
} from 'lucide-react';
import ContentCard from '@/components/ContentCard';
import { fetchKnowledgeBases } from '@/api/client';

/* ──────────────────────── types ──────────────────────── */

interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'business' | 'general' | 'private' | 'external';
  docCount: number;
  tagCount: number;
  indexedCount: number;
  totalCount: number;
  tags: string[];
  lastUpdated: string;
  status: 'synced' | 'syncing' | 'error';
  accentColor: string;
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: string;
  chunks: number;
  status: 'indexed' | 'indexing' | 'pending' | 'error';
  kb: string;
  tags: string[];
  modifiedAt: string;
}

/* ──────────────────────── 数据层 ──────────────────────── */

const tagCloud = [
  { name: 'API', count: 45, color: '#7fa3b0' },
  { name: '开发', count: 38, color: '#6b7a5a' },
  { name: '产品', count: 32, color: '#d4a373' },
  { name: '数据库', count: 28, color: '#a78b9a' },
  { name: '部署', count: 25, color: '#c9a96e' },
  { name: 'AI', count: 22, color: '#7fb89f' },
  { name: '用户', count: 20, color: '#6b7a5a' },
  { name: '认证', count: 18, color: '#7fa3b0' },
  { name: '错误处理', count: 16, color: '#c97b84' },
  { name: 'Docker', count: 15, color: '#7fa3b0' },
  { name: '会议', count: 14, color: '#a78b9a' },
  { name: '翻译', count: 12, color: '#7fb89f' },
  { name: '架构', count: 10, color: '#6b7a5a' },
  { name: '测试', count: 9, color: '#d4a373' },
  { name: '安全', count: 8, color: '#c97b84' },
];

const categories = [
  { id: 'all', name: '全部文档', count: 891 },
  { id: 'tech', name: '技术文档', count: 342 },
  { id: 'product', name: '产品文档', count: 156 },
  { id: 'business', name: '业务文档', count: 98 },
  { id: 'meeting', name: '会议记录', count: 67 },
  { id: 'reference', name: '参考资料', count: 178 },
  { id: 'uncategorized', name: '未分类', count: 50 },
];

const typeLabels: Record<string, string> = {
  technical: '技术文档',
  business: '业务知识',
  general: '通用知识',
  private: '私有数据',
  external: '外部API',
};

const statusLabels: Record<string, string> = {
  synced: '已同步',
  syncing: '同步中',
  error: '错误',
};

const docStatusLabels: Record<string, string> = {
  indexed: '已索引',
  indexing: '索引中',
  pending: '待处理',
  error: '错误',
};

/* ──────────────────────── easing helpers ──────────────────────── */

const easeGentle = [0.22, 1, 0.36, 1] as [number, number, number, number];
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ──────────────────────── component ──────────────────────── */

export default function KnowledgeHub() {
  const [activeTab, setActiveTab] = useState<'kb' | 'docs' | 'search'>('kb');
  const [searchQuery, setSearchQuery] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [docFilter, setDocFilter] = useState('all');
  const [docViewMode, setDocViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [openMenuKb, setOpenMenuKb] = useState<string | null>(null);
  const [kbData, setKbData] = useState<KnowledgeBaseItem[]>([]);
  const [docData, setDocData] = useState<DocumentItem[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchKnowledgeBases()
      .then(res => {
        if (!cancelled) {
          const data = res.data || res;
          setKbData(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError('加载知识库失败: ' + (err.message || '未知错误'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-kb-menu]')) setOpenMenuKb(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const filteredDocs = docData.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(docSearchQuery.toLowerCase());
    const matchesFilter = docFilter === 'all' || d.status === docFilter;
    return matchesSearch && matchesFilter;
  });

  const handleSemanticSearch = () => {
    if (!semanticQuery.trim()) return;
    const query = semanticQuery.trim().toLowerCase();
    const filtered = kbData.filter((kb) =>
      kb.name.toLowerCase().includes(query) ||
      kb.description.toLowerCase().includes(query) ||
      kb.tags.some((tag) => tag.toLowerCase().includes(query))
    );
    setSearchResults(filtered);
    setHasSearched(true);
  };

  const tabs = [
    { id: 'kb' as const, label: '知识库', icon: BookOpen },
    { id: 'docs' as const, label: '文档管理', icon: FileText },
    { id: 'search' as const, label: '语义搜索', icon: Search },
  ];

  return (
    <div className="space-y-6">
      {/* ═══════════ Hero Header ═══════════ */}
      <div
        ref={heroRef}
        className="relative rounded-2xl overflow-hidden"
        style={{ height: 200 }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/knowledge-forest.jpg)' }}
        />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26,31,24,0.6)' }} />
        <div className="relative z-10 flex flex-col justify-center h-full px-8">
          <motion.h1
            className="font-display text-4xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeGentle, delay: 0.2 }}
          >
            知识库
          </motion.h1>
          <motion.p
            className="text-lg mt-1"
            style={{ color: '#7fb89f' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeGentle, delay: 0.4 }}
          >
            Knowledge Hub
          </motion.p>
          <motion.p
            className="text-sm mt-1"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeGentle, delay: 0.5 }}
          >
            管理智能体的知识源泉 · Manage the knowledge sources for your agents
          </motion.p>
          <motion.div
            className="absolute bottom-4 right-6 flex items-center gap-4 text-sm"
            style={{ color: 'rgba(255,255,255,0.8)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <span>23 知识库</span>
            <span>·</span>
            <span>1,456 文档</span>
            <span>·</span>
            <span>98.7% 索引完成</span>
          </motion.div>
        </div>
      </div>

      {loading && (
        <div className="card p-6 text-center">
          <Loader2 className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2 animate-spin" />
          <p className="text-sm text-[var(--sage-400)]">加载中...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* ═══════════ Tab Navigation ═══════════ */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300"
              style={{
                color: isActive ? 'var(--sage-700)' : 'var(--sage-400)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="kb-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  transition={{ duration: 0.3, ease: easeGentle }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ Tab Content ═══════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'kb' && (
          <motion.div
            key="kb-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: easeGentle }}
            className="space-y-6"
          >
            <KBOverviewSection />
            <KBGridSection
              kbData={kbData}
              openMenuKb={openMenuKb}
              setOpenMenuKb={setOpenMenuKb}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
            />
            <TagCloudSection selectedTag={selectedTag} setSelectedTag={setSelectedTag} />
          </motion.div>
        )}

        {activeTab === 'docs' && (
          <motion.div
            key="docs-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: easeGentle }}
            className="space-y-6"
          >
            <DocumentsSection
              searchQuery={docSearchQuery}
              setSearchQuery={setDocSearchQuery}
              filter={docFilter}
              setFilter={setDocFilter}
              viewMode={docViewMode}
              setViewMode={setDocViewMode}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              filteredDocs={filteredDocs}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              showUpload={showUpload}
              setShowUpload={setShowUpload}
            />
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div
            key="search-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: easeGentle }}
            className="space-y-6"
          >
            <SemanticSearchSection
              kbData={kbData}
              query={semanticQuery}
              setQuery={setSemanticQuery}
              hasSearched={hasSearched}
              onSearch={handleSemanticSearch}
              searchResults={searchResults}
              openMenuKb={openMenuKb}
              setOpenMenuKb={setOpenMenuKb}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KB Overview Section
   ═══════════════════════════════════════════════════════════════ */

function KBOverviewSection() {
  const stats = [
    { label: '知识库总数', value: 23, icon: Database, color: '#7fa3b0', trend: '+3 本周', trendType: 'up' as const },
    { label: '文档总数', value: 1456, icon: FileText, color: '#d4a373', trend: '+156 新增', trendType: 'up' as const },
    { label: '索引块数', value: 28473, icon: Layers, color: '#7fb89f', trend: '全部就绪', trendType: 'neutral' as const },
    { label: '最后同步', value: 0, icon: Clock, color: '#a78b9a', display: '2分钟前', trend: '', trendType: 'neutral' as const },
  ];

  return (
    <ContentCard
      title="概览"
      subtitle="知识库整体状态"
      actions={
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-card-sm text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
            style={{ backgroundColor: 'var(--sage-600)' }}>
            <Plus size={14} />
            <span>新建知识库</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
            <Download size={14} />
            <span>导入</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
            <RefreshCw size={14} />
            <span>同步全部</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="flex items-center gap-4 p-4 rounded-card border"
            style={{
              backgroundColor: '#fff',
              borderColor: 'var(--sage-200)',
              boxShadow: 'var(--shadow-card)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeGentle, delay: i * 0.1 }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${s.color}18` }}
            >
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-display" style={{ color: 'var(--sage-700)' }}>
                {s.display || s.value.toLocaleString()}
              </div>
              <div className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sage-400)' }}>
                {s.label}
              </div>
              {s.trend && (
                <div className="text-xs mt-0.5 font-medium" style={{ color: s.color }}>
                  {s.trend}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </ContentCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KB Grid Section
   ═══════════════════════════════════════════════════════════════ */

function KBGridSection({
  kbData,
  openMenuKb,
  setOpenMenuKb,
  selectedTag,
  setSelectedTag,
}: {
  kbData: KnowledgeBaseItem[];
  openMenuKb: string | null;
  setOpenMenuKb: (id: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}) {
  const filteredKBs = selectedTag
    ? kbData.filter((kb) => kb.tags.includes(selectedTag))
    : kbData;

  return (
    <ContentCard
      title="知识库列表"
      subtitle={`共 ${filteredKBs.length} 个知识库`}
      actions={
        selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
          >
            <X size={12} />
            <span>清除筛选: {selectedTag}</span>
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4">
        {filteredKBs.map((kb, i) => (
          <KBCard key={kb.id} kb={kb} index={i} isMenuOpen={openMenuKb === kb.id} onMenuToggle={() => setOpenMenuKb(openMenuKb === kb.id ? null : kb.id)} />
        ))}
      </div>
    </ContentCard>
  );
}

function KBCard({
  kb,
  index,
  isMenuOpen,
  onMenuToggle,
}: {
  kb: KnowledgeBaseItem;
  index: number;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const progress = kb.totalCount > 0 ? Math.round((kb.indexedCount / kb.totalCount) * 100) : 0;
  const isComplete = progress === 100;

  return (
    <motion.div
      className="rounded-card border overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
      style={{
        backgroundColor: '#fff',
        borderColor: 'var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
        borderTopWidth: 4,
        borderTopColor: kb.accentColor,
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeGentle, delay: index * 0.1 }}
      whileHover={{ boxShadow: 'var(--shadow-card-hover)' }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${kb.accentColor}20` }}
          >
            <BookOpen size={18} style={{ color: kb.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate" style={{ color: 'var(--sage-800)' }}>
              {kb.name}
            </h3>
            <span
              className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ backgroundColor: `${kb.accentColor}18`, color: kb.accentColor }}
            >
              {typeLabels[kb.type]}
            </span>
          </div>
          <div data-kb-menu className="relative">
            <button
              onClick={onMenuToggle}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--sage-400)' }}
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: easeSpring }}
                  className="absolute right-0 top-full mt-1 w-40 rounded-card-md border shadow-card-elevated z-30 overflow-hidden"
                  style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
                >
                  {[
                    { icon: Eye, label: '查看文档' },
                    { icon: Edit3, label: '编辑' },
                    { icon: RefreshCw, label: '重建索引' },
                    { icon: Download, label: '导出' },
                    { icon: Trash2, label: '删除', danger: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--sage-50)]"
                      style={{ color: item.danger ? 'var(--error)' : 'var(--sage-700)' }}
                    >
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm mt-3 line-clamp-2" style={{ color: 'var(--sage-500)' }}>
          {kb.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--sage-400)' }}>
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {kb.docCount} 文档
          </span>
          {kb.tagCount > 0 && (
            <span className="flex items-center gap-1">
              <Tag size={12} />
              {kb.tagCount} 标签
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1" style={{ color: 'var(--sage-500)' }}>
              {kb.status === 'syncing' ? (
                <>
                  <RefreshCw size={10} className="animate-spin" />
                  索引中...
                </>
              ) : (
                <>
                  {isComplete ? <CheckCircle2 size={10} style={{ color: 'var(--bloom-mint)' }} /> : <Clock size={10} />}
                  索引进度
                </>
              )}
            </span>
            <span className="font-medium" style={{ color: isComplete ? 'var(--bloom-mint)' : 'var(--sage-500)' }}>
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sage-200)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isComplete ? 'var(--bloom-mint)' : 'var(--sage-500)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: easeGentle }}
            />
          </div>
        </div>

        {/* Tags */}
        {kb.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {kb.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
          <span className="text-xs" style={{ color: 'var(--sage-400)' }}>
            最后更新: {kb.lastUpdated}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              backgroundColor:
                kb.status === 'synced' ? 'rgba(91,154,109,0.12)' :
                kb.status === 'syncing' ? 'rgba(201,169,110,0.12)' :
                'rgba(201,123,132,0.12)',
              color:
                kb.status === 'synced' ? '#5b9a6d' :
                kb.status === 'syncing' ? '#c9a96e' :
                '#c97b84',
            }}
          >
            {statusLabels[kb.status]}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tag Cloud Section
   ═══════════════════════════════════════════════════════════════ */

function TagCloudSection({
  selectedTag,
  setSelectedTag,
}: {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}) {
  const maxCount = Math.max(...tagCloud.map((t) => t.count));
  const minCount = Math.min(...tagCloud.map((t) => t.count));

  return (
    <ContentCard title="标签云" subtitle="按标签筛选知识库">
      <div className="flex flex-wrap gap-3 mt-4">
        {tagCloud.map((tag, i) => {
          const size = minCount === maxCount
            ? 1
            : 0.75 + ((tag.count - minCount) / (maxCount - minCount)) * 0.65;
          const isActive = selectedTag === tag.name;
          return (
            <motion.button
              key={tag.name}
              onClick={() => setSelectedTag(isActive ? null : tag.name)}
              className="px-3 py-1.5 rounded-full font-medium transition-all duration-200"
              style={{
                fontSize: `${size * 0.875}rem`,
                backgroundColor: isActive ? tag.color : `${tag.color}15`,
                color: isActive ? '#fff' : tag.color,
                opacity: isActive ? 1 : 0.85,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isActive ? 1 : 0.85, scale: 1 }}
              transition={{ duration: 0.4, ease: easeGentle, delay: i * 0.03 }}
              whileHover={{ scale: 1.08, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              {tag.name}
              <span className="ml-1 text-xs opacity-70">({tag.count})</span>
            </motion.button>
          );
        })}
      </div>
    </ContentCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Documents Section
   ═══════════════════════════════════════════════════════════════ */

function DocumentsSection({
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  viewMode,
  setViewMode,
  selectedCategory,
  setSelectedCategory,
  filteredDocs,
  selectedDoc,
  setSelectedDoc,
  showUpload,
  setShowUpload,
}: {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  filteredDocs: DocumentItem[];
  selectedDoc: DocumentItem | null;
  setSelectedDoc: (d: DocumentItem | null) => void;
  showUpload: boolean;
  setShowUpload: (s: boolean) => void;
}) {
  const statusFilters = [
    { id: 'all', label: '全部' },
    { id: 'indexed', label: '已索引' },
    { id: 'indexing', label: '索引中' },
    { id: 'pending', label: '待处理' },
    { id: 'error', label: '错误' },
  ];

  return (
    <div className="flex gap-6">
      {/* Category Sidebar */}
      <div className="w-52 flex-shrink-0 hidden lg:block">
        <div className="rounded-card border p-4" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>文档分类</h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-200"
                style={{
                  backgroundColor: selectedCategory === cat.id ? 'var(--sage-500)' : 'transparent',
                  color: selectedCategory === cat.id ? '#fff' : 'var(--sage-600)',
                }}
              >
                <span>{cat.name}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: selectedCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'var(--sage-100)',
                    color: selectedCategory === cat.id ? '#fff' : 'var(--sage-400)',
                  }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-card-md border flex-1 min-w-[200px]"
            style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
          >
            <Search size={16} style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-sm"
              style={{ color: 'var(--sage-700)' }}
            />
          </div>

          <div className="flex items-center gap-1">
            {statusFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: filter === f.id ? 'var(--sage-500)' : 'var(--sage-100)',
                  color: filter === f.id ? '#fff' : 'var(--sage-600)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border rounded-card-sm overflow-hidden" style={{ borderColor: 'var(--sage-200)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5 transition-colors"
              style={{ backgroundColor: viewMode === 'grid' ? 'var(--sage-100)' : 'transparent', color: viewMode === 'grid' ? 'var(--sage-700)' : 'var(--sage-400)' }}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-1.5 transition-colors"
              style={{ backgroundColor: viewMode === 'list' ? 'var(--sage-100)' : 'transparent', color: viewMode === 'list' ? 'var(--sage-700)' : 'var(--sage-400)' }}
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-card-sm text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--sage-600)' }}
          >
            <Upload size={14} />
            <span>上传文档</span>
          </button>
        </div>

        {/* Upload Zone */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: easeGentle }}
              className="overflow-hidden"
            >
              <div
                className="rounded-card border-2 border-dashed p-8 text-center"
                style={{ borderColor: 'var(--bloom-mint)', backgroundColor: 'rgba(127,184,159,0.05)' }}
              >
                <Upload size={48} style={{ color: 'var(--bloom-mint)', margin: '0 auto' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'var(--sage-700)' }}>
                  拖拽文件到此处或点击上传
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--sage-400)' }}>
                  支持 PDF, DOCX, TXT, MD, CSV
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Grid/List */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  className="rounded-card border p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: easeGentle, delay: i * 0.06 }}
                  onClick={() => setSelectedDoc(doc)}
                  whileHover={{ boxShadow: 'var(--shadow-card-hover)' }}
                >
                  <DocTypeIcon type={doc.type} />
                  <h4 className="text-sm font-medium mt-2 truncate" style={{ color: 'var(--sage-800)' }}>{doc.name}</h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>{doc.size} · {doc.kb}</p>
                  <DocStatusBadge status={doc.status} progress={doc.chunks} />
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="rounded-card border overflow-hidden"
              style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px_100px_60px] gap-2 px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-400)', borderColor: 'var(--sage-200)' }}>
                <span>名称</span>
                <span>类型</span>
                <span>大小</span>
                <span>块数</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {/* Table Rows */}
              {filteredDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  className="grid grid-cols-[1fr_80px_80px_80px_100px_60px] gap-2 px-4 py-3 border-b items-center cursor-pointer transition-colors hover:bg-[var(--sage-50)]"
                  style={{ borderColor: 'var(--sage-200)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <span className="text-sm font-medium truncate flex items-center gap-2" style={{ color: 'var(--sage-700)' }}>
                    <DocTypeIconSmall type={doc.type} />
                    {doc.name}
                  </span>
                  <span className="text-xs uppercase" style={{ color: 'var(--sage-400)' }}>{doc.type}</span>
                  <span className="text-xs" style={{ color: 'var(--sage-400)' }}>{doc.size}</span>
                  <span className="text-xs" style={{ color: 'var(--sage-500)' }}>{doc.chunks}</span>
                  <DocStatusBadgeSmall status={doc.status} />
                  <button className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: 'var(--sage-400)' }}>
                    <MoreVertical size={14} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Document Detail Drawer */}
      <AnimatePresence>
        {selectedDoc && (
          <DocDetailDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Doc Detail Drawer
   ═══════════════════════════════════════════════════════════════ */

function DocDetailDrawer({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l overflow-y-auto"
      style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', top: 'var(--topbar-height)' }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-800)' }}>文档详情</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: 'var(--sage-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>文件名</label>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--sage-700)' }}>{doc.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>类型</label>
              <p className="text-sm mt-1" style={{ color: 'var(--sage-700)' }}>{doc.type.toUpperCase()}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>大小</label>
              <p className="text-sm mt-1" style={{ color: 'var(--sage-700)' }}>{doc.size}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>语义块数</label>
              <p className="text-sm mt-1" style={{ color: 'var(--sage-700)' }}>{doc.chunks} 块</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>索引状态</label>
              <div className="mt-1"><DocStatusBadgeSmall status={doc.status} /></div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>所属知识库</label>
            <p className="text-sm mt-1" style={{ color: 'var(--sage-700)' }}>{doc.kb}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>修改时间</label>
            <p className="text-sm mt-1" style={{ color: 'var(--sage-700)' }}>{doc.modifiedAt}</p>
          </div>

          {doc.tags.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>标签</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {doc.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>内容预览</label>
            <div className="mt-2 p-3 rounded-card-md border text-sm leading-relaxed" style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)', color: 'var(--sage-600)', minHeight: 120 }}>
              <p>本文档包含关于 {doc.kb} 的详细内容。</p>
              <p className="mt-2">文档被切分为 {doc.chunks} 个语义块用于智能检索和知识引用。</p>
              <p className="mt-2">每个语义块都经过嵌入模型处理，生成向量表示用于相似度搜索。</p>
            </div>
          </div>

          {/* Semantic Chunks Preview */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>语义块预览</label>
            <div className="mt-2 space-y-2">
              {Array.from({ length: Math.min(3, doc.chunks) }).map((_, i) => (
                <div key={i} className="p-3 rounded-card-md border text-xs" style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)', color: 'var(--sage-500)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium" style={{ color: 'var(--sage-600)' }}>块 #{i + 1}</span>
                    <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>384维向量</span>
                  </div>
                  <p>这是第 {i + 1} 个语义块的内容摘要...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-card-sm text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}>
              <RefreshCw size={14} />
              重新索引
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-card-sm text-sm font-medium"
              style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
              <Download size={14} />
              下载
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Semantic Search Section
   ═══════════════════════════════════════════════════════════════ */

function SemanticSearchSection({
  kbData,
  query,
  setQuery,
  hasSearched,
  onSearch,
  searchResults,
  openMenuKb,
  setOpenMenuKb,
}: {
  kbData: KnowledgeBaseItem[];
  query: string;
  setQuery: (q: string) => void;
  hasSearched: boolean;
  onSearch: () => void;
  searchResults: KnowledgeBaseItem[];
  openMenuKb: string | null;
  setOpenMenuKb: (id: string | null) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(75);
  const [resultCount, setResultCount] = useState(10);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);

  const kbOptions = kbData.map((kb) => kb.name);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <div
            className="flex items-center gap-3 px-5 border rounded-2xl transition-all duration-300 focus-within:border-[var(--sage-500)] focus-within:shadow-md"
            style={{ height: 56, backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
          >
            <Search size={24} style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder="输入自然语言查询... 例如：'公司的API认证流程是什么？'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: 'var(--sage-700)' }}
            />
            <button
              onClick={onSearch}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              搜索
            </button>
          </div>

          {/* Advanced Toggle */}
          <div className="flex items-center justify-end mt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--sage-500)' }}
            >
              <Filter size={12} />
              高级搜索
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: easeGentle }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-card border space-y-4" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}>
                  {/* KB Scope */}
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--sage-700)' }}>知识库范围</label>
                    <div className="flex flex-wrap gap-2">
                      {kbOptions.map((kb) => {
                        const isSelected = selectedKBs.includes(kb);
                        return (
                          <button
                            key={kb}
                            onClick={() => {
                              setSelectedKBs((prev) =>
                                isSelected ? prev.filter((k) => k !== kb) : [...prev, kb]
                              );
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                            style={{
                              backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-100)',
                              color: isSelected ? '#fff' : 'var(--sage-600)',
                            }}
                          >
                            {isSelected && <CheckCircle2 size={12} />}
                            {kb}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Similarity Threshold */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>相似度阈值</label>
                      <span className="text-sm font-medium" style={{ color: 'var(--sage-500)' }}>{similarityThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={similarityThreshold}
                      onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: 'var(--sage-500)', background: `linear-gradient(to right, var(--sage-500) ${similarityThreshold}%, var(--sage-200) ${similarityThreshold}%)` }}
                    />
                  </div>

                  {/* Result Count */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>结果数量</label>
                      <span className="text-sm font-medium" style={{ color: 'var(--sage-500)' }}>{resultCount}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={resultCount}
                      onChange={(e) => setResultCount(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: 'var(--sage-500)', background: `linear-gradient(to right, var(--sage-500) ${(resultCount / 50) * 100}%, var(--sage-200) ${(resultCount / 50) * 100}%)` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: easeGentle }}
        >
          <ContentCard
            title="搜索结果"
            subtitle={`找到 ${searchResults.length} 个相关结果`}
          >
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4">
                {searchResults.map((kb, i) => (
                  <KBCard
                    key={kb.id}
                    kb={kb}
                    index={i}
                    isMenuOpen={openMenuKb === kb.id}
                    onMenuToggle={() => setOpenMenuKb(openMenuKb === kb.id ? null : kb.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                  <Search size={28} style={{ color: 'var(--sage-300)' }} />
                </div>
                <p className="mt-4 text-base font-medium" style={{ color: 'var(--sage-500)' }}>未找到匹配的知识库</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--sage-400)' }}>尝试其他关键词或清除筛选条件</p>
              </div>
            )}
          </ContentCard>
        </motion.div>
      )}

      {/* Empty State (before search) */}
      {!hasSearched && (
        <motion.div
          className="flex flex-col items-center justify-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
            <Search size={28} style={{ color: 'var(--sage-300)' }} />
          </div>
          <p className="mt-4 text-base font-medium" style={{ color: 'var(--sage-500)' }}>输入查询开始语义搜索</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--sage-400)' }}>在自然语言中描述您想查找的内容</p>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Small helper components
   ═══════════════════════════════════════════════════════════════ */

function DocTypeIcon({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    pdf: '#c97b84',
    docx: '#7fa3b0',
    md: '#6b7a5a',
    txt: '#8f9a7d',
    xlsx: '#5b9a6d',
    csv: '#7fb89f',
    xml: '#d4a373',
    json: '#c9a96e',
  };
  const color = colorMap[type] || 'var(--sage-400)';

  return (
    <div className="w-12 h-12 rounded-card-md flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
      <FileText size={24} style={{ color }} />
    </div>
  );
}

function DocTypeIconSmall({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    pdf: '#c97b84',
    docx: '#7fa3b0',
    md: '#6b7a5a',
    txt: '#8f9a7d',
    xlsx: '#5b9a6d',
    csv: '#7fb89f',
    xml: '#d4a373',
    json: '#c9a96e',
  };
  const color = colorMap[type] || 'var(--sage-400)';

  return (
    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
      <FileText size={12} style={{ color }} />
    </div>
  );
}

function DocStatusBadge({ status, progress }: { status: string; progress: number }) {
  const config: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    indexed: { color: '#5b9a6d', bg: 'rgba(91,154,109,0.12)', icon: CheckCircle2 },
    indexing: { color: '#c9a96e', bg: 'rgba(201,169,110,0.12)', icon: Loader2 },
    pending: { color: '#d4a373', bg: 'rgba(212,163,115,0.12)', icon: Clock },
    error: { color: '#c97b84', bg: 'rgba(201,123,132,0.12)', icon: AlertCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <div className="flex items-center gap-1 mt-2">
      <Icon size={12} style={{ color: c.color }} className={status === 'indexing' ? 'animate-spin' : ''} />
      <span className="text-xs font-medium" style={{ color: c.color }}>
        {docStatusLabels[status]} {status === 'indexed' && `${progress}%`}
      </span>
    </div>
  );
}

function DocStatusBadgeSmall({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    indexed: { color: '#5b9a6d', bg: 'rgba(91,154,109,0.12)' },
    indexing: { color: '#c9a96e', bg: 'rgba(201,169,110,0.12)' },
    pending: { color: '#d4a373', bg: 'rgba(212,163,115,0.12)' },
    error: { color: '#c97b84', bg: 'rgba(201,123,132,0.12)' },
  };
  const c = config[status] || config.pending;

  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {docStatusLabels[status]}
    </span>
  );
}

