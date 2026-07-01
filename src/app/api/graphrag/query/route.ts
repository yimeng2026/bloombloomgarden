import { NextRequest, NextResponse } from "next/server";
import { graphrag } from "@/lib/graphrag";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question, mode = "naive" } = await req.json();
    if (!question) {
      return NextResponse.json(
        { error: "缺少 question" },
        { status: 400 }
      );
    }

    const validModes = ["local", "global", "mix", "naive"] as const;
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: "无效的 mode，可选: local, global, mix, naive" },
        { status: 400 }
      );
    }

    const result = await graphrag.query(question, mode);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GraphRAG 查询失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "查询失败" },
      { status: 500 }
    );
  }
}
