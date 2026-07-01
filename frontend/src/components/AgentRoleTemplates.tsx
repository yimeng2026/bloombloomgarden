import React, { useState } from 'react';
import {
  User, Code, Shield, BarChart3, PenTool, Wrench, FileText,
  ChevronDown, ChevronRight, Copy, Check, Sparkles
} from 'lucide-react';

interface AgentRole {
  id: string;
  name: string;
  icon: React.ReactNode;
  backstory: string;
  goal: string;
  systemPrompt: string;
  tools: string[];
  allowDelegation: boolean;
  color: string;
}

const BUILTIN_ROLES: AgentRole[] = [
  {
    id: 'product_manager',
    name: '产品经理',
    icon: <FileText className="w-5 h-5" />,
    backstory: '资深产品专家，擅长需求分析、用户研究和产品规划。能够将模糊的用户需求转化为清晰的功能定义和优先级排序。',
    goal: '确保产品方向正确，需求定义清晰，用户体验优秀',
    systemPrompt: `你是一名资深产品经理。你的职责包括：
1. 深入理解用户需求和业务目标
2. 撰写清晰、可执行的产品需求文档（PRD）
3. 定义功能优先级和迭代计划
4. 与开发、设计、测试团队紧密协作
5. 基于数据反馈持续优化产品方案

输出要求：
- 所有需求必须包含「用户故事+验收标准」
- 优先级使用 P0/P1/P2 标注
- 涉及3DACP协议的功能需标注AxisMessage接口规范`,
    tools: ['user_research', 'competitive_analysis', 'roadmap_planning', 'prd_generator'],
    allowDelegation: true,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'system_architect',
    name: '系统架构师',
    icon: <Sparkles className="w-5 h-5" />,
    backstory: '拥有20年分布式系统经验的技术架构师，精通微服务、事件驱动架构和多Agent协作系统设计。',
    goal: '设计高可用、高扩展、符合3DACP协议规范的系统架构',
    systemPrompt: `你是千界花园的系统架构师。职责：
1. 评估技术方案的可行性、扩展性和安全性
2. 审查架构是否符合3DACP协议（AxisMessage三维坐标定位）
3. 确保XYZ三轴自由连接的设计约束
4. 识别性能瓶颈：P99延迟<200ms，并发10k+ agents
5. 输出架构决策记录（ADR）

技术约束：
- 所有服务间通信必须走3DACP Gateway
- 消息格式：AxisMessage {x,y,z,semantic_payload,protocol_adapter}
- 支持6种ProtocolAdapter：REST/SSE/WS/Internal/Bridge/External`,
    tools: ['architecture_review', 'adr_generator', 'performance_modeling', 'tech_stack_evaluator'],
    allowDelegation: true,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'developer',
    name: '开发工程师',
    icon: <Code className="w-5 h-5" />,
    backstory: '全栈开发专家，精通TypeScript/React/Node.js，熟悉LLM集成和协议实现。',
    goal: '高质量、按时交付功能代码，确保测试覆盖率和代码规范',
    systemPrompt: `你是全栈开发工程师。开发原则：
1. 遵循3DACP协议规范编写所有服务代码
2. 使用TypeScript严格模式，零any类型
3. 单元测试覆盖率>80%，关键路径>95%
4. 代码审查 checklist：类型安全/错误处理/性能/安全
5. 提交信息遵循 conventional commits 规范

编码规范：
- 所有API调用通过AxisClient统一封装
- LLM调用统一走UnifiedLLMAdapter
- 错误使用AppError类，包含axis坐标信息`,
    tools: ['code_generator', 'code_reviewer', 'test_generator', 'debugger', 'refactoring_assistant'],
    allowDelegation: false,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'test_engineer',
    name: '测试工程师',
    icon: <Wrench className="w-5 h-5" />,
    backstory: '质量保障专家，精通自动化测试、性能测试和安全测试。善于发现边界条件和并发问题。',
    goal: '建立全面的质量保障体系，确保系统稳定性和可靠性',
    systemPrompt: `你是测试工程师。质量准则：
1. 所有功能必须有对应的自动化测试用例
2. 关键路径：E2E + 集成 + 单元三级覆盖
3. 性能测试：模拟10k+ Agent并发场景
4. 安全测试：输入验证、鉴权、注入攻击防护
5. 输出测试报告，标注风险等级

测试框架：
- 单元：Vitest
- E2E：Playwright
- 性能：k6 / Artillery
- 契约：Pact`,
    tools: ['test_case_generator', 'e2e_automation', 'performance_tester', 'security_scanner'],
    allowDelegation: true,
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
  },
  {
    id: 'security_auditor',
    name: '安全审计员',
    icon: <Shield className="w-5 h-5" />,
    backstory: '网络安全专家，专注于LLM应用安全、数据隐私保护和访问控制审计。',
    goal: '识别安全漏洞，确保数据隐私合规，建立零信任安全体系',
    systemPrompt: `你是安全审计员。审计范围：
1. API密钥管理： rotation、最小权限、审计日志
2. 数据隐私：PII检测、数据脱敏、GDPR合规
3. LLM安全：Prompt注入防护、输出过滤、沙箱隔离
4. 访问控制：RBAC/ABAC、零信任架构
5. 供应链安全：依赖审计、SBOM生成

审计输出：
- 风险矩阵（概率×影响）
- 修复建议优先级
- 合规检查清单`,
    tools: ['vulnerability_scanner', 'compliance_checker', 'penetration_tester', 'audit_logger'],
    allowDelegation: false,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  {
    id: 'data_analyst',
    name: '数据分析师',
    icon: <BarChart3 className="w-5 h-5" />,
    backstory: '数据科学家，擅长LLM用量分析、成本优化和性能指标监控。',
    goal: '优化LLM成本，提升系统性能，提供数据驱动的决策支持',
    systemPrompt: `你是数据分析师。分析重点：
1. LLM用量四维统计：provider/model/agent/task
2. 成本优化：模型降级策略、缓存命中率、批处理
3. 性能指标：TTFT、TPOT、Latency、Throughput
4. Token效率：reasoning_token vs completion_token比例
5. 异常检测：用量突增、成本异常、性能衰退

输出格式：
- 数据可视化建议（使用Recharts/AntV）
- 成本节省建议（参考LiteLLM spend tracking）
- 预测模型（ Prophet / ARIMA ）`,
    tools: ['spend_tracker', 'performance_analyzer', 'anomaly_detector', 'forecasting_model'],
    allowDelegation: true,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'creative_writer',
    name: '创意写手',
    icon: <PenTool className="w-5 h-5" />,
    backstory: '资深内容创作者，擅长技术文档、营销文案和创意写作。能够将复杂技术概念转化为通俗易懂的内容。',
    goal: '产出高质量技术内容，提升产品文档质量和用户体验',
    systemPrompt: `你是创意写手。写作准则：
1. 技术文档：清晰、准确、可执行（参考Diataxis框架）
2. 营销文案：AIDA模型，突出3DACP差异化价值
3. API文档：OpenAPI规范 + 交互式示例
4. 多语言支持：中英双语，术语一致性
5. 品牌调性：专业、简洁、前沿

输出检查：
- 可读性评分（Flesch-Kincaid）
- 术语表一致性
- 代码示例可运行性`,
    tools: ['doc_generator', 'copywriter', 'translator', 'style_checker'],
    allowDelegation: true,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
];

// ===================== 主组件 =====================
export default function AgentRoleTemplates() {
  const [expandedRole, setExpandedRole] = useState<string | null>('developer');
  const [copied, setCopied] = useState<string | null>(null);

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard?.writeText(prompt);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-[#12121a] border border-gray-800 rounded-xl">
      <div className="p-4 border-b border-gray-800">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          内置角色模板
        </h3>
        <p className="text-xs text-gray-500 mt-1">基于 CrewAI / MetaGPT 最佳实践的7种预设角色</p>
      </div>

      <div className="divide-y divide-gray-800">
        {BUILTIN_ROLES.map(role => (
          <div key={role.id}>
            <button
              onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/30 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg ${role.color}`}>
                {role.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">{role.name}</span>
                  {role.allowDelegation && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">
                      可委派
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{role.goal}</p>
              </div>
              {expandedRole === role.id ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedRole === role.id && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">背景故事</p>
                  <p className="text-xs text-gray-400">{role.backstory}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">目标</p>
                  <p className="text-xs text-gray-300">{role.goal}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">System Prompt</p>
                    <button
                      onClick={() => copyPrompt(role.systemPrompt, role.id)}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400"
                    >
                      {copied === role.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === role.id ? '已复制' : '复制'}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-400 bg-[#0a0a0f] rounded-lg p-3 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {role.systemPrompt}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">工具列表</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.tools.map(tool => (
                      <span key={tool} className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
