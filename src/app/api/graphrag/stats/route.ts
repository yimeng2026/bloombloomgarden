import { NextResponse } from "next/server";
import { graphrag } from "@/lib/graphrag";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await graphrag.getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("GraphRAG 统计获取失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "获取失败" },
      { status: 500 }
    );
  }
}
