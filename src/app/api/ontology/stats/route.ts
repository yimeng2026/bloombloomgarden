import { NextResponse } from "next/server";
import { ontologyEngine } from "@/lib/ontology";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get("schemaId") || undefined;

    const stats = await ontologyEngine.getStats(schemaId);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/ontology/stats]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
