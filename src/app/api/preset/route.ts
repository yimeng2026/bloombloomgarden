import { NextResponse } from "next/server";
import { getActivePreset, getPreset, listPresets, getAdapterConfig } from "@/lib/presets";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const preset = await getPreset(id);
    if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(preset);
  }

  const active = await getActivePreset();
  const all = await listPresets();
  const adapter = getAdapterConfig();

  return NextResponse.json({ active, all, adapter });
}
