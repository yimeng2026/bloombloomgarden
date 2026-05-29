import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Server,
  Star,
  Diamond,
  Zap,
  Plus,
  Key,
  Search,
  X,
  FolderOpen,
  FileText,
  Database,
  BookOpen,
  Bot,
  Code,
  Globe,
  Image,
  BarChart3,
  Settings,
  Wrench,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useNavigate } from 'react-router-dom';
import { createAgent, fetchProviders } from '@/api/client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlatformOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ElementType;
  tint: string;
}

interface ApiConfig {
  id: string;
  name: string;
  platform: string;
  baseUrl: string;
  latency: number;
  models: string[];
  status: 'normal' | 'error';
}

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  usageCount: number;
}

interface WorkspaceItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modifiedAt: string;
  children?: WorkspaceItem[];
}

interface MemoryFile {
  id: string;
  name: string;
  agentName: string;
  type: string;
  description: string;
  size: string;
}

interface KnowledgeBaseItem {
  id: string;
  name: string;
  type: string;
  description: string;
  documentCount: number;
  indexRate: number;
  lastUpdated: string;
}

interface AvatarOption {
  id: string;
  type: string;
  color: string;
  svg: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const platforms: PlatformOption[] = [
  { id: 'openai', name: 'OpenAI', provider: 'OpenAI Inc.', description: 'GPT-4, GPT-3.5, DALL-E', icon: Zap, tint: '#7fa3b0' },
  { id: 'ollama', name: 'Ollama', provider: '本地部署', description: 'Llama, Mistral, 本地模型', icon: Server, tint: '#7fb89f' },
  { id: 'kimi', name: 'Kimi', provider: 'Moonshot AI', description: 'k1.5, moonshot', icon: Star, tint: '#d4a373' },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', description: 'Claude-3, Claude-3.5', icon: Diamond, tint: '#a78b9a' },
  { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Gemini Pro, Gemini Ultra', icon: Sparkles, tint: '#c9a96e' },
  { id: 'custom', name: '自定义', provider: 'Custom Endpoint', description: '自定义配置端点', icon: Plus, tint: '#6b7a5a' },
];

const apiConfigs: ApiConfig[] = [
  { id: 'api-1', name: 'OpenAI-生产', platform: 'OpenAI', baseUrl: 'https://api.openai.com/v1', latency: 23, models: ['GPT-4o', 'GPT-3.5-turbo'], status: 'normal' },
  { id: 'api-2', name: 'OpenAI-测试', platform: 'OpenAI', baseUrl: 'https://api.openai.com/v1', latency: 45, models: ['GPT-4o'], status: 'normal' },
  { id: 'api-3', name: 'Kimi-主节点', platform: 'Kimi', baseUrl: 'https://api.moonshot.cn', latency: 156, models: ['moonshot-v1', 'k1.5'], status: 'normal' },
  { id: 'api-4', name: 'Ollama-本地', platform: 'Ollama', baseUrl: (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434', latency: 12, models: ['llama3.1', 'mistral'], status: 'normal' },
  { id: 'api-5', name: 'Claude-API', platform: 'Claude', baseUrl: 'https://api.anthropic.com', latency: 67, models: ['claude-sonnet', 'claude-haiku'], status: 'normal' },
  { id: 'api-6', name: 'Gemini-API', platform: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com', latency: 89, models: ['gemini-1.5-pro'], status: 'normal' },
];

const skillCategories = [
  { id: 'all', name: '全部' },
  { id: 'code', name: '代码' },
  { id: 'research', name: '研究' },
  { id: 'data', name: '数据' },
  { id: 'creative', name: '创作' },
  { id: 'system', name: '系统' },
];

const skills: Skill[] = [
  { id: 'skill-1', name: '代码审查', category: 'code', description: '自动审查代码质量、风格和潜在问题', icon: Code, usageCount: 1280 },
  { id: 'skill-2', name: '代码生成', category: 'code', description: '根据需求生成代码片段和完整函数', icon: Code, usageCount: 3420 },
  { id: 'skill-3', name: '调试助手', category: 'code', description: '分析错误日志，提供调试建议', icon: Wrench, usageCount: 890 },
  { id: 'skill-4', name: '网络搜索', category: 'research', description: '实时搜索网络获取最新信息', icon: Globe, usageCount: 5670 },
  { id: 'skill-5', name: '文档解析', category: 'research', description: '解析PDF、Word等文档内容', icon: FileText, usageCount: 2340 },
  { id: 'skill-6', name: '数据分析', category: 'data', description: '处理和分析结构化数据', icon: BarChart3, usageCount: 1890 },
  { id: 'skill-7', name: '数据可视化', category: 'data', description: '生成图表和数据可视化', icon: BarChart3, usageCount: 1560 },
  { id: 'skill-8', name: '图像生成', category: 'creative', description: '根据描述生成AI图像', icon: Image, usageCount: 3210 },
  { id: 'skill-9', name: '内容写作', category: 'creative', description: '撰写文章、博客和营销文案', icon: Pencil, usageCount: 2890 },
  { id: 'skill-10', name: '文件管理', category: 'system', description: '读写和管理工作空间文件', icon: FolderOpen, usageCount: 4120 },
  { id: 'skill-11', name: '配置管理', category: 'system', description: '管理智能体配置和参数', icon: Settings, usageCount: 980 },
  { id: 'skill-12', name: 'API调用', category: 'system', description: '调用外部API获取数据', icon: Server, usageCount: 2450 },
];

const workspaceItems: WorkspaceItem[] = [
  {
    id: 'ws-1', name: '项目文档', type: 'folder', modifiedAt: '2026-01-15',
    children: [
      { id: 'ws-1-1', name: '需求规格.md', type: 'file', size: '24 KB', modifiedAt: '2026-01-15' },
      { id: 'ws-1-2', name: 'API设计.json', type: 'file', size: '156 KB', modifiedAt: '2026-01-14' },
      { id: 'ws-1-3', name: '架构图.png', type: 'file', size: '2.1 MB', modifiedAt: '2026-01-13' },
    ],
  },
  {
    id: 'ws-2', name: '数据源', type: 'folder', modifiedAt: '2026-01-14',
    children: [
      { id: 'ws-2-1', name: '销售数据.csv', type: 'file', size: '1.8 MB', modifiedAt: '2026-01-14' },
      { id: 'ws-2-2', name: '用户行为.xlsx', type: 'file', size: '890 KB', modifiedAt: '2026-01-13' },
    ],
  },
  {
    id: 'ws-3', name: '代码库', type: 'folder', modifiedAt: '2026-01-12',
    children: [
      { id: 'ws-3-1', name: 'utils.ts', type: 'file', size: '12 KB', modifiedAt: '2026-01-12' },
      { id: 'ws-3-2', name: 'config.yaml', type: 'file', size: '4 KB', modifiedAt: '2026-01-11' },
    ],
  },
  { id: 'ws-4', name: '全局配置.env', type: 'file', size: '2 KB', modifiedAt: '2026-01-10' },
  { id: 'ws-5', name: 'README.md', type: 'file', size: '8 KB', modifiedAt: '2026-01-09' },
];

const memoryFiles: MemoryFile[] = [
  { id: 'mem-1', name: 'conversation-history.json', agentName: '代码助手-01', type: '对话历史', description: '与用户的对话记录和上下文', size: '156 KB' },
  { id: 'mem-2', name: 'code-preferences.json', agentName: '代码助手-01', type: '偏好设置', description: '代码风格偏好和常用模式', size: '12 KB' },
  { id: 'mem-3', name: 'analysis-patterns.json', agentName: '数据分析-A', type: '分析模式', description: '数据分析模板和常用查询', size: '45 KB' },
  { id: 'mem-4', name: 'doc-templates.json', agentName: '文档撰写-B', type: '文档模板', description: '文档结构和模板偏好', size: '23 KB' },
];

const knowledgeBases: KnowledgeBaseItem[] = [
  { id: 'kb-1', name: '技术文档库', type: '文档', description: 'API文档、技术规范和开发指南', documentCount: 1247, indexRate: 98, lastUpdated: '2026-01-15' },
  { id: 'kb-2', name: '产品知识库', type: '产品', description: '产品功能、使用手册和FAQ', documentCount: 356, indexRate: 100, lastUpdated: '2026-01-14' },
  { id: 'kb-3', name: 'API参考手册', type: 'API', description: '内部API接口文档和示例', documentCount: 892, indexRate: 95, lastUpdated: '2026-01-15' },
  { id: 'kb-4', name: '设计规范', type: '设计', description: 'UI/UX设计规范和组件库', documentCount: 234, indexRate: 100, lastUpdated: '2026-01-13' },
  { id: 'kb-5', name: '会议纪要', type: '会议', description: '团队会议记录和决策追踪', documentCount: 567, indexRate: 92, lastUpdated: '2026-01-15' },
  { id: 'kb-6', name: '通用知识', type: '通用', description: '通用知识和最佳实践', documentCount: 2103, indexRate: 97, lastUpdated: '2026-01-12' },
];

const avatarOptions: AvatarOption[] = [
  { id: 'avatar-1', type: 'leaf', color: '#7fb89f', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 4C18 14 10 20 10 28a14 14 0 1028 0c0-8-8-14-14-24z" fill="currentColor" opacity="0.8"/><path d="M24 16c-4 6-8 10-8 14a8 8 0 0016 0c0-4-4-8-8-14z" fill="currentColor" opacity="0.5"/></svg> },
  { id: 'avatar-2', type: 'flower', color: '#c97b84', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="6" fill="currentColor"/><circle cx="24" cy="10" r="5" fill="currentColor" opacity="0.7"/><circle cx="36" cy="18" r="5" fill="currentColor" opacity="0.7"/><circle cx="32" cy="34" r="5" fill="currentColor" opacity="0.7"/><circle cx="16" cy="34" r="5" fill="currentColor" opacity="0.7"/><circle cx="12" cy="18" r="5" fill="currentColor" opacity="0.7"/></svg> },
  { id: 'avatar-3', type: 'tree', color: '#6b7a5a', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 4L10 20h8v8h-8l14 16 14-16h-8v-8h8z" fill="currentColor" opacity="0.8"/></svg> },
  { id: 'avatar-4', type: 'fern', color: '#8f9a7d', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 4v40" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M24 12c-6 2-10 6-10 10 0-4 4-8 10-10z" fill="currentColor" opacity="0.7"/><path d="M24 20c6 2 10 6 10 10 0-4-4-8-10-10z" fill="currentColor" opacity="0.7"/><path d="M24 8c-4 2-8 5-8 8 0-3 4-6 8-8z" fill="currentColor" opacity="0.5"/></svg> },
  { id: 'avatar-5', type: 'mushroom', color: '#d4a373', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M10 24c0-10 6-18 14-18s14 8 14 18z" fill="currentColor" opacity="0.8"/><rect x="20" y="24" width="8" height="16" rx="2" fill="currentColor" opacity="0.6"/></svg> },
  { id: 'avatar-6', type: 'vine', color: '#a78b9a', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M8 40Q16 30 24 24T40 8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/><circle cx="24" cy="24" r="3" fill="currentColor"/><circle cx="32" cy="16" r="2.5" fill="currentColor" opacity="0.7"/><circle cx="16" cy="32" r="2.5" fill="currentColor" opacity="0.7"/></svg> },
  { id: 'avatar-7', type: 'seed', color: '#c9a96e', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><ellipse cx="24" cy="28" rx="8" ry="10" fill="currentColor" opacity="0.8"/><path d="M24 18c0-8 4-14 4-14s-4 2-8 2-4-2-4-2 4 6 4 14z" fill="currentColor" opacity="0.6"/></svg> },
  { id: 'avatar-8', type: 'petal', color: '#7fa3b0', svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 4c-8 8-12 16-12 22a12 12 0 1024 0c0-6-4-14-12-22z" fill="currentColor" opacity="0.7"/><circle cx="24" cy="26" r="4" fill="currentColor" opacity="0.9"/></svg> },
];

/* ------------------------------------------------------------------ */
/*  Easing                                                             */
/* ------------------------------------------------------------------ */

const easeGentle = [0.22, 1, 0.36, 1] as [number, number, number, number];
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

const stepLabels = ['平台', 'API', '技能', '记忆', '知识', '确认'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="flex items-center gap-0">
        {stepLabels.map((label, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isUpcoming = i > currentStep;

          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className="relative flex items-center justify-center rounded-full border-2"
                  style={{
                    width: isCurrent ? 28 : 24,
                    height: isCurrent ? 28 : 24,
                    borderColor: isCompleted || isCurrent ? 'var(--sage-500)' : 'var(--sage-300)',
                    backgroundColor: isCompleted ? 'var(--sage-500)' : isCurrent ? 'var(--sage-500)' : 'transparent',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(107,122,90,0.15)' : 'none',
                  }}
                  animate={{
                    width: isCurrent ? 28 : 24,
                    height: isCurrent ? 28 : 24,
                  }}
                  transition={{ duration: 0.3, ease: easeSpring }}
                >
                  {isCompleted ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: easeSpring }}>
                      <Check size={12} className="text-white" />
                    </motion.div>
                  ) : (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isCurrent ? '#fff' : 'var(--sage-400)' }}
                    >
                      {i + 1}
                    </span>
                  )}
                </motion.div>
                <span
                  className="text-xs font-medium transition-all duration-300"
                  style={{
                    color: isCurrent ? 'var(--sage-700)' : isCompleted ? 'var(--sage-500)' : 'var(--sage-400)',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="relative mx-2 mb-5" style={{ width: 60, height: 2 }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--sage-200)', borderRadius: 1 }} />
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      backgroundColor: 'var(--sage-500)',
                      borderRadius: 1,
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: easeGentle }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Botanical Avatar SVG                                               */
/* ------------------------------------------------------------------ */

function BotanicalAvatar({ type, color, size = 40 }: { type: string; color: string; size?: number }) {
  const av = avatarOptions.find(a => a.type === type);
  if (!av) return null;
  return (
    <div style={{ width: size, height: size, color }} className="flex items-center justify-center">
      {av.svg}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Select Platform                                           */
/* ------------------------------------------------------------------ */

function Step1Platform({ selected, onSelect, platformsData = platforms }: { selected: string | null; onSelect: (id: string) => void; platformsData?: PlatformOption[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择平台</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择一个AI平台作为智能体的基础</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {platformsData.map((p, i) => {
          const isSelected = selected === p.id;
          const Icon = p.icon;
          return (
            <motion.button
              key={p.id}
              className="relative flex flex-col items-center gap-3 p-5 rounded-card border-2 transition-all duration-200 text-left"
              style={{
                backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: easeGentle }}
              whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
              onClick={() => onSelect(p.id)}
            >
              <div
                className="w-12 h-12 rounded-card-sm flex items-center justify-center"
                style={{ backgroundColor: `${p.tint}20` }}
              >
                <Icon size={24} style={{ color: p.tint }} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{p.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>{p.provider}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--sage-500)' }}>{p.description}</div>
              </div>
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center absolute top-3 right-3"
                style={{
                  borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-300)',
                  backgroundColor: isSelected ? 'var(--sage-500)' : 'transparent',
                }}
              >
                {isSelected && <Check size={10} className="text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Select API                                                */
/* ------------------------------------------------------------------ */

function Step2API({ selected, onSelect, platformId }: { selected: string | null; onSelect: (id: string) => void; platformId: string | null }) {
  const platform = platforms.find(p => p.id === platformId);
  const filteredApis = apiConfigs.filter(a => platformId === 'custom' || !platformId || a.platform === platform?.name);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择API</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择该平台下的API配置</p>
      </div>

      {platform && (
        <div
          className="flex items-center gap-3 p-3 rounded-card-sm mb-6"
          style={{ backgroundColor: 'var(--sage-50)' }}
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${platform.tint}20` }}>
            <platform.icon size={16} style={{ color: platform.tint }} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{platform.name}</span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-200)', color: 'var(--sage-500)' }}>已选择</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredApis.map((api, i) => {
          const isSelected = selected === api.id;
          return (
            <motion.button
              key={api.id}
              className="w-full flex items-center gap-4 p-4 rounded-card border-l-4 transition-all duration-200 text-left"
              style={{
                backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                borderColor: isSelected ? 'var(--sage-200)' : 'var(--sage-200)',
                borderLeftColor: isSelected ? 'var(--sage-500)' : 'transparent',
                borderLeftWidth: isSelected ? 4 : 0,
                boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
              onClick={() => onSelect(api.id)}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{
                  borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-300)',
                  backgroundColor: isSelected ? 'var(--sage-500)' : 'transparent',
                }}
              >
                {isSelected && <Check size={12} className="text-white" />}
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sage-100)' }}>
                <Key size={18} style={{ color: 'var(--sage-400)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{api.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: api.status === 'normal' ? 'rgba(91,154,109,0.15)' : 'rgba(184,92,92,0.15)',
                      color: api.status === 'normal' ? 'var(--success)' : 'var(--error)',
                    }}
                  >
                    {api.status === 'normal' ? '正常' : '错误'}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                  {api.platform} · {api.baseUrl} · 延迟 {api.latency}ms
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {api.models.map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Select Skills                                             */
/* ------------------------------------------------------------------ */

function Step3Skills({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const filteredSkills = skills.filter(s => {
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择技能</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择智能体需要具备的能力</p>
      </div>

      <div className="flex gap-4">
        {/* Category sidebar */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {skillCategories.map(cat => {
            const count = cat.id === 'all' ? skills.length : skills.filter(s => s.category === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                className="w-full flex items-center justify-between px-3 py-2 rounded-card-sm text-sm transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'var(--sage-500)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--sage-600)',
                }}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span>{cat.name}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--sage-100)',
                    color: isActive ? '#fff' : 'var(--sage-400)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Skills grid */}
        <div className="flex-1">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder="搜索技能..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)]"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', color: 'var(--sage-700)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredSkills.map((skill, i) => {
              const isSelected = selected.includes(skill.id);
              const Icon = skill.icon;
              return (
                <motion.button
                  key={skill.id}
                  className="relative flex flex-col gap-2 p-4 rounded-card border-2 transition-all duration-200 text-left"
                  style={{
                    backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                    borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
                  onClick={() => onToggle(skill.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)' }}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <Icon size={16} style={{ color: 'var(--sage-400)' }} />
                    <span className="font-medium text-sm" style={{ color: 'var(--sage-700)' }}>{skill.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-400)' }}>
                    {skillCategories.find(c => c.id === skill.category)?.name}
                  </span>
                  <p className="text-xs" style={{ color: 'var(--sage-400)' }}>{skill.description}</p>
                  <span className="text-xs" style={{ color: 'var(--sage-300)' }}>使用 {skill.usageCount} 次</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected skills summary */}
      {selected.length > 0 && (
        <motion.div
          className="mt-6 p-4 rounded-card border"
          style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>已选择 {selected.length} 个技能</div>
          <div className="flex flex-wrap gap-2">
            {selected.map(id => {
              const skill = skills.find(s => s.id === id);
              if (!skill) return null;
              return (
                <motion.span
                  key={id}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2, ease: easeSpring }}
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  {skill.name}
                  <X size={10} />
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Memory & Workspace                                        */
/* ------------------------------------------------------------------ */

function Step4Memory({ selectedFiles, onToggleFile }: { selectedFiles: string[]; onToggleFile: (id: string) => void }) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['ws-1', 'ws-2', 'ws-3']));
  const [search, setSearch] = useState('');
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [newMemoryName, setNewMemoryName] = useState('');

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: WorkspaceItem, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFiles.includes(item.id);
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch && !isFolder) return null;

    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-md transition-colors duration-150 cursor-pointer"
          style={{
            paddingLeft: `${12 + depth * 16}px`,
            backgroundColor: isSelected ? 'var(--sage-50)' : 'transparent',
          }}
          onClick={() => !isFolder && onToggleFile(item.id)}
        >
          {isFolder ? (
            <button onClick={(e) => { e.stopPropagation(); toggleFolder(item.id); }} style={{ color: 'var(--sage-400)' }}>
              {isExpanded ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div
              className="w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-300)',
                backgroundColor: isSelected ? 'var(--sage-500)' : 'transparent',
              }}
            >
              {isSelected && <Check size={10} className="text-white" />}
            </div>
          )}
          {isFolder ? <FolderOpen size={14} style={{ color: 'var(--bloom-amber)' }} /> : <FileText size={14} style={{ color: 'var(--sage-400)' }} />}
          <span className="text-sm flex-1" style={{ color: 'var(--sage-700)' }}>{item.name}</span>
          {!isFolder && item.size && (
            <span className="text-xs" style={{ color: 'var(--sage-300)' }}>{item.size}</span>
          )}
        </div>
        {isFolder && isExpanded && item.children?.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择记忆与工作空间</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择智能体可以访问的工作文件和记忆</p>
      </div>

      {/* Workspace Files */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>工作文件</h3>
          <span className="text-xs" style={{ color: 'var(--sage-400)' }}>选择智能体可以读写的文件</span>
        </div>
        <div
          className="rounded-card border overflow-hidden"
          style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
              <input
                type="text"
                placeholder="搜索文件..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-card-sm border text-sm outline-none"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
              />
            </div>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto">
            {workspaceItems.map(item => renderItem(item))}
          </div>
        </div>
      </div>

      {/* Memory Files */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>记忆文件</h3>
          <span className="text-xs" style={{ color: 'var(--sage-400)' }}>继承已有智能体的记忆</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {memoryFiles.map((mem, i) => {
            const isSelected = selectedFiles.includes(mem.id);
            return (
              <motion.div
                key={mem.id}
                className="flex items-start gap-3 p-4 rounded-card border-2 transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                  borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: easeGentle }}
                onClick={() => onToggleFile(mem.id)}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                  }}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Bot size={14} style={{ color: 'var(--sage-400)' }} />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--sage-700)' }}>{mem.name}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                    {mem.agentName} · {mem.type}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>{mem.description}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--sage-300)' }}>{mem.size}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Create new memory */}
      <div className="mt-4">
        {!showNewMemory ? (
          <button
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: 'var(--sage-500)' }}
            onClick={() => setShowNewMemory(true)}
          >
            <Plus size={16} />
            创建新记忆文件
          </button>
        ) : (
          <motion.div
            className="flex items-center gap-3 p-4 rounded-card border"
            style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <input
              type="text"
              placeholder="输入记忆文件名称..."
              value={newMemoryName}
              onChange={e => setNewMemoryName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-card-sm border text-sm outline-none"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
              autoFocus
            />
            <button
              className="px-4 py-2 rounded-card-sm text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--sage-500)' }}
              onClick={() => { if (newMemoryName.trim()) { onToggleFile(`mem-new-${Date.now()}`); setNewMemoryName(''); setShowNewMemory(false); } }}
            >
              创建
            </button>
            <button
              className="px-3 py-2 rounded-card-sm text-sm"
              style={{ color: 'var(--sage-400)' }}
              onClick={() => { setShowNewMemory(false); setNewMemoryName(''); }}
            >
              取消
            </button>
          </motion.div>
        )}
      </div>

      {/* Selected summary */}
      {selectedFiles.length > 0 && (
        <motion.div
          className="mt-6 p-4 rounded-card border"
          style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>已选择 {selectedFiles.length} 个文件</div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map(id => {
              const file = memoryFiles.find(m => m.id === id);
              const wsItem = workspaceItems.flatMap(w => w.children || []).find(c => c.id === id) || workspaceItems.find(w => w.id === id);
              const name = file?.name || wsItem?.name || id;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  onClick={() => onToggleFile(id)}
                >
                  {name}
                  <X size={10} />
                </span>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Knowledge Base                                            */
/* ------------------------------------------------------------------ */

function Step5Knowledge({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择知识库</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择智能体可以查询的知识来源</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {knowledgeBases.map((kb, i) => {
          const isSelected = selected.includes(kb.id);
          return (
            <motion.button
              key={kb.id}
              className="relative flex flex-col gap-2 p-5 rounded-card border-2 transition-all duration-200 text-left"
              style={{
                backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: easeGentle }}
              onClick={() => onToggle(kb.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)' }}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <BookOpen size={16} style={{ color: 'var(--bloom-lavender)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--sage-700)' }}>{kb.name}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full self-start"
                style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}
              >
                {kb.type}
              </span>
              <p className="text-xs" style={{ color: 'var(--sage-400)' }}>{kb.description}</p>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--sage-400)' }}>
                <span className="flex items-center gap-1">
                  <FileText size={12} /> {kb.documentCount} 文档
                </span>
                <span>{kb.indexRate}% 索引</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--sage-300)' }}>更新于 {kb.lastUpdated}</div>
            </motion.button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <motion.div
          className="mt-6 p-4 rounded-card border"
          style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>已选择 {selected.length} 个知识库</div>
          <div className="flex flex-wrap gap-2">
            {selected.map(id => {
              const kb = knowledgeBases.find(k => k.id === id);
              if (!kb) return null;
              return (
                <motion.span
                  key={id}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  {kb.name}
                  <X size={10} />
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 6 — Review & Create                                           */
/* ------------------------------------------------------------------ */

function Step6Review({
  wizardState,
  onUpdate,
  onStepClick,
  onCreate,
  isSubmitting,
}: {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onStepClick: (step: number) => void;
  onCreate: () => void;
  isSubmitting: boolean;
}) {
  const { platformId, apiId, selectedSkills, selectedFiles, selectedKBs, agentName, agentDescription, agentAvatar } = wizardState;
  const platform = platforms.find(p => p.id === platformId);
  const api = apiConfigs.find(a => a.id === apiId);
  const selectedSkillList = skills.filter(s => selectedSkills.includes(s.id));
  const selectedKBList = knowledgeBases.filter(k => selectedKBs.includes(k.id));
  const isReady = agentName.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>确认配置</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>查看并确认您的智能体配置</p>
      </div>

      {/* Agent Name */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>
          智能体名称 <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input
          type="text"
          placeholder="输入名称，例如：代码助手-01"
          value={agentName}
          onChange={e => onUpdate({ agentName: e.target.value })}
          className="w-full px-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)]"
          style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
        />
        <label className="block text-sm font-medium mt-4 mb-2" style={{ color: 'var(--sage-700)' }}>描述（可选）</label>
        <textarea
          placeholder="输入智能体的描述..."
          value={agentDescription}
          onChange={e => onUpdate({ agentDescription: e.target.value })}
          className="w-full px-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)] resize-y"
          style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', minHeight: 80 }}
        />

        {/* Avatar Selector */}
        <label className="block text-sm font-medium mt-4 mb-3" style={{ color: 'var(--sage-700)' }}>选择头像</label>
        <div className="flex items-center gap-3">
          {avatarOptions.map(avatar => (
            <button
              key={avatar.id}
              className="relative w-12 h-12 rounded-full border-2 p-1.5 transition-all duration-200 flex items-center justify-center"
              style={{
                borderColor: agentAvatar === avatar.id ? avatar.color : 'var(--sage-200)',
                backgroundColor: agentAvatar === avatar.id ? `${avatar.color}15` : 'transparent',
                transform: agentAvatar === avatar.id ? 'scale(1.1)' : 'scale(1)',
              }}
              onClick={() => onUpdate({ agentAvatar: avatar.id })}
            >
              <BotanicalAvatar type={avatar.type} color={avatar.color} size={32} />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Platform Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>平台配置</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(0)}>编辑</button>
        </div>
        <div className="text-sm" style={{ color: 'var(--sage-500)' }}>
          {platform ? (
            <span>平台: {platform.name} · API: {api?.name || '未选择'} · 模型: {api?.models.join(', ') || '—'}</span>
          ) : '未选择平台'}
        </div>
      </motion.div>

      {/* Skills Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>技能配置</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(2)}>编辑</button>
        </div>
        {selectedSkillList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedSkillList.map(s => (
              <span key={s.id} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>{s.name}</span>
            ))}
          </div>
        ) : (
          <span className="text-sm" style={{ color: 'var(--sage-400)' }}>未选择技能（可选）</span>
        )}
      </motion.div>

      {/* Workspace Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>工作空间</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(3)}>编辑</button>
        </div>
        <div className="text-sm" style={{ color: 'var(--sage-500)' }}>
          已选择 {selectedFiles.length} 个文件
          {selectedFiles.length > 0 && (
            <span className="ml-2 text-xs" style={{ color: 'var(--sage-400)' }}>
              ({selectedFiles.slice(0, 3).join(', ')}{selectedFiles.length > 3 ? ` 等` : ''})
            </span>
          )}
        </div>
      </motion.div>

      {/* Knowledge Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>知识库</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(4)}>编辑</button>
        </div>
        {selectedKBList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedKBList.map(k => (
              <span key={k.id} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>{k.name}</span>
            ))}
          </div>
        ) : (
          <span className="text-sm" style={{ color: 'var(--sage-400)' }}>未选择知识库（可选）</span>
        )}
      </motion.div>

      {/* Create Button */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className="w-full py-3.5 rounded-card text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            backgroundColor: isReady && !isSubmitting ? 'var(--sage-500)' : 'var(--sage-300)',
            cursor: isReady && !isSubmitting ? 'pointer' : 'not-allowed',
            boxShadow: isReady && !isSubmitting ? '0 0 0 3px rgba(107,122,90,0.2)' : 'none',
          }}
          disabled={!isReady || isSubmitting}
          onClick={() => {
            if (isReady && !isSubmitting) {
              onCreate();
            }
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              创建智能体
            </>
          )}
        </button>
        <div className="text-center mt-3">
          <span className="text-xs cursor-pointer transition-colors hover:underline" style={{ color: 'var(--sage-400)' }}>
            取消
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard State                                                       */
/* ------------------------------------------------------------------ */

interface WizardState {
  platformId: string | null;
  apiId: string | null;
  selectedSkills: string[];
  selectedFiles: string[];
  selectedKBs: string[];
  agentName: string;
  agentDescription: string;
  agentAvatar: string;
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AgentCreator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>({
    platformId: null,
    apiId: null,
    selectedSkills: [],
    selectedFiles: [],
    selectedKBs: [],
    agentName: '',
    agentDescription: '',
    agentAvatar: 'avatar-1',
  });
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendProviders, setBackendProviders] = useState<PlatformOption[]>([]);

  /* Fetch providers from backend */
  useEffect(() => {
    fetchProviders()
      .then((data: any) => {
        if (Array.isArray(data)) {
          setBackendProviders(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              provider: p.provider || p.name,
              description: p.description || '',
              icon: Server,
              tint: '#7fb89f',
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to fetch providers:', err));
  }, []);

  const handleCreate = async () => {
    if (!wizardState.agentName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: wizardState.agentName,
        providers: wizardState.apiId ? [{ id: wizardState.apiId, priority: 1 }] : [],
        accessLayer: 'standard',
        runtime: 'default',
        agentZero: { enabled: false, mode: 'standard' },
      };

      await createAgent(payload);
      navigate('/agents');
    } catch (err) {
      console.error('Failed to create agent:', err);
      alert('创建智能体失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const goNext = () => {
    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  // Validation
  const canGoNext = (() => {
    switch (currentStep) {
      case 0: return !!wizardState.platformId;
      case 1: return !!wizardState.apiId;
      case 5: return wizardState.agentName.trim().length > 0;
      default: return true;
    }
  })();

  const stepValidations = [
    !!wizardState.platformId,
    !!wizardState.apiId,
    true,
    true,
    true,
    wizardState.agentName.trim().length > 0,
  ];

  const allStepsValid = stepValidations.every(Boolean);

  return (
    <div className="max-w-[900px] mx-auto pb-24">
      {/* Hero Header */}
      <div
        className="relative rounded-card overflow-hidden mb-6"
        style={{ minHeight: 160 }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/onboarding-garden.jpg)', opacity: 0.9 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(26,31,24,0.5) 0%, rgba(45,53,40,0.3) 100%)' }}
        />
        <div className="relative z-10 p-8">
          <h1 className="text-3xl font-display font-bold text-white">创建智能体</h1>
          <p className="text-sm mt-2 text-white/70">像培育种子一样，一步步构建您的AI智能体</p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <div className="mt-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.4, ease: easeGentle }}
          >
            {currentStep === 0 && (
              <Step1Platform
                selected={wizardState.platformId}
                onSelect={(id) => updateState({ platformId: id })}
                platformsData={backendProviders.length > 0 ? backendProviders : platforms}
              />
            )}
            {currentStep === 1 && (
              <Step2API
                selected={wizardState.apiId}
                onSelect={(id) => updateState({ apiId: id })}
                platformId={wizardState.platformId}
              />
            )}
            {currentStep === 2 && (
              <Step3Skills
                selected={wizardState.selectedSkills}
                onToggle={(id) => {
                  const next = wizardState.selectedSkills.includes(id)
                    ? wizardState.selectedSkills.filter(s => s !== id)
                    : [...wizardState.selectedSkills, id];
                  updateState({ selectedSkills: next });
                }}
              />
            )}
            {currentStep === 3 && (
              <Step4Memory
                selectedFiles={wizardState.selectedFiles}
                onToggleFile={(id) => {
                  const next = wizardState.selectedFiles.includes(id)
                    ? wizardState.selectedFiles.filter(f => f !== id)
                    : [...wizardState.selectedFiles, id];
                  updateState({ selectedFiles: next });
                }}
              />
            )}
            {currentStep === 4 && (
              <Step5Knowledge
                selected={wizardState.selectedKBs}
                onToggle={(id) => {
                  const next = wizardState.selectedKBs.includes(id)
                    ? wizardState.selectedKBs.filter(k => k !== id)
                    : [...wizardState.selectedKBs, id];
                  updateState({ selectedKBs: next });
                }}
              />
            )}
            {currentStep === 5 && (
              <Step6Review
                wizardState={wizardState}
                onUpdate={updateState}
                onStepClick={goToStep}
                onCreate={handleCreate}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div
        className="fixed bottom-0 right-0 flex items-center justify-between px-6 py-4 border-t bg-white z-30"
        style={{
          left: 'var(--sidebar-width)',
          borderColor: 'var(--sage-200)',
          marginLeft: 0,
        }}
      >
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-card-sm text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--sage-100)',
            color: currentStep === 0 ? 'var(--sage-300)' : 'var(--sage-700)',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          <ChevronLeft size={16} />
          上一步
        </button>
        <button
          className="flex items-center gap-2 px-6 py-2.5 rounded-card-sm text-sm font-medium text-white transition-all duration-200"
          style={{
            backgroundColor: canGoNext && !isSubmitting ? 'var(--sage-500)' : 'var(--sage-300)',
            cursor: canGoNext && !isSubmitting ? 'pointer' : 'not-allowed',
            boxShadow: canGoNext && !isSubmitting ? '0 0 0 3px rgba(107,122,90,0.2)' : 'none',
          }}
          onClick={() => {
            if (currentStep === 5 && allStepsValid && !isSubmitting) {
              handleCreate();
              return;
            }
            if (canGoNext) goNext();
          }}
          disabled={!canGoNext || isSubmitting}
        >
          {currentStep === 5 ? (
            isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                创建智能体
              </>
            )
          ) : (
            <>
              下一步
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

