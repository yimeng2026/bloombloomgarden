/**
 * ResearchPrompts — 千界花园学术协作 Prompt 模板系统
 *
 * 为 9 种协作类型 × 20 种协作方式 生成专业的 system prompt + user prompt。
 * 所有 prompt 针对学术研究场景优化，使用中文（适合 GLM-5.1）。
 */

import { researchChat, ResearchLLMResponse } from "./research-llm";

// ─── 类型定义 ───

export interface PromptTemplate {
  systemPrompt: string;
  buildUserPrompt: (context: Record<string, any>) => string;
}

export interface PromptContext {
  topic: string;
  domain: string;
  mode: string;
  role?: string;
  specialty?: string;
  previousContent?: string;
  targetModule?: string;
  targetPaper?: string;
  targetCode?: string;
  roundNumber?: number;
  maxRounds?: number;
  competitors?: Array<{ name: string; specialty: string }>;
  panelMembers?: Array<{ role: string; specialty: string }>;
  [key: string]: any;
}

// ─── 基础学术角色 Prompt ───

const BASE_ACADEMIC_SYSTEM = `你是一位资深学术研究者，在以下领域有深厚造诣。
你的职责是：
1. 基于严格的数学/逻辑推理进行思考
2. 使用精确的学术语言，避免模糊表述
3. 所有结论必须有理由支撑，区分"已知"与"推测"
4. 引用相关定理、文献或已知结果时注明出处
5. 对不确定的内容明确标注"待验证"或"开放问题"
6. 如使用 Lean 4 形式化，确保代码语法正确且可编译`;

// ─── 9 种协作类型的 Prompt 模板 ───

const COLLABORATION_PROMPTS: Record<string, PromptTemplate> = {
  // 1. 专家组
  expert_panel: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你现在是专家组的成员，参与一个跨学科学术顾问委员会的审议。
你的任务是根据给定的论题，提出专业、深入的分析意见。
请从多个角度审视问题：理论层面、方法层面、应用层面、开放问题层面。
如果与其他领域交叉，请指出潜在的连接点。`,
    buildUserPrompt: (ctx) => {
      const role = ctx.role || "member";
      const specialty = ctx.specialty || "general";
      const topic = ctx.topic || "未指定论题";
      const domain = ctx.domain || "general";
      const previous = ctx.previousContent || "";

      let prompt = `【专家组审议】\n`;
      prompt += `论题：${topic}\n`;
      prompt += `学科领域：${domain}\n`;
      prompt += `你的角色：${role}（专长：${specialty}）\n\n`;

      if (previous) {
        prompt += `此前讨论摘要：\n${previous}\n\n`;
        prompt += `请基于上述讨论，从 ${specialty} 角度提出补充意见或不同视角。\n`;
      } else {
        prompt += `请从 ${specialty} 角度对该论题进行全面分析，包括：\n`;
        prompt += `1. 核心问题界定\n`;
        prompt += `2. 现有研究现状（关键定理/结果）\n`;
        prompt += `3. 主要挑战与开放问题\n`;
        prompt += `4. 建议的研究方向\n`;
        prompt += `5. 与相关领域（如适用）的交叉点\n`;
      }

      return prompt;
    },
  },

  // 2. 研讨会
  workshop: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你正在参与一个学术研讨会，与其他研究者围绕特定论题进行深入讨论。
研讨规则：
- 发言要有理有据，避免空泛的定性判断
- 如果反驳他人观点，必须指出具体逻辑漏洞或证据不足
- 如果支持他人观点，请补充新的证据或延伸论证
- 每个发言控制在 300-800 字，聚焦核心论点`,
    buildUserPrompt: (ctx) => {
      const topic = ctx.topic || "未指定论题";
      const mode = ctx.mode || "committee";
      const phase = ctx.phase || "argument";
      const round = ctx.roundNumber || 1;
      const maxRounds = ctx.maxRounds || 5;
      const previous = ctx.previousContent || "";
      const role = ctx.role || "participant";

      let prompt = `【学术研讨会 第 ${round}/${maxRounds} 轮】\n`;
      prompt += `研讨模式：${mode} | 当前阶段：${phase}\n`;
      prompt += `论题：${topic}\n`;
      prompt += `你的角色：${role}\n\n`;

      if (previous) {
        prompt += `此前发言记录：\n${previous}\n\n`;
      }

      switch (phase) {
        case "argument":
          prompt += `请提出你的核心论点，支持该论点的证据，以及潜在的反驳意见。\n`;
          break;
        case "rebuttal":
          prompt += `请针对上述论点进行反驳，指出逻辑漏洞或证据不足，或提出替代解释。\n`;
          break;
        case "synthesis":
          prompt += `请综合各方观点，找出共识点和分歧点，提出一个整合性的分析框架。\n`;
          break;
        case "conclusion":
          prompt += `请给出本轮研讨的最终结论，包括达成的共识、遗留的争议、以及下一步研究方向。\n`;
          break;
        default:
          prompt += `请围绕论题发表你的专业见解。\n`;
      }

      return prompt;
    },
  },

  // 3. 流水线
  pipeline: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你正在参与学术论文/定理的流水线生产。
当前阶段需要产出具体的学术内容，质量要求：
- 概念定义精确，避免歧义
- 论证逻辑严密，每一步可追踪
- 如包含 Lean 代码，确保语法正确
- 引用相关文献和已知结果`,
    buildUserPrompt: (ctx) => {
      const stage = ctx.stage || "draft";
      const topic = ctx.topic || "未指定主题";
      const previous = ctx.previousContent || "";
      const targetModule = ctx.targetModule || "";

      const stageDescriptions: Record<string, string> = {
        idea: "提出研究选题的初步构思，包括研究问题、动机、预期贡献。",
        outline: "撰写论文/定理的详细大纲，包括章节结构、核心定理、证明策略。",
        draft: "撰写完整的初稿，包括引言、定义、定理陈述、证明、例子、结论。",
        review: "对该稿件进行同行评审，指出逻辑漏洞、表述问题、遗漏的引用、可改进之处。",
        revision: "根据评审意见修改稿件，逐条回应评审意见，说明修改内容。",
        final: "进行最终润色，确保所有术语一致、所有引用完整、所有证明可验证。",
        publish: "撰写发表摘要和关键词，准备最终提交版本。",
      };

      let prompt = `【稿件流水线 — ${stage} 阶段】\n`;
      prompt += `主题：${topic}\n`;
      if (targetModule) prompt += `关联模块：${targetModule}\n`;
      prompt += `阶段任务：${stageDescriptions[stage] || "完成当前阶段产出"}\n\n`;

      if (previous) {
        prompt += `此前阶段产出：\n${previous}\n\n`;
      }

      if (stage === "review") {
        prompt += `请从以下维度进行评审（每项给出评分 0-10 和详细意见）：\n`;
        prompt += `1. 创新性/原创性\n`;
        prompt += `2. 技术正确性（证明/推导）\n`;
        prompt += `3. 表述清晰度\n`;
        prompt += `4. 文献覆盖度\n`;
        prompt += `5. 形式化质量（如适用）\n`;
        prompt += `6. 总体推荐：accept / minor_revision / major_revision / reject\n`;
      } else if (stage === "revision") {
        prompt += `请根据评审意见逐条修改，对每个修改说明：原问题 → 修改内容 → 修改位置。\n`;
      } else {
        prompt += `请产出该阶段的高质量学术内容。\n`;
      }

      return prompt;
    },
  },

  // 4. 评审团
  review_board: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你现在是学术评审团的成员，对提交的学术成果进行同行评审。
评审原则：
- 公正、客观、建设性
- 区分"个人偏好"与"学术标准"
- 对形式化内容检查语法和逻辑正确性
- 对证明检查每一步的合理性
- 如果发现问题，给出具体位置和改进建议`,
    buildUserPrompt: (ctx) => {
      const reviewMode = ctx.mode || "single_blind";
      const targetType = ctx.targetType || "paper";
      const title = ctx.title || "未指定标题";
      const content = ctx.content || "";
      const round = ctx.roundNumber || 1;

      let prompt = `【学术评审 — 第 ${round} 轮】\n`;
      prompt += `评审模式：${reviewMode}\n`;
      prompt += `评审对象类型：${targetType}\n`;
      prompt += `标题：${title}\n\n`;

      if (content) {
        prompt += `评审内容：\n${content}\n\n`;
      }

      prompt += `请提供详细的评审报告，包括：\n`;
      prompt += `1. 总体评价（摘要）\n`;
      prompt += `2. 技术正确性评估（证明/推导/形式化检查）\n`;
      prompt += `3. 创新性评估\n`;
      prompt += `4. 表述质量评估\n`;
      prompt += `5. 具体修改建议（逐条列出）\n`;
      prompt += `6. 评分（0-10）\n`;
      prompt += `7. 决策建议：accept / minor_revision / major_revision / reject\n`;

      return prompt;
    },
  },

  // 5. 竞赛
  competition: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你正在参加一场学术竞赛，需要展示你的研究能力和解题技巧。
竞赛规则：
- 在限定时间内给出最优解或最深刻的分析
- 如果题目是证明题，请给出完整、严谨的证明
- 如果题目是探索题，请展示你的洞察力和创造性思维
- 如果题目是算法题，请分析时间复杂度并给出正确性证明`,
    buildUserPrompt: (ctx) => {
      const topic = ctx.topic || "未指定题目";
      const format = ctx.format || "tournament";
      const round = ctx.roundNumber || 1;
      const specialty = ctx.specialty || "general";
      const competitors = ctx.competitors || [];

      let prompt = `【学术竞赛 第 ${round} 轮】\n`;
      prompt += `竞赛格式：${format}\n`;
      prompt += `你的专长：${specialty}\n`;
      prompt += `题目：${topic}\n\n`;

      if (competitors.length > 0) {
        prompt += `其他参赛者：${competitors.map((c: any) => c.name).join(", ")}\n\n`;
      }

      prompt += `请给出你的解答。要求：\n`;
      prompt += `1. 完整的解题思路（包含关键洞察）\n`;
      prompt += `2. 严谨的推导/证明过程\n`;
      prompt += `3. 如适用，给出 Lean 4 形式化代码片段\n`;
      prompt += `4. 讨论结果的局限性和可能的推广\n`;

      return prompt;
    },
  },

  // 6. 教学辅导
  mentorship: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你是一位资深导师，正在对学生进行学术辅导。
辅导原则：
- 循序渐进，从基础概念到高级技巧
- 通过例子和反例加深理解
- 鼓励学生独立思考和提问
- 对错误给予建设性反馈，指出具体原因
- 如使用 Lean 4，先解释概念再给出代码`,
    buildUserPrompt: (ctx) => {
      const topic = ctx.topic || "未指定主题";
      const mode = ctx.mode || "lecture";
      const studentResponse = ctx.studentResponse || "";
      const sessionTitle = ctx.title || "辅导会话";

      let prompt = `【教学辅导 — ${sessionTitle}】\n`;
      prompt += `辅导模式：${mode}\n`;
      prompt += `主题：${topic}\n\n`;

      if (studentResponse) {
        prompt += `学生回答/提问：\n${studentResponse}\n\n`;
        prompt += `请对学生的回答进行点评：\n`;
        prompt += `- 正确之处给予肯定\n`;
        prompt += `- 错误之处指出具体问题并给出正确解释\n`;
        prompt += `- 补充更深层次的理解或相关延伸\n`;
      } else {
        switch (mode) {
          case "lecture":
            prompt += `请就该主题进行系统讲解，包括：定义、核心定理、典型例子、常见误区。\n`;
            break;
          case "exercise":
            prompt += `请出一道与该主题相关的练习题，包含题目、提示、和参考答案。\n`;
            break;
          case "discussion":
            prompt += `请提出一个开放性问题，引导学生深入思考该主题的本质。\n`;
            break;
          case "critique":
            prompt += `请给出一段关于该主题的论述（可能包含错误），然后引导学生找出错误。\n`;
            break;
          case "review":
            prompt += `请对该主题进行复习总结，以问答形式呈现核心知识点。\n`;
            break;
          default:
            prompt += `请就该主题进行讲解。\n`;
        }
      }

      return prompt;
    },
  },

  // 7. 代码审查
  code_review: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你是一位 Lean 4 / 形式化验证专家，正在对代码进行审查。
审查标准：
- 语法正确性：每个定义/定理能否编译
- 逻辑正确性：证明策略是否正确、是否遗漏关键步骤
- 风格：是否符合 Mathlib 风格、命名是否规范
- 效率：是否使用了最优的 tactic 组合
- 可读性：代码是否清晰、注释是否充分
- 如发现问题，指出具体行号和修改建议`,
    buildUserPrompt: (ctx) => {
      const targetCode = ctx.targetCode || "";
      const targetModule = ctx.targetModule || "";
      const targetFile = ctx.targetFile || "";
      const lineStart = ctx.lineStart || 0;
      const lineEnd = ctx.lineEnd || 0;
      const reviewMode = ctx.mode || "line_by_line";

      let prompt = `【代码审查 — ${reviewMode} 模式】\n`;
      if (targetModule) prompt += `关联模块：${targetModule}\n`;
      if (targetFile) prompt += `文件路径：${targetFile}\n`;
      if (lineStart > 0) prompt += `审查行范围：${lineStart}-${lineEnd}\n`;
      prompt += `\n`;

      if (targetCode) {
        prompt += `待审查代码：\n\`\`\`lean\n${targetCode}\n\`\`\`\n\n`;
      }

      prompt += `请提供详细的代码审查报告，包括：\n`;
      prompt += `1. 语法检查（是否有编译错误）\n`;
      prompt += `2. 逻辑正确性（证明是否完整、策略是否正确）\n`;
      prompt += `3. 代码风格（命名、格式、注释）\n`;
      prompt += `4. 改进建议（更优的 tactic、更简洁的表达）\n`;
      prompt += `5. 严重程度：critical / major / minor / suggestion / praise\n`;
      prompt += `6. 具体修改建议（给出修改后的代码片段）\n`;

      return prompt;
    },
  },

  // 8. 验证组
  validation: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你正在参与一个独立验证组，对学术结果进行第三方验证。
验证原则：
- 独立于原作者的视角进行验证
- 使用不同的方法（如可能）进行交叉验证
- 对数值结果检查精度和边界情况
- 对符号结果检查推导的每一步
- 对形式化结果检查证明的完备性
- 明确报告验证结论和置信度`,
    buildUserPrompt: (ctx) => {
      const validationType = ctx.mode || "numerical";
      const targetModule = ctx.targetModule || "";
      const targetTheorem = ctx.targetTheorem || "";
      const content = ctx.content || "";
      const method = ctx.method || "";

      let prompt = `【验证组 — ${validationType} 验证】\n`;
      if (targetModule) prompt += `关联模块：${targetModule}\n`;
      if (targetTheorem) prompt += `目标定理：${targetTheorem}\n`;
      if (method) prompt += `验证方法：${method}\n`;
      prompt += `\n`;

      if (content) {
        prompt += `待验证内容：\n${content}\n\n`;
      }

      switch (validationType) {
        case "numerical":
          prompt += `请通过数值计算验证该结果。包括：选择测试数据、计算过程、结果对比、精度分析。\n`;
          break;
        case "symbolic":
          prompt += `请通过符号推导验证该结果。展示每一步的推导，检查是否有遗漏的假设。\n`;
          break;
        case "experimental":
          prompt += `请设计实验验证该结果。包括：实验设置、数据收集、结果分析、误差来源。\n`;
          break;
        case "cross_reference":
          prompt += `请通过引用其他文献中的相关结果进行交叉验证。指出一致性和差异点。\n`;
          break;
        case "peer":
          prompt += `请作为同行评审者，从专业角度验证该结果的合理性。\n`;
          break;
        default:
          prompt += `请对该结果进行验证。\n`;
      }

      prompt += `\n验证报告格式：\n`;
      prompt += `- 验证方法描述\n`;
      prompt += `- 验证过程（详细）\n`;
      prompt += `- 验证结果\n`;
      prompt += `- 结论：verified / refuted / inconclusive\n`;
      prompt += `- 置信度（0-1）及理由\n`;
      prompt += `- 如果 refuted，指出错误位置和原因\n`;

      return prompt;
    },
  },

  // 9. 任务组
  task_force: {
    systemPrompt: `${BASE_ACADEMIC_SYSTEM}

你正在执行一个具体的学术任务。请专注于任务目标，给出高质量、可执行的产出。`,
    buildUserPrompt: (ctx) => {
      const taskType = ctx.mode || "prove";
      const title = ctx.title || "未指定任务";
      const description = ctx.description || "";
      const targetModule = ctx.targetModule || "";
      const targetPaper = ctx.targetPaper || "";

      const typeDescriptions: Record<string, string> = {
        prove: "完成该定理的完整证明，包括思路概述、详细推导、Lean 4 形式化代码（如适用）。",
        review: "对该文献/结果进行批判性评审，指出优点、缺点、遗漏和可改进之处。",
        verify: "对该结果进行独立验证，包括数值验证、符号验证或逻辑检查。",
        discover: "探索该领域的新现象、新模式或新猜想，基于现有结果进行合理推断。",
        draft: "撰写该主题的学术文本，包括引言、主体、结论、参考文献。",
        critique: "对该理论/方法进行系统性批判，指出根本局限和替代方案。",
        audit: "对该项目/代码进行全面审计，检查所有假设、边界条件、潜在错误。",
      };

      let prompt = `【学术任务 — ${taskType}】\n`;
      prompt += `任务标题：${title}\n`;
      if (targetModule) prompt += `关联模块：${targetModule}\n`;
      if (targetPaper) prompt += `关联论文：${targetPaper}\n`;
      prompt += `\n`;

      if (description) {
        prompt += `任务描述：\n${description}\n\n`;
      }

      prompt += `任务要求：${typeDescriptions[taskType] || "完成指定任务"}\n\n`;

      prompt += `请产出高质量的学术成果，确保：\n`;
      prompt += `- 逻辑严密，每一步可追踪\n`;
      prompt += `- 语言精确，避免歧义\n`;
      prompt += `- 如适用，包含 Lean 4 代码片段\n`;
      prompt += `- 明确标注"已知结果"和"原创贡献"\n`;

      return prompt;
    },
  },
};

// ─── 公共函数 ───

/** 根据协作类型和上下文生成 prompt，并调用 LLM */
export async function generateCollaborationResponse(
  collaborationType: string,
  context: PromptContext,
  options?: { model?: string; temperature?: number; maxTokens?: number; provider?: "zhipu" | "kimi" }
): Promise<ResearchLLMResponse> {
  const template = COLLABORATION_PROMPTS[collaborationType];
  if (!template) {
    throw new Error(`Unknown collaboration type: ${collaborationType}`);
  }

  const systemPrompt = template.systemPrompt;
  const userPrompt = template.buildUserPrompt(context);

  return researchChat({
    systemPrompt,
    userPrompt,
    model: options?.model || "glm-5.1",
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens || 4096,
    provider: options?.provider || "zhipu",
  });
}

/** 批量生成（用于专家组/竞赛等多成员并行场景） */
export async function generateCollaborationResponses(
  collaborationType: string,
  contexts: PromptContext[],
  options?: { model?: string; temperature?: number; maxTokens?: number; provider?: "zhipu" | "kimi"; concurrency?: number }
): Promise<ResearchLLMResponse[]> {
  const { researchChatBatch } = await import("./research-llm");

  const requests = contexts.map((ctx) => {
    const template = COLLABORATION_PROMPTS[collaborationType];
    if (!template) throw new Error(`Unknown collaboration type: ${collaborationType}`);
    return {
      systemPrompt: template.systemPrompt,
      userPrompt: template.buildUserPrompt(ctx),
      model: options?.model || "glm-5.1",
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens || 4096,
      provider: options?.provider || "zhipu",
    };
  });

  return researchChatBatch(requests, { concurrency: options?.concurrency || 3 });
}

/** 获取所有支持的协作类型 */
export function getSupportedCollaborationTypes(): string[] {
  return Object.keys(COLLABORATION_PROMPTS);
}

/** 获取协作类型的描述 */
export function getCollaborationTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    expert_panel: "专家组审议",
    workshop: "学术研讨会",
    pipeline: "稿件流水线",
    review_board: "同行评审",
    competition: "学术竞赛",
    mentorship: "教学辅导",
    code_review: "代码审查",
    validation: "独立验证",
    task_force: "学术任务执行",
  };
  return descriptions[type] || type;
}

export { COLLABORATION_PROMPTS };
