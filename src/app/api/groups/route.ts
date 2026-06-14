import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/groups - 获取所有群组
export async function GET() {
  try {
    const groups = await prisma.agentGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: { include: { agent: { select: { id: true, name: true, avatar: true, role: true, agentPlatform: true } } } },
        childGroups: { include: { childGroup: { select: { id: true, name: true, avatar: true, mode: true } } } },
        parentGroups: { include: { parentGroup: { select: { id: true, name: true } } } },
        _count: { select: { conversations: true } },
      },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return NextResponse.json({ error: "获取群组列表失败" }, { status: 500 });
  }
}

// POST /api/groups - 创建群组
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, avatar, mode, agentIds, childGroupIds } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "群组名称不能为空" }, { status: 400 });
    }

    const group = await prisma.agentGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        avatar: avatar?.trim() || "",
        mode: mode || "relay",
        members: {
          create: (agentIds || []).map((agentId: string, i: number) => ({
            agentId,
            role: i === 0 ? "leader" : "member",
          })),
        },
        childGroups: {
          create: (childGroupIds || []).map((childGroupId: string) => ({
            childGroupId,
          })),
        },
      },
      include: {
        members: { include: { agent: true } },
        childGroups: { include: { childGroup: true } },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Failed to create group:", error);
    return NextResponse.json({ error: "创建群组失败" }, { status: 500 });
  }
}
