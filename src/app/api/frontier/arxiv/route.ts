import { NextRequest, NextResponse } from "next/server";
import { ingest, listEntries, listDayDates, loadDigest, todayUtc, loadDayFile, generateDigest, saveDigest } from "@/lib/frontier/arxiv-ingest";
import { FRONTIER_TOPICS } from "@/lib/frontier/frontier.config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/frontier/arxiv —— 已摄取条目列表
//   ?topic=quant-ph   主题过滤（slug）
//   ?date=2026-10-07  日期过滤（缺省跨日全部）
//   ?tag=可形式化      关系标签过滤
//   ?limit=100        条数上限
//   ?digest=1         附带今日快报
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic") || undefined;
    const date = searchParams.get("date") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 200;

    const { dates, entries } = listEntries({ topic, date, tag, limit });
    const body: Record<string, unknown> = {
      ok: true,
      dates,
      count: entries.length,
      topics: FRONTIER_TOPICS.map((t) => ({ slug: t.slug, name: t.name })),
      entries,
    };
    if (searchParams.get("digest") === "1") {
      body.digest = loadDigest(date || todayUtc());
    }
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/frontier/arxiv —— 触发一次真实抓取
//   body: { topics?: string[], maxResults?: number, digest?: boolean, redigest?: boolean }
//   全程真实 arXiv API；LLM 快报失败自动降级（digestSource=fallback-raw）
//   redigest=true 时跳过抓取，用当日已落盘条目重新生成快报（用于 LLM 通道恢复后重试）
export async function POST(request: NextRequest) {
  try {
    let body: { topics?: string[]; maxResults?: number; digest?: boolean; redigest?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // 空 body = 全主题默认抓取
    }
    if (body.redigest) {
      const date = todayUtc();
      const day = loadDayFile(date);
      const digest = await generateDigest(date, day.entries);
      saveDigest(digest);
      return NextResponse.json({ ok: true, redigest: true, digest });
    }
    const report = await ingest(body);
    return NextResponse.json(report, { status: report.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
