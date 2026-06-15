import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [teams, config] = await Promise.all([
      prisma.team.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.companyConfig.findFirst(),
    ]);
    return NextResponse.json({ teams, config });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "team" } = body;
    if (type === "config") {
      const existing = await prisma.companyConfig.findFirst();
      if (existing) {
        const config = await prisma.companyConfig.update({ where: { id: existing.id }, data: body });
        return NextResponse.json(config);
      }
      const config = await prisma.companyConfig.create({ data: body });
      return NextResponse.json(config, { status: 201 });
    }
    const team = await prisma.team.create({ data: body });
    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type = "team", ...data } = body;
    if (type === "config") {
      const existing = await prisma.companyConfig.findFirst();
      if (!existing) return NextResponse.json({ error: "No config found" }, { status: 404 });
      const config = await prisma.companyConfig.update({ where: { id: existing.id }, data });
      return NextResponse.json(config);
    }
    const team = await prisma.team.update({ where: { id }, data });
    return NextResponse.json(team);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type = "team" } = await req.json();
    if (type === "team") {
      await prisma.team.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
