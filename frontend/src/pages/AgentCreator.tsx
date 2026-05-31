import React from 'react'
import { useState, useEffect } from 'react';
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
  Route,
  Network,
  Waypoints,
  Cpu,
  Thermometer,
  Hash,
  Layers,
  UserCog,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useNavigate } from 'react-router-dom';
import { createAgent, fetchProviders, fetchPlatformsByLevel } from '@/api/client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CreateMode = 'single' | 'multi' | 'gateway';

interface ThreadConfig {
  id: string;
  name: string;
  platformId: string | null;
}

interface PlatformOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ElementType;
  tint: string;
  protocolLevel?: number;
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

interface RolePreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  icon: React.ElementType;
}

interface WizardState {
  // Step 0: Mode
  mode: CreateMode | null;

  // Step 1: Platform selection
  platformId: string | null;           // L1 for single, L2 for multi, L3 for gateway
  gatewayBackendId: string | null;     // L1 backend for gateway mode
  threads: ThreadConfig[];             // thread configs for multi mode
  threadCount: number;                 // number of threads for multi mode

  // Step 2: Role config
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  rolePresetId: string | null;

  // Step 3: Skills
  selectedSkills: string[];

  // Step 4: Knowledge
  selectedKBs: string[];

  // Step 5: Work files
  selectedFiles: string[];

  // Step 6: Review
  agentName: string;
  agentDescription: string;
  agentAvatar: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const l1Platforms: PlatformOption[] = [
  { id: 'openai', name: 'OpenAI', provider: 'OpenAI Inc.', description: 'GPT-4o, GPT-4, GPT-3.5', icon: Zap, tint: '#7fa3b0', protocolLevel: 1 },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', description: 'Claude 3.5, Claude 3', icon: Diamond, tint: '#a78b9a', protocolLevel: 1 },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', description: 'DeepSeek-V3, DeepSeek-Coder', icon: Cpu, tint: '#5a7a9a', protocolLevel: 1 },
  { id: 'kimi', name: 'Kimi', provider: 'Moonshot AI', description: 'k1.5, moonshot-v1', icon: Star, tint: '#d4a373', protocolLevel: 1 },
  { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Gemini Pro, Gemini Ultra', icon: Sparkles, tint: '#c9a96e', protocolLevel: 1 },
  { id: 'ollama', name: 'Ollama', provider: '本地部署', description: 'Llama, Mistral 本地模型', icon: Server, tint: '#7fb89f', protocolLevel: 1 },
  { id: 'custom', name: '自定义', provider: 'Custom Endpoint', description: '自定义 API 端点', icon: Plus, tint: '#6b7a5a', protocolLevel: 1 },
];

const l2Platforms: PlatformOption[] = [
  { id: 'autogen', name: 'AutoGen', provider: 'Microsoft', description: '多智能体对话编排框架', icon: Network, tint: '#5a7a9a', protocolLevel: 2 },
  { id: 'crewai', name: 'CrewAI', provider: 'CrewAI', description: '角色扮演多智能体团队', icon: UserCog, tint: '#7fa3b0', protocolLevel: 2 },
  { id: 'langgraph', name: 'LangGraph', provider: 'LangChain', description: '循环图状态机编排', icon: Waypoints, tint: '#a78b9a', protocolLevel: 2 },
  { id: 'dify', name: 'Dify', provider: 'LangGenius', description: '可视化工作流编排', icon: Layers, tint: '#7fb89f', protocolLevel: 2 },
  { id: 'flowise', name: 'Flowise', provider: 'FlowiseAI', description: '拖拽式 LLM 工作流', icon: Route, tint: '#c9a96e', protocolLevel: 2 },
  { id: 'openclaw', name: 'OpenClaw', provider: 'OpenClaw', description: '开源多智能体 claws 框架', icon: Bot, tint: '#6b7a5a', protocolLevel: 2 },
  { id: 'metagpt', name: 'MetaGPT', provider: 'MetaGPT', description: '软件公司多智能体 SOP', icon: Code, tint: '#d4a373', protocolLevel: 2 },
];

const l3Platforms: PlatformOption[] = [
  { id: 'openrouter', name: 'OpenRouter', provider: 'OpenRouter', description: '统一路由多家 LLM', icon: Route, tint: '#7fa3b0', protocolLevel: 3 },
  { id: 'azure', name: 'Azure OpenAI', provider: 'Microsoft', description: '企业级 GPT 服务', icon: Server, tint: '#5a7a9a', protocolLevel: 3 },
  { id: 'bedrock', name: 'AWS Bedrock', provider: 'Amazon', description: '托管多模型推理服务', icon: Database, tint: '#c9a96e', protocolLevel: 3 },
  { id: 'cloudflare', name: 'Cloudflare AI', provider: 'Cloudflare', description: '边缘 AI 推理网关', icon: Globe, tint: '#7fb89f', protocolLevel: 3 },
  { id: 'novita', name: 'Novita AI', provider: 'Novita', description: 'Serverless LLM API', icon: Zap, tint: '#a78b9a', protocolLevel: 3 },
  { id: 'together', name: 'Together AI', provider: 'Together', description: '开源模型推理云', icon: Network, tint: '#6b7a5a', protocolLevel: 3 },
  { id: 'fireworks', name: 'Fireworks AI', provider: 'Fireworks', description: '快速模型推理端点', icon: Sparkles, tint: '#d4a373', protocolLevel: 3 },
  { id: 'replicate', name: 'Replicate', provider: 'Replicate', description: '模型托管与运行', icon: Cpu, tint: '#5a7a9a', protocolLevel: 3 },
  { id: 'groq', name: 'Groq', provider: 'Groq', description: 'LPU 极速推理', icon: Zap, tint: '#7fb89f', protocolLevel: 3 },
];

const apiConfigs: ApiConfig[] = [
  { id: 'api-1', name: 'OpenAI-生产', platform: 'OpenAI', baseUrl: 'https://api.openai.com/v1', latency: 23, models: ['GPT-4o', 'GPT-3.5-turbo'], status: 'normal' },
  { id: 'api-2', name: 'OpenAI-测试', platform: 'OpenAI', baseUrl: 'https://api.openai.com/v1', latency: 45, models: ['GPT-4o'], status: 'normal' },
  { id: 'api-3', name: 'Kimi-主节点', platform: 'Kimi', baseUrl: 'https://api.moonshot.cn', latency: 156, models: ['moonshot-v1', 'k1.5'], status: 'normal' },
  { id: 'api-4', name: 'Ollama-本地', platform: 'Ollama', baseUrl: (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434', latency: 12, models: ['llama3.1', 'mistral'], status: 'normal' },
  { id: 'api-5', name: 'Claude-API', platform: 'Claude', baseUrl: 'https://api.anthropic.com', latency: 67, models: ['claude-sonnet', 'claude-haiku'], status: 'normal' },
  { id: 'api-6', name: 'Gemini-API', platform: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com', latency: 89, models: ['gemini-1.5-pro'], status: 'normal' },
  { id: 'api-7', name: 'DeepSeek-API', platform: 'DeepSeek', baseUrl: 'https://api.deepseek.com', latency: 34, models: ['deepseek-chat', 'deepseek-coder'], status: 'normal' },
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

const rolePresets: RolePreset[] = [
  { id: 'preset-general', name: '通用助手', description: '全能型 AI 助手', systemPrompt: '你是一个 helpful 的 AI 助手，能够回答各种问题并提供协助。', temperature: 0.7, maxTokens: 2048, icon: Bot },
  { id: 'preset-coder', name: '代码专家', description: '专注编程与代码审查', systemPrompt: '你是一个资深软件工程师，擅长代码编写、审查、调试和优化。请提供高质量、可维护的代码，并遵循最佳实践。', temperature: 0.3, maxTokens: 4096, icon: Code },
  { id: 'preset-writer', name: '写作助手', description: '内容创作与文案撰写', systemPrompt: '你是一个专业写作者，擅长撰写各类文章、博客、营销文案和技术文档。注意语言流畅、结构清晰。', temperature: 0.9, maxTokens: 2048, icon: Pencil },
  { id: 'preset-analyst', name: '数据分析师', description: '数据分析与可视化', systemPrompt: '你是一个数据分析师，擅长数据处理、统计分析、可视化呈现和洞察提取。请用数据说话，提供清晰的分析结论。', temperature: 0.4, maxTokens: 2048, icon: BarChart3 },
  { id: 'preset-researcher', name: '研究员', description: '深度研究与信息检索', systemPrompt: '你是一个研究员，擅长深度研究、信息检索、文献综述和知识整理。请提供准确、有据可查的信息。', temperature: 0.6, maxTokens: 4096, icon: BookOpen },
  { id: 'preset-custom', name: '自定义', description: '完全自定义角色配置', systemPrompt: '', temperature: 0.7, maxTokens: 2048, icon: Settings },
];

/* ------------------------------------------------------------------ */
/*  Easing                                                             */
/* ------------------------------------------------------------------ */

const easeGentle = [0.22, 1, 0.36, 1] as [number, number, number, number];
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

const stepLabels = ['模式', '平台', '角色', '技能', '知识', '文件', '确认'];

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
                <div className="relative mx-2 mb-5" style={{ width: 40, height: 2 }}>
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
/*  Step 0 — Select Mode                                               */
/* ------------------------------------------------------------------ */

const modeOptions: { id: CreateMode; name: string; description: string; detail: string; icon: React.ElementType; tint: string }[] = [
  {
    id: 'single',
    name: '单线程直连',
    description: '单个 LLM 直接对话',
    detail: '选择一个 L1 平台（如 OpenAI、Claude），建立最直接的 AI 连接。适合简单问答、代码生成等单任务场景。',
    icon: Zap,
    tint: '#7fa3b0',
  },
  {
    id: 'multi',
    name: '多线程编排',
    description: '多智能体协作编排',
    detail: '选择一个 L2 编排框架（如 AutoGen、CrewAI），为每个线程分配不同的 L1 模型，实现多智能体协作。适合复杂工作流。',
    icon: Network,
    tint: '#7fb89f',
  },
  {
    id: 'gateway',
    name: '网关直联',
    description: '网关聚合 + 后端模型',
    detail: '选择一个 L3 网关（如 OpenRouter、Azure），统一路由到后端 L1 模型。适合企业级部署和负载均衡场景。',
    icon: Route,
    tint: '#c9a96e',
  },
];

function Step0Mode({ selected, onSelect }: { selected: CreateMode | null; onSelect: (mode: CreateMode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择创建模式</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>选择适合您需求的智能体连接架构</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modeOptions.map((mode, i) => {
          const isSelected = selected === mode.id;
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              className="relative flex flex-col items-start gap-3 p-6 rounded-card border-2 transition-all duration-200 text-left h-full"
              style={{
                backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: easeGentle }}
              whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)', y: -2 }}
              onClick={() => onSelect(mode.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className="w-12 h-12 rounded-card-sm flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${mode.tint}20` }}
                >
                  <Icon size={24} style={{ color: mode.tint }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{mode.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>{mode.description}</div>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-300)',
                    backgroundColor: isSelected ? 'var(--sage-500)' : 'transparent',
                  }}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
              </div>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--sage-500)' }}>{mode.detail}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Dynamic Platform Selection                                */
/* ------------------------------------------------------------------ */

function Step1PlatformDynamic({
  mode,
  platformId,
  gatewayBackendId,
  threads,
  threadCount,
  onUpdate,
  l1Data,
  l2Data,
  l3Data,
}: {
  mode: CreateMode;
  platformId: string | null;
  gatewayBackendId: string | null;
  threads: ThreadConfig[];
  threadCount: number;
  onUpdate: (updates: Partial<WizardState>) => void;
  l1Data: PlatformOption[];
  l2Data: PlatformOption[];
  l3Data: PlatformOption[];
}) {
  const allL1 = l1Data.length > 0 ? l1Data : l1Platforms;
  const allL2 = l2Data.length > 0 ? l2Data : l2Platforms;
  const allL3 = l3Data.length > 0 ? l3Data : l3Platforms;

  const handleThreadCountChange = (count: number) => {
    const clamped = Math.max(2, Math.min(8, count));
    const currentThreads = threads.length > 0 ? threads : [];
    const newThreads: ThreadConfig[] = [];
    for (let i = 0; i < clamped; i++) {
      if (i < currentThreads.length) {
        newThreads.push(currentThreads[i]);
      } else {
        newThreads.push({ id: `thread-${i}`, name: `线程 ${i + 1}`, platformId: null });
      }
    }
    onUpdate({ threadCount: clamped, threads: newThreads });
  };

  const updateThreadPlatform = (threadId: string, platformId: string | null) => {
    const updated = threads.map(t => t.id === threadId ? { ...t, platformId } : t);
    onUpdate({ threads: updated });
  };

  const updateThreadName = (threadId: string, name: string) => {
    const updated = threads.map(t => t.id === threadId ? { ...t, name } : t);
    onUpdate({ threads: updated });
  };

  // Initialize threads if not set
  useEffect(() => {
    if (mode === 'multi' && threads.length === 0) {
      handleThreadCountChange(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>
          {mode === 'single' && '选择 L1 平台'}
          {mode === 'multi' && '选择 L2 编排框架'}
          {mode === 'gateway' && '选择 L3 网关'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>
          {mode === 'single' && '选择一个 LLM 平台作为智能体后端'}
          {mode === 'multi' && '选择编排框架，并为每个线程分配模型'}
          {mode === 'gateway' && '选择网关聚合服务，并指定后端 L1 模型'}
        </p>
      </div>

      {/* Mode A: Single - Select L1 Platform */}
      {mode === 'single' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {allL1.map((p, i) => {
            const isSelected = platformId === p.id;
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
                transition={{ duration: 0.5, delay: i * 0.06, ease: easeGentle }}
                whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
                onClick={() => onUpdate({ platformId: p.id })}
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
      )}

      {/* Mode B: Multi - Select L2 + Thread Config */}
      {mode === 'multi' && (
        <div className="space-y-6">
          {/* L2 Platform Selection */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>1. 选择编排框架</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allL2.map((p, i) => {
                const isSelected = platformId === p.id;
                const Icon = p.icon;
                return (
                  <motion.button
                    key={p.id}
                    className="relative flex items-center gap-3 p-4 rounded-card border-2 transition-all duration-200 text-left"
                    style={{
                      backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                      borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
                    whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
                    onClick={() => onUpdate({ platformId: p.id })}
                  >
                    <div
                      className="w-10 h-10 rounded-card-sm flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${p.tint}20` }}
                    >
                      <Icon size={20} style={{ color: p.tint }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{p.name}</div>
                      <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{p.description}</div>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
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
          </div>

          {/* Thread Count */}
          {platformId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>2. 配置线程数量</h3>
              <div className="flex items-center gap-4 p-4 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
                <button
                  className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
                  onClick={() => handleThreadCountChange(threadCount - 1)}
                  disabled={threadCount <= 2}
                >
                  -
                </button>
                <span className="text-lg font-semibold w-8 text-center" style={{ color: 'var(--sage-700)' }}>{threadCount}</span>
                <button
                  className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
                  onClick={() => handleThreadCountChange(threadCount + 1)}
                  disabled={threadCount >= 8}
                >
                  +
                </button>
                <span className="text-sm ml-2" style={{ color: 'var(--sage-400)' }}>个线程（2-8）</span>
              </div>
            </motion.div>
          )}

          {/* Thread Platform Assignment */}
          {platformId && threads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>3. 为每个线程分配 L1 模型</h3>
              <div className="space-y-3">
                {threads.map((thread, idx) => (
                  <motion.div
                    key={thread.id}
                    className="p-4 rounded-card border"
                    style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: 'var(--sage-500)' }}
                      >
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={thread.name}
                        onChange={e => updateThreadName(thread.id, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-card-sm border text-sm outline-none"
                        style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                      />
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 ml-10">
                      {allL1.filter(l1 => l1.id !== 'custom').map(l1 => {
                        const isSelected = thread.platformId === l1.id;
                        return (
                          <button
                            key={l1.id}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-all duration-150"
                            style={{
                              borderColor: isSelected ? l1.tint : 'var(--sage-200)',
                              backgroundColor: isSelected ? `${l1.tint}15` : 'transparent',
                              color: isSelected ? l1.tint : 'var(--sage-500)',
                            }}
                            onClick={() => updateThreadPlatform(thread.id, isSelected ? null : l1.id)}
                          >
                            {isSelected && <Check size={10} />}
                            {l1.name}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Mode C: Gateway - Select L3 + L1 Backend */}
      {mode === 'gateway' && (
        <div className="space-y-6">
          {/* L3 Gateway Selection */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>1. 选择 L3 网关</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allL3.map((p, i) => {
                const isSelected = platformId === p.id;
                const Icon = p.icon;
                return (
                  <motion.button
                    key={p.id}
                    className="relative flex items-center gap-3 p-4 rounded-card border-2 transition-all duration-200 text-left"
                    style={{
                      backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                      borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
                    whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
                    onClick={() => onUpdate({ platformId: p.id })}
                  >
                    <div
                      className="w-10 h-10 rounded-card-sm flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${p.tint}20` }}
                    >
                      <Icon size={20} style={{ color: p.tint }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{p.name}</div>
                      <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{p.description}</div>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
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
          </div>

          {/* L1 Backend Selection */}
          {platformId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>2. 选择后端 L1 模型</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allL1.filter(p => p.id !== 'custom').map((p, i) => {
                  const isSelected = gatewayBackendId === p.id;
                  const Icon = p.icon;
                  return (
                    <motion.button
                      key={p.id}
                      className="relative flex items-center gap-3 p-4 rounded-card border-2 transition-all duration-200 text-left"
                      style={{
                        backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                        borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.04, ease: easeGentle }}
                      whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
                      onClick={() => onUpdate({ gatewayBackendId: p.id })}
                    >
                      <div
                        className="w-10 h-10 rounded-card-sm flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${p.tint}20` }}
                      >
                        <Icon size={20} style={{ color: p.tint }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{p.name}</div>
                        <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{p.provider}</div>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
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
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Role Configuration                                        */
/* ------------------------------------------------------------------ */

function Step2RoleConfig({
  systemPrompt,
  temperature,
  maxTokens,
  rolePresetId,
  onUpdate,
}: {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  rolePresetId: string | null;
  onUpdate: (updates: Partial<WizardState>) => void;
}) {
  const handlePresetSelect = (preset: RolePreset) => {
    onUpdate({
      rolePresetId: preset.id,
      systemPrompt: preset.systemPrompt,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: easeGentle }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>角色配置</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>配置智能体的行为模式和生成参数</p>
      </div>

      {/* Role Presets */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>角色预设</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {rolePresets.map((preset, i) => {
            const isSelected = rolePresetId === preset.id;
            const Icon = preset.icon;
            return (
              <motion.button
                key={preset.id}
                className="relative flex items-center gap-3 p-4 rounded-card border-2 transition-all duration-200 text-left"
                style={{
                  backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                  borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
                whileHover={{ borderColor: 'var(--sage-300)', backgroundColor: 'var(--sage-50)' }}
                onClick={() => handlePresetSelect(preset)}
              >
                <div
                  className="w-9 h-9 rounded-card-sm flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-100)' }}
                >
                  <Icon size={18} style={{ color: isSelected ? '#fff' : 'var(--sage-400)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{preset.name}</div>
                  <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{preset.description}</div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
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
      </div>

      {/* System Prompt */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--sage-700)' }}>系统提示词</h3>
        <textarea
          placeholder="输入系统提示词，定义智能体的角色和行为..."
          value={systemPrompt}
          onChange={e => onUpdate({ systemPrompt: e.target.value })}
          className="w-full px-4 py-3 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)] resize-y"
          style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', minHeight: 120 }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>系统提示词决定了智能体的行为方式和回答风格</p>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature */}
        <div className="p-5 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Thermometer size={16} style={{ color: 'var(--sage-500)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>温度 (Temperature)</span>
            <span className="text-sm font-mono ml-auto" style={{ color: 'var(--sage-500)' }}>{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={Math.round(temperature * 10)}
            onChange={e => onUpdate({ temperature: parseInt(e.target.value) / 10 })}
            className="w-full accent-sage-500"
            style={{ accentColor: 'var(--sage-500)' }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--sage-400)' }}>精确 (0)</span>
            <span className="text-xs" style={{ color: 'var(--sage-400)' }}>平衡 (1)</span>
            <span className="text-xs" style={{ color: 'var(--sage-400)' }}>创意 (2)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="p-5 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Hash size={16} style={{ color: 'var(--sage-500)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>最大 Token</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={256}
              max={128000}
              step={256}
              value={maxTokens}
              onChange={e => onUpdate({ maxTokens: Math.max(256, Math.min(128000, parseInt(e.target.value) || 2048)) })}
              className="flex-1 px-3 py-2 rounded-card-sm border text-sm outline-none"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
            />
            <div className="flex gap-1">
              {[1024, 2048, 4096, 8192].map(v => (
                <button
                  key={v}
                  className="px-2 py-1 rounded-md text-xs transition-all duration-150"
                  style={{
                    backgroundColor: maxTokens === v ? 'var(--sage-500)' : 'var(--sage-100)',
                    color: maxTokens === v ? '#fff' : 'var(--sage-500)',
                  }}
                  onClick={() => onUpdate({ maxTokens: v })}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--sage-400)' }}>单次响应的最大生成 token 数量</p>
        </div>
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
/*  Step 4 — Knowledge Base                                            */
/* ------------------------------------------------------------------ */

function Step4Knowledge({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
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
          transition={{ duration: 0.3 }}
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
/*  Step 5 — Work Files                                                */
/* ------------------------------------------------------------------ */

function Step5WorkFiles({ selectedFiles, onToggleFile }: { selectedFiles: string[]; onToggleFile: (id: string) => void }) {
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
        <h2 className="text-2xl font-semibold font-display" style={{ color: 'var(--sage-800)' }}>选择工作文件</h2>
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
                    {mem.agentName} &middot; {mem.type}
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
  const {
    mode, platformId, gatewayBackendId, threads, threadCount,
    systemPrompt, temperature, maxTokens, rolePresetId,
    selectedSkills, selectedFiles, selectedKBs,
    agentName, agentDescription, agentAvatar,
  } = wizardState;

  const selectedSkillList = skills.filter(s => selectedSkills.includes(s.id));
  const selectedKBList = knowledgeBases.filter(k => selectedKBs.includes(k.id));
  const isReady = agentName.trim().length > 0;

  const modeLabel = mode === 'single' ? '单线程直连' : mode === 'multi' ? '多线程编排' : '网关直联';
  const modeDesc = mode === 'single' ? '单个 LLM 直接对话' : mode === 'multi' ? '多智能体协作编排' : '网关聚合 + 后端模型';

  const allL1 = l1Platforms;
  const allL2 = l2Platforms;
  const allL3 = l3Platforms;

  const mainPlatform = mode === 'single'
    ? allL1.find(p => p.id === platformId)
    : mode === 'multi'
      ? allL2.find(p => p.id === platformId)
      : allL3.find(p => p.id === platformId);

  const backendPlatform = mode === 'gateway' ? allL1.find(p => p.id === gatewayBackendId) : null;

  const preset = rolePresets.find(r => r.id === rolePresetId);

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

      {/* Mode & Platform Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>架构配置</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(0)}>编辑</button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>{modeLabel}</span>
            <span style={{ color: 'var(--sage-500)' }}>{modeDesc}</span>
          </div>
          {mainPlatform && (
            <div className="text-sm" style={{ color: 'var(--sage-500)' }}>
              {mode === 'single' && `L1 平台: ${mainPlatform.name} (${mainPlatform.provider})`}
              {mode === 'multi' && `L2 编排: ${mainPlatform.name} · ${threadCount} 个线程`}
              {mode === 'gateway' && `L3 网关: ${mainPlatform.name}${backendPlatform ? ` → L1: ${backendPlatform.name}` : ''}`}
            </div>
          )}
          {mode === 'multi' && threads.length > 0 && (
            <div className="mt-2 space-y-1">
              {threads.map((t, i) => {
                const tp = allL1.find(p => p.id === t.platformId);
                return (
                  <div key={t.id} className="text-xs flex items-center gap-2" style={{ color: 'var(--sage-400)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: 'var(--sage-300)', fontSize: 9 }}>{i + 1}</span>
                    <span>{t.name}</span>
                    <span>{tp ? `→ ${tp.name}` : '(未选择模型)'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Role Config Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>角色配置</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(1)}>编辑</button>
        </div>
        <div className="space-y-1 text-sm" style={{ color: 'var(--sage-500)' }}>
          {preset && <div>预设: {preset.name}</div>}
          <div>温度: {temperature.toFixed(1)} &middot; 最大 Token: {maxTokens.toLocaleString()}</div>
          {systemPrompt && (
            <div className="text-xs mt-1 p-2 rounded-md" style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-400)' }}>
              {systemPrompt.length > 80 ? systemPrompt.slice(0, 80) + '...' : systemPrompt}
            </div>
          )}
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

      {/* Knowledge Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>知识库</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(3)}>编辑</button>
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

      {/* Work Files Summary */}
      <motion.div
        className="p-5 rounded-card border mb-4"
        style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>工作文件</h3>
          <button className="text-xs transition-colors hover:underline" style={{ color: 'var(--sage-500)' }} onClick={() => onStepClick(4)}>编辑</button>
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

const defaultWizardState: WizardState = {
  mode: null,
  platformId: null,
  gatewayBackendId: null,
  threads: [],
  threadCount: 2,
  systemPrompt: rolePresets[0].systemPrompt,
  temperature: rolePresets[0].temperature,
  maxTokens: rolePresets[0].maxTokens,
  rolePresetId: rolePresets[0].id,
  selectedSkills: [],
  selectedKBs: [],
  selectedFiles: [],
  agentName: '',
  agentDescription: '',
  agentAvatar: 'avatar-1',
};

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AgentCreator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>(defaultWizardState);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backend data
  const [backendL1, setBackendL1] = useState<PlatformOption[]>([]);
  const [backendL2, setBackendL2] = useState<PlatformOption[]>([]);
  const [backendL3, setBackendL3] = useState<PlatformOption[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  /* Fetch platforms from backend by level */
  useEffect(() => {
    let cancelled = false;

    async function loadPlatforms() {
      try {
        const [l1Data, l2Data, l3Data] = await Promise.all([
          fetchPlatformsByLevel(1).catch(() => []),
          fetchPlatformsByLevel(2).catch(() => []),
          fetchPlatformsByLevel(3).catch(() => []),
        ]);

        if (cancelled) return;

        const mapper = (p: any, idx: number): PlatformOption => ({
          id: p.id,
          name: p.name,
          provider: p.provider || p.name,
          description: p.description || '',
          icon: [Zap, Server, Star, Diamond, Sparkles, Cpu, Bot, Globe, Route, Network][idx % 10] || Server,
          tint: ['#7fa3b0', '#7fb89f', '#d4a373', '#a78b9a', '#c9a96e', '#5a7a9a', '#6b7a5a', '#8f9a7d', '#c97b84', '#7fa3b0'][idx % 10],
          protocolLevel: p.protocolLevel,
        });

        if (Array.isArray(l1Data) && l1Data.length > 0) setBackendL1(l1Data.map(mapper));
        if (Array.isArray(l2Data) && l2Data.length > 0) setBackendL2(l2Data.map(mapper));
        if (Array.isArray(l3Data) && l3Data.length > 0) setBackendL3(l3Data.map(mapper));

        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to fetch platforms:', err);
        setDataLoaded(true);
      }
    }

    loadPlatforms();

    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!wizardState.agentName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Build thread platforms for multi mode
      const threadPlatforms = wizardState.mode === 'multi'
        ? wizardState.threads
            .filter(t => t.platformId)
            .map((t, i) => ({ id: t.platformId!, threadIndex: i, threadName: t.name }))
        : undefined;

      const payload: Record<string, any> = {
        name: wizardState.agentName,
        description: wizardState.agentDescription,
        avatar: wizardState.agentAvatar,
        mode: wizardState.mode,
        protocolLevel: wizardState.mode === 'single' ? 1 : wizardState.mode === 'multi' ? 2 : 3,
        platformId: wizardState.platformId,
        systemPrompt: wizardState.systemPrompt,
        temperature: wizardState.temperature,
        maxTokens: wizardState.maxTokens,
        rolePreset: wizardState.rolePresetId,
        skills: wizardState.selectedSkills,
        knowledgeBases: wizardState.selectedKBs,
        workFiles: wizardState.selectedFiles,
        providers: wizardState.platformId ? [{ id: wizardState.platformId, priority: 1 }] : [],
        accessLayer: 'standard',
        runtime: 'default',
        agentZero: { enabled: false, mode: 'standard' },
      };

      // Mode-specific fields
      if (wizardState.mode === 'gateway') {
        payload.gatewayBackendId = wizardState.gatewayBackendId;
        payload.parentPlatform = wizardState.platformId;
      }

      if (wizardState.mode === 'multi') {
        payload.threadPlatforms = threadPlatforms;
        payload.threadCount = wizardState.threadCount;
        payload.parentPlatform = wizardState.platformId;
      }

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
    if (currentStep < stepLabels.length - 1) {
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

  // Validation per step
  const canGoNext = (() => {
    switch (currentStep) {
      case 0: return !!wizardState.mode;
      case 1: {
        if (!wizardState.platformId) return false;
        if (wizardState.mode === 'multi') {
          // At least one thread must have a platform selected
          return wizardState.threads.some(t => t.platformId);
        }
        if (wizardState.mode === 'gateway') {
          return !!wizardState.gatewayBackendId;
        }
        return true;
      }
      case 2: return wizardState.systemPrompt.trim().length > 0;
      case 6: return wizardState.agentName.trim().length > 0;
      default: return true;
    }
  })();

  const stepValidations = [
    !!wizardState.mode,
    (() => {
      if (!wizardState.platformId) return false;
      if (wizardState.mode === 'multi') return wizardState.threads.some(t => t.platformId);
      if (wizardState.mode === 'gateway') return !!wizardState.gatewayBackendId;
      return true;
    })(),
    wizardState.systemPrompt.trim().length > 0,
    true, // skills optional
    true, // knowledge optional
    true, // work files optional
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
              <Step0Mode
                selected={wizardState.mode}
                onSelect={(mode) => updateState({ mode })}
              />
            )}
            {currentStep === 1 && wizardState.mode && (
              <Step1PlatformDynamic
                mode={wizardState.mode}
                platformId={wizardState.platformId}
                gatewayBackendId={wizardState.gatewayBackendId}
                threads={wizardState.threads}
                threadCount={wizardState.threadCount}
                onUpdate={updateState}
                l1Data={backendL1}
                l2Data={backendL2}
                l3Data={backendL3}
              />
            )}
            {currentStep === 2 && (
              <Step2RoleConfig
                systemPrompt={wizardState.systemPrompt}
                temperature={wizardState.temperature}
                maxTokens={wizardState.maxTokens}
                rolePresetId={wizardState.rolePresetId}
                onUpdate={updateState}
              />
            )}
            {currentStep === 3 && (
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
            {currentStep === 4 && (
              <Step4Knowledge
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
              <Step5WorkFiles
                selectedFiles={wizardState.selectedFiles}
                onToggleFile={(id) => {
                  const next = wizardState.selectedFiles.includes(id)
                    ? wizardState.selectedFiles.filter(f => f !== id)
                    : [...wizardState.selectedFiles, id];
                  updateState({ selectedFiles: next });
                }}
              />
            )}
            {currentStep === 6 && (
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
            if (currentStep === stepLabels.length - 1 && allStepsValid && !isSubmitting) {
              handleCreate();
              return;
            }
            if (canGoNext) goNext();
          }}
          disabled={!canGoNext || isSubmitting}
        >
          {currentStep === stepLabels.length - 1 ? (
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
