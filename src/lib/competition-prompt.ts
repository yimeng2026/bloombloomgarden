import type { PromptContext } from "./research-prompts";

export function buildCompetitionUserPrompt(context: PromptContext): string {
  const topic = context.topic || "未指定题目";
  const format = context.format || "tournament";
  const round = context.roundNumber || 1;
  const specialty = context.specialty || "general";
  const competitors = context.competitors ?? [];

  let prompt = `【学术竞赛 第 ${round} 轮】\n`;
  prompt += `竞赛格式：${format}\n`;
  prompt += `你的专长：${specialty}\n`;
  prompt += `题目：${topic}\n\n`;

  if (competitors.length > 0) {
    prompt += `其他参赛者：${competitors.map((competitor) => competitor.name).join(", ")}\n\n`;
  }

  prompt += `请给出你的解答。要求：\n`;
  prompt += `1. 完整的解题思路（包含关键洞察）\n`;
  prompt += `2. 严谨的推导/证明过程\n`;
  prompt += `3. 如适用，给出 Lean 4 形式化代码片段\n`;
  prompt += `4. 讨论结果的局限性和可能的推广\n`;

  return prompt;
}
