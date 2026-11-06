import { NextRequest, NextResponse } from "next/server";
import { getKimiGateway } from "@/lib/kimi-gateway";
import { getPool } from "@/lib/provider-pool";
import { researchLLMHealthCheck } from "@/lib/research-llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function externalProviders() {
  return getPool().map((provider) => ({
    id: provider.id,
    name: provider.name,
    model: provider.model,
    apiStyle: provider.apiStyle || "chat_completions",
    keyCount: provider.keys.length,
    priority: provider.priority,
  }));
}

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

/** No-probe mode is free and reports configuration, not model health. */
export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const probe = searchParams.get("probe") === "1";
  const providers = externalProviders();
  if (!probe) {
    if (process.env.GARDEN_USE_CLUSTER === "0") {
      const direct = getKimiGateway();
      return NextResponse.json({
        success: true,
        probed: false,
        mode: "direct",
        provider: "kimi",
        configured: direct !== null,
        model: direct?.model || "kimi-for-coding",
        healthy: null,
        externalProviders: providers,
      });
    }
    return NextResponse.json({
      success: true,
      probed: false,
      mode: "cluster",
      provider: "kimi",
      healthy: null,
      ...(await clusterConfiguration()),
      externalProviders: providers,
    });
  }
  const provider = searchParams.get("provider") || undefined;
  const result = await researchLLMHealthCheck(provider);
  const external = provider && !["kimi", "kimi-gateway"].includes(provider);
  return NextResponse.json({
    success: result.ok,
    probed: true,
    mode: external ? "external" : process.env.GARDEN_USE_CLUSTER === "0" ? "direct" : "cluster",
    ...result,
    externalProviders: providers,
  }, { status: result.ok ? 200 : 502 });
}
