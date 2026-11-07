export interface ExecutionStage {
  name: string;
  description: string;
  assigneeRoles: string[];
  expectedOutput: string;
}

export interface ExecutionPlan {
  mode: string;
  topic: string;
  panelId: string;
  panelName: string;
  members: Array<{
    id: string;
    role: string;
    specialty: string;
    weight: number;
    systemPrompt: string;
    model: string;
  }>;
  stages: ExecutionStage[];
  meta: {
    totalMembers: number;
    chairCount: number;
    reviewerCount: number;
    contributorCount: number;
    totalWeight: number;
  };
  steps: Array<{
    memberId: string;
    role: string;
    specialty: string;
    content: string;
    latencyMs: number;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}

export type PanelMember = ExecutionPlan["members"][number];

export function generateStages(mode: string, members: PanelMember[]): ExecutionStage[] {
  const roles = members.map((member) => member.role);
  const hasReviewer = roles.includes("reviewer");

  switch (mode) {
    case "committee":
      return [
        {
          name: "初步审议",
          description: "各专家基于自身专长提出对议题的初步分析和见解",
          assigneeRoles: ["contributor", "chair"],
          expectedOutput: "每位成员提交一份初步分析备忘录",
        },
        {
          name: "交叉评议",
          description: "成员之间就初步分析进行交叉质疑和补充",
          assigneeRoles: hasReviewer ? ["reviewer", "chair"] : ["contributor", "chair"],
          expectedOutput: "交叉评议报告，包含质疑点和补充建议",
        },
        {
          name: "综合决议",
          description: "主席或全体委员会综合各方意见形成共识决议",
          assigneeRoles: ["chair", "contributor"],
          expectedOutput: "委员会共识决议文档",
        },
      ];

    case "debate":
      return [
        {
          name: "立论陈词",
          description: "正方和反方分别阐述自己的立场和论据",
          assigneeRoles: ["contributor"],
          expectedOutput: "立论陈词记录",
        },
        {
          name: "自由辩论",
          description: "各方成员自由展开辩论，提出反驳和质疑",
          assigneeRoles: ["contributor", "reviewer"],
          expectedOutput: "辩论过程记录和关键论点",
        },
        {
          name: "总结评议",
          description: "主席或评审员总结辩论结果，评估各方论证质量",
          assigneeRoles: ["chair", "reviewer"],
          expectedOutput: "辩论总结与裁决报告",
        },
      ];

    case "sequential":
      return members
        .filter((member) => member.role !== "observer")
        .sort((a: PanelMember, b: PanelMember) => b.weight - a.weight)
        .map((member: PanelMember, index: number) => ({
          name: `阶段 ${index + 1}: ${member.specialty}`,
          description: `${member.role === "chair" ? "主席" : "专家"} (${member.specialty}) 基于前一阶段的输出进行深化分析`,
          assigneeRoles: [member.role],
          expectedOutput: `阶段 ${index + 1} 分析报告，基于 ${member.specialty} 视角`,
        }));

    case "parallel":
      return [
        {
          name: "并行分析",
          description: "所有专家同时从各自专长角度对议题进行独立分析",
          assigneeRoles: ["contributor", "chair", "reviewer"],
          expectedOutput: "各专家独立分析报告",
        },
        {
          name: "汇总整合",
          description: "主席或协调员将各专家的独立分析整合为综合报告",
          assigneeRoles: ["chair"],
          expectedOutput: "综合整合报告",
        },
      ];

    default:
      return [
        {
          name: "通用分析",
          description: "专家组基于各自专长进行综合分析",
          assigneeRoles: ["contributor", "chair", "reviewer"],
          expectedOutput: "综合分析报告",
        },
      ];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function rolesOrDefault(value: unknown): string[] {
  if (!Array.isArray(value)) return ["contributor"];
  return value.filter((role): role is string => typeof role === "string");
}

export function parseCustomStages(value: unknown): ExecutionStage[] | null {
  if (!isRecord(value) || !Array.isArray(value.customStages)) return null;
  return value.customStages.map((stage: unknown) => {
    const record = isRecord(stage) ? stage : {};
    return {
      name: stringOrDefault(record.name, "自定义阶段"),
      description: stringOrDefault(record.description, ""),
      assigneeRoles: rolesOrDefault(record.assigneeRoles),
      expectedOutput: stringOrDefault(record.expectedOutput, ""),
    };
  });
}
