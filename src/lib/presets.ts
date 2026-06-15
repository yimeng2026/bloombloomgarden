import { promises as fs } from "fs";
import path from "path";

export interface PresetConfig {
  name: string;
  description: string;
  features: string[];
  adapter: string;
  defaultAgents: Array<{ name: string; role: string; skills: string[] }>;
  defaultChannels: string[];
  theme: { primary: string; accent: string };
}

export interface PresetsManifest {
  version: string;
  name: string;
  description: string;
  presets: Record<string, PresetConfig>;
  adapters: Record<string, { apiBase: string; apiKey: string }>;
}

let manifest: PresetsManifest | null = null;

export async function loadPresets(): Promise<PresetsManifest> {
  if (manifest) return manifest;
  const filePath = path.join(process.cwd(), "presets.json");
  const content = await fs.readFile(filePath, "utf-8");
  manifest = JSON.parse(content) as PresetsManifest;
  return manifest;
}

export async function getPreset(name: string): Promise<PresetConfig | null> {
  const presets = await loadPresets();
  return presets.presets[name] || null;
}

export async function getActivePreset(): Promise<PresetConfig> {
  const presetName = process.env.PRESET || "customer-service";
  const preset = await getPreset(presetName);
  if (!preset) throw new Error(`Unknown preset: ${presetName}`);
  return preset;
}

export async function listPresets(): Promise<Array<{ id: string; config: PresetConfig }>> {
  const presets = await loadPresets();
  return Object.entries(presets.presets).map(([id, config]) => ({ id, config }));
}

export function getAdapterConfig() {
  const type = process.env.ADAPTER_TYPE || "openclaw";
  const apiBase = process.env.ADAPTER_API_BASE || "http://localhost:11435";
  const apiKey = process.env.ADAPTER_API_KEY || "";
  return { id: type, name: type, type, apiBase, apiKey };
}
