import { NextRequest, NextResponse } from "next/server";
import { graphrag } from "@/lib/graphrag";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { error: "缺少 title 或 content" },
        { status: 400 }
      );
    }

    const result = await graphrag.ingest(content, title);
    return NextResponse.json({
      id: result.id,
      status: "indexed",
      entityCount: result.entityCount,
      relationCount: result.relationCount,
    });
  } catch (err) {
    console.error("GraphRAG 文档摄入失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "摄入失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const docs = await graphrag.listDocuments();
    return NextResponse.json(docs);
  } catch (err) {
    console.error("GraphRAG 文档列表失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "获取失败" },
      { status: 500 }
    );
  }
}
