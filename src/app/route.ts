import { NextResponse } from "next/server";
import { RESEARCH_SCENARIOS } from "@/lib/research-scenarios";

export const runtime = "nodejs";

/** Machine-readable service discovery, not a browser frontend. */
export function GET() {
  return NextResponse.json({
    name: "BloomBloomGarden Headless Research API",
    service: "BloomBloomGarden Kimi API",
    mode: "headless-kimi",
    status: "ok",
    interface: "api-only",
    provider: "kimi",
    control: "/api/kimi-control",
    agent: "/api/kimi-agent",
    lawPackages: "/api/research/law-packages",
    guide: "/docs/KIMI_HEADLESS_RESEARCH_GUIDE.md",
    note: "Use Authorization: Bearer <GARDEN_AGENT_TOKEN> for the control, agent and research APIs.",
    scenarios: RESEARCH_SCENARIOS.map(({ id, title }) => ({ id, title })),
    endpoints: [
      { method: "GET", path: "/api/llm-pool/status", purpose: "供应商健康状态；不返回原始密钥" },
      { method: "GET", path: "/api/research/scenarios", purpose: "六类研究场景" },
      { method: "GET", path: "/api/research/protocol-requests", purpose: "实验协议求援与证据计数" },
      { method: "POST", path: "/api/research/scenarios", purpose: "创建研究场景或工作计划" },
      { method: "POST", path: "/api/research/protocol-requests/:id/review", purpose: "三角色评审；dryRun 可免费预览" },
    ],
    evidenceBoundary: "模型评审不是原始证据，不自动提升证据等级。",
  });
}
