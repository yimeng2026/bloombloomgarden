import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get("schemaId");
    const typeName = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (schemaId) where.schemaId = schemaId;

    if (typeName) {
      const typeDef = await prisma.ontologyObjectType.findFirst({
        where: { schemaId: schemaId || undefined, name: typeName },
      });
      if (typeDef) {
        where.typeId = typeDef.id;
      } else {
        return NextResponse.json({ instances: [] });
      }
    }

    const instances = await prisma.ontologyInstance.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { type: true },
    });

    const parsed = instances.map((i) => ({
      ...i,
      properties: (() => {
        try {
          return JSON.parse(i.properties);
        } catch {
          return {};
        }
      })(),
      typeName: i.type?.name || null,
    }));

    return NextResponse.json({ instances: parsed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/ontology/instances]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
