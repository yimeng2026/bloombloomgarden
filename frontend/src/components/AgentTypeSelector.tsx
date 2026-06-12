import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

/* ── Agent Types Configuration ─────────────────────────────────── */

export interface AgentTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof LucideIcons;
  recommendedPlatforms: string[];
  recommendedModels: string[];
  defaultColor: string;
  defaultSystemPrompt: string;
  defaultCapabilities: string[];
}

export const AGENT_TYPES: AgentTypeConfig[] = [
  {
    id: 'general',
    name: '通用助手',
    description: '全能型助手，适用于日常问答、信息整理和通用任务',
    icon: 'Sparkles',
    recommendedPlatforms: ['openai', 'kimi', 'claude'],
    recommendedModels: ['gpt-4', 'k1.5', 'claude-3-5'],
    defaultColor: '#6B7280',
    defaultSystemPrompt: '你是一个通用助手，擅长处理各种日常任务，包括信息查询、内容整理、建议提供等。请保持友好、专业的态度。',
    defaultCapabilities: ['问答', '信息整理', '建议'],
  },
  {
    id: 'coding',
    name: '编程助手',
    description: '代码编写、调试、重构和代码审查专家',
    icon: 'Code',
    recommendedPlatforms: ['openai', 'claude', 'github-copilot'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1-mini'],
    defaultColor: '#3B82F6',
    defaultSystemPrompt: '你是一名资深软件工程师，擅长编写高质量、可维护的代码。请遵循最佳实践，编写清晰、高效的代码，并附带必要的注释。',
    defaultCapabilities: ['代码编写', '调试', '代码审查', '重构'],
  },
  {
    id: 'writing',
    name: '写作助手',
    description: '文案创作、技术文档、论文撰写和翻译',
    icon: 'PenTool',
    recommendedPlatforms: ['openai', 'kimi', 'claude'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'k1.5'],
    defaultColor: '#8B5CF6',
    defaultSystemPrompt: '你是一名专业写作者，擅长撰写各类文本，包括技术文档、商业文案、学术论文等。请确保内容清晰、准确、有条理。',
    defaultCapabilities: ['文案创作', '技术文档', '翻译', '润色'],
  },
  {
    id: 'analysis',
    name: '数据分析',
    description: '数据处理、统计分析、可视化建议',
    icon: 'BarChart3',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1-mini'],
    defaultColor: '#10B981',
    defaultSystemPrompt: '你是一名数据分析师，擅长数据清洗、统计分析、数据可视化建议。请提供准确的数据洞察和 actionable 的建议。',
    defaultCapabilities: ['数据清洗', '统计分析', '可视化', '报告'],
  },
  {
    id: 'creative',
    name: '创意设计师',
    description: '创意设计、UI/UX建议、品牌策划',
    icon: 'Palette',
    recommendedPlatforms: ['openai', 'midjourney', 'claude'],
    recommendedModels: ['gpt-4', 'dall-e-3', 'claude-3-5'],
    defaultColor: '#F59E0B',
    defaultSystemPrompt: '你是一名创意设计师，擅长提供创新的设计思路、UI/UX建议和品牌创意方案。请保持独特的审美视角。',
    defaultCapabilities: ['创意设计', 'UI/UX', '品牌策划', '配色'],
  },
  {
    id: 'research',
    name: '研究员',
    description: '深度研究、文献综述、信息检索',
    icon: 'Search',
    recommendedPlatforms: ['openai', 'claude', 'perplexity'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1'],
    defaultColor: '#6366F1',
    defaultSystemPrompt: '你是一名研究员，擅长深度研究、文献综述和信息检索。请提供全面、深入、有引用的研究结果。',
    defaultCapabilities: ['深度研究', '文献综述', '信息检索', '总结'],
  },
  {
    id: 'business',
    name: '商业顾问',
    description: '商业策略、市场分析、财务建议',
    icon: 'Briefcase',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1'],
    defaultColor: '#64748B',
    defaultSystemPrompt: '你是一名商业顾问，擅长商业策略、市场分析和财务建议。请提供务实、可执行的商业洞察。',
    defaultCapabilities: ['商业策略', '市场分析', '财务建议', '规划'],
  },
  {
    id: 'reviewer',
    name: '代码审查',
    description: '代码审查、质量评估、安全审计',
    icon: 'Eye',
    recommendedPlatforms: ['openai', 'claude', 'github-copilot'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1-mini'],
    defaultColor: '#EC4899',
    defaultSystemPrompt: '你是一名代码审查专家，擅长发现代码中的潜在问题、安全漏洞和性能瓶颈。请提供具体的改进建议。',
    defaultCapabilities: ['代码审查', '安全审计', '质量评估', '重构建议'],
  },
  {
    id: 'architect',
    name: '架构师',
    description: '系统架构、技术选型、设计模式',
    icon: 'Building2',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'o1', 'claude-3-5'],
    defaultColor: '#0EA5E9',
    defaultSystemPrompt: '你是一名系统架构师，擅长系统架构设计、技术选型和设计模式应用。请考虑可扩展性、可靠性和性能。',
    defaultCapabilities: ['架构设计', '技术选型', '设计模式', '性能优化'],
  },
  {
    id: 'qa',
    name: '测试工程师',
    description: '测试用例设计、自动化测试、质量保障',
    icon: 'TestTube',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1-mini'],
    defaultColor: '#EF4444',
    defaultSystemPrompt: '你是一名测试工程师，擅长测试用例设计、自动化测试策略和质量保障体系。请确保全面覆盖各类测试场景。',
    defaultCapabilities: ['测试用例', '自动化测试', '性能测试', '回归测试'],
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'CI/CD、容器化、基础设施管理',
    icon: 'Server',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1-mini'],
    defaultColor: '#14B8A6',
    defaultSystemPrompt: '你是一名DevOps工程师，擅长CI/CD流水线设计、容器化部署和基础设施管理。请遵循最佳实践。',
    defaultCapabilities: ['CI/CD', 'Docker', 'Kubernetes', '监控'],
  },
  {
    id: 'customer-service',
    name: '客服',
    description: '客户支持、问题解答、投诉处理',
    icon: 'Headphones',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'k1.5'],
    defaultColor: '#F97316',
    defaultSystemPrompt: '你是一名客服代表，擅长客户支持、问题解答和投诉处理。请保持耐心、专业，以客户满意度为优先。',
    defaultCapabilities: ['客户支持', '问题解答', '投诉处理', '工单'],
  },
  {
    id: 'security',
    name: '安全专家',
    description: '安全审计、漏洞分析、合规检查',
    icon: 'Shield',
    recommendedPlatforms: ['openai', 'claude'],
    recommendedModels: ['gpt-4', 'o1', 'claude-3-5'],
    defaultColor: '#DC2626',
    defaultSystemPrompt: '你是一名安全专家，擅长安全审计、漏洞分析和合规检查。请严格遵守安全标准，提供专业的安全建议。',
    defaultCapabilities: ['安全审计', '漏洞分析', '合规检查', '渗透测试'],
  },
  {
    id: 'legal',
    name: '法律专家',
    description: '法律咨询、合同审查、法规解读',
    icon: 'Scale',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1'],
    defaultColor: '#7C3AED',
    defaultSystemPrompt: '你是一名法律专家，擅长法律咨询、合同审查和法规解读。请提供准确、谨慎的法律建议，并注明免责声明。',
    defaultCapabilities: ['法律咨询', '合同审查', '法规解读', '尽职调查'],
  },
  {
    id: 'medical',
    name: '医疗专家',
    description: '医学咨询、病例分析、健康建议',
    icon: 'HeartPulse',
    recommendedPlatforms: ['openai', 'claude'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'o1'],
    defaultColor: '#06B6D4',
    defaultSystemPrompt: '你是一名医疗专家，擅长医学咨询、病例分析和健康建议。请提供基于循证医学的建议，并注明需咨询专业医生。',
    defaultCapabilities: ['医学咨询', '病例分析', '健康建议', '文献'],
  },
  {
    id: 'education',
    name: '教育助手',
    description: '教学辅导、课程设计、学习规划',
    icon: 'GraduationCap',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'k1.5'],
    defaultColor: '#FBBF24',
    defaultSystemPrompt: '你是一名教育助手，擅长教学辅导、课程设计和学习规划。请采用启发式教学方法，注重理解而非死记硬背。',
    defaultCapabilities: ['教学辅导', '课程设计', '学习规划', '答疑'],
  },
  {
    id: 'entertainment',
    name: '娱乐助手',
    description: '游戏攻略、影视推荐、创作娱乐内容',
    icon: 'Gamepad2',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'k1.5'],
    defaultColor: '#D946EF',
    defaultSystemPrompt: '你是一名娱乐助手，擅长游戏攻略、影视推荐和创作娱乐内容。请保持有趣、轻松的语气。',
    defaultCapabilities: ['游戏攻略', '影视推荐', '内容创作', '互动'],
  },
  {
    id: 'marketing',
    name: '营销专家',
    description: '营销策略、SEO/SEM、社交媒体运营',
    icon: 'Megaphone',
    recommendedPlatforms: ['openai', 'claude', 'kimi'],
    recommendedModels: ['gpt-4', 'claude-3-5', 'k1.5'],
    defaultColor: '#FB923C',
    defaultSystemPrompt: '你是一名营销专家，擅长营销策略、SEO/SEM和社交媒体运营。请提供数据驱动的营销建议。',
    defaultCapabilities: ['营销策略', 'SEO', '社交媒体', '内容营销'],
  },
];

/* ── Component ─────────────────────────────────────────────────── */

interface AgentTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: AgentTypeConfig) => void;
}

export default function AgentTypeSelector({ selectedType, onSelect }: AgentTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--sage-500)]">
        选择智能体类型，系统将自动推荐合适的平台、模型和配置
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AGENT_TYPES.map((type, idx) => {
          const IconComponent = (LucideIcons as any)[type.icon] || LucideIcons.Sparkles;
          const isSelected = selectedType === type.id;
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => onSelect(type)}
              className={`card p-4 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: type.defaultColor + '20' }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: type.defaultColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-[var(--sage-800)]">{type.name}</h3>
                  <p className="text-[11px] text-[var(--sage-500)] mt-0.5 line-clamp-2">{type.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {type.defaultCapabilities.slice(0, 2).map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-[var(--sage-500)]" style={{ borderColor: 'var(--sage-200)' }}>
                  <LucideIcons.CheckCircle className="w-3.5 h-3.5 text-[var(--sage-500)]" />
                  已选择
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
