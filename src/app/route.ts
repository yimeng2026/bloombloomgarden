import { NextResponse } from "next/server";

/** Machine-readable service discovery, not a browser frontend. */
export function GET() {
  return NextResponse.json({
    name: "BloomBloomGarden Headless Research API",
    mode: "headless-kimi",
    provider: "kimi",
    control: "/api/kimi-control",
    agent: "/api/kimi-agent",
    lawPackages: "/api/research/law-packages",
    guide: "/docs/KIMI_HEADLESS_RESEARCH_GUIDE.md",
    note: "Use Authorization: Bearer <GARDEN_AGENT_TOKEN> for the control and agent APIs.",
  });
}
