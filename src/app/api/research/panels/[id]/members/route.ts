import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 预置专家角色模板常量
const EXPERT_TEMPLATES = {
  number_theory: {
    specialty: "number_theory",
    systemPrompt: "你是数论专家，精通解析数论、代数数论、算术几何。你擅长分析整数、素数分布、模形式、L-函数和Diophantine方程。你以严谨的逻辑推理和深厚的理论功底著称，能够从数论的角度审视数学问题，提供深刻而精确的见解。",
    model: "glm-5.1",
  },
  algebraic_geometry: {
    specialty: "algebraic_geometry",
    systemPrompt: "你是代数几何专家，精通概形理论、层上同调、相交理论和动机理论。你擅长将代数问题转化为几何语言，利用几何直觉解决代数难题。你熟悉Grothendieck的数学哲学，能够在抽象与一般性的层面上思考问题。",
    model: "glm-5.1",
  },
  formal_verification: {
    specialty: "formal_verification",
    systemPrompt: "你是 Lean 4 形式化验证专家，精通依赖类型理论、构造性数学和证明助手。你擅长将数学证明转化为形式化代码，确保每个推理步骤的绝对正确性。你熟悉 Mathlib 库，能够在 Lean 4 中实现复杂的数学形式化。",
    model: "glm-5.1",
  },
  pde_analysis: {
    specialty: "pde_analysis",
    systemPrompt: "你是偏微分方程分析专家，精通椭圆型、抛物型和双曲型PDE的定性理论。你擅长Sobolev空间、调和分析、变分方法和正则性理论。你能够将物理问题转化为数学方程，并从分析的角度提供深刻见解。",
    model: "glm-5.1",
  },
  topology: {
    specialty: "topology",
    systemPrompt: "你是拓扑学专家，精通代数拓扑、微分拓扑和几何拓扑。你擅长同伦论、示性类、K理论和低维拓扑。你具有将抽象拓扑概念与具体几何问题联系起来的能力，能够从拓扑的视角发现问题的本质结构。",
    model: "glm-5.1",
  },
  quantum_mechanics: {
    specialty: "quantum_mechanics",
    systemPrompt: "你是量子力学专家，精通量子场论、路径积分、对称性和重整化。你擅长将量子力学的基本原理应用于凝聚态物理、粒子物理和量子信息。你能够深入理解量子纠缠、超导和量子相变等现象。",
    model: "glm-5.1",
  },
  general_relativity: {
    specialty: "general_relativity",
    systemPrompt: "你是广义相对论专家，精通微分几何、黎曼几何和爱因斯坦场方程。你擅长时空几何、黑洞物理、引力波和宇宙学。你能够在弯曲时空的背景下分析物理问题，理解引力与几何的深刻联系。",
    model: "glm-5.1",
  },
  statistical_mechanics: {
    specialty: "statistical_mechanics",
    systemPrompt: "你是统计力学专家，精通平衡态与非平衡态统计物理、相变理论和临界现象。你擅长重整化群、蒙特卡洛方法、Ising模型和自旋玻璃。你能够从统计的角度理解复杂系统的宏观行为。",
    model: "glm-5.1",
  },
  evolutionary_biology: {
    specialty: "evolutionary_biology",
    systemPrompt: "你是进化生物学专家，精通群体遗传学、进化动力学、自然选择理论和系统发育学。你擅长数学建模进化过程，理解适应度景观、基因频率变化和物种形成。你能够将进化理论与生物数学紧密结合。",
    model: "glm-5.1",
  },
  machine_learning: {
    specialty: "machine_learning",
    systemPrompt: "你是机器学习理论专家，精通统计学习理论、优化算法、泛化界限和深度学习的数学基础。你擅长理解神经网络的表达能力和优化景观，能够将学习问题转化为严谨的数学框架。你关注算法背后的统计保证和计算复杂性。",
    model: "glm-5.1",
  },
  optimization: {
    specialty: "optimization",
    systemPrompt: "你是优化理论专家，精通凸优化、非凸优化、组合优化和在线优化。你擅长梯度方法、对偶理论、随机优化和分布式优化。你能够将实际问题建模为优化问题，并设计高效的求解算法。",
    model: "glm-5.1",
  },
  interdisciplinary: {
    specialty: "interdisciplinary",
    systemPrompt: "你是跨学科研究协调员，精通多个学科领域的基础知识，擅长发现不同学科之间的深层联系。你能够桥接数学、物理、生物学和计算机科学之间的鸿沟，促进跨学科思想的交流与融合。你擅长组织不同背景专家进行协作，协调研究方向和资源分配。",
    model: "glm-5.1",
  },
};

// GET: 列出专家组成员
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");
    const role = searchParams.get("role");

    const where: any = { panelId: id };
    if (specialty) where.specialty = specialty;
    if (role) where.role = role;

    const members = await prisma.academicPanelMember.findMany({
      where,
      orderBy: { weight: "desc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("[GET /api/research/panels/:id/members] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch panel members" },
      { status: 500 }
    );
  }
}

// POST: 添加成员（支持模板快速创建）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const templateKey = searchParams.get("template");

    const body = await request.json();

    // 检查专家组是否存在
    const panel = await prisma.academicPanel.findUnique({
      where: { id },
    });

    if (!panel) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    let memberData: {
      role: string;
      specialty: string;
      weight: number;
      systemPrompt: string;
      model: string;
    };

    // 如果指定了模板，从模板获取数据
    if (templateKey && templateKey in EXPERT_TEMPLATES) {
      const template = EXPERT_TEMPLATES[templateKey as keyof typeof EXPERT_TEMPLATES];
      memberData = {
        role: body.role || "contributor",
        specialty: template.specialty,
        weight: body.weight !== undefined ? body.weight : 1.0,
        systemPrompt: template.systemPrompt,
        model: template.model,
      };
    } else {
      // 自定义成员
      const { role, specialty, weight, systemPrompt, model } = body;

      if (!specialty || typeof specialty !== "string" || specialty.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Member specialty is required" },
          { status: 400 }
        );
      }

      memberData = {
        role: role || "contributor",
        specialty: specialty.trim(),
        weight: weight !== undefined ? weight : 1.0,
        systemPrompt: systemPrompt || "",
        model: model || "glm-5.1",
      };
    }

    const member = await prisma.academicPanelMember.create({
      data: {
        panelId: id,
        role: memberData.role,
        specialty: memberData.specialty,
        weight: memberData.weight,
        systemPrompt: memberData.systemPrompt,
        model: memberData.model,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: member,
        templateUsed: templateKey || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/panels/:id/members] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add panel member" },
      { status: 500 }
    );
  }
}

// 导出模板供其他模块使用
export { EXPERT_TEMPLATES };
