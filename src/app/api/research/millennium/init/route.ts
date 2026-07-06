import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 千年难题研究配置
const MILLENNIUM_PROBLEMS = [
  {
    id: "p-vs-np",
    name: "P vs NP 问题",
    description: "P vs NP 是计算复杂性理论中最著名的未解决问题。P 类问题可在多项式时间内求解，NP 类问题可在多项式时间内验证。问题问：P 是否等于 NP？即，每个可以快速验证其解的问题是否也能快速求解？",
    domain: "mathematics",
    field: "computational_complexity",
    filePath: "sylva-release/src/Complexity.lean",
    status: "open" as const,
    experts: [
      {
        role: "chair",
        specialty: "computational_complexity",
        systemPrompt: "You are a world-renowned computational complexity theorist specializing in P vs NP, circuit complexity, and proof techniques for lower bounds. You have deep expertise in Kolmogorov complexity, entropy methods, and algebraic approaches to complexity theory.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "mathematical_logic",
        systemPrompt: "You are a mathematical logician specializing in proof theory, model theory, and the logical foundations of computation. You are adept at analyzing the logical structure of complexity class separations and independence results.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "information_theory",
        systemPrompt: "You are an information theorist specializing in computational entropy, Kolmogorov complexity, and the information-theoretic foundations of computational complexity. You have expertise in Shannon entropy, algorithmic randomness, and their applications to complexity theory.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "formal_verification",
        systemPrompt: "You are a formal verification expert specializing in Lean 4 proof assistant and the formalization of mathematical proofs. You have extensive experience in formalizing complexity theory, algorithm analysis, and mathematical logic in proof assistants.",
        model: "glm-5.1",
      },
    ],
  },
  {
    id: "hodge-conjecture",
    name: "Hodge 猜想",
    description: "Hodge 猜想是代数几何中的核心问题，涉及霍奇结构与代数循环之间的关系。它断言：在光滑射影复代数簇上，每个霍奇类（即在有理系数上同调中纯型 (p,p) 的类）都是代数闭链类的有理线性组合。",
    domain: "mathematics",
    field: "algebraic_geometry",
    filePath: "sylva-release/src/Hodge.lean",
    status: "open" as const,
    experts: [
      {
        role: "chair",
        specialty: "algebraic_geometry",
        systemPrompt: "You are a world-renowned algebraic geometer specializing in Hodge theory, algebraic cycles, and the Hodge conjecture. You have deep expertise in complex geometry, cohomology theories, and the intersection of algebraic and transcendental methods in geometry.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "hodge_theory",
        systemPrompt: "You are a Hodge theorist specializing in mixed Hodge structures, variations of Hodge structure, and the applications of Hodge theory to algebraic geometry. You have expertise in the Hodge decomposition, Hodge filtration, and the Lefschetz theorems.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "algebraic_cycles",
        systemPrompt: "You are an expert in algebraic cycles, Chow groups, and motivic cohomology. You have deep knowledge of the cycle class map, rational equivalence, and the Bloch-Beilinson conjectures related to the Hodge conjecture.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "formal_verification",
        systemPrompt: "You are a formal verification expert specializing in Lean 4 and the formalization of algebraic geometry. You have experience in formalizing cohomology theories, scheme theory, and complex algebraic structures in proof assistants.",
        model: "glm-5.1",
      },
    ],
  },
  {
    id: "navier-stokes",
    name: "Navier-Stokes 方程解的存在性与光滑性",
    description: "Navier-Stokes 方程描述了不可压缩流体的运动。 millennium 问题是：在三维空间中，给定光滑的初始数据，Navier-Stokes 方程是否存在全局光滑解？或者，解是否会在有限时间内产生奇点（blow-up）？",
    domain: "mathematics",
    field: "partial_differential_equations",
    filePath: "sylva-release/src/NavierStokes.lean",
    status: "open" as const,
    experts: [
      {
        role: "chair",
        specialty: "pde_analysis",
        systemPrompt: "You are a world-renowned PDE analyst specializing in the Navier-Stokes equations, fluid dynamics, and regularity theory. You have deep expertise in Sobolev spaces, energy methods, blow-up analysis, and the analytical techniques for studying fluid equations.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "fluid_dynamics",
        systemPrompt: "You are a fluid dynamics theorist specializing in the mathematical theory of turbulence, vorticity dynamics, and the physical interpretation of Navier-Stokes solutions. You have expertise in the Beale-Kato-Majda criterion, Leray-Hopf theory, and weak solutions.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "harmonic_analysis",
        systemPrompt: "You are a harmonic analyst specializing in the applications of Fourier analysis, Littlewood-Paley theory, and multiplier theorems to PDEs. You have expertise in the analytical techniques used for regularity criteria and blow-up analysis in fluid equations.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "formal_verification",
        systemPrompt: "You are a formal verification expert specializing in Lean 4 and the formalization of analysis and PDE theory. You have experience in formalizing Sobolev spaces, distribution theory, and the existence theory for differential equations in proof assistants.",
        model: "glm-5.1",
      },
    ],
  },
  {
    id: "yang-mills",
    name: "Yang-Mills 存在性与质量间隙",
    description: "Yang-Mills 理论是量子场论中描述基本粒子相互作用的数学框架。Millennium 问题包括两个部分：(1) 对任意紧致规范群，证明量子 Yang-Mills 理论的严格数学存在性；(2) 证明该理论存在正的质量间隙（即存在正的最小能量激发）。",
    domain: "physics",
    field: "quantum_field_theory",
    filePath: "sylva-release/src/Complexity.lean",
    status: "open" as const,
    experts: [
      {
        role: "chair",
        specialty: "quantum_field_theory",
        systemPrompt: "You are a world-renowned mathematical physicist specializing in quantum field theory, gauge theory, and the Yang-Mills mass gap problem. You have deep expertise in the renormalization group, lattice gauge theory, conformal bootstrap, and the constructive QFT methods.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "gauge_theory",
        systemPrompt: "You are a gauge theorist specializing in the mathematical structure of Yang-Mills theory, fiber bundles, connections, and curvature. You have expertise in the geometric and topological aspects of gauge theories and their relationship to physics.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "statistical_mechanics",
        systemPrompt: "You are a statistical mechanician specializing in the lattice models, phase transitions, and the connection between statistical mechanics and quantum field theory. You have expertise in the Osterwalder-Schrader axioms, reflection positivity, and the mass gap in lattice systems.",
        model: "glm-5.1",
      },
      {
        role: "contributor",
        specialty: "formal_verification",
        systemPrompt: "You are a formal verification expert specializing in Lean 4 and the formalization of mathematical physics. You have experience in formalizing operator algebras, Hilbert spaces, and the axiomatic structure of quantum field theories in proof assistants.",
        model: "glm-5.1",
      },
    ],
  },
];

// POST: 初始化千年难题研究生态
export async function POST(request: NextRequest) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const created: Array<{
        problemId: string;
        problemName: string;
        panelId: string;
        workshopId: string;
        pipelineId: string;
        reviewBoardId: string;
        validationGroupId: string;
        codeReviewGroupId: string;
        taskIds: string[];
      }> = [];

      for (const problem of MILLENNIUM_PROBLEMS) {
        // 1. 创建专家组
        const panel = await tx.academicPanel.create({
          data: {
            name: `${problem.name} 研究专家组`,
            description: problem.description,
            domain: problem.domain,
            status: "active",
            strategy: JSON.stringify({
              problemId: problem.id,
              field: problem.field,
              filePath: problem.filePath,
              createdVia: "millennium_init",
            }),
          },
        });

        // 预置专家成员
        for (const expert of problem.experts) {
          await tx.academicPanelMember.create({
            data: {
              panelId: panel.id,
              role: expert.role,
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "chair" ? 2.0 : 1.0,
            },
          });
        }

        // 2. 创建研讨会
        const workshop = await tx.academicWorkshop.create({
          data: {
            panelId: panel.id,
            title: `${problem.name} 研讨会`,
            topic: problem.description,
            status: "planning",
            mode: "committee",
            maxRounds: 7,
            currentRound: 0,
          },
        });

        // 3. 创建稿件流水线
        const pipeline = await tx.manuscriptPipeline.create({
          data: {
            panelId: panel.id,
            title: `${problem.name} 研究手稿流水线`,
            description: `关于 ${problem.name} 的论文、证明与形式化代码流水线`,
            status: "idea",
            currentStage: "idea",
            content: JSON.stringify({
              problem: problem.name,
              status: problem.status,
              filePath: problem.filePath,
              notes: "初始研究阶段：收集已知结果、分析证明策略、评估形式化可行性",
            }),
            history: "[]",
          },
        });

        // 4. 创建评审委员会
        const reviewBoard = await tx.academicReviewBoard.create({
          data: {
            name: `${problem.name} 评审委员会`,
            description: `评审 ${problem.name} 相关研究成果与证明`,
            domain: problem.domain,
            reviewMode: "double_blind",
            status: "active",
            strategy: JSON.stringify({
              problemId: problem.id,
              criteria: ["correctness", "elegance", "novelty", "formalization_quality"],
              createdVia: "millennium_init",
            }),
          },
        });

        // 预置评审员
        for (const expert of problem.experts) {
          await tx.reviewBoardMember.create({
            data: {
              boardId: reviewBoard.id,
              role: expert.role === "chair" ? "chair" : "reviewer",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
              weight: expert.role === "chair" ? 2.0 : 1.0,
              anonymityId: `R-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            },
          });
        }

        // 5. 创建验证组
        const validationGroup = await tx.validationGroup.create({
          data: {
            name: `${problem.name} 验证组`,
            description: `验证 ${problem.name} 的定理、证明与形式化代码`,
            targetModule: problem.field,
            targetTheorem: problem.name,
            validationType: "cross_reference",
            status: "active",
            strategy: JSON.stringify({
              problemId: problem.id,
              filePath: problem.filePath,
              methods: ["symbolic", "numerical", "cross_reference"],
              createdVia: "millennium_init",
            }),
          },
        });

        for (const expert of problem.experts) {
          await tx.validationMember.create({
            data: {
              groupId: validationGroup.id,
              role: expert.role === "chair" ? "lead_validator" : "validator",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        // 6. 创建代码审查组
        const codeReviewGroup = await tx.codeReviewGroup.create({
          data: {
            name: `${problem.name} 代码审查组`,
            description: `审查 ${problem.name} 的 Lean 4 形式化代码`,
            targetModule: problem.field,
            targetFile: problem.filePath,
            status: "active",
            reviewMode: "line_by_line",
          },
        });

        for (const expert of problem.experts) {
          await tx.codeReviewMember.create({
            data: {
              groupId: codeReviewGroup.id,
              role: expert.role === "chair" ? "lead_reviewer" : "reviewer",
              specialty: expert.specialty,
              systemPrompt: expert.systemPrompt,
              model: expert.model,
            },
          });
        }

        // 7. 创建学术任务
        const taskIds: string[] = [];
        const taskTemplates = [
          {
            title: `文献综述：${problem.name} 已知结果`,
            description: `收集并整理 ${problem.name} 的所有已知结果、部分证明和进展`,
            type: "review" as const,
          },
          {
            title: `证明策略分析：${problem.name}`,
            description: `分析 ${problem.name} 的潜在证明策略，评估各种方法的优缺点`,
            type: "discover" as const,
          },
          {
            title: `形式化可行性评估：${problem.name}`,
            description: `评估 ${problem.name} 在 Lean 4 中形式化的可行性，确定技术障碍`,
            type: "verify" as const,
          },
          {
            title: `Lean 4 代码开发：${problem.name}`,
            description: `开发 ${problem.name} 的 Lean 4 形式化代码，包括定义、引理和定理框架`,
            type: "prove" as const,
          },
          {
            title: `专家审议：${problem.name} 阶段性进展`,
            description: `组织专家组对 ${problem.name} 的阶段性研究成果进行审议和评估`,
            type: "audit" as const,
          },
        ];

        for (const taskTemplate of taskTemplates) {
          const task = await tx.academicTask.create({
            data: {
              title: taskTemplate.title,
              description: taskTemplate.description,
              type: taskTemplate.type,
              status: "pending",
              priority: "high",
              targetModule: problem.field,
              targetPaper: problem.name,
              panelMemberId: "",
              workshopId: workshop.id,
              pipelineId: pipeline.id,
            },
          });
          taskIds.push(task.id);
        }

        created.push({
          problemId: problem.id,
          problemName: problem.name,
          panelId: panel.id,
          workshopId: workshop.id,
          pipelineId: pipeline.id,
          reviewBoardId: reviewBoard.id,
          validationGroupId: validationGroup.id,
          codeReviewGroupId: codeReviewGroup.id,
          taskIds,
        });
      }

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "千年难题研究生态初始化完成",
          problems: result.map((r) => ({
            problemId: r.problemId,
            problemName: r.problemName,
            panelId: r.panelId,
            workshopId: r.workshopId,
            pipelineId: r.pipelineId,
            reviewBoardId: r.reviewBoardId,
            validationGroupId: r.validationGroupId,
            codeReviewGroupId: r.codeReviewGroupId,
            taskCount: r.taskIds.length,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/millennium/init] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize millennium problems research ecosystem",
      },
      { status: 500 }
    );
  }
}

// GET: 获取千年难题研究生态状态
export async function GET(request: NextRequest) {
  try {
    const panels = await prisma.academicPanel.findMany({
      where: {
        strategy: {
          contains: "millennium_init",
        },
      },
      include: {
        members: true,
        workshops: true,
        pipelines: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          problemCount: panels.length,
          problems: panels.map((panel) => ({
            name: panel.name,
            domain: panel.domain,
            status: panel.status,
            memberCount: panel.members.length,
            workshopCount: panel.workshops.length,
            pipelineCount: panel.pipelines.length,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/research/millennium/init] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch millennium problems research status",
      },
      { status: 500 }
    );
  }
}
