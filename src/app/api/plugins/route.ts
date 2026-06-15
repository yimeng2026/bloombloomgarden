import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [plugins, skills] = await Promise.all([
      prisma.plugin.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.skill.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ plugins, skills });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch plugins" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "plugin" } = body;
    if (type === "skill") {
      const skill = await prisma.skill.create({ data: body });
      return NextResponse.json(skill, { status: 201 });
    }
    const plugin = await prisma.plugin.create({ data: body });
    return NextResponse.json(plugin, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type = "plugin", ...data } = body;
    if (type === "skill") {
      const skill = await prisma.skill.update({ where: { id }, data });
      return NextResponse.json(skill);
    }
    const plugin = await prisma.plugin.update({ where: { id }, data });
    return NextResponse.json(plugin);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type = "plugin" } = await req.json();
    if (type === "skill") {
      await prisma.skill.delete({ where: { id } });
    } else {
      await prisma.plugin.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
