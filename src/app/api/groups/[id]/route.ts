import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/groups/[id] - 获取单个群组详情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await prisma.agentGroup.findUnique({
      where: { id },
      include: {
        members: { include: { agent: true } },
        childGroups: { include: { childGroup: { include: { members: { include: { agent: true } } } } } },
        parentGroups: { include: { parentGroup: true } },
        conversations: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { messages: true } } } },
      },
    });
    if (!group) return NextResponse.json({ error: "群组不存在" }, { status: 404 });
    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to fetch group:", error);
    return NextResponse.json({ error: "获取群组失败" }, { status: 500 });
  }
}

// PUT /api/groups/[id] - 更新群组
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, avatar, mode, addAgentIds, removeAgentIds, addChildGroupIds, removeChildGroupIds } = body;

    // 先更新基本字段
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description.trim();
    if (avatar !== undefined) data.avatar = avatar.trim();
    if (mode !== undefined) data.mode = mode;

    await prisma.agentGroup.update({ where: { id }, data });

    // 添加 Agent 成员
    if (addAgentIds?.length) {
      for (const agentId of addAgentIds) {
        await prisma.agentGroupMember.upsert({
          where: { agentId_groupId: { agentId, groupId: id } },
          create: { agentId, groupId: id, role: "member" },
          update: {},
        });
      }
    }

    // 移除 Agent 成员
    if (removeAgentIds?.length) {
      await prisma.agentGroupMember.deleteMany({
        where: { groupId: id, agentId: { in: removeAgentIds } },
      });
    }

    // 添加子群组
    if (addChildGroupIds?.length) {
      for (const childGroupId of addChildGroupIds) {
        await prisma.groupGroupMember.upsert({
          where: { parentGroupId_childGroupId: { parentGroupId: id, childGroupId } },
          create: { parentGroupId: id, childGroupId },
          update: {},
        });
      }
    }

    // 移除子群组
    if (removeChildGroupIds?.length) {
      await prisma.groupGroupMember.deleteMany({
        where: { parentGroupId: id, childGroupId: { in: removeChildGroupIds } },
      });
    }

    const updated = await prisma.agentGroup.findUnique({
      where: { id },
      include: {
        members: { include: { agent: true } },
        childGroups: { include: { childGroup: { include: { members: { include: { agent: true } } } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update group:", error);
    return NextResponse.json({ error: "更新群组失败" }, { status: 500 });
  }
}

// DELETE /api/groups/[id] - 删除群组
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.agentGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "删除群组失败" }, { status: 500 });
  }
}
