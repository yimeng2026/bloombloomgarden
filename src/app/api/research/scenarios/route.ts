import { NextRequest, NextResponse } from "next/server";
import { getScenario, RESEARCH_SCENARIOS } from "@/lib/research-scenarios";
import { createProtocolRequest } from "@/lib/protocol-requests";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const scenario = getScenario(id);
    if (!scenario) return NextResponse.json({ success: false, error: "Unknown scenario" }, { status: 404 });
    return NextResponse.json({ success: true, data: scenario });
  }
  return NextResponse.json({ success: true, data: RESEARCH_SCENARIOS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenario = getScenario(body.scenarioId);
    if (!scenario) return NextResponse.json({ success: false, error: "Unknown scenarioId" }, { status: 404 });
    if (scenario.id === "protocol-rescue") {
      const result = createProtocolRequest({
        id: body.requestId,
        title: body.title || scenario.title,
        documents: body.documents,
        contacts: body.contacts,
        sourceReferences: body.sourceReferences,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...scenario,
        status: "planned",
        target: body.target || null,
        note: "此场景返回可执行工作计划；协议求援场景另外持久化完整状态机。",
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create scenario";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
