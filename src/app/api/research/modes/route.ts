import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COLLABORATION_MODES = [
  {
    id: "committee",
    name: "委员会审议",
    description: "主席引导，成员依次发表意见",
    applicableTypes: ["expert_panel", "workshop"],
    characteristics: ["结构化", "层级化"],
    examples: ["论文评审委员会", "学术委员会"]
  },
  {
    id: "debate",
    name: "辩论对抗",
    description: "正方/反方交替发言",
    applicableTypes: ["expert_panel", "workshop"],
    characteristics: ["对抗性", "观点交锋"],
    examples: ["学术辩论赛", "方法学争论"]
  },
  {
    id: "sequential",
    name: "顺序执行",
    description: "按顺序轮询每个参与者",
    applicableTypes: ["expert_panel", "workshop", "pipeline"],
    characteristics: ["线性", "确定性"],
    examples: ["流水线阶段", "顺序审查"]
  },
  {
    id: "parallel",
    name: "并行执行",
    description: "所有参与者同时参与",
    applicableTypes: ["expert_panel", "workshop", "validation"],
    characteristics: ["并发", "效率"],
    examples: ["并行验证", "并行评审"]
  },
  {
    id: "socratic",
    name: "苏格拉底式",
    description: "通过追问引导思考",
    applicableTypes: ["workshop", "mentorship"],
    characteristics: ["启发性", "追问式"],
    examples: ["教学辅导", "深度研讨"]
  },
  {
    id: "deliberation",
    name: "审议式民主",
    description: "充分讨论后达成共识",
    applicableTypes: ["workshop"],
    characteristics: ["民主性", "共识导向"],
    examples: ["政策审议", "研究共识"]
  },
  {
    id: "single_blind",
    name: "单盲评审",
    description: "评审者知道作者，作者不知道评审者",
    applicableTypes: ["review_board"],
    characteristics: ["部分匿名", "公平性"],
    examples: ["期刊评审"]
  },
  {
    id: "double_blind",
    name: "双盲评审",
    description: "双方互不知晓身份",
    applicableTypes: ["review_board"],
    characteristics: ["完全匿名", "最高公平性"],
    examples: ["顶会评审"]
  },
  {
    id: "open",
    name: "开放评审",
    description: "身份公开，评审透明",
    applicableTypes: ["review_board"],
    characteristics: ["透明", "可追溯"],
    examples: ["开放期刊", "GitHub PR"]
  },
  {
    id: "tournament",
    name: "锦标赛",
    description: "配对对抗，胜者晋级",
    applicableTypes: ["competition"],
    characteristics: ["对抗性", "淘汰制"],
    examples: ["定理证明竞赛"]
  },
  {
    id: "round_robin",
    name: "循环赛",
    description: "所有参赛者互相对抗",
    applicableTypes: ["competition"],
    characteristics: ["全面", "公平"],
    examples: ["算法基准测试"]
  },
  {
    id: "line_by_line",
    name: "逐行审查",
    description: "对代码逐行进行审查",
    applicableTypes: ["code_review"],
    characteristics: ["细致", "精确"],
    examples: ["Lean 代码审查"]
  },
  {
    id: "cross_reference",
    name: "交叉验证",
    description: "多种方法独立验证同一结果",
    applicableTypes: ["validation"],
    characteristics: ["严谨", "可靠性"],
    examples: ["数值验证 + 符号验证"]
  },
  {
    id: "peer",
    name: "同行验证",
    description: "多个同行独立验证",
    applicableTypes: ["validation"],
    characteristics: ["社会性", "分布式"],
    examples: ["同行复现"]
  },
  {
    id: "stage_gate",
    name: "阶段门控",
    description: "每个阶段必须满足条件才能进入下一阶段",
    applicableTypes: ["pipeline"],
    characteristics: ["严格", "质量控制"],
    examples: ["论文流水线"]
  },
  {
    id: "one_on_one",
    name: "一对一",
    description: "导师与学生一对一辅导",
    applicableTypes: ["mentorship"],
    characteristics: ["个性化", "深度"],
    examples: ["导师制"]
  },
  {
    id: "group",
    name: "小组辅导",
    description: "导师带领小组学习",
    applicableTypes: ["mentorship"],
    characteristics: ["协作", "互动"],
    examples: ["研讨课"]
  },
  {
    id: "peer_mentorship",
    name: "同伴学习",
    description: "学生之间互相学习",
    applicableTypes: ["mentorship"],
    characteristics: ["平等", "互助"],
    examples: ["学习小组"]
  },
  {
    id: "prove",
    name: "证明任务",
    description: "执行数学证明",
    applicableTypes: ["task_force"],
    characteristics: ["严谨", "逻辑性"],
    examples: ["定理证明", "Lean 形式化"]
  },
  {
    id: "discover",
    name: "探索任务",
    description: "探索新的数学/物理现象",
    applicableTypes: ["task_force"],
    characteristics: ["创造性", "不确定性"],
    examples: ["猜想发现", "模式识别"]
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let modes = COLLABORATION_MODES;

    if (type) {
      modes = modes.filter((m) => m.applicableTypes.includes(type));
    }

    return NextResponse.json({
      success: true,
      data: {
        modes,
        count: modes.length,
        total: COLLABORATION_MODES.length,
        filtered: type ? true : false,
        filterType: type || null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
