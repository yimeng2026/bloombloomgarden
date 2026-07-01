import { NextResponse } from "next/server";
import { ontologyEngine } from "@/lib/ontology";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, schemaId, mode = "hybrid" } = body;

    if (!question || !schemaId) {
      return NextResponse.json(
        { error: "Missing required fields: question, schemaId" },
        { status: 400 }
      );
    }

    const validModes = ["type_filter", "relation_traverse", "hybrid", "temporal"] as const;
    const normalizedMode = validModes.includes(mode) ? mode : "hybrid";

    const result = await ontologyEngine.queryWithOntology(
      question,
      schemaId,
      normalizedMode
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/ontology/query]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
