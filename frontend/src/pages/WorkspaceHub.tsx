import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  FolderPlus,
  Upload,
  Search,
  Grid3x3,
  List,
  ChevronRight,
  ChevronDown,
  FileText,
  Code,
  Table,
  Terminal,
  File,
  Image,
  Database,
  MoreVertical,
  X,
  Download,
  Copy,
  Share2,
  Edit3,
  Trash2,
  Brain,
  CheckCircle2,
  Link2,
  Plus,
  Clock,
  HardDrive,
  Folder,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  Hash,
  Tag,
  Minus,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import ContentCard from '@/components/ContentCard';

/* ───────────────────── types ───────────────────── */

interface FileItem {
  id: string;
  name: string;
  type: string;
  ext: string;
  size: string;
  sizeBytes: number;
  modifiedAt: string;
  agentId?: string;
  agentName?: string;
  folderPath: string;
  tags: string[];
  content?: string;
}

interface FolderNode {
  id: string;
  name: string;
  fileCount: number;
  children?: FolderNode[];
}

interface MemoryFile {
  id: string;
  agentName: string;
  agentAvatar: string;
  type: 'conversation' | 'working' | 'system' | 'knowledge';
  description: string;
  fileCount: number;
  size: string;
  lastUsed: string;
}

interface TaskGroup {
  id: string;
  taskNum: string;
  taskName: string;
  createdAt: string;
  completedAt?: string;
  files: { name: string; type: string; inherited?: boolean }[];
  children: {
    id: string;
    taskNum: string;
    taskName: string;
    inheritedCount: number;
    newFiles: number;
    files: { name: string; type: string; inherited: boolean }[];
  }[];
}

/* ───────────────────── mock data ───────────────────── */

const folderTree: FolderNode[] = [
  {
    id: 'root', name: '根目录 (Root)', fileCount: 1247,
    children: [
      {
        id: 'memories', name: 'agent-memories', fileCount: 156,
        children: [
          { id: 'code-mem', name: 'code-assistant', fileCount: 45 },
          { id: 'data-mem', name: 'data-analyst', fileCount: 38 },
          { id: 'doc-mem', name: 'doc-writer', fileCount: 73 },
        ],
      },
      {
        id: 'tasks', name: 'task-outputs', fileCount: 892,
        children: [
          { id: 't2847', name: 'task-2847', fileCount: 12 },
          { id: 't2846', name: 'task-2846', fileCount: 8 },
          { id: 't2845', name: 'task-2845', fileCount: 23 },
          { id: 't2844', name: 'task-2844', fileCount: 15 },
          { id: 't2843', name: 'task-2843', fileCount: 19 },
        ],
      },
      { id: 'knowledge', name: 'shared-knowledge', fileCount: 67 },
      { id: 'logs', name: 'system-logs', fileCount: 45 },
      { id: 'uploads', name: 'uploads', fileCount: 87 },
    ],
  },
];

const filesData: FileItem[] = [
  { id: 'f1', name: 'project-spec.md', type: 'markdown', ext: 'md', size: '24 KB', sizeBytes: 24576, modifiedAt: '2小时前', agentId: 'agent-3', agentName: '文档撰写-B', folderPath: '/uploads', tags: ['spec', 'project'], content: '# 项目规格说明\n\n## 概述\n本项目是一个多智能体协作平台...\n\n## 技术栈\n- React + TypeScript\n- Tailwind CSS\n- Node.js\n' },
  { id: 'f2', name: 'api-schema.json', type: 'json', ext: 'json', size: '156 KB', sizeBytes: 159744, modifiedAt: '3小时前', agentId: 'agent-1', agentName: '代码助手-01', folderPath: '/task-outputs/task-2847', tags: ['api', 'schema'], content: '{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Bloom API",\n    "version": "1.0.0"\n  }\n}' },
  { id: 'f3', name: 'sales-data-q4.csv', type: 'csv', ext: 'csv', size: '2.1 MB', sizeBytes: 2202009, modifiedAt: '5小时前', agentId: 'agent-2', agentName: '数据分析-A', folderPath: '/task-outputs/task-2846', tags: ['data', 'sales'], content: 'region,product,revenue\nNorth,Widget-A,45000\nSouth,Widget-B,32000\nEast,Widget-C,67000\n' },
  { id: 'f4', name: 'translation-ja.po', type: 'po', ext: 'po', size: '89 KB', sizeBytes: 91136, modifiedAt: '6小时前', agentId: 'agent-4', agentName: '翻译专员', folderPath: '/task-outputs/task-2845', tags: ['i18n', 'ja'], content: 'msgid "Hello"\nmsgstr "こんにちは"\n\nmsgid "Goodbye"\nmsgstr "さようなら"\n' },
  { id: 'f5', name: 'test-results.xml', type: 'xml', ext: 'xml', size: '456 KB', sizeBytes: 466944, modifiedAt: '8小时前', agentId: 'agent-5', agentName: '测试工程师', folderPath: '/task-outputs/task-2847', tags: ['test', 'ci'], content: '<?xml version="1.0"?>\n<testsuite tests="42" failures="0" errors="0">\n  <testcase name="test_login"/>\n</testsuite>' },
  { id: 'f6', name: 'README.md', type: 'markdown', ext: 'md', size: '12 KB', sizeBytes: 12288, modifiedAt: '1天前', folderPath: '/shared-knowledge', tags: ['doc', 'readme'], content: '# 千界花园\n\n## 项目介绍\n千界花园是一个多智能体协作平台。\n\n## 快速开始\nnpm install && npm run dev\n' },
  { id: 'f7', name: 'config.yaml', type: 'yaml', ext: 'yaml', size: '8 KB', sizeBytes: 8192, modifiedAt: '1天前', folderPath: '/shared-knowledge', tags: ['config'], content: 'app:\n  name: 千界花园\n  version: 1.0.0\n  port: 3000\n' },
  { id: 'f8', name: 'user-data.csv', type: 'csv', ext: 'csv', size: '156 KB', sizeBytes: 159744, modifiedAt: '2天前', agentId: 'agent-2', agentName: '数据分析-A', folderPath: '/task-outputs/task-2845', tags: ['data', 'users'], content: 'id,name,role\n1,Alice,admin\n2,Bob,editor\n3,Carol,viewer\n' },
  { id: 'f9', name: 'deploy.sh', type: 'shell', ext: 'sh', size: '4 KB', sizeBytes: 4096, modifiedAt: '2天前', agentId: 'agent-1', agentName: '代码助手-01', folderPath: '/task-outputs/task-2847', tags: ['deploy', 'script'], content: '#!/bin/bash\necho "Deploying..."\nnpm run build\nscp -r dist/* server:/var/www/\n' },
  { id: 'f10', name: 'logo.svg', type: 'image', ext: 'svg', size: '32 KB', sizeBytes: 32768, modifiedAt: '3天前', folderPath: '/uploads', tags: ['design', 'asset'], content: '<svg viewBox="0 0 100 100">...</svg>' },
  { id: 'f11', name: 'database.sql', type: 'sql', ext: 'sql', size: '64 KB', sizeBytes: 65536, modifiedAt: '3天前', agentId: 'agent-2', agentName: '数据分析-A', folderPath: '/shared-knowledge', tags: ['db', 'schema'], content: 'CREATE TABLE agents (\n  id VARCHAR(36) PRIMARY KEY,\n  name VARCHAR(255),\n  status VARCHAR(50)\n);\n' },
  { id: 'f12', name: 'analysis-report.pdf', type: 'pdf', ext: 'pdf', size: '1.2 MB', sizeBytes: 1258291, modifiedAt: '4天前', agentId: 'agent-2', agentName: '数据分析-A', folderPath: '/task-outputs/task-2846', tags: ['report'], content: '%PDF-1.4\n... binary content ...' },
  { id: 'f13', name: 'main.py', type: 'python', ext: 'py', size: '18 KB', sizeBytes: 18432, modifiedAt: '4天前', agentId: 'agent-1', agentName: '代码助手-01', folderPath: '/task-outputs/task-2847', tags: ['code', 'main'], content: 'def main():\n    print("Hello from 千界花园")\n\nif __name__ == "__main__":\n    main()\n' },
  { id: 'f14', name: 'styles.css', type: 'css', ext: 'css', size: '42 KB', sizeBytes: 43008, modifiedAt: '5天前', folderPath: '/shared-knowledge', tags: ['css', 'style'], content: ':root {\n  --primary: #6b7a5a;\n  --accent: #7fb89f;\n}\n\nbody {\n  font-family: "Inter", sans-serif;\n}\n' },
  { id: 'f15', name: 'app.tsx', type: 'typescript', ext: 'tsx', size: '8 KB', sizeBytes: 8192, modifiedAt: '5天前', agentId: 'agent-1', agentName: '代码助手-01', folderPath: '/task-outputs/task-2847', tags: ['code', 'react'], content: 'import React from "react";\nimport { BrowserRouter } from "react-router-dom";\n\nfunction App() {\n  return <BrowserRouter>...</BrowserRouter>;\n}\n' },
  { id: 'f16', name: 'env.example', type: 'env', ext: 'env', size: '1 KB', sizeBytes: 1024, modifiedAt: '6天前', folderPath: '/shared-knowledge', tags: ['config'], content: 'DATABASE_URL=postgresql://...\nREDIS_URL=redis://...\nAPI_KEY=sk-...\n' },
  { id: 'f17', name: 'Dockerfile', type: 'docker', ext: 'dockerfile', size: '3 KB', sizeBytes: 3072, modifiedAt: '1周前', folderPath: '/uploads', tags: ['docker', 'devops'], content: 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["npm", "start"]\n' },
  { id: 'f18', name: 'metrics.json', type: 'json', ext: 'json', size: '34 KB', sizeBytes: 34816, modifiedAt: '1周前', folderPath: '/task-outputs/task-2846', tags: ['data', 'metrics'], content: '{\n  "requests": 15234,\n  "avgLatency": 45.2,\n  "errors": 12\n}\n' },
  { id: 'f19', name: 'CHANGELOG.md', type: 'markdown', ext: 'md', size: '22 KB', sizeBytes: 22528, modifiedAt: '1周前', folderPath: '/shared-knowledge', tags: ['doc', 'changelog'], content: '# 更新日志\n\n## v1.0.0\n- 初始版本发布\n- 支持多智能体协作\n' },
  { id: 'f20', name: 'docker-compose.yml', type: 'yaml', ext: 'yml', size: '5 KB', sizeBytes: 5120, modifiedAt: '2周前', folderPath: '/uploads', tags: ['docker', 'compose'], content: 'version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n' },
];

const memoryFiles: MemoryFile[] = [
  { id: 'm1', agentName: '代码助手-01', agentAvatar: 'leaf', type: 'conversation', description: '记录了与用户的代码审查对话，包含Python最佳实践的讨论和代码示例...', fileCount: 12, size: '45 KB', lastUsed: '10分钟前' },
  { id: 'm2', agentName: '数据分析-A', agentAvatar: 'flower', type: 'working', description: '销售数据分析的中间结果和SQL查询记录，包含Q4季度汇总...', fileCount: 8, size: '23 KB', lastUsed: '1小时前' },
  { id: 'm3', agentName: '文档撰写-B', agentAvatar: 'tree', type: 'knowledge', description: 'API文档模板和技术术语表，包含RESTful设计规范...', fileCount: 23, size: '156 KB', lastUsed: '3小时前' },
  { id: 'm4', agentName: '翻译专员', agentAvatar: 'fern', type: 'conversation', description: '中日技术术语对照表和翻译风格指南，涵盖软件工程领域...', fileCount: 5, size: '12 KB', lastUsed: '昨天' },
  { id: 'm5', agentName: '测试工程师', agentAvatar: 'mushroom', type: 'system', description: '系统配置和全局变量定义，包含测试环境参数和CI/CD配置...', fileCount: 3, size: '8 KB', lastUsed: '2天前' },
  { id: 'm6', agentName: '代码助手-01', agentAvatar: 'leaf', type: 'working', description: 'React组件库的设计文档和样式变量定义，包含暗色模式适配...', fileCount: 15, size: '78 KB', lastUsed: '3天前' },
];

const taskGroups: TaskGroup[] = [
  {
    id: 'tg1', taskNum: '#2845', taskName: '代码审查与优化',
    createdAt: '2026-01-15 13:00', completedAt: '13:45',
    files: [
      { name: 'review-notes.md', type: 'markdown' },
      { name: 'code-changes.py', type: 'python' },
      { name: 'analysis.json', type: 'json' },
      { name: 'summary.md', type: 'markdown' },
    ],
    children: [
      { id: 'tg1-1', taskNum: '#2846', taskName: '测试用例生成', inheritedCount: 3, newFiles: 1, files: [
        { name: 'review-notes.md', type: 'markdown', inherited: true },
        { name: 'code-changes.py', type: 'python', inherited: true },
        { name: 'analysis.json', type: 'json', inherited: true },
        { name: 'test-cases.py', type: 'python', inherited: false },
      ]},
      { id: 'tg1-2', taskNum: '#2847', taskName: '文档更新', inheritedCount: 2, newFiles: 2, files: [
        { name: 'review-notes.md', type: 'markdown', inherited: true },
        { name: 'code-changes.py', type: 'python', inherited: true },
        { name: 'api-docs.md', type: 'markdown', inherited: false },
        { name: 'changelog.md', type: 'markdown', inherited: false },
      ]},
    ],
  },
  {
    id: 'tg2', taskNum: '#2830', taskName: '数据清洗与预处理',
    createdAt: '2026-01-14 09:00', completedAt: '09:30',
    files: [
      { name: 'raw-data.csv', type: 'csv' },
      { name: 'cleaning-script.py', type: 'python' },
      { name: 'data-profile.json', type: 'json' },
      { name: 'null-report.md', type: 'markdown' },
      { name: 'outliers.xlsx', type: 'xlsx' },
      { name: 'transform-rules.yaml', type: 'yaml' },
    ],
    children: [
      { id: 'tg2-1', taskNum: '#2831', taskName: '数据分析报告', inheritedCount: 4, newFiles: 3, files: [
        { name: 'raw-data.csv', type: 'csv', inherited: true },
        { name: 'cleaning-script.py', type: 'python', inherited: true },
        { name: 'data-profile.json', type: 'json', inherited: true },
        { name: 'null-report.md', type: 'markdown', inherited: true },
        { name: 'report.md', type: 'markdown', inherited: false },
        { name: 'charts.json', type: 'json', inherited: false },
        { name: 'sql-queries.sql', type: 'sql', inherited: false },
      ]},
      { id: 'tg2-2', taskNum: '#2832', taskName: '可视化仪表盘', inheritedCount: 3, newFiles: 2, files: [
        { name: 'cleaning-script.py', type: 'python', inherited: true },
        { name: 'data-profile.json', type: 'json', inherited: true },
        { name: 'null-report.md', type: 'markdown', inherited: true },
        { name: 'dashboard.tsx', type: 'typescript', inherited: false },
        { name: 'styles.css', type: 'css', inherited: false },
      ]},
    ],
  },
];

/* ───────────────────── helpers ───────────────────── */

const tabs = [
  { id: 'files', label: '文件浏览器', labelEn: 'File Browser', count: 1247 },
  { id: 'memory', label: '记忆管理', labelEn: 'Memory', count: 6 },
  { id: 'tasks', label: '任务文件', labelEn: 'Task Files', count: 2 },
];

const fileTypeColors: Record<string, string> = {
  markdown: '#7fb89f', json: '#7fa3b0', csv: '#d4a373', xml: '#7fa3b0',
  po: '#a78b9a', yaml: '#7fa3b0', python: '#7fb89f', image: '#c9a96e',
  sql: '#6b7a5a', css: '#7fa3b0', typescript: '#7fb89f', pdf: '#c97b84',
  xlsx: '#d4a373', shell: '#7fb89f', env: '#c9a96e', docker: '#7fa3b0',
  default: '#8f9a7d',
};

function FileTypeIcon({ type, size = 20 }: { type: string; size?: number }) {
  const color = fileTypeColors[type] || fileTypeColors.default;
  const iconMap: Record<string, React.ReactNode> = {
    markdown: <FileText size={size} />, json: <FileCode size={size} />, csv: <FileSpreadsheet size={size} />,
    xml: <FileCode size={size} />, po: <FileText size={size} />, yaml: <FileCode size={size} />,
    python: <Terminal size={size} />, image: <FileImage size={size} />, sql: <Database size={size} />,
    css: <Code size={size} />, typescript: <Code size={size} />, pdf: <File size={size} />,
    xlsx: <Table size={size} />, shell: <Terminal size={size} />, env: <FileText size={size} />,
    docker: <HardDrive size={size} />, default: <File size={size} />,
  };
  return <span style={{ color }}>{iconMap[type] || iconMap.default}</span>;
}

function FileTypeBadge({ ext }: { ext: string }) {
  const labelMap: Record<string, string> = { md: 'MD', json: 'JSON', csv: 'CSV', xml: 'XML', py: 'PY', tsx: 'TSX', sql: 'SQL', yaml: 'YAML', yml: 'YML', svg: 'SVG', pdf: 'PDF', css: 'CSS', env: 'ENV', sh: 'SH', po: 'PO', dockerfile: 'DF' };
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}>
      {labelMap[ext] || ext.toUpperCase()}
    </span>
  );
}

function MemoryTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    conversation: { label: '对话记忆', color: '#7fb89f' },
    working: { label: '工作记忆', color: '#7fa3b0' },
    system: { label: '系统记忆', color: '#d4a373' },
    knowledge: { label: '知识记忆', color: '#a78b9a' },
  };
  const info = map[type] || map.conversation;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${info.color}15`, color: info.color }}>
      {info.label}
    </span>
  );
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

/* ═══════════════════════════════════════════════════════
   Workspace Hub Page
   ═══════════════════════════════════════════════════════ */

export default function WorkspaceHub() {
  const { language } = useAppStore();
  const [activeTab, setActiveTab] = useState('files');
  const [searchQuery, setSearchQuery] = useState('');

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <div className="max-w-[1440px] mx-auto">
      {/* Hero Header */}
      <HeroHeader t={t} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Tabs */}
      <div className="mt-6 mb-6" style={{ borderBottom: '2px solid var(--sage-200)' }}>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 text-sm font-semibold transition-colors duration-200 flex items-center gap-2"
              style={{ color: activeTab === tab.id ? 'var(--sage-700)' : 'var(--sage-400)' }}
            >
              {t(tab.label, tab.labelEn)}
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--sage-500)' : 'var(--sage-200)',
                  color: activeTab === tab.id ? '#fff' : 'var(--sage-500)',
                }}
              >
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="workspace-tab-indicator"
                  className="absolute bottom-[-2px] left-0 right-0 h-[2px]"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'files' && (
          <motion.div key="files" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <FileBrowserTab t={t} searchQuery={searchQuery} />
          </motion.div>
        )}
        {activeTab === 'memory' && (
          <motion.div key="memory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <MemoryTab t={t} searchQuery={searchQuery} />
          </motion.div>
        )}
        {activeTab === 'tasks' && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <TaskFilesTab t={t} searchQuery={searchQuery} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Hero Header
   ═══════════════════════════════════════════════════════ */

function HeroHeader({ t, searchQuery, onSearchChange }: {
  t: (zh: string, en: string) => string;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

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
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'url(/workspace-meadow.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold" style={{ color: 'var(--sage-800)' }}>
              {t('工作空间', 'Workspace')}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sage-500)' }}>
              {t('智能体共享工作空间 · Shared workspace across all agents', 'Shared workspace across all agents')}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--sage-500)' }}>
              <span className="font-semibold">1,247 {t('文件', 'files')}</span>
              <span style={{ color: 'var(--sage-300)' }}>|</span>
              <span>23 {t('文件夹', 'folders')}</span>
              <span style={{ color: 'var(--sage-300)' }}>|</span>
              <span>2.3 GB</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-card-md border text-sm transition-all duration-200 focus-within:border-[var(--sage-500)]"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff', width: '260px' }}
            >
              <Search size={16} style={{ color: 'var(--sage-400)' }} />
              <input
                type="text"
                placeholder={t('搜索文件、文件夹...', 'Search files, folders...')}
                className="bg-transparent outline-none flex-1 text-sm"
                style={{ color: 'var(--sage-700)' }}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium transition-all duration-200 hover:bg-[var(--sage-200)]" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
              <FolderPlus size={16} />
              {t('新建文件夹', 'New Folder')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-card" style={{ backgroundColor: 'var(--sage-600)' }}>
              <Upload size={16} />
              {t('上传文件', 'Upload')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   File Browser Tab
   ═══════════════════════════════════════════════════════ */

function FileBrowserTab({ t, searchQuery }: { t: (zh: string, en: string) => string; searchQuery: string }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFolder, setActiveFolder] = useState('root');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'memories', 'tasks']));
  const [isDragOver, setIsDragOver] = useState(false);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const filteredFiles = filesData.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterType === 'all' || f.type === filterType || (filterType === 'doc' && ['markdown', 'pdf', 'po'].includes(f.type)) || (filterType === 'code' && ['python', 'typescript', 'css', 'shell', 'xml', 'json', 'yaml'].includes(f.type)) || (filterType === 'data' && ['csv', 'sql', 'xlsx'].includes(f.type)) || (filterType === 'image' && f.type === 'image');
    return matchSearch && matchFilter;
  });

  const filterPills = [
    { id: 'all', label: t('全部', 'All') },
    { id: 'doc', label: t('文档', 'Docs') },
    { id: 'code', label: t('代码', 'Code') },
    { id: 'data', label: t('数据', 'Data') },
    { id: 'image', label: t('图像', 'Images') },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Folder Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="w-full lg:w-56 flex-shrink-0"
      >
        <div className="rounded-card-lg p-3" style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider px-3 py-2" style={{ color: 'var(--sage-400)' }}>
            {t('文件夹', 'Folders')}
          </h3>
          {folderTree.map((node) => renderFolderNode(node, 0, activeFolder, setActiveFolder, expandedFolders, toggleFolder, t))}
        </div>
      </motion.div>

      {/* File Area */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {filterPills.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: filterType === f.id ? 'var(--sage-500)' : 'var(--sage-100)',
                  color: filterType === f.id ? '#fff' : 'var(--sage-600)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-card-sm transition-all"
              style={{ backgroundColor: viewMode === 'grid' ? 'var(--sage-200)' : 'transparent', color: 'var(--sage-600)' }}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-card-sm transition-all"
              style={{ backgroundColor: viewMode === 'list' ? 'var(--sage-200)' : 'transparent', color: 'var(--sage-600)' }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Files */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="rounded-card-lg p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover group"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--sage-200)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onClick={() => setPreviewFile(file)}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: `${fileTypeColors[file.type] || fileTypeColors.default}15` }}>
                  <FileTypeIcon type={file.type} size={24} />
                </div>
                <p className="text-xs font-medium truncate w-full" style={{ color: 'var(--sage-700)' }}>{file.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--sage-400)' }}>{file.size} · {file.modifiedAt}</p>
                {file.agentName && (
                  <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-400)' }}>
                    {file.agentName}
                  </span>
                )}
                {file.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap justify-center">
                    {file.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-400)' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {filteredFiles.length === 0 && <EmptyState t={t} message={t('此文件夹为空', 'This folder is empty')} />}
          </div>
        ) : (
          /* List View */
          <div className="rounded-card-lg overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--sage-100)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('名称', 'Name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('类型', 'Type')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('大小', 'Size')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('修改时间', 'Modified')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('关联智能体', 'Agent')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-500)' }}>{t('操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file, i) => (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className="transition-colors duration-150 hover:bg-[var(--sage-50)] cursor-pointer"
                    style={{ borderBottom: '1px solid var(--sage-100)' }}
                    onClick={() => setPreviewFile(file)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon type={file.type} size={16} />
                        <span className="font-medium text-xs" style={{ color: 'var(--sage-700)' }}>{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><FileTypeBadge ext={file.ext} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-500)' }}>{file.size}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-400)' }}>{file.modifiedAt}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-400)' }}>{file.agentName || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-400)' }}><Download size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-400)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          className="mt-6 rounded-card-lg border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer"
          style={{
            borderColor: isDragOver ? 'var(--sage-500)' : 'var(--sage-300)',
            backgroundColor: isDragOver ? 'var(--sage-50)' : 'transparent',
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
        >
          <Upload size={28} style={{ color: isDragOver ? 'var(--sage-500)' : 'var(--sage-400)', margin: '0 auto' }} />
          <p className="text-sm font-medium mt-2" style={{ color: 'var(--sage-600)' }}>
            {t('拖放文件到此处上传', 'Drag and drop files here')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>
            {t('或点击选择文件', 'or click to select files')}
          </p>
        </div>
      </div>

      {/* File Preview Drawer */}
      <AnimatePresence>
        {previewFile && <FilePreviewDrawer file={previewFile} t={t} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Folder Tree Renderer ── */

function renderFolderNode(
  node: FolderNode, depth: number, activeFolder: string, setActiveFolder: (id: string) => void,
  expanded: Set<string>, toggle: (id: string) => void, t: (zh: string, en: string) => string
) {
  const isExpanded = expanded.has(node.id);
  const isActive = activeFolder === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div key={node.id}>
      <button
        onClick={() => { setActiveFolder(node.id); if (hasChildren) toggle(node.id); }}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-card-sm text-sm transition-all duration-150"
        style={{
          paddingLeft: `${12 + depth * 16}px`,
          backgroundColor: isActive ? 'var(--sage-100)' : 'transparent',
          color: isActive ? 'var(--sage-700)' : 'var(--sage-600)',
          borderLeft: isActive ? '3px solid var(--sage-500)' : '3px solid transparent',
        }}
      >
        {hasChildren ? (
          <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', color: 'var(--sage-400)' }}>
            <ChevronRight size={14} />
          </span>
        ) : <span className="w-3.5" />}
        <Folder size={16} style={{ color: 'var(--bloom-amber)' }} />
        <span className="truncate flex-1 text-xs">{node.name}</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--sage-400)' }}>{node.fileCount}</span>
      </button>
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => renderFolderNode(child, depth + 1, activeFolder, setActiveFolder, expanded, toggle, t))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── File Preview Drawer ── */

function FilePreviewDrawer({ file, t, onClose }: { file: FileItem; t: (zh: string, en: string) => string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex justify-end"
      style={{ backgroundColor: 'rgba(26, 31, 24, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 600 }}
        animate={{ x: 0 }}
        exit={{ x: 600 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="w-full max-w-[600px] h-full overflow-y-auto"
        style={{ backgroundColor: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}>
          <div className="flex items-center gap-3 min-w-0">
            <FileTypeIcon type={file.type} size={20} />
            <div className="min-w-0">
              <h3 className="text-base font-semibold truncate" style={{ color: 'var(--sage-800)' }}>{file.name}</h3>
              <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>{file.size} · {file.modifiedAt}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-card-sm hover:bg-[var(--sage-100)] transition-colors flex-shrink-0" style={{ color: 'var(--sage-400)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Metadata */}
          <div className="rounded-card-lg p-4 mb-4" style={{ backgroundColor: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--sage-400)' }}>{t('元数据', 'Metadata')}</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span style={{ color: 'var(--sage-400)' }}>{t('大小', 'Size')}:</span> <span style={{ color: 'var(--sage-700)' }}>{file.size}</span></div>
              <div><span style={{ color: 'var(--sage-400)' }}>{t('类型', 'Type')}:</span> <span style={{ color: 'var(--sage-700)' }}>{file.type}</span></div>
              <div><span style={{ color: 'var(--sage-400)' }}>{t('修改时间', 'Modified')}:</span> <span style={{ color: 'var(--sage-700)' }}>{file.modifiedAt}</span></div>
              <div><span style={{ color: 'var(--sage-400)' }}>{t('路径', 'Path')}:</span> <span style={{ color: 'var(--sage-700)' }} className="font-mono">{file.folderPath}</span></div>
              {file.agentName && <div className="col-span-2"><span style={{ color: 'var(--sage-400)' }}>{t('关联智能体', 'Agent')}:</span> <span style={{ color: 'var(--sage-700)' }}>{file.agentName}</span></div>}
            </div>
            {file.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag size={12} style={{ color: 'var(--sage-400)' }} />
                {file.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-200)', color: 'var(--sage-600)' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Content Preview */}
          <div className="rounded-card-lg p-4" style={{ backgroundColor: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--sage-400)' }}>{t('内容预览', 'Content Preview')}</h4>
            {file.type === 'image' ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-24 h-24 rounded-card-md flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                  <FileImage size={40} style={{ color: 'var(--sage-300)' }} />
                </div>
              </div>
            ) : (
              <pre className="text-xs font-mono p-4 rounded-card-md overflow-x-auto" style={{ backgroundColor: '#fff', color: 'var(--sage-700)', border: '1px solid var(--sage-200)', lineHeight: 1.7 }}>
                <code>{file.content || t('无内容预览', 'No content preview')}</code>
              </pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
            <Download size={14} />
            {t('下载', 'Download')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
            <Copy size={14} />
            {t('复制内容', 'Copy')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
            <Share2 size={14} />
            {t('分享', 'Share')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-card-md text-sm font-medium text-white ml-auto" style={{ backgroundColor: 'var(--sage-600)' }}>
            <Edit3 size={14} />
            {t('编辑', 'Edit')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Memory Management Tab
   ═══════════════════════════════════════════════════════ */

function MemoryTab({ t, searchQuery }: { t: (zh: string, en: string) => string; searchQuery: string }) {
  const [typeFilter, setTypeFilter] = useState('all');

  const typePills = [
    { id: 'all', label: t('全部', 'All') },
    { id: 'conversation', label: t('对话记忆', 'Conversation') },
    { id: 'working', label: t('工作记忆', 'Working') },
    { id: 'system', label: t('系统记忆', 'System') },
    { id: 'knowledge', label: t('知识记忆', 'Knowledge') },
  ];

  const filtered = memoryFiles.filter((m) => {
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchSearch = m.agentName.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          {typePills.map((p) => (
            <button
              key={p.id}
              onClick={() => setTypeFilter(p.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: typeFilter === p.id ? 'var(--sage-500)' : 'var(--sage-100)',
                color: typeFilter === p.id ? '#fff' : 'var(--sage-600)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {filtered.map((mem, i) => (
            <motion.div
              key={mem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="rounded-card-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: mem.type === 'conversation' ? '#7fb89f' : mem.type === 'working' ? '#7fa3b0' : mem.type === 'system' ? '#d4a373' : '#a78b9a' }}
                  >
                    {mem.agentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{mem.agentName}</h3>
                    <MemoryTypeBadge type={mem.type} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs mb-3 line-clamp-3" style={{ color: 'var(--sage-500)' }}>{mem.description}</p>

              {/* Metadata */}
              <div className="py-2.5" style={{ borderTop: '1px solid var(--sage-100)', borderBottom: '1px solid var(--sage-100)' }}>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--sage-400)' }}>
                  <span className="flex items-center gap-1">
                    <Link2 size={12} />
                    {mem.fileCount} {t('关联文件', 'files')}
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive size={12} />
                    {mem.size}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--sage-400)' }}>
                  <Clock size={12} />
                  {t('最后使用', 'Last used')}: {mem.lastUsed}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
                  <Eye size={12} /> {t('查看详情', 'Details')}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-600)' }}>
                  <ArrowDownIcon size={12} /> {t('继承到任务', 'Inherit')}
                </button>
                <button className="p-1.5 rounded-card-sm ml-auto transition-all hover:bg-[var(--sage-100)]" style={{ color: 'var(--sage-400)' }}>
                  <MoreVertical size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && <EmptyState t={t} message={t('未找到记忆文件', 'No memory files found')} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Task Files Tab (Inheritance Chain)
   ═══════════════════════════════════════════════════════ */

function TaskFilesTab({ t, searchQuery }: { t: (zh: string, en: string) => string; searchQuery: string }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['tg1', 'tg2']));

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const filtered = taskGroups.filter((g) =>
    g.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.taskNum.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {filtered.map((group, gi) => (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: gi * 0.12, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          {/* Parent Task Card */}
          <ContentCard noPadding>
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sage-100)' }}>
                    <CheckCircle2 size={20} style={{ color: 'var(--sage-500)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>
                      {t('任务', 'Task')} {group.taskNum}: {group.taskName}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                      {t('创建于', 'Created')} {group.createdAt}
                      {group.completedAt ? ` · ${t('完成于', 'Completed')} ${group.completedAt}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="p-1.5 rounded-card-sm transition-all duration-200 hover:bg-[var(--sage-100)]"
                  style={{ color: 'var(--sage-400)', transform: expandedGroups.has(group.id) ? 'rotate(180deg)' : 'none' }}
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* File Chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                {group.files.map((f, fi) => (
                  <motion.div
                    key={fi}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: fi * 0.04, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-[var(--sage-200)] cursor-pointer"
                    style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
                  >
                    <FileTypeIcon type={f.type} size={12} />
                    <span>{f.name}</span>
                  </motion.div>
                ))}
              </div>

              {/* Inheritance connector + children */}
              <AnimatePresence>
                {expandedGroups.has(group.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                    className="overflow-hidden"
                  >
                    {/* Connector */}
                    <div className="flex items-center gap-2 mt-4 ml-5">
                      <div className="w-0.5 h-8" style={{ backgroundColor: 'var(--sage-300)' }} />
                      <ArrowDownIcon size={14} style={{ color: 'var(--sage-400)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--sage-500)' }}>
                        {t(`被 ${group.children.length} 个子任务继承`, `Inherited by ${group.children.length} sub-tasks`)}
                      </span>
                    </div>

                    {/* Child Task Cards */}
                    <div className="mt-2 ml-8 space-y-3">
                      {group.children.map((child, ci) => (
                        <motion.div
                          key={child.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: ci * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                          className="rounded-card-lg p-4"
                          style={{ backgroundColor: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Hash size={14} style={{ color: 'var(--sage-400)' }} />
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>
                              {t('任务', 'Task')} {child.taskNum}: {child.taskName}
                            </h4>
                            <span className="text-[10px] ml-auto" style={{ color: 'var(--sage-400)' }}>
                              {t('继承', 'Inherits')} {child.inheritedCount} + {child.newFiles} {t('新文件', 'new')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {child.files.map((cf, cfi) => (
                              <motion.div
                                key={cfi}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: cfi * 0.04 }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors hover:bg-[var(--sage-200)] ${cf.inherited ? '' : ''}`}
                                style={{
                                  backgroundColor: cf.inherited ? 'var(--sage-50)' : 'var(--sage-100)',
                                  color: 'var(--sage-600)',
                                  border: cf.inherited ? '1px dashed var(--sage-300)' : '1px solid transparent',
                                }}
                              >
                                {cf.inherited ? <Link2 size={10} /> : <Plus size={10} />}
                                <FileTypeIcon type={cf.type} size={12} />
                                <span>{cf.name}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ContentCard>
        </motion.div>
      ))}
      {filtered.length === 0 && <EmptyState t={t} message={t('未找到任务', 'No tasks found')} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared Empty State
   ═══════════════════════════════════════════════════════ */

function EmptyState({ t, message }: { t: (zh: string, en: string) => string; message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-bounce" style={{ backgroundColor: 'var(--sage-100)' }}>
        <FolderOpen size={28} style={{ color: 'var(--sage-300)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--sage-500)' }}>{message}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Missing icon imports
   ═══════════════════════════════════════════════════════ */

function Eye({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowDownIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

