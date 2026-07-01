import { NextRequest, NextResponse } from "next/server";
import { graphrag } from "@/lib/graphrag";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const entities = await graphrag.listEntities(limit);
    return NextResponse.json(entities);
  } catch (err) {
    console.error("GraphRAG 实体列表获取失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "获取失败" },
      { status: 500 }
    );
  }
}
