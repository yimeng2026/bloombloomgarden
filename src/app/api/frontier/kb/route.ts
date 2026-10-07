import { NextRequest, NextResponse } from "next/server";
import { searchKb } from "@/lib/frontier/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/frontier/kb —— 前沿知识库检索
//   ?topic=quant-ph   主题过滤
//   ?tag=对接          关系标签过滤（对接/竞品/可形式化/可评论）
//   ?q=lean           标题/作者/一句话模糊检索
//   ?limit=100        条数上限
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const q = searchParams.get("q") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 200;
    const { count, cards } = searchKb({ topic, tag, q, limit });
    return NextResponse.json({ ok: true, count, cards });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
