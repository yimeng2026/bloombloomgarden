import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Users,
  Plus,
  Search,
  Play,
  Pause,
  Settings,
  MoreVertical,
  Trash2,
  Copy,
  Activity,
  Bot,
  Server,
  Code,
  BarChart3,
  Pencil,
  Globe,
  BookOpen,
  Star,
  Layout,
  ArrowRight,
  Sparkles,
  FolderOpen,
  CheckSquare2,
  Zap,
  Clock,
  Layers,
  Network,
  RefreshCw,
  Radio,
  CircleDot,
  Route,
  MessageSquare,
  TreePine,
  User,
  GitBranch,
  Workflow,
  ScanEye,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentGroup {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'paused' | 'error';
  agents: { id: string; name: string; avatarType: string; color: string }[];
  activeTasks: number;
  totalTasks: number;
  uptime: string;
}

interface CollaborationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  agentCount: number;
  handoffCount: number;
  uses: number;
  rating: number;
  icon: React.ElementType;
}

interface AvailableAgent {
  id: string;
  name: string;
  platform: string;
  skills: string[];
  status: 'running' | 'idle' | 'error';
  avatarType: string;
  color: string;
  fileCount: number;
  memoryCount: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const agentGroups: AgentGroup[] = [
  {
    id: 'cg-1', name: '开发团队', description: '前端+后端+测试+文档协作开发', status: 'active',
    agents: [
      { id: 'a1', name: '代码助手', avatarType: 'leaf', color: '#7fb89f' },
      { id: 'a2', name: '测试工程师', avatarType: 'mushroom', color: '#7fa3b0' },
      { id: 'a3', name: '文档撰写', avatarType: 'tree', color: '#d4a373' },
      { id: 'a4', name: 'API设计', avatarType: 'fern', color: '#8f9a7d' },
    ],
    activeTasks: 3, totalTasks: 12, uptime: '2h 34m',
  },
  {
    id: 'cg-2', name: '数据分析组', description: '数据清洗→分析→可视化→报告', status: 'idle',
    agents: [
      { id: 'a4', name: '数据清洗', avatarType: 'petal', color: '#7fa3b0' },
      { id: 'a5', name: '分析专家', avatarType: 'flower', color: '#c97b84' },
      { id: 'a6', name: '可视化师', avatarType: 'seed', color: '#c9a96e' },
    ],
    activeTasks: 0, totalTasks: 8, uptime: '空闲',
  },
  {
    id: 'cg-3', name: '内容创作组', description: '研究→写作→翻译→审校', status: 'paused',
    agents: [
      { id: 'a7', name: '研究员', avatarType: 'vine', color: '#a78b9a' },
      { id: 'a8', name: '写作者', avatarType: 'leaf', color: '#7fb89f' },
      { id: 'a9', name: '翻译员', avatarType: 'fern', color: '#8f9a7d' },
      { id: 'a10', name: '审校员', avatarType: 'mushroom', color: '#7fa3b0' },
    ],
    activeTasks: 1, totalTasks: 5, uptime: '已暂停',
  },
  {
    id: 'cg-4', name: '客服团队', description: '多语言客服响应', status: 'error',
    agents: [
      { id: 'a11', name: '客服A', avatarType: 'flower', color: '#c97b84' },
      { id: 'a12', name: '客服B', avatarType: 'tree', color: '#6b7a5a' },
    ],
    activeTasks: 0, totalTasks: 3, uptime: '错误',
  },
  {
    id: 'cg-5', name: 'DevOps流水线', description: '构建→测试→部署→监控', status: 'active',
    agents: [
      { id: 'a13', name: '构建助手', avatarType: 'seed', color: '#c9a96e' },
      { id: 'a14', name: '部署专家', avatarType: 'mushroom', color: '#7fa3b0' },
      { id: 'a15', name: '监控员', avatarType: 'vine', color: '#a78b9a' },
    ],
    activeTasks: 2, totalTasks: 6, uptime: '5h 12m',
  },
  {
    id: 'cg-6', name: '研究实验室', description: '文献综述→实验设计→数据分析→论文撰写', status: 'idle',
    agents: [
      { id: 'a16', name: '文献助手', avatarType: 'petal', color: '#7fa3b0' },
      { id: 'a17', name: '实验设计', avatarType: 'leaf', color: '#7fb89f' },
      { id: 'a18', name: '论文撰写', avatarType: 'fern', color: '#8f9a7d' },
      { id: 'a19', name: '数据分析师', avatarType: 'flower', color: '#c97b84' },
    ],
    activeTasks: 0, totalTasks: 10, uptime: '空闲',
  },
];

const templates: CollaborationTemplate[] = [
  { id: 't-1', name: '敏捷开发团队', category: '开发', description: '产品→前端→后端→测试→文档的完整敏捷开发流程', agentCount: 5, handoffCount: 4, uses: 2300, rating: 4.9, icon: Code },
  { id: 't-2', name: '数据分析流水线', category: '数据分析', description: '采集→清洗→分析→可视化→报告的数据处理流水线', agentCount: 4, handoffCount: 3, uses: 1800, rating: 4.7, icon: BarChart3 },
  { id: 't-3', name: '多语言内容工厂', category: '内容创作', description: '研究→写作→翻译→审校→发布的内容生产工厂', agentCount: 5, handoffCount: 4, uses: 890, rating: 4.6, icon: Pencil },
  { id: 't-4', name: '智能客服中心', category: '客服', description: '分类→响应→升级→反馈的智能客服处理流程', agentCount: 3, handoffCount: 3, uses: 3100, rating: 4.8, icon: Users },
];

const availableAgents: AvailableAgent[] = [
  { id: 'ag-1', name: '代码助手-01', platform: 'OpenAI', skills: ['代码生成', '代码审查', '调试'], status: 'running', avatarType: 'leaf', color: '#7fb89f', fileCount: 12, memoryCount: 1 },
  { id: 'ag-2', name: '数据分析-A', platform: 'Kimi', skills: ['数据分析', '数据可视化', '报告生成'], status: 'running', avatarType: 'flower', color: '#c97b84', fileCount: 8, memoryCount: 1 },
  { id: 'ag-3', name: '文档撰写-B', platform: 'Claude', skills: ['文档写作', '翻译', '审校'], status: 'idle', avatarType: 'tree', color: '#d4a373', fileCount: 5, memoryCount: 1 },
  { id: 'ag-4', name: '翻译专员', platform: 'GPT-4', skills: ['翻译', '本地化', '术语管理'], status: 'running', avatarType: 'fern', color: '#a78b9a', fileCount: 3, memoryCount: 0 },
  { id: 'ag-5', name: '测试工程师', platform: 'Ollama', skills: ['测试用例', '自动化测试', 'Bug追踪'], status: 'running', avatarType: 'mushroom', color: '#7fa3b0', fileCount: 15, memoryCount: 2 },
  { id: 'ag-6', name: '研究助手', platform: 'Gemini', skills: ['文献搜索', '综述撰写', '引用管理'], status: 'idle', avatarType: 'vine', color: '#7fb89f', fileCount: 20, memoryCount: 3 },
];

const autonomyLevels = [
  '完全手动 — 每步需人工确认',
  '谨慎 — 关键决策需确认',
  '平衡 — 标准流程自动执行',
  '自主 — 复杂任务自动处理',
  '高度自主 — 极少需人工干预',
  '完全自主 — 全权委托给智能体',
];

/* ------------------------------------------------------------------ */
/*  Easing                                                             */
/* ------------------------------------------------------------------ */

const easeGentle = [0.22, 1, 0.36, 1] as [number, number, number, number];
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Botanical Avatar                                                   */
/* ------------------------------------------------------------------ */

const avatarSvgs: Record<string, React.ReactNode> = {
  leaf: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M16 2C10 10 4 16 4 22a12 12 0 1024 0c0-6-6-12-12-20z" fill="currentColor" opacity="0.8"/><path d="M16 12c-3 4-6 7-6 10a6 6 0 0012 0c0-3-3-6-6-10z" fill="currentColor" opacity="0.5"/></svg>,
  flower: <svg viewBox="0 0 32 32" className="w-full h-full"><circle cx="16" cy="16" r="4" fill="currentColor"/><circle cx="16" cy="6" r="3.5" fill="currentColor" opacity="0.7"/><circle cx="24" cy="12" r="3.5" fill="currentColor" opacity="0.7"/><circle cx="22" cy="22" r="3.5" fill="currentColor" opacity="0.7"/><circle cx="10" cy="22" r="3.5" fill="currentColor" opacity="0.7"/><circle cx="8" cy="12" r="3.5" fill="currentColor" opacity="0.7"/></svg>,
  tree: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M16 4L6 16h6v4H6l10 8 10-8h-6v-4h6z" fill="currentColor" opacity="0.8"/></svg>,
  fern: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M16 2v28" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 10c-4 1-7 4-7 7 0-3 3-6 7-7z" fill="currentColor" opacity="0.7"/><path d="M16 16c4 1 7 4 7 7 0-3-3-6-7-7z" fill="currentColor" opacity="0.7"/></svg>,
  mushroom: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M6 18c0-8 4.5-14 10-14s10 6 10 14z" fill="currentColor" opacity="0.8"/><rect x="12" y="18" width="8" height="10" rx="2" fill="currentColor" opacity="0.6"/></svg>,
  vine: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M4 28Q12 20 16 16T28 4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/><circle cx="16" cy="16" r="2.5" fill="currentColor"/><circle cx="22" cy="10" r="2" fill="currentColor" opacity="0.7"/></svg>,
  seed: <svg viewBox="0 0 32 32" className="w-full h-full"><ellipse cx="16" cy="20" rx="6" ry="7" fill="currentColor" opacity="0.8"/><path d="M16 12c0-6 3-10 3-10s-3 1.5-6 1.5-3-1.5-3-1.5 3 4 6 10z" fill="currentColor" opacity="0.6"/></svg>,
  petal: <svg viewBox="0 0 32 32" className="w-full h-full"><path d="M16 4c-6 6-9 12-9 17a9 9 0 1018 0c0-5-3-11-9-17z" fill="currentColor" opacity="0.7"/><circle cx="16" cy="20" r="3" fill="currentColor" opacity="0.9"/></svg>,
};

function AgentAvatar({ type, color, size = 32 }: { type: string; color: string; size?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, color, backgroundColor: `${color}20` }}
    >
      <div style={{ width: size * 0.6, height: size * 0.6 }}>
        {avatarSvgs[type] || avatarSvgs.leaf}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Helpers                                                     */
/* ------------------------------------------------------------------ */

function statusColor(status: string) {
  switch (status) {
    case 'active': case 'running': case 'online': return { bg: 'var(--bloom-mint)', text: 'var(--success)' };
    case 'idle': return { bg: 'var(--sage-300)', text: 'var(--sage-400)' };
    case 'paused': return { bg: 'var(--bloom-amber)', text: 'var(--warning)' };
    case 'error': return { bg: 'var(--bloom-rose)', text: 'var(--error)' };
    default: return { bg: 'var(--sage-300)', text: 'var(--sage-400)' };
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return '活跃';
    case 'idle': return '空闲';
    case 'paused': return '暂停';
    case 'error': return '错误';
    default: return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Group Card                                                         */
/* ------------------------------------------------------------------ */

function GroupCard({ group, index, onOpen, onDelete }: { group: AgentGroup; index: number; onOpen: () => void; onDelete: () => void }) {
  const sc = statusColor(group.status);
  return (
    <motion.div
      className="rounded-card overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
      }}
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: easeGentle }}
      onClick={onOpen}
    >
      {/* Status bar */}
      <div style={{ height: 4, backgroundColor: sc.bg }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>{group.name}</h3>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${sc.text}15`, color: sc.text }}
          >
            {statusLabel(group.status)}
          </span>
        </div>
        <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--sage-500)' }}>{group.description}</p>

        {/* Agent avatars */}
        <div className="flex items-center mb-4">
          <div className="flex -space-x-2">
            {group.agents.slice(0, 5).map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05, ease: easeSpring }}
                title={agent.name}
              >
                <AgentAvatar type={agent.avatarType} color={agent.color} size={32} />
              </motion.div>
            ))}
          </div>
          {group.agents.length > 5 && (
            <span className="ml-2 text-xs" style={{ color: 'var(--sage-400)' }}>+{group.agents.length - 5}</span>
          )}
          <span className="ml-auto text-xs" style={{ color: 'var(--sage-400)' }}>{group.agents.length} 个智能体</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs mb-4" style={{ color: 'var(--sage-400)' }}>
          <span className="flex items-center gap-1">
            <CheckSquare2 size={12} /> {group.activeTasks}/{group.totalTasks} 任务
          </span>
          <span className="flex items-center gap-1">
            <Activity size={12} /> {group.uptime}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--sage-100)' }}>
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all duration-200"
            style={{ color: 'var(--sage-500)', backgroundColor: 'var(--sage-50)' }}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            <Activity size={12} /> 监控
          </button>
          <button
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all duration-200"
            style={{ color: 'var(--sage-500)', backgroundColor: 'var(--sage-50)' }}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Settings size={12} />
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-card-sm transition-all duration-200"
            style={{ color: 'var(--sage-400)' }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Card                                                      */
/* ------------------------------------------------------------------ */

function TemplateCard({ template, index, onUse }: { template: CollaborationTemplate; index: number; onUse: () => void }) {
  const Icon = template.icon;
  return (
    <motion.div
      className="rounded-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: easeGentle }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-card-sm flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--sage-100)' }}
          >
            <Icon size={20} style={{ color: 'var(--sage-500)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>{template.name}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}
            >
              {template.category}
            </span>
          </div>
        </div>
        <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--sage-500)' }}>{template.description}</p>
        <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'var(--sage-400)' }}>
          <span className="flex items-center gap-1"><Users size={12} /> {template.agentCount} 智能体</span>
          <span className="flex items-center gap-1"><ArrowRight size={12} /> {template.handoffCount} 交接</span>
          <span className="flex items-center gap-1"><Star size={12} /> {template.rating}</span>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--sage-300)' }}>
          <span>{template.uses.toLocaleString()} 次使用</span>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--sage-100)' }}>
          <button
            className="flex-1 py-2 rounded-card-sm text-sm font-medium text-white transition-all duration-200"
            style={{ backgroundColor: 'var(--sage-500)' }}
            onClick={onUse}
          >
            使用模板
          </button>
          <button
            className="px-4 py-2 rounded-card-sm text-sm transition-all duration-200"
            style={{ color: 'var(--sage-500)', backgroundColor: 'var(--sage-50)' }}
          >
            预览
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Wizard Modal (4-step)                                       */
/* ------------------------------------------------------------------ */

const wizardStepLabels = ['基本信息', '添加智能体', '配置工作流', '确认创建'];

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [taskType, setTaskType] = useState('sequential');
  const [autonomyLevel, setAutonomyLevel] = useState(2);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [outputFormat, setOutputFormat] = useState('structured');
  const [handoffRule, setHandoffRule] = useState('auto');

  const filteredAgents = availableAgents.filter(a =>
    !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase()) || a.skills.some(s => s.includes(agentSearch))
  );

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const goNext = () => {
    if (step < 3) {
      setDirection(1);
      setStep(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(prev => prev - 1);
    }
  };

  const canGoNext = (() => {
    switch (step) {
      case 0: return groupName.trim().length > 0;
      case 1: return selectedAgents.length > 0;
      default: return true;
    }
  })();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(26, 31, 24, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-[900px] max-h-[85vh] rounded-card overflow-hidden flex flex-col"
        style={{ backgroundColor: '#fff', boxShadow: 'var(--shadow-card-elevated)' }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: easeSpring }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <h2 className="text-lg font-semibold font-display" style={{ color: 'var(--sage-800)' }}>新建协作组</h2>
          <button
            className="w-8 h-8 rounded-card-sm flex items-center justify-center transition-colors duration-200"
            style={{ color: 'var(--sage-400)' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center">
            {wizardStepLabels.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      width: step === i ? 26 : 22,
                      height: step === i ? 26 : 22,
                      backgroundColor: i < step ? 'var(--sage-500)' : step === i ? 'var(--sage-500)' : 'transparent',
                      color: i <= step ? '#fff' : 'var(--sage-400)',
                      border: i > step ? '2px solid var(--sage-300)' : 'none',
                      boxShadow: step === i ? '0 0 0 3px rgba(107,122,90,0.15)' : 'none',
                    }}
                  >
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: step === i ? 'var(--sage-700)' : i < step ? 'var(--sage-500)' : 'var(--sage-400)',
                      fontWeight: step === i ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
                {i < wizardStepLabels.length - 1 && (
                  <div className="mx-3 mb-5" style={{ width: 50, height: 2, backgroundColor: i < step ? 'var(--sage-500)' : 'var(--sage-200)' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.4, ease: easeGentle }}
            >
              {/* Step 1: Basic Info */}
              {step === 0 && (
                <div className="space-y-6 max-w-[600px] mx-auto">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>
                      协作组名称 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="输入协作组名称"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)]"
                      style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>描述</label>
                    <textarea
                      placeholder="描述此协作组的用途..."
                      value={groupDesc}
                      onChange={e => setGroupDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)] resize-y"
                      style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', minHeight: 80 }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>任务类型</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'sequential', label: '顺序执行', desc: '按顺序依次执行' },
                        { id: 'parallel', label: '并行执行', desc: '同时执行任务' },
                        { id: 'conditional', label: '条件执行', desc: '根据条件分支' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          className="p-4 rounded-card border-2 text-left transition-all duration-200"
                          style={{
                            borderColor: taskType === opt.id ? 'var(--sage-500)' : 'var(--sage-200)',
                            backgroundColor: taskType === opt.id ? 'var(--sage-50)' : '#fff',
                          }}
                          onClick={() => setTaskType(opt.id)}
                        >
                          <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{opt.label}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>
                      自主级别: {autonomyLevel} — {autonomyLevels[autonomyLevel]}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={autonomyLevel}
                      onChange={e => setAutonomyLevel(Number(e.target.value))}
                      className="w-full accent-[var(--sage-500)]"
                      style={{ accentColor: 'var(--sage-500)' }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--sage-400)' }}>
                      <span>手动</span>
                      <span>完全自主</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Agents */}
              {step === 1 && (
                <div>
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
                    <input
                      type="text"
                      placeholder="搜索智能体..."
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-card-md border text-sm outline-none"
                      style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                    />
                  </div>

                  {/* Selected summary */}
                  {selectedAgents.length > 0 && (
                    <div className="mb-4 p-3 rounded-card-sm" style={{ backgroundColor: 'var(--sage-50)' }}>
                      <span className="text-sm" style={{ color: 'var(--sage-700)' }}>已选择 {selectedAgents.length} 个智能体</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {filteredAgents.map((agent, i) => {
                      const isSelected = selectedAgents.includes(agent.id);
                      const sc = statusColor(agent.status);
                      return (
                        <motion.button
                          key={agent.id}
                          className="flex flex-col gap-2 p-4 rounded-card border-2 transition-all duration-200 text-left"
                          style={{
                            backgroundColor: isSelected ? 'var(--sage-50)' : '#fff',
                            borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                          }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: i * 0.06, ease: easeGentle }}
                          onClick={() => toggleAgent(agent.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)' }}
                            >
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <AgentAvatar type={agent.avatarType} color={agent.color} size={36} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{agent.name}</div>
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--sage-400)' }}>
                                <Server size={10} /> {agent.platform}
                                <span style={{ color: sc.text }}>● {agent.status === 'running' ? '运行中' : agent.status === 'idle' ? '空闲' : '错误'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 pl-8">
                            {agent.skills.map(s => (
                              <span key={s} className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-500)' }}>{s}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs pl-8" style={{ color: 'var(--sage-400)' }}>
                            <span className="flex items-center gap-1"><FolderOpen size={10} /> {agent.fileCount} 工作文件</span>
                            <span className="flex items-center gap-1"><Zap size={10} /> {agent.memoryCount} 记忆文件</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Workflow */}
              {step === 2 && (
                <div className="space-y-6 max-w-[600px] mx-auto">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>交接规则</label>
                    <div className="space-y-2">
                      {[
                        { id: 'auto', label: '自动交接', desc: '任务完成后自动交接给下一个智能体' },
                        { id: 'manual', label: '手动交接', desc: '每次交接需人工确认' },
                        { id: 'conditional', label: '条件交接', desc: '根据任务结果决定交接路径' },
                      ].map(rule => (
                        <button
                          key={rule.id}
                          className="w-full flex items-center gap-3 p-4 rounded-card border-2 text-left transition-all duration-200"
                          style={{
                            borderColor: handoffRule === rule.id ? 'var(--sage-500)' : 'var(--sage-200)',
                            backgroundColor: handoffRule === rule.id ? 'var(--sage-50)' : '#fff',
                          }}
                          onClick={() => setHandoffRule(rule.id)}
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                            style={{
                              borderColor: handoffRule === rule.id ? 'var(--sage-500)' : 'var(--sage-300)',
                              backgroundColor: handoffRule === rule.id ? 'var(--sage-500)' : 'transparent',
                            }}
                          >
                            {handoffRule === rule.id && <Check size={10} className="text-white" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{rule.label}</div>
                            <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{rule.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--sage-700)' }}>输出格式</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'structured', label: '结构化', desc: 'JSON/XML格式' },
                        { id: 'document', label: '文档', desc: 'Markdown/Word' },
                        { id: 'raw', label: '原始', desc: '纯文本输出' },
                      ].map(fmt => (
                        <button
                          key={fmt.id}
                          className="p-4 rounded-card border-2 text-center transition-all duration-200"
                          style={{
                            borderColor: outputFormat === fmt.id ? 'var(--sage-500)' : 'var(--sage-200)',
                            backgroundColor: outputFormat === fmt.id ? 'var(--sage-50)' : '#fff',
                          }}
                          onClick={() => setOutputFormat(fmt.id)}
                        >
                          <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{fmt.label}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sage-400)' }}>{fmt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Preview */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: 'var(--sage-700)' }}>工作流预览</label>
                    <div
                      className="p-4 rounded-card border overflow-x-auto"
                      style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}
                    >
                      <div className="flex items-center gap-3 min-w-max">
                        {selectedAgents.map((agentId, i) => {
                          const agent = availableAgents.find(a => a.id === agentId);
                          if (!agent) return null;
                          return (
                            <div key={agentId} className="flex items-center gap-3">
                              <div className="flex flex-col items-center gap-1.5">
                                <AgentAvatar type={agent.avatarType} color={agent.color} size={40} />
                                <span className="text-xs" style={{ color: 'var(--sage-600)' }}>{agent.name}</span>
                              </div>
                              {i < selectedAgents.length - 1 && (
                                <div className="flex flex-col items-center gap-1">
                                  <ArrowRight size={16} style={{ color: 'var(--sage-400)' }} />
                                  <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>
                                    {handoffRule === 'auto' ? '自动' : handoffRule === 'manual' ? '手动' : '条件'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 3 && (
                <div className="space-y-4 max-w-[600px] mx-auto">
                  <div className="p-4 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--sage-700)' }}>协作组信息</h4>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>名称: {groupName}</div>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>描述: {groupDesc || '—'}</div>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>任务类型: {taskType === 'sequential' ? '顺序执行' : taskType === 'parallel' ? '并行执行' : '条件执行'}</div>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>自主级别: {autonomyLevel} — {autonomyLevels[autonomyLevel]}</div>
                  </div>

                  <div className="p-4 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--sage-700)' }}>智能体成员 ({selectedAgents.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgents.map(id => {
                        const agent = availableAgents.find(a => a.id === id);
                        if (!agent) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>
                            <AgentAvatar type={agent.avatarType} color={agent.color} size={18} />
                            {agent.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--sage-700)' }}>工作流配置</h4>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>交接规则: {handoffRule === 'auto' ? '自动交接' : handoffRule === 'manual' ? '手动交接' : '条件交接'}</div>
                    <div className="text-sm" style={{ color: 'var(--sage-500)' }}>输出格式: {outputFormat === 'structured' ? '结构化' : outputFormat === 'document' ? '文档' : '原始'}</div>
                  </div>

                  <div className="mt-6">
                    <button
                      className="w-full py-3 rounded-card text-white font-semibold text-base transition-all duration-200"
                      style={{ backgroundColor: 'var(--sage-500)', boxShadow: '0 0 0 3px rgba(107,122,90,0.2)' }}
                      onClick={() => {
                        onClose();
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles size={18} />
                        创建协作组
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-card-sm text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: 'var(--sage-100)',
                color: step === 0 ? 'var(--sage-300)' : 'var(--sage-700)',
                cursor: step === 0 ? 'not-allowed' : 'pointer',
              }}
              onClick={goPrev}
              disabled={step === 0}
            >
              <ChevronLeft size={16} />
              上一步
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2 rounded-card-sm text-sm font-medium text-white transition-all duration-200"
              style={{
                backgroundColor: canGoNext ? 'var(--sage-500)' : 'var(--sage-300)',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={!canGoNext}
            >
              下一步
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collaboration Mode Types & Data                                   */
/* ------------------------------------------------------------------ */

type CollabMode = 'sequential' | 'parallel' | 'hierarchical' | 'dynamic';

const modeConfig: Record<CollabMode, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  sequential: { label: '顺序执行', desc: '按序依次处理', icon: Clock, color: '#7fa3b0' },
  parallel:   { label: '并行执行', desc: '同时多路处理', icon: Layers, color: '#7fb89f' },
  hierarchical: { label: '层级结构', desc: '上下级汇报链', icon: Network, color: '#a78b9a' },
  dynamic:    { label: '动态重组', desc: '自适应调整', icon: RefreshCw, color: '#d4a373' },
};

interface HandoffStep {
  id: string;
  from: { id: string; name: string; color: string };
  to: { id: string; name: string; color: string };
  status: 'completed' | 'active' | 'pending';
  message: string;
  timestamp: string;
}

const mockHandoffFlow: HandoffStep[] = [
  { id: 'h1', from: { id: 'a1', name: '需求分析', color: '#7fb89f' }, to: { id: 'a2', name: '代码助手', color: '#7fa3b0' }, status: 'completed', message: '需求文档已交付', timestamp: '09:30:15' },
  { id: 'h2', from: { id: 'a2', name: '代码助手', color: '#7fa3b0' }, to: { id: 'a3', name: '测试工程师', color: '#c97b84' }, status: 'completed', message: '代码实现完成', timestamp: '09:45:22' },
  { id: 'h3', from: { id: 'a3', name: '测试工程师', color: '#c97b84' }, to: { id: 'a4', name: '文档撰写', color: '#d4a373' }, status: 'active', message: '测试通过，交付文档', timestamp: '10:00:05' },
  { id: 'h4', from: { id: 'a4', name: '文档撰写', color: '#d4a373' }, to: { id: 'a5', name: '部署专家', color: '#a78b9a' }, status: 'pending', message: '等待文档完成', timestamp: '' },
];

interface CollabAgent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error' | 'completed';
  role: string;
  progress: number;
  currentTask: string;
  color: string;
  avatarType: string;
}

const mockCollabAgents: CollabAgent[] = [
  { id: 'a1', name: '需求分析', status: 'completed', role: '分析', progress: 100, currentTask: '已完成', color: '#7fb89f', avatarType: 'leaf' },
  { id: 'a2', name: '代码助手', status: 'completed', role: '开发', progress: 100, currentTask: '已实现', color: '#7fa3b0', avatarType: 'mushroom' },
  { id: 'a3', name: '测试工程师', status: 'running', role: '测试', progress: 75, currentTask: '集成测试', color: '#c97b84', avatarType: 'flower' },
  { id: 'a4', name: '文档撰写', status: 'idle', role: '文档', progress: 0, currentTask: '等待中', color: '#d4a373', avatarType: 'tree' },
  { id: 'a5', name: '部署专家', status: 'idle', role: '运维', progress: 0, currentTask: '等待中', color: '#a78b9a', avatarType: 'vine' },
];

/* ------------------------------------------------------------------ */
/*  Handoff Flow Visualization                                        */
/* ------------------------------------------------------------------ */

function HandoffFlowViz({ steps }: { steps: HandoffStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: easeGentle }}
          className="flex items-center gap-3"
        >
          {/* From Agent */}
          <div className="flex flex-col items-center gap-1 w-20">
            <AgentAvatar type="leaf" color={step.from.color} size={36} />
            <span className="text-[10px] text-[var(--sage-600)] text-center truncate w-full">{step.from.name}</span>
          </div>

          {/* Connector */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-8 relative flex items-center">
              <div className="w-full h-[2px] rounded-full" style={{ backgroundColor: step.status === 'completed' ? 'var(--success)' : step.status === 'active' ? 'var(--sage-500)' : 'var(--sage-200)' }} />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                animate={step.status === 'active' ? { left: ['0%', '80%', '0%'] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ left: step.status === 'completed' ? '100%' : step.status === 'active' ? '50%' : '0%' }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: step.status === 'completed' ? 'var(--success)' : step.status === 'active' ? 'var(--sage-500)' : 'var(--sage-300)' }}
                />
              </motion.div>
              <ArrowRight
                size={14}
                className="absolute right-0 top-1/2 -translate-y-1/2"
                style={{ color: step.status === 'completed' ? 'var(--success)' : step.status === 'active' ? 'var(--sage-500)' : 'var(--sage-300)' }}
              />
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              step.status === 'completed' ? 'bg-green-500/10 text-green-600' :
              step.status === 'active' ? 'bg-[var(--sage-100)] text-[var(--sage-600)]' :
              'bg-gray-100 text-[var(--sage-400)]'
            }`}>
              {step.status === 'completed' ? '已完成' : step.status === 'active' ? '进行中' : '等待中'}
            </span>
          </div>

          {/* To Agent */}
          <div className="flex flex-col items-center gap-1 w-20">
            <AgentAvatar type="leaf" color={step.to.color} size={36} />
            <span className="text-[10px] text-[var(--sage-600)] text-center truncate w-full">{step.to.name}</span>
          </div>

          {/* Message */}
          <div className="w-40 flex-shrink-0">
            <div className="text-[11px] text-[var(--sage-600)] bg-[var(--sage-50)] rounded-lg px-2.5 py-1.5 truncate">
              {step.message}
            </div>
            {step.timestamp && (
              <div className="text-[10px] text-[var(--sage-400)] mt-0.5">{step.timestamp}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Realtime Status Panel                                             */
/* ------------------------------------------------------------------ */

function RealtimeStatusPanel({ agents }: { agents: CollabAgent[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {agents.map((agent, i) => {
        const sc = statusColor(agent.status);
        return (
          <motion.div
            key={agent.id}
            className="rounded-card p-4 transition-all duration-200"
            style={{
              backgroundColor: '#fff',
              border: '1px solid var(--sage-200)',
              boxShadow: 'var(--shadow-card)',
            }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: easeGentle }}
          >
            <div className="flex items-center gap-3 mb-3">
              <AgentAvatar type={agent.avatarType} color={agent.color} size={38} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{agent.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--sage-400)' }}>{agent.role}</div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ backgroundColor: `${sc.text}15`, color: sc.text }}
              >
                {statusLabel(agent.status)}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--sage-400)' }}>
                <span>进度</span>
                <span>{agent.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sage-100)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: agent.status === 'completed' ? 'var(--success)' : agent.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ duration: 0.8, ease: easeGentle }}
                />
              </div>
            </div>

            {/* Current Task */}
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sage-500)' }}>
              {agent.status === 'running' && (
                <Loader2 size={10} className="animate-spin" style={{ color: agent.color }} />
              )}
              {agent.status === 'completed' && <Check size={10} style={{ color: 'var(--success)' }} />}
              {agent.status === 'idle' && <Clock size={10} />}
              {agent.status === 'error' && <X size={10} style={{ color: 'var(--error)' }} />}
              <span className="truncate">{agent.currentTask}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AgentCollab() {
  const [activeTab, setActiveTab] = useState<'groups' | 'create' | 'templates' | 'collab'>('groups');
  const [collabMode, setCollabMode] = useState<CollabMode>('sequential');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groups, setGroups] = useState(agentGroups);

  const filteredGroups = groups.filter(g => {
    const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { id: 'all', label: '全部' },
    { id: 'active', label: '活跃' },
    { id: 'idle', label: '空闲' },
    { id: 'paused', label: '暂停' },
    { id: 'error', label: '错误' },
  ];

  const tabs = [
    { id: 'groups' as const, label: '协作组列表', icon: Users },
    { id: 'collab' as const, label: '协作编排', icon: Workflow },
    { id: 'create' as const, label: '创建向导', icon: Plus },
    { id: 'templates' as const, label: '模板市场', icon: Layout },
  ];

  return (
    <div className="max-w-[1440px] mx-auto pb-8">
      {/* Hero Header */}
      <motion.div
        className="rounded-card p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        style={{
          backgroundColor: '#fff',
          border: '1px solid var(--sage-200)',
          boxShadow: 'var(--shadow-card)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeGentle }}
      >
        <div>
          <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--sage-800)' }}>多智能体协作</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>组建智能体团队，协同工作 · Agent Collaboration</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
            <input
              type="text"
              placeholder="搜索协作组..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-card-md border text-sm outline-none transition-all duration-200 focus:border-[var(--sage-500)]"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            />
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-card-sm text-sm font-medium text-white transition-all duration-200 hover:shadow-md"
            style={{ backgroundColor: 'var(--sage-500)' }}
            onClick={() => setShowCreateWizard(true)}
          >
            <Plus size={16} />
            新建协作组
          </button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300"
              style={{ color: isActive ? 'var(--sage-700)' : 'var(--sage-400)' }}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                  layoutId="activeTab"
                  transition={{ duration: 0.3, ease: easeGentle }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'groups' && (
          <motion.div
            key="groups"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: easeGentle }}
          >
            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-4">
              {statusFilters.map(filter => (
                <button
                  key={filter.id}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    backgroundColor: statusFilter === filter.id ? 'var(--sage-500)' : 'var(--sage-100)',
                    color: statusFilter === filter.id ? '#fff' : 'var(--sage-500)',
                  }}
                  onClick={() => setStatusFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Groups Grid */}
            {filteredGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGroups.map((group, i) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    index={i}
                    onOpen={() => {}}
                    onDelete={() => setGroups(prev => prev.filter(g => g.id !== group.id))}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--sage-100)' }}
                >
                  <Users size={32} style={{ color: 'var(--sage-300)' }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--sage-700)' }}>暂无协作组</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>点击上方按钮创建您的第一个协作组</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: easeGentle }}
          >
            <div
              className="rounded-card p-8 text-center"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--sage-100)' }}
              >
                <Plus size={32} style={{ color: 'var(--sage-500)' }} />
              </div>
              <h3 className="text-lg font-semibold font-display" style={{ color: 'var(--sage-800)' }}>创建新协作组</h3>
              <p className="text-sm mt-2 mb-6" style={{ color: 'var(--sage-400)' }}>通过向导创建多智能体协作团队</p>
              <button
                className="px-8 py-3 rounded-card text-white font-medium transition-all duration-200"
                style={{ backgroundColor: 'var(--sage-500)', boxShadow: '0 0 0 3px rgba(107,122,90,0.2)' }}
                onClick={() => setShowCreateWizard(true)}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={18} />
                  开始创建
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: easeGentle }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {templates.map((template, i) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={i}
                  onUse={() => {
                    setShowCreateWizard(true);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'collab' && (
          <motion.div
            key="collab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: easeGentle }}
            className="space-y-6"
          >
            {/* Mode Selection */}
            <div
              className="rounded-card p-5"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--sage-700)' }}>
                <CircleDot size={16} style={{ color: 'var(--sage-500)' }} />
                协作模式选择
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(modeConfig) as [CollabMode, typeof modeConfig.sequential][]).map(([mode, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = collabMode === mode;
                  return (
                    <motion.button
                      key={mode}
                      className="relative flex flex-col items-center gap-2 p-4 rounded-card border-2 text-center transition-all duration-200"
                      style={{
                        borderColor: isActive ? cfg.color : 'var(--sage-200)',
                        backgroundColor: isActive ? `${cfg.color}08` : '#fff',
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCollabMode(mode)}
                    >
                      {isActive && (
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ease: easeSpring }}
                        >
                          <Check size={14} style={{ color: cfg.color }} />
                        </motion.div>
                      )}
                      <Icon size={24} style={{ color: isActive ? cfg.color : 'var(--sage-400)' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: isActive ? 'var(--sage-700)' : 'var(--sage-600)' }}>{cfg.label}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--sage-400)' }}>{cfg.desc}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-500)' }}>
                当前模式: <span className="font-semibold" style={{ color: modeConfig[collabMode].color }}>{modeConfig[collabMode].label}</span>
                {' · '}
                {collabMode === 'sequential' && '任务按固定顺序在智能体之间传递，每步完成后自动交接给下一个。'}
                {collabMode === 'parallel' && '所有智能体同时执行任务，结果自动汇总。'}
                {collabMode === 'hierarchical' && '按照组织架构自上而下分配任务，结果逐级上报。'}
                {collabMode === 'dynamic' && '根据任务复杂度和智能体负载自动调整执行顺序和分配策略。'}
              </div>
            </div>

            {/* Participating Agents */}
            <div
              className="rounded-card p-5"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--sage-700)' }}>
                <Users size={16} style={{ color: 'var(--sage-500)' }} />
                参与协作的 Agent
              </h3>
              <RealtimeStatusPanel agents={mockCollabAgents} />
            </div>

            {/* Handoff Flow Visualization */}
            <div
              className="rounded-card p-5"
              style={{ backgroundColor: '#fff', border: '1px solid var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--sage-700)' }}>
                <Route size={16} style={{ color: 'var(--sage-500)' }} />
                手递手（Handoff）流程
              </h3>
              <HandoffFlowViz steps={mockHandoffFlow} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Wizard Modal */}
      <AnimatePresence>
        {showCreateWizard && (
          <CreateGroupModal onClose={() => setShowCreateWizard(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
