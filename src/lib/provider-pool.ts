/**
 * ProviderPool —— 千界花园多 API 集群驱动层
 *
 * 设计借鉴（仅借鉴架构思想，未复制任何代码）：
 *   1. CrewAI/LangGraph fan-out 最佳实践：在 provider 前方放置"限流闸门"，
 *      避免多 worker 同时打爆同一 provider 造成 429 风暴 → 本模块的
 *      per-key 并发闸（maxConcurrencyPerKey + inflight 计数）。
 *   2. AutoGen v0.4 可观测性分层：每次调用记录 span（latency / token usage /
 *      错误），聚合成 per-key 统计并暴露给状态端点。
 *   3. MetaGPT/CrewAI 分层兜底与熔断：key 级熔断器（失败计数 → 指数冷却），
 *      provider 级优先级 failover（priority 小的先用，彻底失败后降级下一个）。
 *
 * 调度策略：健康 key 中按 (inflight 最少 → 累计失败最少) 加权轮询；
 * 健康检查：惰性（调用失败自动熔断冷却）+ 主动（probePool 微型请求）。
 *
 * 安全约定：key 绝不入库、绝不打印日志；对外仅暴露前 6 位掩码。
 */

import { getKimiGateway } from "./kimi-gateway";

// ===================== 类型 =====================

export interface PoolKeySlot {
  /** 唯一标识：providerId:envName[#idx] */
  id: string;
  /** 前6位掩码（仅用于日志/状态展示） */
  masked: string;
  /** 原始 key —— 绝不序列化到状态端点 */
  apiKey: string;
  healthy: boolean;
  failCount: number;
  /** 熔断冷却截止时间（epoch ms），0 表示未冷却 */
  cooldownUntil: number;
  /** 当前在途请求数（并发闸） */
  inflight: number;
  totalCalls: number;
  totalLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
  lastOkAt?: number;
}

export interface PoolProvider {
  id: string;
  name: string;
  chatUrl: string;
  model: string;
  temperature: number;
  /** 该 provider 是否接受 reasoning_effort 参数（kimi 网关实测支持 none/low） */
  supportsReasoningEffort: boolean;
  extraHeaders?: Record<string, string>;
  keys: PoolKeySlot[];
  /** 每 key 最大并发（限流闸门） */
  maxConcurrencyPerKey: number;
  /** 优先级，小的先调度 */
  priority: number;
}

export interface PoolChatRequest {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 关闭/降低思考（kimi 网关实测 reasoning_effort=none 有效，reasoning_tokens 54→18） */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** 指定 provider（默认按 priority 全池调度） */
  providerId?: string;
  timeoutMs?: number;
}

export interface PoolChatResponse {
  content: string;
  reasoning?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  provider: string;
  keyId: string;
  latencyMs: number;
  finishReason?: string;
  attempts: number;
}

// ===================== 环境装载 =====================

const mask = (k: string) => `${k.slice(0, 6)}…len${k.length}`;

function makeKey(providerId: string, envName: string, apiKey: string): PoolKeySlot {
  return {
    id: `${providerId}:${envName}`,
    masked: mask(apiKey),
    apiKey,
    healthy: true,
    failCount: 0,
    cooldownUntil: 0,
    inflight: 0,
    totalCalls: 0,
    totalLatencyMs: 0,
    lastLatencyMs: 0,
  };
}

/**
 * 从环境变量装载全部 provider：
 *   - kimi 网关：KIMI_API_KEY(+_2.._5) + KIMI_BASE_URL（priority 0，唯一实测可用）
 *   - 智谱 GLM：ZHIPU_API_KEY + GLM51_API_KEY_1..10（priority 5，2026-09 实测全部 401，
 *     仍装载以便池状态可视 + 未来 key 更新后自动生效）
 *   - Moonshot 公开端点：MOONSHOT_API_KEY（priority 6）
 *   - 通用 OpenAI 兼容：POOL_<ID>_BASE_URL / POOL_<ID>_API_KEY(+_2.._5) / POOL_<ID>_MODEL
 */
export function loadPoolFromEnv(): PoolProvider[] {
  const env = process.env;
  const providers: PoolProvider[] = [];

  // --- Kimi 网关 ---
  const kimi = getKimiGateway();
  if (kimi) {
    const keys = [makeKey("kimi-gateway", "KIMI_API_KEY", kimi.apiKey)];
    for (let i = 2; i <= 5; i++) {
      const k = env[`KIMI_API_KEY_${i}`]?.trim();
      if (k) keys.push(makeKey("kimi-gateway", `KIMI_API_KEY_${i}`, k));
    }
    providers.push({
      id: "kimi-gateway",
      name: "Kimi 网关 (kimi-for-coding)",
      chatUrl: kimi.chatUrl,
      model: kimi.model,
      temperature: 1, // 网关仅允许 temperature=1
      supportsReasoningEffort: true,
      keys,
      maxConcurrencyPerKey: 5, // 实测 5 路并发 5/5 成功
      priority: 0,
    });
  }

  // --- 智谱 GLM（多 key 集群位） ---
  const glmKeys: PoolKeySlot[] = [];
  const seen = new Set<string>();
  const pushGlm = (envName: string) => {
    const k = env[envName]?.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      glmKeys.push(makeKey("zhipu", envName, k));
    }
  };
  pushGlm("ZHIPU_API_KEY");
  for (let i = 1; i <= 10; i++) pushGlm(`GLM51_API_KEY_${i}`);
  pushGlm("GLM_API_KEY");
  if (glmKeys.length > 0) {
    providers.push({
      id: "zhipu",
      name: "智谱 GLM",
      chatUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      model: "glm-5.1",
      temperature: 0.3,
      supportsReasoningEffort: false,
      keys: glmKeys,
      maxConcurrencyPerKey: 3,
      priority: 5,
    });
  }

  // --- Moonshot 公开端点 ---
  const mk = env.MOONSHOT_API_KEY?.trim();
  if (mk) {
    providers.push({
      id: "moonshot",
      name: "Moonshot 公开端点",
      chatUrl: "https://api.moonshot.cn/v1/chat/completions",
      model: "kimi-k2-0905-preview",
      temperature: 0.3,
      supportsReasoningEffort: false,
      keys: [makeKey("moonshot", "MOONSHOT_API_KEY", mk)],
      maxConcurrencyPerKey: 3,
      priority: 6,
    });
  }

  // --- 通用 OpenAI 兼容端点：POOL_<ID>_* ---
  const customIds = new Set<string>();
  for (const name of Object.keys(env)) {
    const m = name.match(/^POOL_([A-Z0-9]+)_BASE_URL$/);
    if (m) customIds.add(m[1]);
  }
  for (const id of customIds) {
    const base = env[`POOL_${id}_BASE_URL`]?.trim().replace(/\/+$/, "");
    const model = env[`POOL_${id}_MODEL`]?.trim() || "gpt-4o-mini";
    const temp = Number(env[`POOL_${id}_TEMPERATURE`] ?? "0.3");
    if (!base) continue;
    const v1Base = /\/v1$/i.test(base) ? base : `${base}/v1`;
    const keys: PoolKeySlot[] = [];
    const k1 = env[`POOL_${id}_API_KEY`]?.trim();
    if (k1) keys.push(makeKey(id.toLowerCase(), `POOL_${id}_API_KEY`, k1));
    for (let i = 2; i <= 5; i++) {
      const kn = env[`POOL_${id}_API_KEY_${i}`]?.trim();
      if (kn) keys.push(makeKey(id.toLowerCase(), `POOL_${id}_API_KEY_${i}`, kn));
    }
    if (keys.length === 0) continue;
    providers.push({
      id: id.toLowerCase(),
      name: `自定义端点 ${id}`,
      chatUrl: `${v1Base}/chat/completions`,
      model,
      temperature: Number.isFinite(temp) ? temp : 0.3,
      supportsReasoningEffort: false,
      keys,
      maxConcurrencyPerKey: 3,
      priority: 8,
    });
  }

  return providers.sort((a, b) => a.priority - b.priority);
}

// ===================== 池单例（Next 热更新安全） =====================

const GLOBAL_KEY = "__BBG_PROVIDER_POOL__";

interface PoolState {
  providers: PoolProvider[];
  loadedAt: number;
}

export function getPool(): PoolProvider[] {
  const g = globalThis as Record<string, PoolState | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { providers: loadPoolFromEnv(), loadedAt: Date.now() };
  }
  return g[GLOBAL_KEY]!.providers;
}

/** 强制重新装载（环境变量变更后调用） */
export function reloadPool(): PoolProvider[] {
  const g = globalThis as Record<string, PoolState | undefined>;
  g[GLOBAL_KEY] = { providers: loadPoolFromEnv(), loadedAt: Date.now() };
  return g[GLOBAL_KEY]!.providers;
}

// ===================== 调度与熔断 =====================

const now = () => Date.now();

function keyAvailable(k: PoolKeySlot, maxConc: number): boolean {
  if (!k.healthy) return false;
  if (k.cooldownUntil > now()) return false;
  return k.inflight < maxConc;
}

/** 健康 key 中挑 inflight 最少、失败最少的（加权轮询的确定性变体） */
function pickKey(p: PoolProvider): PoolKeySlot | null {
  const avail = p.keys.filter((k) => keyAvailable(k, p.maxConcurrencyPerKey));
  if (avail.length === 0) return null;
  avail.sort((a, b) => a.inflight - b.inflight || a.failCount - b.failCount || a.totalCalls - b.totalCalls);
  return avail[0];
}

function markSuccess(k: PoolKeySlot, latencyMs: number): void {
  k.inflight = Math.max(0, k.inflight - 1);
  k.healthy = true;
  k.failCount = 0;
  k.cooldownUntil = 0;
  k.totalCalls += 1;
  k.totalLatencyMs += latencyMs;
  k.lastLatencyMs = latencyMs;
  k.lastOkAt = now();
  k.lastError = undefined;
}

function markFailure(k: PoolKeySlot, status: number | null, errMsg: string): void {
  k.inflight = Math.max(0, k.inflight - 1);
  k.failCount += 1;
  k.totalCalls += 1;
  k.lastError = `${status ?? "net"}: ${errMsg.slice(0, 120)}`;
  // 熔断冷却：401 长冷却（10min，鉴权失败短期不会自愈）；
  // 429 中冷却；网络/5xx 指数退避 1s→60s 封顶
  let coolMs: number;
  if (status === 401 || status === 403) {
    coolMs = 10 * 60 * 1000;
  } else if (status === 429) {
    coolMs = Math.min(5 * 60 * 1000, 30_000 * Math.pow(2, k.failCount - 1));
  } else {
    coolMs = Math.min(60_000, 1000 * Math.pow(2, k.failCount));
  }
  k.cooldownUntil = now() + coolMs;
  if (k.failCount >= 5) k.healthy = false; // 连续失败 5 次标记不健康，等待主动探测恢复
}

// ===================== 调用 =====================

const DEFAULT_TIMEOUT = 300_000;

async function callOnce(
  p: PoolProvider,
  k: PoolKeySlot,
  req: PoolChatRequest,
): Promise<PoolChatResponse> {
  const messages =
    req.messages ??
    [
      ...(req.systemPrompt ? [{ role: "system", content: req.systemPrompt }] : []),
      { role: "user", content: req.userPrompt ?? "" },
    ];
  const body: Record<string, unknown> = {
    model: req.model || p.model,
    messages,
    temperature: req.temperature ?? p.temperature,
    max_tokens: req.maxTokens ?? 12288,
  };
  if (req.reasoningEffort && p.supportsReasoningEffort) {
    body.reasoning_effort = req.reasoningEffort;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT);
  const start = now();
  k.inflight += 1;
  try {
    const res = await fetch(p.chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${k.apiKey}`,
        ...(p.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const latencyMs = now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      markFailure(k, res.status, text);
      throw new PoolCallError(`LLM API error ${res.status}: ${text.slice(0, 200)}`, res.status, p.id, k.id);
    }
    const data = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string; reasoning_content?: string; reasoning?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    markSuccess(k, latencyMs);
    const choice = data.choices?.[0];
    const message = choice?.message ?? {};
    return {
      content: message.content ?? "",
      reasoning: message.reasoning_content || message.reasoning || "",
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens ?? 0,
            completion_tokens: data.usage.completion_tokens ?? 0,
            total_tokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
      model: data.model || req.model || p.model,
      provider: p.id,
      keyId: k.id,
      latencyMs,
      finishReason: choice?.finish_reason,
      attempts: 1,
    };
  } catch (e) {
    if (e instanceof PoolCallError) throw e;
    markFailure(k, null, e instanceof Error ? e.message : String(e));
    throw new PoolCallError(e instanceof Error ? e.message : String(e), null, p.id, k.id);
  } finally {
    clearTimeout(timer);
  }
}

export class PoolCallError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public providerId: string,
    public keyId: string,
  ) {
    super(message);
    this.name = "PoolCallError";
  }
}

/**
 * 池化调用：按 provider priority 顺序尝试；每个 provider 内最多尝试全部可用 key；
 * 单 key 失败自动熔断并切换下一 key/provider。
 */
export async function poolChat(req: PoolChatRequest, options?: { maxProviders?: number }): Promise<PoolChatResponse> {
  const pool = getPool();
  if (pool.length === 0) {
    throw new Error("ProviderPool 为空：请配置 KIMI_API_KEY+KIMI_BASE_URL 或其他 POOL_* 环境变量");
  }
  const providers = req.providerId ? pool.filter((p) => p.id === req.providerId) : pool;
  if (providers.length === 0) {
    throw new Error(`ProviderPool 中不存在 provider: ${req.providerId}`);
  }

  const errors: string[] = [];
  let attempts = 0;
  for (const p of providers.slice(0, options?.maxProviders ?? providers.length)) {
    // 每个 provider 尝试其全部 key 一轮
    const tried = new Set<string>();
    for (let n = 0; n < p.keys.length; n++) {
      const key = pickKey(p);
      if (!key || tried.has(key.id)) break;
      tried.add(key.id);
      attempts += 1;
      try {
        const r = await callOnce(p, key, req);
        r.attempts = attempts;
        return r;
      } catch (e) {
        const pe = e as PoolCallError;
        errors.push(`${p.id}/${key.masked}: ${pe.message.slice(0, 100)}`);
        // 401/403 不再尝试该 provider 其余同批 key 之外的重试——直接换下一 key（已由循环保证）
      }
    }
  }
  throw new Error(`ProviderPool 全部通道失败: ${errors.join(" | ").slice(0, 400)}`);
}

// ===================== 状态与主动探测 =====================

export interface PoolKeyStatus {
  id: string;
  masked: string;
  healthy: boolean;
  failCount: number;
  cooldownRemainingMs: number;
  inflight: number;
  totalCalls: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
  lastOkAt?: number;
}

export interface PoolProviderStatus {
  id: string;
  name: string;
  model: string;
  priority: number;
  maxConcurrencyPerKey: number;
  supportsReasoningEffort: boolean;
  keys: PoolKeyStatus[];
}

/** 安全状态快照：仅掩码，绝不含原始 key */
export function getPoolStatus(): { loadedAt: number; providers: PoolProviderStatus[] } {
  const providers = getPool(); // 确保已装载（getPool 内部惰性初始化）
  const g = globalThis as Record<string, PoolState | undefined>;
  const state = g[GLOBAL_KEY];
  return {
    loadedAt: state?.loadedAt ?? 0,
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      model: p.model,
      priority: p.priority,
      maxConcurrencyPerKey: p.maxConcurrencyPerKey,
      supportsReasoningEffort: p.supportsReasoningEffort,
      keys: p.keys.map((k) => ({
        id: k.id,
        masked: k.masked,
        healthy: k.healthy,
        failCount: k.failCount,
        cooldownRemainingMs: Math.max(0, k.cooldownUntil - now()),
        inflight: k.inflight,
        totalCalls: k.totalCalls,
        avgLatencyMs: k.totalCalls > 0 ? Math.round(k.totalLatencyMs / k.totalCalls) : 0,
        lastLatencyMs: k.lastLatencyMs,
        lastError: k.lastError,
        lastOkAt: k.lastOkAt,
      })),
    })),
  };
}

// ===================== 状态与主动探测 =====================
export async function probePool(options?: { timeoutMs?: number }): Promise<PoolProviderStatus[]> {
  const pool = getPool();
  await Promise.all(
    pool.map(async (p) => {
      const cand = p.keys.find((k) => k.cooldownUntil <= now()) ?? p.keys[0];
      if (!cand) return;
      try {
        await callOnce(p, cand, {
          userPrompt: "Hi",
          maxTokens: 8,
          timeoutMs: options?.timeoutMs ?? 30_000,
          reasoningEffort: "none",
        });
      } catch {
        // 失败已由 markFailure 记录到状态
      }
    }),
  );
  return getPoolStatus().providers;
}
