import { useState } from 'react';

interface RoleTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  tags: string[];
}

const BUILTIN_TEMPLATES: RoleTemplate[] = [
  {
    id: 'pm',
    name: '产品经理',
    icon: '📊',
    description: '擅长需求分析、PRD撰写、用户故事梳理',
    systemPrompt: '你是一位经验丰富的产品经理，擅长将模糊的需求转化为清晰的PRD文档。你会主动追问边界条件，关注用户体验和商业价值。',
    tags: ['需求', '文档', '分析'],
  },
  {
    id: 'architect',
    name: '架构师',
    icon: '🏗️',
    description: '系统架构设计、技术选型、性能优化',
    systemPrompt: '你是一位全栈架构师，擅长设计高可用、可扩展的系统架构。你会考虑技术债务、运维成本、团队能力匹配。',
    tags: ['架构', '设计', '技术选型'],
  },
  {
    id: 'developer',
    name: '开发工程师',
    icon: '💻',
    description: '代码实现、调试、Code Review',
    systemPrompt: '你是一位资深开发工程师，代码风格简洁优雅，注重可读性和可维护性。你会主动写测试用例，关注边界情况。',
    tags: ['编码', '调试', '测试'],
  },
  {
    id: 'tester',
    name: '测试工程师',
    icon: '🐞',
    description: '测试用例设计、自动化测试、Bug分析',
    systemPrompt: '你是一位严谨的测试工程师，善于发现边界case。你会从用户场景出发设计测试策略，注重覆盖率。',
    tags: ['测试', '自动化', 'QA'],
  },
  {
    id: 'security',
    name: '安全专家',
    icon: '🛡️',
    description: '安全审计、漏洞分析、合规检查',
    systemPrompt: '你是一位安全专家，具备攻防思维。你会从OWASP、等保、GDPR等角度审视系统，给出可落地的修复建议。',
    tags: ['安全', '审计', '合规'],
  },
  {
    id: 'data',
    name: '数据分析师',
    icon: '📈',
    description: '数据分析、可视化、SQL优化',
    systemPrompt: '你是一位数据分析师，擅长从数据中发现洞察。你会给出清晰的SQL/查询建议，并解释统计意义。',
    tags: ['数据', 'SQL', '可视化'],
  },
  {
    id: 'writer',
    name: '技术写手',
    icon: '✍️',
    description: '文档撰写、README、技术博客',
    systemPrompt: '你是一位技术写手，能把复杂的技术概念用通俗的语言解释清楚。你注重文档结构和示例代码。',
    tags: ['文档', '写作', '教程'],
  },
];

/**
 * AgentRoleSelector — Agent 角色模板选择器
 * 7种内置角色 + 自定义输入，一键填充 System Prompt
 */
export default function AgentRoleSelector({
  onSelect,
  onCustom,
}: {
  onSelect: (template: RoleTemplate) => void;
  onCustom: (prompt: string) => void;
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const allTags = Array.from(new Set(BUILTIN_TEMPLATES.flatMap(t => t.tags)));
  const filtered = selectedTag
    ? BUILTIN_TEMPLATES.filter(t => t.tags.includes(selectedTag))
    : BUILTIN_TEMPLATES;

  return (
    <div className="space-y-4">
      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
            selectedTag === null
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          全部
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              selectedTag === tag
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 模板卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="flex items-start gap-3 p-3 bg-[#12121a] border border-gray-800 rounded-lg hover:border-indigo-500/50 hover:bg-[#1a1a2e] transition-all text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">{template.name}</span>
                <div className="flex gap-1">
                  {template.tags.map(t => (
                    <span key={t} className="px-1 py-0.5 text-[10px] bg-gray-800 text-gray-500 rounded">{t}</span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 自定义 */}
      <div className="border-t border-gray-800 pt-4">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
        >
          <span>{showCustom ? '▼' : '▶'}</span>
          <span>自定义 System Prompt</span>
        </button>
        {showCustom && (
          <div className="mt-3 space-y-2">
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="输入自定义 System Prompt..."
              rows={4}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:border-indigo-500 outline-none resize-none"
            />
            <button
              onClick={() => { if (customPrompt.trim()) { onCustom(customPrompt); setCustomPrompt(''); } }}
              disabled={!customPrompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              使用自定义角色
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
