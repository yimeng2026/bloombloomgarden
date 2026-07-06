import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_TYPES = ["numerical", "symbolic", "experimental", "cross_reference", "peer"];
const VALID_STATUS = ["active", "completed", "failed", "archived"];

// GET: 返回所有验证组（含 validators 和 results 关联），支持筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetModule = searchParams.get("targetModule");
    const validationType = searchParams.get("validationType");
    const status = searchParams.get("status");

    const where: any = {};
    if (targetModule) where.targetModule = targetModule;
    if (validationType) where.validationType = validationType;
    if (status) where.status = status;

    const groups = await prisma.validationGroup.findMany({
      where,
      include: {
        validators: {
          orderBy: { createdAt: "asc" },
        },
        results: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error("[GET /api/research/validations] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validation groups" },
      { status: 500 }
    );
  }
}

// POST: 创建验证组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, targetModule, targetTheorem, validationType, strategy } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Validation group name is required" },
        { status: 400 }
      );
    }

    if (validationType && !VALID_TYPES.includes(validationType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid validationType. Valid: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const group = await prisma.validationGroup.create({
      data: {
        name: name.trim(),
        description: description || "",
        targetModule: targetModule || "",
        targetTheorem: targetTheorem || "",
        validationType: validationType || "numerical",
        status: "active",
        strategy: typeof strategy === "object" ? JSON.stringify(strategy) : strategy || "{}",
      },
      include: {
        validators: true,
        results: true,
      },
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/validations] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create validation group" },
      { status: 500 }
    );
  }
}
