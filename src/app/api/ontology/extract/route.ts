import { NextResponse } from "next/server";
import { ontologyEngine } from "@/lib/ontology";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, schemaId } = body;

    if (!text || !schemaId) {
      return NextResponse.json(
        { error: "Missing required fields: text, schemaId" },
        { status: 400 }
      );
    }

    const result = await ontologyEngine.extractWithOntology(text, schemaId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/ontology/extract]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
