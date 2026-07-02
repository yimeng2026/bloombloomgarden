import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_COLLABORATION_TYPES = [
  "full_research",
  "theorem_proving",
  "paper_writing",
  "peer_review",
  "educational",
];

const EXPERT_TEMPLATES: Record<
  string,
  Array<{ role: string; specialty: string; systemPrompt: string; model: string }>
> = {
  mathematics: [
    {
      role: "lead_validator",
      specialty: "formal_verification",
      systemPrompt: "You are a senior mathematician specializing in formal verification and rigorous proof checking.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "number_theory",
      systemPrompt: "You are a number theorist with deep expertise in analytical methods and abstract algebra.",
      model: "glm-5.1",
    },
    {
      role: "checker",
      specialty: "lean4",
      systemPrompt: "You are a Lean 4 proof assistant expert, capable of formalizing and verifying mathematical proofs in Lean 4.",
      model: "glm-5.1",
    },
  ],
  physics: [
    {
      role: "lead_validator",
      specialty: "experimental_physics",
      systemPrompt: "You are a senior experimental physicist with expertise in designing and validating physical experiments.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "theoretical_physics",
      systemPrompt: "You are a theoretical physicist specializing in mathematical modeling and theoretical derivation.",
      model: "glm-5.1",
    },
    {
      role: "witness",
      specialty: "data_analysis",
      systemPrompt: "You are a physics data analyst skilled in statistical methods and experimental data interpretation.",
      model: "glm-5.1",
    },
  ],
  ai: [
    {
      role: "lead_validator",
      specialty: "machine_learning",
      systemPrompt: "You are an ML research lead with expertise in algorithm validation, reproducibility, and benchmarking.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "deep_learning",
      systemPrompt: "You are a deep learning researcher focused on neural network verification and adversarial robustness.",
      model: "glm-5.1",
    },
    {
      role: "checker",
      specialty: "experiment_design",
      systemPrompt: "You are an AI experiment designer who ensures rigorous experimental protocols and controls.",
      model: "glm-5.1",
    },
  ],
  default: [
    {
      role: "lead_validator",
      specialty: "interdisciplinary",
      systemPrompt: "You are a senior interdisciplinary researcher capable of validating findings across multiple domains.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "general",
      systemPrompt: "You are a research generalist with broad knowledge across sciences and humanities.",
      model: "glm-5.1",
    },
    {
      role: "witness",
      specialty: "review",
      systemPrompt: "You are an experienced peer reviewer who provides critical and constructive assessment of research.",
      model: "glm-5.1",
    },
  ],
};

// POST: 初始化完整协作生态
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, topic, collaborationType } = body;

    if (!domain || !topic || !collaborationType) {
      return NextResponse.json(
        {
          success: false,
          error: "domain, topic, and collaborationType are required",
        },
        { status: 400 }
      );
    }

    if (!VALID_COLLABORATION_TYPES.includes(collaborationType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid collaborationType. Valid: ${VALID_COLLABORATION_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let panelId: string | undefined;
      let workshopId: string | undefined;
      let pipelineId: string | undefined;
      let reviewBoardId: string | undefined;
      let validationGroupId: string | undefined;
      let competitionId: string | undefined;
      let mentorshipId: string | undefined;
      let codeReviewGroupId: string | undefined;
      const taskIds: string[] = [];

      const experts = EXPERT_TEMPLATES[domain] || EXPERT_TEMPLATES.default;

      // 1. full_research — 创建完整研究生态
      if (collaborationType === "full_research") {
        const panel = await tx.academicPanel.create({
          data: {
            name: `${domain} 研究专家组: ${topic}`,
            description: `围绕 ${topic} 的跨学科研究专家组`,
            domain,
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        panelId = panel.id;

        // 预置专家成员
        for (const expert of experts) {
          await tx.academicPanelMember.create({
            data: {
              panelId: panel.id,
              role: expert.role === "lead_validator" ? "chair" : "contributor",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "lead_validator" ? 2.0 : 1.0,
            },
          });
        }

        const workshop = await tx.academicWorkshop.create({
          data: {
            panelId: panel.id,
            title: `${topic} 研讨会`,
            topic,
            status: "planning",
            mode: "committee",
            maxRounds: 5,
            currentRound: 0,
          },
        });
        workshopId = workshop.id;

        const pipeline = await tx.manuscriptPipeline.create({
          data: {
            panelId: panel.id,
            title: `${topic} 手稿流水线`,
            description: `关于 ${topic} 的论文写作与评审流水线`,
            status: "idea",
            currentStage: "idea",
            content: "",
            history: "[]",
          },
        });
        pipelineId = pipeline.id;

        const reviewBoard = await tx.academicReviewBoard.create({
          data: {
            name: `${topic} 评审委员会`,
            description: `评审 ${topic} 相关研究成果`,
            domain,
            reviewMode: "single_blind",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        reviewBoardId = reviewBoard.id;

        const validationGroup = await tx.validationGroup.create({
          data: {
            name: `${topic} 验证组`,
            description: `验证 ${topic} 的核心命题与结果`,
            targetModule: domain,
            targetTheorem: topic,
            validationType: "cross_reference",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        validationGroupId = validationGroup.id;

        // 预置验证专家
        for (const expert of experts) {
          await tx.validationMember.create({
            data: {
              groupId: validationGroup.id,
              role: expert.role as any,
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        // 创建 5 个 AcademicTask
        const taskTypes = ["prove", "review", "verify", "discover", "draft"];
        for (let i = 0; i < 5; i++) {
          const task = await tx.academicTask.create({
            data: {
              title: `${topic} 任务 ${i + 1}`,
              description: `自动生成的协作任务 ${i + 1}`,
              type: taskTypes[i],
              status: "pending",
              priority: "normal",
              targetModule: domain,
              targetPaper: topic,
              panelMemberId: "",
              workshopId: workshop.id,
              pipelineId: pipeline.id,
            },
          });
          taskIds.push(task.id);
        }
      }

      // 2. theorem_proving — 定理证明
      if (collaborationType === "theorem_proving") {
        const panel = await tx.academicPanel.create({
          data: {
            name: `${domain} 定理证明专家组: ${topic}`,
            description: `围绕 ${topic} 的定理证明专家组`,
            domain,
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        panelId = panel.id;

        for (const expert of experts) {
          await tx.academicPanelMember.create({
            data: {
              panelId: panel.id,
              role: expert.role === "lead_validator" ? "chair" : "contributor",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "lead_validator" ? 2.0 : 1.0,
            },
          });
        }

        const competition = await tx.academicCompetition.create({
          data: {
            name: `${topic} 定理证明竞赛`,
            description: `围绕 ${topic} 的定理证明竞赛`,
            domain,
            format: "tournament",
            status: "registration",
            maxRounds: 5,
            currentRound: 0,
            criteria: JSON.stringify({
              correctness: 40,
              elegance: 30,
              efficiency: 30,
            }),
          },
        });
        competitionId = competition.id;

        // 预置竞赛选手
        for (let i = 0; i < experts.length; i++) {
          await tx.academicCompetitor.create({
            data: {
              competitionId: competition.id,
              name: `选手 ${i + 1}`,
              specialty: experts[i].specialty,
              role: "contestant",
              systemPrompt: experts[i].systemPrompt,
              model: experts[i].model,
            },
          });
        }

        const validationGroup = await tx.validationGroup.create({
          data: {
            name: `${topic} 验证组`,
            description: `验证 ${topic} 的定理证明结果`,
            targetModule: domain,
            targetTheorem: topic,
            validationType: "symbolic",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        validationGroupId = validationGroup.id;

        for (const expert of experts) {
          await tx.validationMember.create({
            data: {
              groupId: validationGroup.id,
              role: expert.role as any,
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        const codeReviewGroup = await tx.codeReviewGroup.create({
          data: {
            name: `${topic} 代码审查组`,
            description: `审查 ${topic} 的 Lean 4 证明代码`,
            targetModule: domain,
            targetFile: "",
            status: "active",
            reviewMode: "line_by_line",
          },
        });
        codeReviewGroupId = codeReviewGroup.id;

        for (const expert of experts) {
          await tx.codeReviewMember.create({
            data: {
              groupId: codeReviewGroup.id,
              role: expert.role === "lead_validator" ? "lead_reviewer" : "reviewer",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }
      }

      // 3. paper_writing — 论文写作
      if (collaborationType === "paper_writing") {
        const panel = await tx.academicPanel.create({
          data: {
            name: `${domain} 论文写作专家组: ${topic}`,
            description: `围绕 ${topic} 的论文写作专家组`,
            domain,
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        panelId = panel.id;

        for (const expert of experts) {
          await tx.academicPanelMember.create({
            data: {
              panelId: panel.id,
              role: expert.role === "lead_validator" ? "chair" : "contributor",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "lead_validator" ? 2.0 : 1.0,
            },
          });
        }

        const workshop = await tx.academicWorkshop.create({
          data: {
            panelId: panel.id,
            title: `${topic} 研讨会`,
            topic,
            status: "planning",
            mode: "committee",
            maxRounds: 5,
            currentRound: 0,
          },
        });
        workshopId = workshop.id;

        const pipeline = await tx.manuscriptPipeline.create({
          data: {
            panelId: panel.id,
            title: `${topic} 手稿流水线`,
            description: `关于 ${topic} 的论文写作流水线`,
            status: "idea",
            currentStage: "idea",
            content: "",
            history: "[]",
          },
        });
        pipelineId = pipeline.id;

        const reviewBoard = await tx.academicReviewBoard.create({
          data: {
            name: `${topic} 评审委员会`,
            description: `评审 ${topic} 论文`,
            domain,
            reviewMode: "double_blind",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        reviewBoardId = reviewBoard.id;
      }

      // 4. peer_review — 同行评审
      if (collaborationType === "peer_review") {
        const reviewBoard = await tx.academicReviewBoard.create({
          data: {
            name: `${topic} 同行评审委员会`,
            description: `对 ${topic} 进行同行评审`,
            domain,
            reviewMode: "double_blind",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        reviewBoardId = reviewBoard.id;

        // 预置评审员
        for (const expert of experts) {
          await tx.reviewBoardMember.create({
            data: {
              boardId: reviewBoard.id,
              role: expert.role === "lead_validator" ? "chair" : "reviewer",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "lead_validator" ? 2.0 : 1.0,
              anonymityId: `R-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            },
          });
        }

        const validationGroup = await tx.validationGroup.create({
          data: {
            name: `${topic} 验证组`,
            description: `验证 ${topic} 的评审结论`,
            targetModule: domain,
            targetTheorem: topic,
            validationType: "peer",
            status: "active",
            strategy: JSON.stringify({
              topic,
              collaborationType,
              createdVia: "init",
            }),
          },
        });
        validationGroupId = validationGroup.id;

        for (const expert of experts) {
          await tx.validationMember.create({
            data: {
              groupId: validationGroup.id,
              role: expert.role as any,
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        // 创建 3 个 tasks
        const taskTypes = ["review", "verify", "audit"];
        for (let i = 0; i < 3; i++) {
          const task = await tx.academicTask.create({
            data: {
              title: `${topic} 评审任务 ${i + 1}`,
              description: `自动生成的评审任务 ${i + 1}`,
              type: taskTypes[i],
              status: "pending",
              priority: "normal",
              targetModule: domain,
              targetPaper: topic,
              panelMemberId: "",
            },
          });
          taskIds.push(task.id);
        }
      }

      // 5. educational — 教学辅导
      if (collaborationType === "educational") {
        const mentorship = await tx.academicMentorship.create({
          data: {
            name: `${topic} 教学辅导`,
            description: `围绕 ${topic} 的教学辅导`,
            domain,
            mode: "one_on_one",
            status: "active",
            curriculum: JSON.stringify([
              { title: "基础概念", mode: "lecture" },
              { title: "实践练习", mode: "exercise" },
              { title: "讨论与批判", mode: "discussion" },
            ]),
          },
        });
        mentorshipId = mentorship.id;

        const codeReviewGroup = await tx.codeReviewGroup.create({
          data: {
            name: `${topic} 代码审查组`,
            description: `辅导 ${topic} 的代码审查`,
            targetModule: domain,
            targetFile: "",
            status: "active",
            reviewMode: "interactive",
          },
        });
        codeReviewGroupId = codeReviewGroup.id;

        for (const expert of experts) {
          await tx.codeReviewMember.create({
            data: {
              groupId: codeReviewGroup.id,
              role: expert.role === "lead_validator" ? "lead_reviewer" : "reviewer",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        // 创建 3 个 tasks
        const taskTypes = ["prove", "draft", "critique"];
        for (let i = 0; i < 3; i++) {
          const task = await tx.academicTask.create({
            data: {
              title: `${topic} 学习任务 ${i + 1}`,
              description: `自动生成的学习任务 ${i + 1}`,
              type: taskTypes[i],
              status: "pending",
              priority: "normal",
              targetModule: domain,
              targetPaper: topic,
              panelMemberId: "",
            },
          });
          taskIds.push(task.id);
        }
      }

      return {
        panelId,
        workshopId,
        pipelineId,
        reviewBoardId,
        validationGroupId,
        competitionId,
        mentorshipId,
        codeReviewGroupId,
        taskIds,
      };
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/collaborations/init] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize collaboration" },
      { status: 500 }
    );
  }
}
