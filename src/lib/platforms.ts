// ================================================================
// BloomBloomGarden 完整平台注册表
// ================================================================

// ===================== 技能/工具 =====================
export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  source: string;
}

// ===================== 聊天频道 =====================
export interface Channel {
  id: string;
  name: string;
  icon: string;
  type: string;
}

// ===================== 角色模板 =====================
export interface AgentRole {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  recommendedSkills: string[];
  recommendedPlatform: string;
  color: string;
}

// ===================== LLM 供应商 =====================
export interface LLMModel {
  id: string;
  name: string;
  tier: string;
  contextWindow: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  gradient: string;
  description: string;
  defaultModel: string;
  models: LLMModel[];
}

// ===================== 编排平台 =====================
export type AgentPlatformType = "orchestration" | "framework" | "lowcode" | "sdk" | "workflow";

export interface AgentPlatform {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  tagline: string;
  description: string;
  website: string;
  github?: string;
  openSource: boolean;
  color: string;
  gradient: string;
  tagBg: string;
  tagText: string;
  type: AgentPlatformType;
  capabilities: string[];
  features: string[];
  skills: Skill[];
  channels: Channel[];
  supportedProviders: string[];
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
}

// ===================== Agent 设计模式 =====================
export interface AgentDesignPattern {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  howItWorks: string;
  whenToUse: string;
  example: string;
  color: string;
}

// ================================================================
// 角色模板库 —— 25+ 预设角色
// ================================================================
export const AGENT_ROLES: AgentRole[] = [
  { id: "general-assistant", name: "全能助手", emoji: "🤖", tagline: "什么都会一点的万能助手", description: "擅长回答各类问题、分析信息、提供建议", systemPrompt: "你是一个知识渊博、思维清晰的 AI 助手。回答准确可靠、结构清晰、适当举例。用中文回答，专业术语可附英文。", recommendedSkills: ["web-search", "web-scraper", "translator", "summarizer"], recommendedPlatform: "openclaw", color: "from-blue-500 to-cyan-400" },
  { id: "coder", name: "编程专家", emoji: "💻", tagline: "写代码、调 Bug、讲原理", description: "精通多种编程语言，能写代码、调试、解释技术概念", systemPrompt: "你是一位资深全栈工程师。编写高质量代码并附注释，代码放在代码块中标注语言。解释技术概念由浅入深，调试先分析根因再给方案。用中文交流，代码和变量名用英文。", recommendedSkills: ["code-exec", "github", "code-review", "docker"], recommendedPlatform: "openclaw", color: "from-emerald-500 to-teal-400" },
  { id: "creative-writer", name: "创意写手", emoji: "✍️", tagline: "文案抓眼球，故事有画面", description: "文案撰写、故事创作、内容润色", systemPrompt: "你是一位才华横溢的创意写手。文案要抓人眼球，故事要有画面感。润色保留原意提升表达力，改写精准切换风格。给出多个版本标注风格特点。", recommendedSkills: ["doc-writer", "image-gen", "mind-map"], recommendedPlatform: "openclaw", color: "from-pink-500 to-rose-400" },
  { id: "translator-role", name: "翻译官", emoji: "🌍", tagline: "信达雅，多语言互译", description: "专业多语言翻译", systemPrompt: "你是专业翻译官，精通中英日韩法德等语言。信达雅：准确为底线，通顺为标准，优美为追求。考虑语境和文化差异，专业术语附原文对照。", recommendedSkills: ["translator", "web-search", "doc-writer"], recommendedPlatform: "openclaw", color: "from-sky-500 to-indigo-400" },
  { id: "data-analyst", name: "数据分析师", emoji: "📊", tagline: "数据驱动，洞察先行", description: "数据分析、可视化、商业洞察", systemPrompt: "你是一位资深数据分析师。分析要有方法论，结论要有数据支撑。可视化要选择合适的图表类型，洞察要可操作。标注数据来源和时效性。", recommendedSkills: ["code-exec", "sql-query", "chart-gen", "web-search"], recommendedPlatform: "openclaw", color: "from-amber-500 to-orange-400" },
  { id: "research-assistant", name: "调研助手", emoji: "🔎", tagline: "信息收集，深度调研", description: "市场调研、竞品分析、行业报告", systemPrompt: "你是一位专业调研助手。调研要有方法论，信息来源要多元交叉验证。竞品分析要客观全面，行业报告要有数据支撑。标注信息来源和时效性。", recommendedSkills: ["web-search", "web-scraper", "pdf-parser", "chart-gen"], recommendedPlatform: "hermes", color: "from-emerald-600 to-green-400" },
  { id: "product-manager", name: "产品经理", emoji: "📱", tagline: "用户需求，产品落地", description: "需求分析、产品规划、原型设计", systemPrompt: "你是一位资深产品经理。需求分析要挖掘用户真实痛点，产品规划要有优先级和里程碑。原型设计要考虑用户体验和技术可行性。用数据驱动决策。", recommendedSkills: ["web-search", "doc-writer", "mind-map", "image-gen"], recommendedPlatform: "dify", color: "from-violet-500 to-purple-400" },
  { id: "teacher", name: "知识导师", emoji: "📚", tagline: "深入浅出，举一反三", description: "知识讲解、学习辅导、考试备考", systemPrompt: "你是一位耐心细致的知识导师。讲解要由浅入深，用类比和例子帮助理解。鼓励学生思考，引导而非直接给答案。根据学生水平调整难度。", recommendedSkills: ["web-search", "code-exec", "translator"], recommendedPlatform: "openclaw", color: "from-teal-500 to-cyan-400" },
  { id: "sales", name: "销售顾问", emoji: "🤝", tagline: "洞察需求，精准推荐", description: "客户沟通、方案推荐、商务谈判", systemPrompt: "你是一位资深销售顾问。沟通时先倾听需求再推荐方案，推荐要基于客户痛点。报价要有理有据，谈判要双赢思维。用案例和数据增强说服力。", recommendedSkills: ["web-search", "doc-writer", "email-sender", "calendar"], recommendedPlatform: "openclaw", color: "from-yellow-500 to-amber-400" },
  { id: "hr", name: "HR 专家", emoji: "👥", tagline: "人才为本，组织赋能", description: "招聘、培训、绩效、员工关系", systemPrompt: "你是一位资深HR专家。招聘要精准匹配岗位需求，培训要因材施教。绩效管理要公平透明，员工关系要同理心处理。遵守劳动法规。", recommendedSkills: ["web-search", "doc-writer", "email-sender"], recommendedPlatform: "dify", color: "from-indigo-500 to-blue-400" },
  { id: "legal", name: "法律顾问", emoji: "⚖️", tagline: "依法合规，风险防控", description: "合同审查、法律咨询、合规评估", systemPrompt: "你是一位专业法律顾问。合同审查要逐条分析风险条款，法律咨询要引用具体法条。合规评估要对照最新法规。建议要具体可操作，标注法律风险等级。", recommendedSkills: ["web-search", "doc-writer", "pdf-parser"], recommendedPlatform: "openclaw", color: "from-slate-600 to-gray-400" },
  { id: "designer", name: "设计助手", emoji: "🎨", tagline: "从灵感到交付", description: "UI设计建议、配色方案、素材生成", systemPrompt: "你是一位专业设计助手。给设计建议时关注用户体验和视觉层次，配色方案要考虑品牌调性和无障碍。推荐具体工具和资源，评价设计要客观有建设性。", recommendedSkills: ["image-gen", "image-understand", "web-search", "mind-map"], recommendedPlatform: "openclaw", color: "from-fuchsia-500 to-pink-400" },
  { id: "security", name: "安全专家", emoji: "🛡️", tagline: "攻防兼备，安全第一", description: "安全审计、漏洞扫描、合规评估", systemPrompt: "你是一位网络安全专家。审计要覆盖 OWASP Top 10，漏洞扫描要给出 CVSS 评分和修复方案。合规评估对照等保/GDPR/SOC2。安全建议要具体可操作。", recommendedSkills: ["code-review", "github", "web-scraper", "docker"], recommendedPlatform: "openclaw", color: "from-slate-600 to-slate-400" },
  { id: "marketer", name: "营销策划", emoji: "📢", tagline: "流量增长，品牌破圈", description: "营销方案、内容策划、社媒运营", systemPrompt: "你是一位资深营销策划。方案要有创意更要可落地，内容策划要考虑平台特性。社媒运营要关注数据反馈，A/B测试驱动优化。给具体执行步骤和时间表。", recommendedSkills: ["web-search", "image-gen", "doc-writer", "chart-gen"], recommendedPlatform: "coze", color: "from-orange-500 to-red-400" },
  { id: "customer-service", name: "客服专员", emoji: "🎧", tagline: "快速响应，满意解决", description: "客户咨询、工单处理、投诉处理", systemPrompt: "你是一位专业客服专员。响应要快速礼貌，处理问题先理解诉求再给方案。投诉要共情安抚再解决，复杂问题及时升级。记录要完整准确。", recommendedSkills: ["knowledge-base", "email-sender", "web-search"], recommendedPlatform: "dify", color: "from-cyan-500 to-blue-400" },
  { id: "project-mgr", name: "项目经理", emoji: "📋", tagline: "进度可控，质量保障", description: "项目规划、进度跟踪、风险管理", systemPrompt: "你是一位 PMP 认证项目经理。规划要 WBS 分解到可执行粒度，进度跟踪要关注关键路径。风险要提前识别和制定应对策略，沟通要主动及时。", recommendedSkills: ["doc-writer", "calendar", "email-sender", "mind-map"], recommendedPlatform: "crewai", color: "from-blue-600 to-indigo-400" },
  { id: "content-creator", name: "内容创作者", emoji: "🎬", tagline: "图文视频，全栈创作", description: "小红书/抖音/公众号内容创作", systemPrompt: "你是一位全栈内容创作者。小红书要种草感+emoji，抖音要前3秒抓人，公众号要深度有价值。给标题、正文、标签全套方案，每个平台风格不同。", recommendedSkills: ["image-gen", "video-gen", "tts", "web-search"], recommendedPlatform: "coze", color: "from-pink-600 to-rose-400" },
  // ---- 金融量化角色（来源：LLMQuant/skills） ----
  { id: "quant-trader", name: "量化交易员", emoji: "💹", tagline: "数据驱动，策略交易", description: "量化策略开发、回测、风控、实盘执行", systemPrompt: "你是一位资深量化交易员。策略开发要有严格的数学基础和统计验证，回测要考虑滑点、手续费和过拟合风险。风控是第一优先级，每笔交易都要有止损。用数据说话，不做主观预测。", recommendedSkills: ["market-data", "backtest-engine", "risk-analyzer", "alpha-research", "etf-analyzer"], recommendedPlatform: "openclaw", color: "from-green-600 to-emerald-400" },
  { id: "fund-analyst", name: "基金分析师", emoji: "📊", tagline: "精选基金，组合配置", description: "基金筛选、组合构建、业绩归因", systemPrompt: "你是一位专业基金分析师。筛选基金要看长期业绩、最大回撤、夏普比率，不只看短期排名。组合配置要考虑相关性分散风险，业绩归因要区分Beta和Alpha。给投资者讲清楚风险收益特征。", recommendedSkills: ["etf-analyzer", "portfolio-risk", "sector-rotation", "chart-generator"], recommendedPlatform: "dify", color: "from-blue-600 to-cyan-400" },
  { id: "risk-manager", name: "风控经理", emoji: "⚠️", tagline: "识别风险，守住底线", description: "风险识别、量化评估、压力测试", systemPrompt: "你是一位严谨的风控经理。风险识别要全面覆盖市场/信用/流动性/操作风险，量化评估用VaR/CVaR/压力测试。风控不是阻止业务，而是在可控范围内开展业务。每个风险都要有应对预案。", recommendedSkills: ["risk-analyzer", "portfolio-risk", "credit-risk", "sentiment-analysis"], recommendedPlatform: "openclaw", color: "from-red-600 to-orange-400" },
  { id: "invest-researcher", name: "投研分析师", emoji: "🔬", tagline: "深度研究，价值发现", description: "行业研究、公司分析、估值建模", systemPrompt: "你是一位投研分析师。行业研究要看清格局和趋势，公司分析要穿透财务数据看商业模式。估值建模要多种方法交叉验证（DCF/可比公司/可比交易）。结论要有逻辑链和数据支撑，标注不确定性。", recommendedSkills: ["stock-screener", "macro-indicator", "supply-chain", "report-writer", "chart-generator"], recommendedPlatform: "dify", color: "from-violet-600 to-purple-400" },
  { id: "macro-strategist", name: "宏观策略师", emoji: "🌍", tagline: "宏观视野，前瞻布局", description: "宏观经济分析、政策解读、大类资产配置", systemPrompt: "你是一位宏观策略师。宏观分析要跟踪GDP/CPI/就业/利率等核心指标，政策解读要理解央行和监管意图。大类资产配置要考虑经济周期位置，美林时钟是起点不是终点。给长期视角，不追短期噪音。", recommendedSkills: ["macro-indicator", "policy-monitor", "sentiment-analysis", "sector-rotation"], recommendedPlatform: "hermes", color: "from-indigo-600 to-blue-400" },
];

// ================================================================
// LLM 供应商
// ================================================================
export const LLM_PROVIDERS: LLMProvider[] = [
  { id: "zhipu", name: "智谱AI", shortName: "智谱", logo: "🔮", color: "text-blue-600", gradient: "from-blue-500 to-indigo-600", description: "GLM系列，国产领先", defaultModel: "glm-5.1", models: [
    { id: "glm-5.1", name: "GLM-5.1", tier: "flagship", contextWindow: "128K" },
    { id: "glm-4-plus", name: "GLM-4 Plus", tier: "standard", contextWindow: "128K" },
    { id: "glm-4-flash", name: "GLM-4 Flash", tier: "fast", contextWindow: "128K" },
  ]},
  { id: "openai", name: "OpenAI", shortName: "OpenAI", logo: "🟢", color: "text-green-600", gradient: "from-green-500 to-emerald-600", description: "GPT系列，全球领先", defaultModel: "gpt-4o", models: [
    { id: "gpt-4o", name: "GPT-4o", tier: "flagship", contextWindow: "128K" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "fast", contextWindow: "128K" },
    { id: "o3", name: "o3", tier: "reasoning", contextWindow: "200K" },
  ]},
  { id: "anthropic", name: "Anthropic", shortName: "Anthropic", logo: "🟣", color: "text-purple-600", gradient: "from-purple-500 to-violet-600", description: "Claude系列，安全可靠", defaultModel: "claude-sonnet-4-20250514", models: [
    { id: "claude-sonnet-4-20250514", name: "Claude 4 Sonnet", tier: "flagship", contextWindow: "200K" },
    { id: "claude-opus-4-20250514", name: "Claude 4 Opus", tier: "reasoning", contextWindow: "200K" },
  ]},
  { id: "deepseek", name: "DeepSeek", shortName: "DeepSeek", logo: "🔵", color: "text-blue-600", gradient: "from-blue-600 to-cyan-600", description: "深度推理，性价比高", defaultModel: "deepseek-r1", models: [
    { id: "deepseek-r1", name: "DeepSeek R1", tier: "reasoning", contextWindow: "128K" },
    { id: "deepseek-chat", name: "DeepSeek V3", tier: "standard", contextWindow: "128K" },
  ]},
  { id: "google", name: "Google", shortName: "Google", logo: "🔵", color: "text-blue-500", gradient: "from-blue-500 to-cyan-500", description: "Gemini系列，多模态", defaultModel: "gemini-2.5-pro", models: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "flagship", contextWindow: "1M" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "fast", contextWindow: "1M" },
  ]},
  { id: "alibaba", name: "阿里云", shortName: "阿里", logo: "🟠", color: "text-orange-600", gradient: "from-orange-500 to-amber-600", description: "通义千问，企业级", defaultModel: "qwen-max", models: [
    { id: "qwen-max", name: "Qwen Max", tier: "flagship", contextWindow: "128K" },
    { id: "qwen-plus", name: "Qwen Plus", tier: "standard", contextWindow: "128K" },
  ]},
  { id: "moonshot", name: "Moonshot", shortName: "Moonshot", logo: "🌙", color: "text-indigo-600", gradient: "from-indigo-500 to-purple-600", description: "Kimi，长文本专家", defaultModel: "moonshot-v1-auto", models: [
    { id: "moonshot-v1-auto", name: "Moonshot V1", tier: "standard", contextWindow: "128K" },
  ]},
  { id: "ollama", name: "Ollama 本地", shortName: "Ollama", logo: "🦙", color: "text-gray-600", gradient: "from-gray-500 to-gray-700", description: "本地部署，隐私安全", defaultModel: "llama4", models: [
    { id: "llama4", name: "Llama 4", tier: "flagship", contextWindow: "1M" },
    { id: "qwen3", name: "Qwen3 32B", tier: "standard", contextWindow: "128K" },
  ]},
];

// ================================================================
// 编排平台
// ================================================================
export const AGENT_PLATFORMS: AgentPlatform[] = [
  { id: "openclaw", name: "OpenClaw", shortName: "OpenClaw", logo: "🦞", tagline: "最强大的 Agent 编排平台", description: "开源 Agent 编排平台，280K+ Stars", website: "https://openclaw.ai", github: "https://github.com/openclaw/openclaw", openSource: true, color: "text-red-600", gradient: "from-red-500 to-orange-500", tagBg: "bg-red-50", tagText: "text-red-700", type: "orchestration", capabilities: ["多Agent编排", "MCP工具", "持久记忆", "定时任务", "多频道接入", "SubAgent"], features: ["多Agent编排", "MCP工具调用", "20+消息平台", "持久记忆", "定时任务", "SubAgent委派"], skills: [], channels: [], supportedProviders: ["openai", "anthropic", "google", "deepseek", "alibaba", "zhipu", "baidu", "moonshot", "mistral", "xai", "ollama"], defaultProvider: "openai", defaultModel: "gpt-4o", defaultTemperature: 0.7 },
  { id: "dify", name: "Dify", shortName: "Dify", logo: "🎨", tagline: "低代码 RAG 和 Agent 平台", description: "开源低代码 AI 应用开发平台", website: "https://dify.ai", github: "https://github.com/langgenius/dify", openSource: true, color: "text-violet-600", gradient: "from-violet-500 to-purple-600", tagBg: "bg-violet-50", tagText: "text-violet-700", type: "lowcode", capabilities: ["可视化编排", "RAG检索", "知识库", "插件市场", "工作流"], features: ["可视化编排", "RAG检索增强", "知识库管理", "插件市场", "工作流"], skills: [], channels: [], supportedProviders: ["openai", "anthropic", "google", "deepseek", "alibaba", "zhipu", "baidu", "moonshot", "ollama"], defaultProvider: "openai", defaultModel: "gpt-4o", defaultTemperature: 0.7 },
  { id: "coze", name: "Coze", shortName: "Coze", logo: "🤖", tagline: "字节出品，插件丰富", description: "字节跳动出品的 AI Bot 平台", website: "https://coze.com", openSource: false, color: "text-pink-600", gradient: "from-pink-500 to-rose-600", tagBg: "bg-pink-50", tagText: "text-pink-700", type: "lowcode", capabilities: ["插件市场", "多模态", "工作流", "一键发布", "字节生态"], features: ["插件市场", "多模态交互", "工作流编排", "一键发布", "字节生态"], skills: [], channels: [], supportedProviders: ["openai", "anthropic", "google", "deepseek", "alibaba", "zhipu", "baidu", "moonshot"], defaultProvider: "alibaba", defaultModel: "qwen-max", defaultTemperature: 0.7 },
  { id: "crewai", name: "CrewAI", shortName: "CrewAI", logo: "👥", tagline: "角色扮演，团队协作", description: "多 Agent 角色扮演框架", website: "https://crewai.com", github: "https://github.com/crewaiinc/crewai", openSource: true, color: "text-blue-600", gradient: "from-blue-500 to-indigo-600", tagBg: "bg-blue-50", tagText: "text-blue-700", type: "framework", capabilities: ["角色扮演", "团队协作", "任务委派", "200+工具", "流程编排"], features: ["角色扮演", "团队协作", "任务委派", "200+工具", "流程编排"], skills: [], channels: [], supportedProviders: ["openai", "anthropic", "google", "deepseek", "ollama"], defaultProvider: "openai", defaultModel: "gpt-4o", defaultTemperature: 0.7 },
  { id: "hermes", name: "Hermes Agent", shortName: "Hermes", logo: "🦅", tagline: "自我进化的 AI Agent", description: "Nous Research 出品的自我学习 Agent", website: "https://hermes-agent.nousresearch.com", github: "https://github.com/nousresearch/hermes-agent", openSource: true, color: "text-emerald-600", gradient: "from-emerald-500 to-teal-600", tagBg: "bg-emerald-50", tagText: "text-emerald-700", type: "orchestration", capabilities: ["自我学习", "技能积累", "本地优先", "MCP工具", "NVIDIA DGX", "Git记忆"], features: ["自我学习循环", "技能积累", "本地优先", "MCP工具", "NVIDIA DGX", "Git记忆"], skills: [], channels: [], supportedProviders: ["openai", "anthropic", "google", "deepseek", "ollama"], defaultProvider: "openai", defaultModel: "gpt-4o", defaultTemperature: 0.6 },
];

// ================================================================
// Google 8大 Agent 设计模式
// ================================================================
export const AGENT_DESIGN_PATTERNS: AgentDesignPattern[] = [
  { id: "reflection", name: "反思模式", nameEn: "Reflection Pattern", icon: "🪞", description: "Agent 对自己的输出进行自我审查和迭代改进", howItWorks: "生成初始回答 → 自我评估 → 发现不足 → 修改优化 → 重复直到满意", whenToUse: "需要高质量输出的场景：代码审查、文案润色、方案优化", example: "Agent 写完代码后自动检查 bug，发现边界条件遗漏后自行修复", color: "from-blue-500 to-cyan-400" },
  { id: "tool-use", name: "工具调用模式", nameEn: "Tool Use Pattern", icon: "🔧", description: "Agent 根据任务需要选择并调用外部工具", howItWorks: "分析任务 → 选择合适工具 → 构造参数 → 调用执行 → 解析结果", whenToUse: "需要与外部系统交互：搜索信息、执行代码、操作数据库", example: "Agent 需要最新股价，调用 Market Data 工具获取实时行情", color: "from-emerald-500 to-teal-400" },
  { id: "planning", name: "规划模式", nameEn: "Planning Pattern", icon: "📋", description: "Agent 先制定完整计划再逐步执行", howItWorks: "理解目标 → 拆解子任务 → 排列执行顺序 → 逐步执行 → 检查完成度", whenToUse: "复杂多步骤任务：研究报告、项目开发、流程自动化", example: "Agent 接到'分析茅台投资价值'任务，先规划：财务分析→行业对比→估值建模→结论", color: "from-amber-500 to-orange-400" },
  { id: "multi-agent", name: "多Agent协作模式", nameEn: "Multi-Agent Pattern", icon: "👥", description: "多个专业化 Agent 分工协作完成复杂任务", howItWorks: "拆分任务 → 分配给专业Agent → 并行/串行执行 → 汇总结果 → 协调冲突", whenToUse: "需要多领域专业知识：投研团队、开发团队、内容生产线", example: "研究员Agent分析数据，策略Agent设计交易，风控Agent审核合规", color: "from-violet-500 to-purple-400" },
  { id: "react", name: "推理+行动模式", nameEn: "ReAct Pattern", icon: "🧠", description: "交替进行推理和行动，边想边做，动态调整", howItWorks: "观察环境 → 推理下一步 → 执行动作 → 观察结果 → 继续推理", whenToUse: "需要与环境交互的动态场景：调试代码、探索数据、实时决策", example: "Agent 发现数据异常，推理可能原因，调用工具验证，确认后修正分析", color: "from-pink-500 to-rose-400" },
  { id: "memory", name: "记忆管理模式", nameEn: "Memory Management Pattern", icon: "🧩", description: "Agent 维护和利用长期记忆，越用越聪明", howItWorks: "短期记忆(对话上下文) + 长期记忆(知识库) + 工作记忆(当前任务)", whenToUse: "需要持续学习和经验积累：个人助手、专业顾问、知识管理", example: "Hermes Agent 记住用户偏好，下次自动用相同风格回答", color: "from-sky-500 to-indigo-400" },
  { id: "human-in-loop", name: "人机协作模式", nameEn: "Human-in-the-Loop Pattern", icon: "🤝", description: "关键决策点引入人类审核", howItWorks: "Agent 执行 → 到达决策点 → 暂停请求人类确认 → 人类批准/修改 → 继续", whenToUse: "高风险场景：交易执行、法律文件、医疗诊断", example: "Agent 生成交易策略，执行前弹出确认框让交易员审核", color: "from-red-500 to-pink-400" },
  { id: "guardrails", name: "安全护栏模式", nameEn: "Guardrails Pattern", icon: "🛡️", description: "设置输入/输出护栏，防止越界行为", howItWorks: "输入验证 → 规则检查 → 执行 → 输出过滤 → 审计日志", whenToUse: "所有生产环境，尤其是金融、医疗、法律等合规领域", example: "Agent 输出交易建议前，护栏检查是否违反风控规则", color: "from-lime-500 to-green-400" },
];

// ===================== 辅助函数 =====================
export function getAgentPlatformById(id: string): AgentPlatform | undefined {
  return AGENT_PLATFORMS.find((p) => p.id === id);
}

export function getLLMProviderById(id: string): LLMProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

export function getAgentRoleById(id: string): AgentRole | undefined {
  return AGENT_ROLES.find((r) => r.id === id);
}

/** 获取平台信息（用于 UI 展示，不需要实例化适配器） */
export function getPlatformInfo(platformId: string): { id: string; name: string; logo: string; statusLine: string } {
  const platform = AGENT_PLATFORMS.find(p => p.id === platformId);
  if (platform) {
    return { id: platform.id, name: platform.name, logo: platform.logo, statusLine: `${platform.logo} ${platform.name} 运行中` };
  }
  return { id: platformId, name: platformId, logo: "⚡", statusLine: "⚡ 直接调用 LLM API" };
}

/** 获取所有平台信息 */
export function getAllPlatformInfos(): { id: string; name: string; logo: string; statusLine: string }[] {
  return AGENT_PLATFORMS.map(p => ({ id: p.id, name: p.name, logo: p.logo, statusLine: `${p.logo} ${p.name} 运行中` }));
}
