import { NextResponse } from "next/server";
import { ontologyEngine } from "@/lib/ontology";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, definition } = body;

    if (!name || !definition) {
      return NextResponse.json(
        { error: "Missing required fields: name, definition" },
        { status: 400 }
      );
    }

    const result = await ontologyEngine.createSchema(name, description || "", definition);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/ontology/schemas]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const schemas = await ontologyEngine.listSchemas();
    return NextResponse.json({ schemas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/ontology/schemas]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
