import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { researchChat, type ResearchLLMRequest, type ResearchLLMResponse } from "./research-llm";

export interface PrimeQuadrupleChallenge {
  type: "prime_quadruple";
  start: number;
  end: number;
}

export interface EgyptianFractionChallenge {
  type: "egyptian_fraction";
  targetNumerator: number;
  targetDenominator: number;
  terms: number;
  minDenominator: number;
  maxDenominator: number;
  // Records written before this field was added retain the original distinct-denominator rule.
  requireDistinct?: boolean;
}

export type MathChallenge = PrimeQuadrupleChallenge | EgyptianFractionChallenge;
export type MathCertificate = Record<string, unknown>;

export interface MathContestant {
  id: string;
  name: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
}

export interface PrimeCertificate {
  p: number;
  [key: string]: unknown;
}

export interface CertificateVerification {
  valid: boolean;
  reasons: string[];
  algorithm?: "trial_division_to_sqrt" | "exact_bigint_fraction_sum";
  values: Array<{ value: number; prime?: boolean; smallestFactor?: number; trialDivisionLimit?: number }>;
  checks?: string[];
  evidence?: {
    target: string;
    requiredTerms: number;
    submittedTerms: number;
    denominatorBounds: [number, number];
    requireDistinct: boolean;
    numerator: string;
    commonDenominator: string;
    crossMultipliedLeft: string;
    crossMultipliedRight: string;
  };
}

export interface MathTournamentResult {
  competitorId: string;
  name: string;
  provider: string;
  model: string;
  status: "evaluated" | "incomplete" | "error";
  content: string;
  certificate?: MathCertificate;
  verification: CertificateVerification;
  score: number;
  finishReason?: string;
  usage?: ResearchLLMResponse["usage"];
  latencyMs?: number;
  error?: string;
}

export interface MathTournamentRecord {
  id: string;
  competitionId?: string;
  challenge: MathChallenge;
  contestants: MathContestant[];
  results: MathTournamentResult[];
  reviews: Array<{
    reviewerId: string;
    provider: string;
    model: string;
    content: string;
    finishReason?: string;
    usage?: ResearchLLMResponse["usage"];
    error?: string;
  }>;
  status: "complete" | "partial";
  modelCallsSucceeded: boolean;
  winners: string[];
  consensusLevel: number;
  claimScope: "known_answer_certificate_benchmark";
  scoringRule: string;
  createdAt: string;
}

export class MathTournamentInputError extends Error {}

function assertChallenge(challenge: MathChallenge): void {
  if (!challenge || typeof challenge !== "object") throw new MathTournamentInputError("challenge must be an object");
  if (challenge.type === "prime_quadruple") {
    if (!Number.isSafeInteger(challenge.start) || !Number.isSafeInteger(challenge.end)) throw new MathTournamentInputError("range bounds must be integers");
    if (challenge.start < 2 || challenge.end < challenge.start || challenge.end > 2_000_000_000) throw new MathTournamentInputError("range must be within 2..2000000000");
    if (challenge.end - challenge.start + 1 > 2000) throw new MathTournamentInputError("range cannot exceed 2000 integers");
    return;
  }
  if (challenge.type !== "egyptian_fraction") throw new MathTournamentInputError("challenge.type must be prime_quadruple or egyptian_fraction");
  const integers = [challenge.targetNumerator, challenge.targetDenominator, challenge.terms, challenge.minDenominator, challenge.maxDenominator];
  if (!integers.every(Number.isSafeInteger)) throw new MathTournamentInputError("target, terms and denominator bounds must be integers");
  if (challenge.targetNumerator < 1 || challenge.targetNumerator > 1000 || challenge.targetDenominator < 2 || challenge.targetDenominator > 1000) {
    throw new MathTournamentInputError("target must have numerator 1..1000 and denominator 2..1000");
  }
  if (challenge.terms < 2 || challenge.terms > 8) throw new MathTournamentInputError("terms must be within 2..8");
  if (challenge.minDenominator < 2 || challenge.maxDenominator < challenge.minDenominator || challenge.maxDenominator > 1_000_000) {
    throw new MathTournamentInputError("denominator bounds must be within 2..1000000");
  }
  if (challenge.requireDistinct !== undefined && typeof challenge.requireDistinct !== "boolean") {
    throw new MathTournamentInputError("requireDistinct must be a boolean when provided");
  }
}

function smallestFactor(n: number): number | null {
  if (!Number.isSafeInteger(n) || n < 2 || n === 2) return null;
  if (n % 2 === 0) return 2;
  for (let divisor = 3; divisor * divisor <= n; divisor += 2) {
    if (n % divisor === 0) return divisor;
  }
  return null;
}

export function isPrime(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 2 && smallestFactor(n) === null;
}

export function verifyPrimeQuadruple(challenge: PrimeQuadrupleChallenge, certificate: { p?: unknown }): CertificateVerification {
  assertChallenge(challenge);
  const p = typeof certificate.p === "string" && certificate.p.trim() ? Number(certificate.p) : certificate.p;
  if (typeof p !== "number" || !Number.isSafeInteger(p)) {
    return { valid: false, reasons: ["p is not a safe integer"], algorithm: "trial_division_to_sqrt", values: [] };
  }
  if (p < challenge.start || p > challenge.end) {
    return { valid: false, reasons: [`${p} is outside the declared range`], algorithm: "trial_division_to_sqrt", values: [] };
  }
  const values = [p, p + 2, p + 6, p + 8].map((value) => {
    const smallest = smallestFactor(value);
    return { value, prime: smallest === null, ...(smallest === null ? {} : { smallestFactor: smallest }), trialDivisionLimit: Math.floor(Math.sqrt(value)) };
  });
  const composites = values.filter((item) => !item.prime);
  return {
    valid: composites.length === 0,
    reasons: composites.length ? composites.map((item) => `${item.value} is not prime (smallest factor ${item.smallestFactor})`) : ["All four values are prime and p is in range"],
    algorithm: "trial_division_to_sqrt",
    values,
  };
}

export function verifyEgyptianFraction(challenge: EgyptianFractionChallenge, certificate: { denominators: unknown }): CertificateVerification {
  assertChallenge(challenge);
  if (!Array.isArray(certificate.denominators) || certificate.denominators.length !== challenge.terms) {
    return { valid: false, reasons: [`Exactly ${challenge.terms} denominators are required`], algorithm: "exact_bigint_fraction_sum", values: [] };
  }
  const denominators = certificate.denominators.map((value) => typeof value === "string" && value.trim() ? Number(value) : value);
  if (!denominators.every((value) => typeof value === "number" && Number.isSafeInteger(value))) {
    return { valid: false, reasons: ["Every denominator must be a safe integer"], algorithm: "exact_bigint_fraction_sum", values: [] };
  }
  const integers = denominators as number[];
  const values = integers.map((value) => ({ value }));
  const requireDistinct = challenge.requireDistinct !== false;
  const reasons: string[] = [];
  if (requireDistinct && new Set(integers).size !== integers.length) reasons.push("Denominators must be pairwise distinct");
  for (const denominator of integers) {
    if (denominator < challenge.minDenominator || denominator > challenge.maxDenominator) {
      reasons.push(`${denominator} is outside the declared denominator bounds`);
    }
  }
  let numerator = BigInt(0);
  let commonDenominator = BigInt(1);
  for (const denominator of integers) {
    const value = BigInt(denominator);
    numerator = numerator * value + commonDenominator;
    commonDenominator *= value;
  }
  const crossMultipliedLeft = numerator * BigInt(challenge.targetDenominator);
  const crossMultipliedRight = BigInt(challenge.targetNumerator) * commonDenominator;
  if (crossMultipliedLeft !== crossMultipliedRight) {
    reasons.push(`Unit-fraction sum does not exactly equal ${challenge.targetNumerator}/${challenge.targetDenominator}`);
  }
  return {
    valid: reasons.length === 0,
    reasons: reasons.length ? reasons : [`Exactly ${challenge.terms} unit fractions match ${challenge.targetNumerator}/${challenge.targetDenominator}; all declared denominator constraints are satisfied`],
    algorithm: "exact_bigint_fraction_sum",
    values,
    checks: [
      "exact_term_count",
      "safe_integer_denominators",
      "closed_denominator_bounds",
      ...(requireDistinct ? ["pairwise_distinct"] : []),
      "exact_bigint_unit_fraction_sum",
    ],
    evidence: {
      target: `${challenge.targetNumerator}/${challenge.targetDenominator}`,
      requiredTerms: challenge.terms,
      submittedTerms: integers.length,
      denominatorBounds: [challenge.minDenominator, challenge.maxDenominator],
      requireDistinct,
      numerator: numerator.toString(),
      commonDenominator: commonDenominator.toString(),
      crossMultipliedLeft: crossMultipliedLeft.toString(),
      crossMultipliedRight: crossMultipliedRight.toString(),
    },
  };
}

export function verifyCertificate(challenge: MathChallenge, certificate: MathCertificate): CertificateVerification {
  if (challenge.type === "prime_quadruple") return verifyPrimeQuadruple(challenge, certificate);
  return verifyEgyptianFraction(challenge, certificate as { denominators: unknown });
}

export function createEgyptianFractionSeries(repeat: number): EgyptianFractionChallenge[] {
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 4) throw new MathTournamentInputError("repeat must be an integer from 1 to 4");
  return Array.from({ length: repeat }, (_, index) => ({
    type: "egyptian_fraction",
    targetNumerator: 1,
    targetDenominator: 2 + (index % 2),
    terms: 4,
    minDenominator: 2,
    maxDenominator: 200,
    requireDistinct: true,
  }));
}

function challengePrompt(challenge: MathChallenge): string {
  if (challenge.type === "prime_quadruple") {
    return `在闭区间 [${challenge.start}, ${challenge.end}] 内寻找一个整数 p，使 p、p+2、p+6、p+8 都是素数。独立构造一个候选，不要参考其他参赛者。只返回 JSON：{"p":整数,"method":"你的方法","reason":"简短理由"}。不得把自我声称为素数当作验证；花园将独立重算。`;
  }
  const distinctRule = challenge.requireDistinct === false ? "分母允许重复" : "各分母互不相同";
  return `将 ${challenge.targetNumerator}/${challenge.targetDenominator} 表示为 ${challenge.terms} 个单位分数之和。各分母必须是区间 [${challenge.minDenominator}, ${challenge.maxDenominator}] 内的正整数，${distinctRule}。独立构造一个候选，不要参考其他参赛者。只返回 JSON：{"denominators":[整数,...],"method":"你的方法","reason":"简短理由"}。花园将用任意精度整数独立验算精确求和、项数、题目声明的互异性与边界，不把自我声称当作证明。`;
}

function certificateConsensusKey(challenge: MathChallenge, certificate: MathCertificate): string {
  if (challenge.type === "prime_quadruple") return `p:${String(certificate.p)}`;
  const denominators = Array.isArray(certificate.denominators) ? certificate.denominators.map(Number).sort((a, b) => a - b) : [];
  return `denominators:${denominators.join(",")}`;
}

function extractJson(text: string, challenge: MathChallenge): MathCertificate {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object was returned");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const character = text[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const parsed = JSON.parse(text.slice(start, index + 1)) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Certificate must be a JSON object");
        if (challenge.type === "prime_quadruple") {
          const candidate = parsed as { p?: unknown };
          const p = typeof candidate.p === "string" && candidate.p.trim() ? Number(candidate.p) : candidate.p;
          if (typeof p !== "number" || !Number.isSafeInteger(p)) throw new Error("Certificate p must be an integer");
          return { ...candidate, p };
        }
        return parsed as MathCertificate;
      }
    }
  }
  throw new Error("Unterminated certificate JSON");
}

function storeDirectory(custom?: string): string {
  const directory = custom || process.env.MATH_TOURNAMENTS_DIR || path.join("data", "math-tournaments");
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
    throw new MathTournamentInputError("Math tournament storage must be relative to the project");
  }
  return directory;
}

function tournamentPath(id: string, storeDir?: string): string {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new MathTournamentInputError("Invalid tournament id");
  return path.join(/* turbopackIgnore: true */ process.cwd(), storeDirectory(storeDir), `${id}.json`);
}

function saveTournament(record: MathTournamentRecord, storeDir?: string): void {
  const target = tournamentPath(record.id, storeDir);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
}

export function getMathTournament(id: string, options?: { storeDir?: string }): MathTournamentRecord {
  return JSON.parse(fs.readFileSync(tournamentPath(id, options?.storeDir), "utf8")) as MathTournamentRecord;
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

function normalFinish(reason?: string): boolean {
  return ["stop", "completed", "end_turn"].includes(reason || "");
}

export async function runMathTournament(input: {
  competitionId?: string;
  challenge: MathChallenge;
  contestants: MathContestant[];
  reviewers?: MathContestant[];
}, options: {
  chat?: (request: ResearchLLMRequest) => Promise<ResearchLLMResponse>;
  storeDir?: string;
  concurrency?: number;
} = {}): Promise<MathTournamentRecord> {
  assertChallenge(input.challenge);
  if (!Array.isArray(input.contestants) || input.contestants.length < 2 || input.contestants.length > 6) {
    throw new MathTournamentInputError("Two to six contestants are required");
  }
  if (new Set(input.contestants.map((item) => item.id)).size !== input.contestants.length) {
    throw new MathTournamentInputError("Contestant ids must be unique");
  }
  const concurrency = options.concurrency ?? 3;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new MathTournamentInputError("concurrency must be an integer from 1 to 6");
  const chat = options.chat || ((request: ResearchLLMRequest) => researchChat(request, { maxRetries: 0 }));
  const prompt = challengePrompt(input.challenge);
  const results = await mapLimit(input.contestants, concurrency, async (contestant): Promise<MathTournamentResult> => {
    const base = { competitorId: contestant.id, name: contestant.name, provider: contestant.provider || "kimi", model: contestant.model || "kimi-for-coding" };
    try {
      const response = await chat({
        provider: contestant.provider,
        model: contestant.model,
        systemPrompt: contestant.systemPrompt || "你是构造性数论研究者。只给出候选证书，不夸大验证范围，不编造计算过程。",
        userPrompt: prompt,
        maxTokens: 6144,
        timeoutMs: 120000,
        providerAttempts: 1,
        reasoningEffort: "low",
      });
      if (!normalFinish(response.finishReason)) {
        return { ...base, provider: response.provider, model: response.model, status: "incomplete", content: response.content, verification: { valid: false, reasons: [`unfinished response: ${response.finishReason || "unknown"}`], values: [] }, score: 0, finishReason: response.finishReason, usage: response.usage, latencyMs: response.latencyMs };
      }
      let certificate: MathCertificate | undefined;
      let verification: CertificateVerification;
      try {
        certificate = extractJson(response.content, input.challenge);
        verification = verifyCertificate(input.challenge, certificate);
      } catch (error) {
        verification = { valid: false, reasons: [safeError(error)], values: [] };
      }
      return { ...base, provider: response.provider, model: response.model, status: "evaluated", content: response.content, certificate, verification, score: verification.valid ? 10 : 0, finishReason: response.finishReason, usage: response.usage, latencyMs: response.latencyMs };
    } catch (error) {
      return { ...base, status: "error", content: "", verification: { valid: false, reasons: ["model call failed"], values: [] }, score: 0, error: safeError(error) };
    }
  });

  const reviewers = input.reviewers || [
    { id: "kimi-adversary", name: "Kimi 反方", provider: "kimi" },
    { id: "openai-adversary", name: "OpenAI 反方", provider: "relay", model: "gpt-5.5" },
  ];
  const evidence = {
    challenge: input.challenge,
    results: results.map((result) => ({ competitorId: result.competitorId, certificate: result.certificate, verification: result.verification, status: result.status })),
  };
  const reviews = await mapLimit(reviewers, concurrency, async (reviewer) => {
    try {
      const response = await chat({
        provider: reviewer.provider,
        model: reviewer.model,
        systemPrompt: reviewer.systemPrompt || "你是数学反方评审。只检查证书验证范围和未覆盖的假设，不改变机器分数，不宣布新定理。",
        userPrompt: `对抗复核：检查下列构造结果和独立验证是否存在范围错配、遗漏或过度宣称。不得把投票当证明。材料：${JSON.stringify(evidence)}`,
        maxTokens: 2400,
        timeoutMs: 90000,
        providerAttempts: 1,
        reasoningEffort: "low",
      });
      return { reviewerId: reviewer.id, provider: response.provider, model: response.model, content: response.content, finishReason: response.finishReason, usage: response.usage };
    } catch (error) {
      return { reviewerId: reviewer.id, provider: reviewer.provider || "kimi", model: reviewer.model || "kimi-for-coding", content: "", error: safeError(error) };
    }
  });

  const validResults = results.filter((result) => result.status === "evaluated" && result.verification.valid);
  const certificateCounts = new Map<string, number>();
  for (const result of validResults) {
    if (!result.certificate) continue;
    const key = certificateConsensusKey(input.challenge, result.certificate);
    certificateCounts.set(key, (certificateCounts.get(key) || 0) + 1);
  }
  const modelCallsSucceeded = results.every((result) => result.status === "evaluated") && reviews.every((review) => !review.error && normalFinish(review.finishReason));
  const record: MathTournamentRecord = {
    id: randomUUID(),
    competitionId: input.competitionId,
    challenge: input.challenge,
    contestants: input.contestants,
    results,
    reviews,
    status: modelCallsSucceeded ? "complete" : "partial",
    modelCallsSucceeded,
    winners: validResults.map((result) => result.name),
    consensusLevel: results.length ? Math.max(0, ...certificateCounts.values()) / results.length : 0,
    claimScope: "known_answer_certificate_benchmark",
    scoringRule: "Verified certificate = 10; otherwise = 0. Errors and truncation remain explicitly incomplete; no random, length-based or voting scores.",
    createdAt: new Date().toISOString(),
  };
  saveTournament(record, options.storeDir);
  return record;
}
