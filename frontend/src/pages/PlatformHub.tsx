import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Settings,
  Play,
  MoreVertical,
  ChevronDown,
  Check,
  X,
  Server,
  Code,
  BarChart3,
  FileText,
  Globe,
  FolderOpen,
  Image,
  Cpu,
  Star,
  Diamond,
  Sparkles,
  Zap,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Keyboard,
  Layers,
  Bot,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import ContentCard from '@/components/ContentCard';
import { fetchProviders, fetchSkills } from '@/api/client';

/* ───────────────────── types ───────────────────── */

interface PlatformCard {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'configuring' | 'error';
  modelCount: number;
  latency: number;
  lastUsed: string;
  icon: string;
  tint: string;
}

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  keyMask: string;
  modelCount: number;
  status: 'connected' | 'disconnected' | 'error';
  latency: number | string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  platforms: string[];
  enabled: boolean;
  usageCount: number;
  tint: string;
}

/* ───────────────────── mock data ───────────────────── */

const categories = [
  { id: 'all', name: '全部技能', nameEn: 'All Skills', icon: 'layers', count: 0 },
  { id: 'code', name: '代码开发', nameEn: 'Code', icon: 'code', count: 0 },
  { id: 'research', name: '数据分析', nameEn: 'Data', icon: 'barchart', count: 0 },
  { id: 'data', name: '文档处理', nameEn: 'Document', icon: 'filetext', count: 0 },
  { id: 'creative', name: '网络搜索', nameEn: 'Search', icon: 'globe', count: 0 },
  { id: 'system', name: '文件操作', nameEn: 'File', icon: 'folder', count: 0 },
  { id: 'image', name: '图像处理', nameEn: 'Image', icon: 'image', count: 0 },
];

const providerOptions = [
  { id: 'openai', name: 'OpenAI', icon: Zap, desc: 'GPT-4, GPT-4o, GPT-3.5' },
  { id: 'ollama', name: 'Ollama', icon: Cpu, desc: 'Llama3, Mistral, CodeLlama' },
  { id: 'kimi', name: 'Kimi (Moonshot)', icon: Star, desc: 'Moonshot-v1 系列' },
  { id: 'claude', name: 'Claude (Anthropic)', icon: Diamond, desc: 'Claude 3.5 Sonnet, Opus' },
  { id: 'gemini', name: 'Gemini (Google)', icon: Sparkles, desc: 'Gemini 1.5 Pro, Ultra' },
  { id: 'custom', name: '自定义端点', icon: Server, desc: 'OpenAI-compatible API' },
];

/* ───────────────────── icon helpers ───────────────────── */

function PlatformIcon({ icon, size = 20, color = 'currentColor' }: { icon: string; size?: number; color?: string }) {
  const map: Record<string, React.ReactNode> = {
    zap: <Zap size={size} />,
    cpu: <Cpu size={size} />,
    star: <Star size={size} />,
    diamond: <Diamond size={size} />,
    sparkles: <Sparkles size={size} />,
    server: <Server size={size} />,
  };
  return <span style={{ color }}>{map[icon] || <Server size={size} />}</span>;
}

function SkillIcon({ icon, size = 20, color = 'currentColor' }: { icon: string; size?: number; color?: string }) {
  const map: Record<string, React.ReactNode> = {
    code: <Code size={size} />,
    barchart: <BarChart3 size={size} />,
    filetext: <FileText size={size} />,
    globe: <Globe size={size} />,
    folder: <FolderOpen size={size} />,
    image: <Image size={size} />,
    layers: <Layers size={size} />,
  };
  return <span style={{ color }}>{map[icon] || <Layers size={size} />}</span>;
}

function CategoryIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const map: Record<string, React.ReactNode> = {
    code: <Code size={size} />,
    barchart: <BarChart3 size={size} />,
    filetext: <FileText size={size} />,
    globe: <Globe size={size} />,
    folder: <FolderOpen size={size} />,
    image: <Image size={size} />,
    layers: <Layers size={size} />,
  };
  return <span>{map[icon] || <Layers size={size} />}</span>;
}

/* ───────────────────── status helpers ───────────────────── */

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    connected: '#5b9a6d',
    disconnected: '#b85c5c',
    configuring: '#c9973f',
    error: '#b85c5c',
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        {status === 'connected' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorMap[status] || '#c9973f' }} />
        )}
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: colorMap[status] || '#c9973f' }} />
      </span>
      <span className="text-xs font-medium" style={{ color: colorMap[status] || '#c9973f' }}>
        {status === 'connected' ? '已连接' : status === 'disconnected' ? '已断开' : status === 'configuring' ? '配置中' : '错误'}
      </span>
    </span>
  );
}

/* ───────────────────── data transformers ───────────────────── */

function flattenProviders(data: unknown): any[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (!d.success || !d.data || typeof d.data !== 'object') return [];
  const groups = d.data as Record<string, any[]>;
  return [
    ...(groups.international || []),
    ...(groups.chinese || []),
    ...(groups.gateway || []),
    ...(groups.cloud || []),
    ...(groups.local || []),
  ];
}

const providerIconMap: Record<string, string> = {
  openai: 'zap', claude: 'diamond', gemini: 'sparkles', ollama: 'cpu',
  kimi: 'star', custom: 'server', deepseek: 'zap', qwen: 'sparkles',
  moonshot: 'star', azure: 'server', aws: 'server', local: 'cpu',
};

const providerTintMap: Record<string, string> = {
  openai: '#7fa3b0', claude: '#a78b9a', gemini: '#c9a96e', ollama: '#7fb89f',
  kimi: '#d4a373', custom: '#c97b84', deepseek: '#7fa3b0', qwen: '#c9a96e',
  moonshot: '#d4a373', azure: '#7fa3b0', aws: '#a78b9a', local: '#7fb89f',
};

const skillIconMap: Record<string, string> = {
  code: 'code', research: 'barchart', data: 'filetext', creative: 'globe',
  system: 'folder', image: 'image', default: 'layers',
};

const skillTintMap: Record<string, string> = {
  code: '#7fb89f', research: '#d4a373', data: '#a78b9a', creative: '#7fa3b0',
  system: '#d4a373', image: '#c97b84', default: '#7fa3b0',
};

function providerToPlatformCard(p: any): PlatformCard {
  const typeKey = (p.type || 'custom').toLowerCase();
  return {
    id: p.id,
    name: p.name,
    provider: p.type || 'Custom',
    status: p.status || 'connected',
    modelCount: p.models?.length || 0,
    latency: 0,
    lastUsed: '从未',
    icon: providerIconMap[typeKey] || 'server',
    tint: providerTintMap[typeKey] || '#c97b84',
  };
}

function providerToApiKey(p: any): ApiKey {
  return {
    id: p.id,
    name: p.name,
    provider: p.type || 'Custom',
    endpoint: p.baseUrl || '',
    keyMask: p.apiKeyEnvVar ? `${p.apiKeyEnvVar.slice(0, 6)}...` : '••••••••',
    modelCount: p.models?.length || 0,
    status: p.status || 'connected',
    latency: 0,
  };
}

function backendSkillToSkill(s: any): Skill {
  const catKey = (s.category || 'default').toLowerCase();
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    category: s.category || 'default',
    icon: skillIconMap[catKey] || 'layers',
    version: s.version || 'v1.0.0',
    platforms: s.capabilities || [],
    enabled: true,
    usageCount: 0,
    tint: skillTintMap[catKey] || '#7fa3b0',
  };
}

function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, revealed };
}

/* ───────────────────── tabs ───────────────────── */

const tabs = [
  { id: 'platforms', label: '已连接平台', labelEn: 'Connected Platforms', count: 6 },
  { id: 'api', label: 'API管理', labelEn: 'API Management', count: 8 },
  { id: 'skills', label: '技能库', labelEn: 'Skills Library', count: 12 },
];

/* ═══════════════════════════════════════════════════════
   Platform Hub Page
   ═══════════════════════════════════════════════════════ */

export default function PlatformHub() {
  const { language } = useAppStore();
  const [activeTab, setActiveTab] = useState('platforms');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [rawProviders, setRawProviders] = useState<any[]>([]);
  const [rawSkills, setRawSkills] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [errorProviders, setErrorProviders] = useState<string | null>(null);
  const [errorSkills, setErrorSkills] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      try {
        setLoadingProviders(true);
        const data = await fetchProviders();
        if (!cancelled) {
          const flat = flattenProviders(data);
          setRawProviders(flat);
          setErrorProviders(null);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorProviders(err instanceof Error ? err.message : 'Failed to load providers');
        }
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    };

    const loadSkills = async () => {
      try {
        setLoadingSkills(true);
        const data = await fetchSkills();
        if (!cancelled) {
          const list = (data as any)?.data || [];
          setRawSkills(list);
          setErrorSkills(null);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorSkills(err instanceof Error ? err.message : 'Failed to load skills');
        }
      } finally {
        if (!cancelled) setLoadingSkills(false);
      }
    };

    loadProviders();
    loadSkills();

    return () => { cancelled = true; };
  }, []);

  const platformCards = rawProviders.map(providerToPlatformCard);
  const apiKeys = rawProviders.map(providerToApiKey);
  const skills = rawSkills.map(backendSkillToSkill);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <div className="max-w-[1440px] mx-auto">
      {/* ── Hero Header ── */}
      <HeroHeader t={t} onAddPlatform={() => setShowModal(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* ── Tabs ── */}
      <div className="mt-6 mb-6" style={{ borderBottom: '2px solid var(--sage-200)' }}>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 text-sm font-semibold transition-colors duration-200 flex items-center gap-2"
              style={{
                color: activeTab === tab.id ? 'var(--sage-700)' : 'var(--sage-400)',
              }}
            >
              {t(tab.label, tab.labelEn)}
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--sage-500)' : 'var(--sage-200)',
                  color: activeTab === tab.id ? '#fff' : 'var(--sage-500)',
                }}
              >
                {tab.id === 'platforms' ? platformCards.length : tab.id === 'api' ? apiKeys.length : skills.length}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="platform-tab-indicator"
                  className="absolute bottom-[-2px] left-0 right-0 h-[2px]"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'platforms' && (
          <motion.div key="platforms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <PlatformsTab t={t} searchQuery={searchQuery} platformCards={platformCards} loading={loadingProviders} error={errorProviders} />
          </motion.div>
        )}
        {activeTab === 'api' && (
          <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ApiTab t={t} searchQuery={searchQuery} apiKeys={apiKeys} loading={loadingProviders} error={errorProviders} />
          </motion.div>
        )}
        {activeTab === 'skills' && (
          <motion.div key="skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <SkillsTab t={t} searchQuery={searchQuery} skills={skills} loading={loadingSkills} error={errorSkills} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Platform Modal ── */}
      <AnimatePresence>
        {showModal && <AddPlatformModal t={t} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Hero Header
   ═══════════════════════════════════════════════════════ */

function HeroHeader({ t, onAddPlatform, searchQuery, onSearchChange }: {
  t: (zh: string, en: string) => string;
  onAddPlatform: () => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();
  const [batchOpen, setBatchOpen] = useState(false);
  const batchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (batchRef.current && !batchRef.current.contains(e.target as Node)) setBatchOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="relative overflow-hidden rounded-card-lg p-6 lg:p-8 mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(246,247,244,0.95) 0%, rgba(232,235,227,0.95) 40%, rgba(212,217,204,0.95) 100%)',
        border: '1px solid var(--sage-200)',
      }}
    >
      {/* Background image overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'url(/workspace-meadow.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold" style={{ color: 'var(--sage-800)' }}>
            {t('平台中心', 'Platform Hub')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sage-500)' }}>
            {t('管理您的AI平台基础设施 · Manage your AI platform infrastructure', 'Manage your AI platform infrastructure')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-card-md border text-sm transition-all duration-200 focus-within:border-[var(--sage-500)]"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', width: '240px' }}
          >
            <Search size={16} style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder={t('搜索平台、API或技能...', 'Search platforms, APIs, skills...')}
              className="bg-transparent outline-none flex-1 text-sm"
              style={{ color: 'var(--sage-700)' }}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={onAddPlatform}
            className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-card"
            style={{ backgroundColor: 'var(--sage-600)' }}
          >
            <Plus size={16} />
            {t('添加平台', 'Add Platform')}
          </button>
          <div className="relative" ref={batchRef}>
            <button
              onClick={() => setBatchOpen(!batchOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium transition-all duration-200 hover:bg-[var(--sage-200)]"
              style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
            >
              {t('批量操作', 'Batch')}
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {batchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-card-md shadow-card-elevated overflow-hidden z-50"
                  style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)' }}
                >
                  {['启用所选', '禁用所选', '删除所选', '测试连接'].map((item) => (
                    <button key={item} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--sage-50)]" style={{ color: 'var(--sage-700)' }}>
                      {item}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Platforms Tab
   ═══════════════════════════════════════════════════════ */

function PlatformsTab({ t, searchQuery, platformCards, loading, error }: {
  t: (zh: string, en: string) => string;
  searchQuery: string;
  platformCards: PlatformCard[];
  loading: boolean;
  error: string | null;
}) {
  const filtered = platformCards.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--sage-400)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle size={32} style={{ color: '#b85c5c' }} className="mb-3" />
        <p className="text-sm font-medium" style={{ color: 'var(--sage-600)' }}>{t('加载失败', 'Load Failed')}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {filtered.map((platform, i) => (
        <PlatformCardComponent key={platform.id} platform={platform} t={t} index={i} />
      ))}
      {filtered.length === 0 && <EmptyState t={t} />}
    </div>
  );
}

function PlatformCardComponent({ platform, t, index }: { platform: PlatformCard; t: (zh: string, en: string) => string; index: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    function handler(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={revealed ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="rounded-card-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover group"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
      }}
      whileHover={{ borderColor: 'var(--sage-300)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-card-md flex items-center justify-center"
            style={{ backgroundColor: `${platform.tint}18` }}
          >
            <PlatformIcon icon={platform.icon} size={22} color={platform.tint} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>{platform.name}</h3>
            <p className="text-xs" style={{ color: 'var(--sage-400)' }}>{platform.provider}</p>
          </div>
        </div>
        <StatusDot status={platform.status} />
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-2 my-3 py-3" style={{ borderTop: '1px solid var(--sage-100)', borderBottom: '1px solid var(--sage-100)' }}>
        <div className="flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>{t('模型数', 'Models')}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--sage-600)' }}>{platform.modelCount}</p>
        </div>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--sage-200)' }} />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>{t('延迟', 'Latency')}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--sage-600)' }}>{platform.latency}ms</p>
        </div>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--sage-200)' }} />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>{t('最后使用', 'Last')}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--sage-600)' }}>{platform.lastUsed}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all duration-200 hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
          <Settings size={14} />
          {t('配置', 'Configure')}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all duration-200 hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
          <Play size={14} />
          {t('测试', 'Test')}
        </button>
        <div className="relative ml-auto" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-card-sm transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-400)' }}>
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-1 w-36 rounded-card-md shadow-card-elevated overflow-hidden z-50"
                style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)' }}
              >
                {[{ label: '编辑', icon: Edit3 }, { label: '复制配置', icon: Copy }, { label: '查看日志', icon: Eye }, { label: '删除', icon: Trash2 }].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[var(--sage-50)]" style={{ color: 'var(--sage-700)' }}>
                    <item.icon size={13} />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   API Management Tab
   ═══════════════════════════════════════════════════════ */

function ApiTab({ t, searchQuery, apiKeys, loading, error }: { t: (zh: string, en: string) => string; searchQuery: string; apiKeys: ApiKey[]; loading: boolean; error: string | null }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);

  const filtered = apiKeys
    .filter((k) =>
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.provider.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

  const toggleSelectAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map((k) => k.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const testConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => setTestingId(null), 2000);
  };

  return (
    <ContentCard>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>{t('状态', 'Status')}:</span>
          {['全部', '正常', '已断开', '错误'].map((s) => (
            <button key={s} className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Search size={14} style={{ color: 'var(--sage-400)' }} />
          <input
            type="text"
            placeholder={t('搜索API密钥名称...', 'Search API keys...')}
            className="bg-transparent outline-none text-sm w-48"
            style={{ color: 'var(--sage-700)' }}
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-card-md text-xs font-medium text-white" style={{ backgroundColor: 'var(--sage-600)' }}>
          <Plus size={14} />
          {t('添加API密钥', 'Add API Key')}
        </button>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-card-md"
            style={{ backgroundColor: 'var(--sage-100)', border: '1px solid var(--sage-200)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>
              {t(`已选择 ${selectedRows.size} 项`, `${selectedRows.size} selected`)}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {['启用', '禁用', '测试连接', '删除'].map((a) => (
                <button key={a} className="px-3 py-1 rounded-card-sm text-xs font-medium transition-colors hover:bg-[var(--sage-200)]" style={{ color: 'var(--sage-600)' }}>
                  {a}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto rounded-card-md" style={{ border: '1px solid var(--sage-200)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--sage-100)' }}>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={selectedRows.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
              </th>
              {[
                { key: 'name', label: t('名称', 'Name') },
                { key: 'provider', label: t('平台', 'Provider') },
                { key: 'endpoint', label: t('端点', 'Endpoint') },
                { key: 'modelCount', label: t('模型数', 'Models') },
                { key: 'status', label: t('状态', 'Status') },
                { key: 'latency', label: t('延迟', 'Latency') },
              ].map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--sage-500)' }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ChevronDown size={12} style={{ color: sortKey === col.key ? 'var(--sage-600)' : 'var(--sage-400)', transform: sortKey === col.key && !sortAsc ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>
                {t('操作', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((key, i) => (
              <motion.tr
                key={key.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="transition-colors duration-150 hover:bg-[var(--sage-50)]"
                style={{ borderBottom: '1px solid var(--sage-100)' }}
              >
                <td className="px-4 py-3.5">
                  <input type="checkbox" checked={selectedRows.has(key.id)} onChange={() => toggleRow(key.id)} className="rounded" />
                </td>
                <td className="px-4 py-3.5 font-medium" style={{ color: 'var(--sage-700)' }}>{key.name}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>
                    {key.provider}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--sage-500)' }}>
                  <div className="flex items-center gap-1.5">
                    {revealedKeys.has(key.id) ? key.keyMask : '••••••••'}
                    <button onClick={() => setRevealedKeys((prev) => { const n = new Set(prev); if (n.has(key.id)) n.delete(key.id); else n.add(key.id); return n; })} className="p-0.5 rounded hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-400)' }}>
                      {revealedKeys.has(key.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3.5">{key.modelCount}</td>
                <td className="px-4 py-3.5"><StatusDot status={key.status} /></td>
                <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--sage-500)' }}>
                  {testingId === key.id ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--sage-500)' }} /> : typeof key.latency === 'number' ? `${key.latency}ms` : key.latency}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-card-sm hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-500)' }} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => testConnection(key.id)} className="p-1.5 rounded-card-sm hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-500)' }} title="Test">
                      <Play size={14} />
                    </button>
                    <button className="p-1.5 rounded-card-sm hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-500)' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentCard>
  );
}

/* ═══════════════════════════════════════════════════════
   Skills Tab
   ═══════════════════════════════════════════════════════ */

function SkillsTab({ t, searchQuery }: { t: (zh: string, en: string) => string; searchQuery: string }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [skillSearch, setSkillSearch] = useState('');
  const [skills, setSkills] = useState([] as any[]);

  const filtered = skills.filter((s) => {
    const matchCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase());
    const matchGlobal = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && (searchQuery ? matchGlobal : matchSearch);
  });

  const toggleSkill = (id: string) => {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Category Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="w-full lg:w-60 flex-shrink-0"
      >
        <div className="rounded-card-lg p-4" style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-card-md mb-3" style={{ backgroundColor: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
            <Search size={14} style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder={t('搜索技能...', 'Search skills...')}
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--sage-700)' }}
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-card-md text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: activeCategory === cat.id ? 'var(--sage-500)' : 'transparent',
                  color: activeCategory === cat.id ? '#fff' : 'var(--sage-600)',
                }}
              >
                <CategoryIcon icon={cat.icon} size={16} />
                <span>{t(cat.name, cat.nameEn)}</span>
                <span
                  className="ml-auto min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: activeCategory === cat.id ? 'rgba(255,255,255,0.3)' : 'var(--sage-100)',
                    color: activeCategory === cat.id ? '#fff' : 'var(--sage-500)',
                  }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Skills Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="wait">
            {filtered.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="rounded-card-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover group"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--sage-200)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${skill.tint}18` }}
                    >
                      <SkillIcon icon={skill.icon} size={18} color={skill.tint} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{skill.name}</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${skill.tint}15`, color: skill.tint }}>
                        {skill.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSkill(skill.id)}
                    className="w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0"
                    style={{ backgroundColor: skill.enabled ? 'var(--sage-500)' : 'var(--sage-300)' }}
                  >
                    <motion.div
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                      animate={{ left: skill.enabled ? '22px' : '2px' }}
                      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--sage-500)' }}>{skill.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--sage-100)' }}>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--sage-400)' }}>{skill.version}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>
                      {skill.usageCount.toLocaleString()} {t('次使用', 'uses')}
                    </span>
                  </div>
                </div>
                {/* Platform compatibility */}
                <div className="flex items-center gap-1 mt-2">
                  {skill.platforms.map((plat) => (
                    <span key={plat} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-500)', border: '1px solid var(--sage-200)' }}>
                      {plat}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && <EmptyState t={t} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Add Platform Modal (4-step wizard)
   ═══════════════════════════════════════════════════════ */

function AddPlatformModal({ t, onClose }: { t: (zh: string, en: string) => string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const steps = [
    { label: t('选择提供商', 'Select Provider') },
    { label: t('配置端点', 'Configure Endpoint') },
    { label: t('添加模型', 'Add Models') },
    { label: t('测试连接', 'Test Connection') },
  ];

  const handleTest = () => {
    setTestStatus('testing');
    setTimeout(() => setTestStatus('success'), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26, 31, 24, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
        className="rounded-card-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#fff', boxShadow: 'var(--shadow-card-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-800)' }}>{t('添加新平台', 'Add New Platform')}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>{t('配置一个新的AI模型平台', 'Configure a new AI model platform')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-card-sm hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-400)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 flex-shrink-0"
                style={{
                  backgroundColor: i <= step ? 'var(--sage-500)' : 'var(--sage-200)',
                  color: i <= step ? '#fff' : 'var(--sage-500)',
                }}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: i <= step ? 'var(--sage-700)' : 'var(--sage-400)' }}>{s.label}</span>
              {i < steps.length - 1 && <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: i < step ? 'var(--sage-500)' : 'var(--sage-200)' }} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="px-6 pb-4">
          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <p className="text-sm font-medium mb-4" style={{ color: 'var(--sage-600)' }}>{t('选择平台类型', 'Select platform type')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {providerOptions.map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => setSelectedProvider(prov.id)}
                      className="flex items-center gap-3 p-4 rounded-card-lg border-2 transition-all duration-200 text-left"
                      style={{
                        borderColor: selectedProvider === prov.id ? 'var(--sage-500)' : 'var(--sage-200)',
                        backgroundColor: selectedProvider === prov.id ? 'var(--sage-50)' : '#fff',
                      }}
                    >
                      <div className="w-12 h-12 rounded-card-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sage-100)' }}>
                        <prov.icon size={24} style={{ color: 'var(--sage-600)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{prov.name}</p>
                        <p className="text-xs" style={{ color: 'var(--sage-400)' }}>{prov.desc}</p>
                      </div>
                      {selectedProvider === prov.id && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                          <CheckCircle2 size={20} style={{ color: 'var(--sage-500)' }} />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="space-y-4">
                  <FormField label={t('平台名称', 'Platform Name')}>
                    <input type="text" defaultValue={providerOptions.find((p) => p.id === selectedProvider)?.name || ''} className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)]" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }} />
                  </FormField>
                  <FormField label={t('API基础URL', 'API Base URL')}>
                    <input type="text" defaultValue="https://api.openai.com/v1" className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)] font-mono" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }} />
                  </FormField>
                  <FormField label={t('API密钥', 'API Key')}>
                    <div className="relative">
                      <input type="password" placeholder="sk-..." className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)] pr-10 font-mono" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }} />
                      <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={t('超时时间 (ms)', 'Timeout (ms)')}>
                      <input type="number" defaultValue={30000} className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)]" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }} />
                    </FormField>
                    <FormField label={t('重试次数', 'Retry Count')}>
                      <input type="number" defaultValue={3} className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)]" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }} />
                    </FormField>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--sage-600)' }}>{t('选择要启用的模型', 'Select models to enable')}</p>
                <div className="space-y-2">
                  {[
                    { name: 'gpt-4o', desc: '128K context · Multimodal', ctx: '128K' },
                    { name: 'gpt-4-turbo', desc: '128K context · Code expert', ctx: '128K' },
                    { name: 'gpt-3.5-turbo', desc: '16K context · Fast & cheap', ctx: '16K' },
                  ].map((m) => (
                    <label key={m.name} className="flex items-center gap-3 p-3 rounded-card-md border cursor-pointer hover:bg-[var(--sage-50)] transition-colors" style={{ borderColor: 'var(--sage-200)' }}>
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--sage-500)]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{m.name}</p>
                        <p className="text-xs" style={{ color: 'var(--sage-400)' }}>{m.desc}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}>{m.ctx}</span>
                    </label>
                  ))}
                </div>
                <FormField label={t('默认模型', 'Default Model')} className="mt-4">
                  <select className="w-full px-3 py-2.5 rounded-card-md border text-sm outline-none focus:border-[var(--sage-500)]" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }}>
                    <option>gpt-4o</option>
                    <option>gpt-4-turbo</option>
                    <option>gpt-3.5-turbo</option>
                  </select>
                </FormField>
              </motion.div>
            )}

            {/* Step 4 */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="text-center py-6">
                  <p className="text-sm mb-4" style={{ color: 'var(--sage-600)' }}>{t('点击测试按钮验证平台连接', 'Click test to verify platform connection')}</p>
                  <button
                    onClick={handleTest}
                    disabled={testStatus === 'testing' || testStatus === 'success'}
                    className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-card-md text-sm font-medium text-white transition-all duration-200"
                    style={{ backgroundColor: testStatus === 'success' ? '#5b9a6d' : testStatus === 'error' ? '#b85c5c' : 'var(--sage-600)' }}
                  >
                    {testStatus === 'testing' && <Loader2 size={16} className="animate-spin" />}
                    {testStatus === 'success' && <CheckCircle2 size={16} />}
                    {testStatus === 'error' && <XCircle size={16} />}
                    {testStatus === 'idle' && <Play size={16} />}
                    {testStatus === 'testing' ? t('测试中...', 'Testing...') : testStatus === 'success' ? t('连接成功 · 23ms', 'Connected · 23ms') : testStatus === 'error' ? t('连接失败', 'Failed') : t('测试连接', 'Test Connection')}
                  </button>
                  {testStatus === 'success' && (
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs mt-3" style={{ color: '#5b9a6d' }}>
                      {t('连接测试通过！您可以保存此平台配置。', 'Connection test passed! You can save this platform configuration.')}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
          >
            <ArrowLeft size={16} />
            {t('上一步', 'Back')}
          </button>
          <button
            onClick={() => {
              if (step >= 3) { onClose(); return; }
              setStep((s) => Math.min(3, s + 1));
            }}
            disabled={step === 0 && !selectedProvider}
            className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium text-white transition-all disabled:opacity-40 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--sage-600)' }}
          >
            {step >= 3 ? t('保存平台', 'Save Platform') : t('下一步', 'Next')}
            {step < 3 && <ArrowRight size={16} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--sage-600)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════ */

function EmptyState({ t }: { t: (zh: string, en: string) => string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--sage-100)' }}>
        <Server size={28} style={{ color: 'var(--sage-300)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--sage-500)' }}>{t('未找到匹配项', 'No results found')}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>{t('尝试调整搜索条件', 'Try adjusting your search')}</p>
    </div>
  );
}

