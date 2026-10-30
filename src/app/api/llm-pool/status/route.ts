import { NextRequest, NextResponse } from "next/server";
import { getKimiGateway } from "@/lib/kimi-gateway";
import { researchLLMHealthCheck } from "@/lib/research-llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clusterConfiguration(): Promise<{ configured: boolean; endpoints: number; reachable: boolean; error?: string }> {
  const token = process.env.GARDEN_AGENT_TOKEN?.trim();
  if (!token) return { configured: false, endpoints: 0, reachable: false, error: "GARDEN_AGENT_TOKEN is not configured" };
  const base = (process.env.GARDEN_BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/api/kimi-cluster/status`, {
      headers: { "X-Garden-Agent-Key": token },
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`cluster status HTTP ${response.status}`);
    const endpoints = Number(payload?.data?.endpoints) || 0;
    return { configured: endpoints > 0, endpoints, reachable: true };
  } catch (error) {
    return {
      configured: false,
      endpoints: 0,
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** No-probe mode is free and reports cluster configuration, not model health. */
export async function GET(request: NextRequest) {
  const probe = new URL(request.url).searchParams.get("probe") === "1";
  if (!probe) {
    if (process.env.GARDEN_USE_CLUSTER === "0") {
      const direct = getKimiGateway();
      return NextResponse.json({
        probed: false,
        mode: "direct",
        provider: "kimi",
        configured: direct !== null,
        model: direct?.model || "kimi-for-coding",
        healthy: null,
      });
    }
    return NextResponse.json({
      probed: false,
      mode: "cluster",
      provider: "kimi",
      healthy: null,
      ...(await clusterConfiguration()),
    });
  }
  const result = await researchLLMHealthCheck();
  return NextResponse.json({ probed: true, mode: process.env.GARDEN_USE_CLUSTER === "0" ? "direct" : "cluster", ...result }, { status: result.ok ? 200 : 502 });
}
