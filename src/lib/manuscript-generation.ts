import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateCollaborationResponse } from "./research-prompts";
import type { ResearchLLMResponse } from "./research-llm";

export const MAX_TOTAL_OUTPUT_BUDGET = 100_000_000;
export const DEFAULT_SEGMENT_MAX_TOKENS = 12288;

export interface GenerationPlan {
  totalOutputBudget: number;
  targetOutputTokens: number;
  segmentMaxTokens: number;
  segmentCount: number;
  timeoutMs?: number;
  maxRetries?: number;
  resume: boolean;
}

export interface GenerationInput {
  maxTokens?: number;
  totalOutputBudget?: number;
  targetOutputTokens?: number;
  segmentMaxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  resume?: boolean;
}

interface CheckpointSegment {
  index: number;
  content: string;
  completedAt: string;
  finishReason?: string;
  usage?: ResearchLLMResponse["usage"];
}

interface Checkpoint {
  schemaVersion: 1;
  fingerprint: string;
  plan: GenerationPlan;
  status: "in_progress" | "completed";
  segments: CheckpointSegment[];
}

export interface ManuscriptGenerationRequest extends GenerationInput {
  pipelineId: string;
  stageId: string;
  stageName: string;
  topic: string;
  targetModule: string;
  previousContent: string;
  checkpointRoot?: string;
  generate?: typeof generateCollaborationResponse;
}

function integer(value: unknown, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isInteger(selected) || (selected as number) < 1 || (selected as number) > MAX_TOTAL_OUTPUT_BUDGET) {
    throw new Error(`${name} must be an integer between 1 and ${MAX_TOTAL_OUTPUT_BUDGET}`);
  }
  return selected as number;
}

/** Total budget and per-call limits are deliberately separate. */
export function normalizeGenerationOptions(input: GenerationInput): GenerationPlan {
  const totalOutputBudget = integer(input.totalOutputBudget, MAX_TOTAL_OUTPUT_BUDGET, "totalOutputBudget");
  const segmentMaxTokens = integer(input.segmentMaxTokens ?? input.maxTokens, DEFAULT_SEGMENT_MAX_TOKENS, "segmentMaxTokens");
  if (segmentMaxTokens > totalOutputBudget) throw new Error("segmentMaxTokens cannot exceed totalOutputBudget");
  const targetOutputTokens = integer(input.targetOutputTokens, segmentMaxTokens, "targetOutputTokens");
  if (targetOutputTokens > totalOutputBudget) throw new Error("targetOutputTokens cannot exceed totalOutputBudget");
  if (input.timeoutMs !== undefined && (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1000 || input.timeoutMs > 3600000)) {
    throw new Error("timeoutMs must be an integer between 1000 and 3600000");
  }
  if (input.maxRetries !== undefined && (!Number.isInteger(input.maxRetries) || input.maxRetries < 0 || input.maxRetries > 10)) {
    throw new Error("maxRetries must be an integer between 0 and 10");
  }
  return {
    totalOutputBudget,
    targetOutputTokens,
    segmentMaxTokens,
    segmentCount: Math.ceil(targetOutputTokens / segmentMaxTokens),
    timeoutMs: input.timeoutMs,
    maxRetries: input.maxRetries,
    resume: input.resume !== false,
  };
}

function safeId(value: string, name: string): string {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(value)) throw new Error(`${name} is unsafe for checkpoint storage`);
  return value;
}

function fingerprint(request: ManuscriptGenerationRequest, plan: GenerationPlan): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    pipelineId: request.pipelineId,
    stageId: request.stageId,
    stageName: request.stageName,
    topic: request.topic,
    targetModule: request.targetModule,
    previousContent: request.previousContent,
    plan,
  })).digest("hex");
}

function checkpointPath(root: string, pipelineId: string, stageId: string): string {
  return path.join(root, safeId(pipelineId, "pipelineId"), `${safeId(stageId, "stageId")}.json`);
}

function readCheckpoint(file: string, expectedFingerprint: string): Checkpoint | null {
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Checkpoint;
  if (parsed.schemaVersion !== 1 || parsed.fingerprint !== expectedFingerprint || !Array.isArray(parsed.segments)) return null;
  return parsed;
}

function writeCheckpoint(file: string, checkpoint: Checkpoint): void {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function aggregateUsage(segments: CheckpointSegment[]): ResearchLLMResponse["usage"] | undefined {
  const present = segments.filter((segment) => segment.usage);
  if (!present.length) return undefined;
  return present.reduce((total, segment) => ({
    prompt_tokens: total.prompt_tokens + (segment.usage?.prompt_tokens || 0),
    completion_tokens: total.completion_tokens + (segment.usage?.completion_tokens || 0),
    total_tokens: total.total_tokens + (segment.usage?.total_tokens || 0),
  }), { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
}

/**
 * Generate only missing segments and checkpoint each success atomically.
 * Patterns adapted from map/reduce and durable execution; no text is padded to a target.
 */
export async function generateManuscriptInSegments(request: ManuscriptGenerationRequest): Promise<ResearchLLMResponse & {
  segmentCount: number;
  resumedSegmentCount: number;
}> {
  const plan = normalizeGenerationOptions(request);
  const root = request.checkpointRoot || process.env.MANUSCRIPT_CHECKPOINT_DIR || path.join(process.cwd(), "data", "manuscript-checkpoints");
  const file = checkpointPath(root, request.pipelineId, request.stageId);
  const expectedFingerprint = fingerprint(request, plan);
  const existing = plan.resume ? readCheckpoint(file, expectedFingerprint) : null;
  const segments = existing ? [...existing.segments] : [];
  const generate = request.generate || generateCollaborationResponse;
  let latencyMs = 0;
  let lastFinishReason: string | undefined;

  for (let index = 0; index < plan.segmentCount; index++) {
    const prior = segments.find((segment) => segment.index === index && segment.content.trim());
    if (prior) continue;
    const assembled = segments.filter((segment) => segment.index < index).sort((a, b) => a.index - b.index).map((segment) => segment.content).join("\n\n");
    const continuation = `${request.previousContent}\n\n[分段任务] 第 ${index + 1}/${plan.segmentCount} 段。仅生成当前段，避免重复前文；保留原始证据、引用和限制。目标为整篇预算而非必须填满的字数。`;
    const previousContent = assembled ? `${continuation}\n\n[已完成片段]\n${assembled}` : continuation;
    const response = await generate("pipeline", {
      topic: request.topic,
      domain: "academic_pipeline",
      mode: "stage_production",
      stage: request.stageName,
      previousContent,
      targetModule: request.targetModule,
    }, {
      maxTokens: plan.segmentMaxTokens,
      timeoutMs: plan.timeoutMs,
      maxRetries: plan.maxRetries,
    });
    if (!response.content.trim()) throw new Error(`Segment ${index + 1} returned empty content`);
    latencyMs += response.latencyMs;
    lastFinishReason = response.finishReason;
    segments.push({ index, content: response.content, completedAt: new Date().toISOString(), finishReason: response.finishReason, usage: response.usage });
    writeCheckpoint(file, { schemaVersion: 1, fingerprint: expectedFingerprint, plan, status: "in_progress", segments });
  }

  const ordered = segments.sort((a, b) => a.index - b.index);
  const checkpoint: Checkpoint = { schemaVersion: 1, fingerprint: expectedFingerprint, plan, status: "completed", segments: ordered };
  writeCheckpoint(file, checkpoint);
  return {
    content: ordered.map((segment) => segment.content).join("\n\n"),
    toolCalls: [],
    rawMessage: {},
    usage: aggregateUsage(ordered),
    model: "kimi-for-coding",
    provider: "kimi",
    latencyMs,
    finishReason: lastFinishReason,
    segmentCount: plan.segmentCount,
    resumedSegmentCount: existing?.segments.length || 0,
  };
}
