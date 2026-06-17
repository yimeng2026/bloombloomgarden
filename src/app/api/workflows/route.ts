import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows
export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        nodes: true,
        edges: true,
        _count: { select: { conversations: true } },
      },
    });
    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return NextResponse.json({ error: "获取工作流列表失败" }, { status: 500 });
  }
}

// POST /api/workflows
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, canvasData, nodes, edges } = body;
    if (!name?.trim()) return NextResponse.json({ error: "工作流名称不能为空" }, { status: 400 });

    const workflow = await prisma.workflow.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        canvasData: canvasData || "{}",
        nodes: {
          create: (nodes || []).map((n: { type?: string; refId?: string; label?: string; config?: string; positionX?: number; positionY?: number }) => ({
            type: n.type || "agent",
            refId: n.refId || "",
            label: n.label || "",
            config: typeof n.config === "string" ? n.config : JSON.stringify(n.config || {}),
            positionX: n.positionX || 0,
            positionY: n.positionY || 0,
          })),
        },
        edges: {
          create: (edges || []).map((e: { sourceId?: string; targetId?: string; label?: string; condition?: string }) => ({
            sourceId: e.sourceId || "",
            targetId: e.targetId || "",
            label: e.label || "",
            condition: e.condition || "",
          })),
        },
      },
      include: { nodes: true, edges: true },
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json({ error: "创建工作流失败" }, { status: 500 });
  }
}
