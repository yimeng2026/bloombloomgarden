import { NextRequest, NextResponse } from "next/server";
import { getPoolStatus, probePool, reloadPool } from "@/lib/provider-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/llm-pool/status —— ProviderPool 集群健康状态快照（仅掩码，绝不含原始 key）
//   ?probe=1  主动健康探测（每 provider 发一个微型请求，会刷新熔断状态）
//   ?reload=1 重新从环境变量装载池
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("reload") === "1") {
      reloadPool();
    }
    if (searchParams.get("probe") === "1") {
      const providers = await probePool({ timeoutMs: 30_000 });
      return NextResponse.json({ probed: true, loadedAt: Date.now(), providers });
    }
    const status = getPoolStatus();
    return NextResponse.json({
      probed: false,
      ...status,
      summary: {
        totalProviders: status.providers.length,
        totalKeys: status.providers.reduce((n, p) => n + p.keys.length, 0),
        healthyKeys: status.providers.reduce((n, p) => n + p.keys.filter((k) => k.healthy && k.cooldownRemainingMs === 0).length, 0),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
