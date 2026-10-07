/**
 * arxiv-ingest.ts — 前沿吞并引擎 · arXiv 摄取层
 *
 * 职责：
 *   1. 按 frontier.config.ts 主题调用 arXiv API（atom 解析，零外部依赖）；
 *   2. 按 arXiv id 全局去重（index.json 持久化）；
 *   3. 结果落盘 data/frontier/arxiv_<date>.json（按日增量合并）；
 *   4. 新条目写入 KB 摘要卡 data/frontier/kb/<topic>/<id>.md；
 *   5. 每日增量摘要：走 ProviderPool LLM 通道生成"今日前沿快报"，
 *      LLM 失败时降级为原始摘要列表（digestSource="fallback-raw"），绝不假造 AI 摘要。
 */

import fs from "fs";
import path from "path";
import {
  FRONTIER_TOPICS,
  RELATION_TAG_RULES,
  ARXIV_API,
  ARXIV_HTTPS_API,
  MAX_RESULTS_PER_TOPIC,
  TOPIC_DELAY_MS,
  FRONTIER_DATA_DIR,
  FRONTIER_KB_DIR,
  FrontierTopic,
} from "./frontier.config";
import { researchChat } from "@/lib/research-llm";

// ==================== 类型 ====================
export interface ArxivEntry {
  id: string;             // arXiv id，如 2501.12345v1
  baseId: string;         // 去版本号 id，去重键
  title: string;
  authors: string[];
  abstract: string;
  published: string;      // ISO
  updated: string;
  link: string;           // abs 页
  categories: string[];
  topic: string;          // 命中的监测主题 slug
  tags: string[];         // 关系标签：对接/竞品/可形式化/可评论
  ingestedAt: string;     // ISO，摄取时间
}

export interface DayFile {
  date: string;                       // YYYY-MM-DD（UTC）
  updatedAt: string;
  count: number;
  entries: ArxivEntry[];
}

export interface DigestResult {
  date: string;
  newCount: number;
  digest: string;
  /** "llm" = ProviderPool 真实生成；"fallback-raw" = LLM 失败降级为原始摘要列表 */
  digestSource: "llm" | "fallback-raw" | "empty";
  llmProvider?: string;
  llmError?: string;
}

export interface IngestReport {
  ok: boolean;
  fetched: number;                    // API 返回总条数（去重前）
  newCount: number;                   // 去重后新增
  dayCount: number;                   // 当日文件总条数
  topics: { slug: string; fetched: number; new: number; error?: string }[];
  kbCardsWritten: number;
  digest?: DigestResult;
  errors: string[];
}

// ==================== 路径工具 ====================
function dataRoot(): string {
  return path.join(process.cwd(), FRONTIER_DATA_DIR);
}
function kbRoot(): string {
  return path.join(process.cwd(), FRONTIER_KB_DIR);
}
function dayFilePath(date: string): string {
  return path.join(dataRoot(), `arxiv_${date}.json`);
}
function indexPath(): string {
  return path.join(dataRoot(), "index.json");
}
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureDirs() {
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.mkdirSync(kbRoot(), { recursive: true });
}

// ==================== 去重索引 ====================
interface DedupIndex {
  [baseId: string]: { firstSeen: string; topics: string[] };
}
function loadIndex(): DedupIndex {
  try {
    return JSON.parse(fs.readFileSync(indexPath(), "utf-8")) as DedupIndex;
  } catch {
    return {};
  }
}
function saveIndex(idx: DedupIndex) {
  fs.writeFileSync(indexPath(), JSON.stringify(idx, null, 2), "utf-8");
}

// ==================== Atom 解析（零依赖，容错型） ====================
function xmlText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXml(m[1].trim()) : "";
}
function xmlTextAll(block: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.push(decodeXml(m[1].trim()));
  return out;
}
function xmlAttrAll(block: string, tag: string, attr: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*/?>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.push(m[1]);
  return out;
}
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parseAtom(xml: string, topicSlug: string): Omit<ArxivEntry, "tags" | "ingestedAt" | "topic">[] {
  const entries: Omit<ArxivEntry, "tags" | "ingestedAt" | "topic">[] = [];
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const b of blocks) {
    const rawId = xmlText(b, "id"); // http://arxiv.org/abs/2501.12345v1
    const idMatch = rawId.match(/abs\/([^/]+)$/);
    const id = idMatch ? idMatch[1] : rawId;
    if (!id) continue;
    const baseId = id.replace(/v\d+$/, "");
    const title = xmlText(b, "title").replace(/\s+/g, " ").trim();
    const abstract = xmlText(b, "summary").replace(/\s+/g, " ").trim();
    const published = xmlText(b, "published");
    const updated = xmlText(b, "updated");
    const authors = xmlTextAll(b, "name");
    const categories = xmlAttrAll(b, "category", "term");
    entries.push({
      id,
      baseId,
      title,
      authors,
      abstract,
      published,
      updated: updated || published,
      link: `https://arxiv.org/abs/${baseId}`,
      categories,
    });
  }
  void topicSlug;
  return entries;
}

// ==================== 关系标签 ====================
export function classifyTags(title: string, abstract: string): string[] {
  const hay = `${title} ${abstract}`.toLowerCase();
  const tags: string[] = [];
  for (const rule of RELATION_TAG_RULES) {
    if (rule.markers.some((mk) => hay.includes(mk.toLowerCase()))) {
      tags.push(rule.tag);
    }
  }
  return tags;
}

// ==================== arXiv 拉取 ====================
function buildQuery(topic: FrontierTopic, maxResults: number): string {
  const catPart = topic.categories.map((c) => `cat:${c}`).join("+OR+");
  const kwPart = topic.keywords.map((k) => `all:"${k.replace(/"/g, "")}"`).join("+OR+");
  const q = `(${catPart})+AND+(${kwPart})`;
  return `search_query=${q}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
}

async function fetchTopic(topic: FrontierTopic, maxResults: number, timeoutMs = 30_000): Promise<ReturnType<typeof parseAtom>> {
  const qs = buildQuery(topic, maxResults);
  let lastErr: Error | null = null;
  for (const base of [ARXIV_HTTPS_API, ARXIV_API]) {
    try {
      const res = await fetch(`${base}?${qs}`, {
        headers: { "User-Agent": "BloomBloomGarden-FrontierEngine/1.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
      const xml = await res.text();
      if (xml.includes("<entry>") || xml.includes("<feed")) {
        return parseAtom(xml, topic.slug);
      }
      throw new Error("arXiv 返回非 atom 内容");
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr || new Error("arXiv fetch failed");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ==================== 日文件读写 ====================
export function loadDayFile(date: string): DayFile {
  try {
    return JSON.parse(fs.readFileSync(dayFilePath(date), "utf-8")) as DayFile;
  } catch {
    return { date, updatedAt: new Date().toISOString(), count: 0, entries: [] };
  }
}
function saveDayFile(df: DayFile) {
  df.updatedAt = new Date().toISOString();
  df.count = df.entries.length;
  fs.writeFileSync(dayFilePath(df.date), JSON.stringify(df, null, 2), "utf-8");
}

export function listDayDates(): string[] {
  try {
    return fs
      .readdirSync(dataRoot())
      .filter((f) => /^arxiv_\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.slice(6, 16))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function listEntries(filter: { topic?: string; date?: string; tag?: string; limit?: number }): { dates: string[]; entries: ArxivEntry[] } {
  const dates = filter.date ? [filter.date] : listDayDates();
  const out: ArxivEntry[] = [];
  for (const d of dates) {
    const df = loadDayFile(d);
    for (const e of df.entries) {
      if (filter.topic && e.topic !== filter.topic) continue;
      if (filter.tag && !e.tags.includes(filter.tag)) continue;
      out.push(e);
      if (filter.limit && out.length >= filter.limit) return { dates, entries: out };
    }
  }
  return { dates, entries: out };
}

// ==================== KB 摘要卡 ====================
function yamlEscape(s: string): string {
  return s.replace(/"/g, '\\"');
}

function firstSentence(abstract: string): string {
  const m = abstract.match(/^(.{20,300}?[.!?。！？])\s/);
  return (m ? m[1] : abstract.slice(0, 280)).trim();
}

export function kbCardPath(topic: string, baseId: string): string {
  return path.join(kbRoot(), topic, `${baseId.replace(/\//g, "_")}.md`);
}

export function writeKbCard(e: ArxivEntry): string {
  const dir = path.join(kbRoot(), e.topic);
  fs.mkdirSync(dir, { recursive: true });
  const md = [
    "---",
    `id: "${yamlEscape(e.id)}"`,
    `base_id: "${yamlEscape(e.baseId)}"`,
    `title: "${yamlEscape(e.title)}"`,
    `authors: "${yamlEscape(e.authors.join(", "))}"`,
    `link: "${e.link}"`,
    `published: "${e.published}"`,
    `topic: "${e.topic}"`,
    `tags: "${yamlEscape(e.tags.join(", "))}"`,
    `categories: "${yamlEscape(e.categories.join(", "))}"`,
    `ingested_at: "${e.ingestedAt}"`,
    "---",
    "",
    `# ${e.title}`,
    "",
    `**一句话**：${firstSentence(e.abstract)}`,
    "",
    `**与 TOE-SYLVA 关系**：${e.tags.length > 0 ? e.tags.join(" / ") : "待定（未命中关系标签规则，待人工评注）"}`,
    "",
    `**摘要**：${e.abstract}`,
    "",
  ].join("\n");
  const p = kbCardPath(e.topic, e.baseId);
  fs.writeFileSync(p, md, "utf-8");
  return p;
}

// ==================== 每日增量摘要（LLM 通道 + 降级） ====================
export async function generateDigest(date: string, newEntries: ArxivEntry[]): Promise<DigestResult> {
  if (newEntries.length === 0) {
    return { date, newCount: 0, digest: "今日无新增前沿条目。", digestSource: "empty" };
  }
  // LLM 输入上限 30 条：144 条全量 brief 超上下文会导致空回复（实测 2026-10-07）
  const llmEntries = newEntries.slice(0, 30);
  const brief = llmEntries
    .map((e, i) => `${i + 1}. [${e.topic}][${e.tags.join("/") || "无标签"}] ${e.title}\n   作者: ${e.authors.slice(0, 3).join(", ")}\n   摘要: ${e.abstract.slice(0, 500)}`)
    .join("\n");

  try {
    const r = await researchChat({
      systemPrompt:
        "你是 TOE-SYLVA 前沿吞并引擎的快报编辑。基于给出的 arXiv 新条目（标题+摘要），输出中文《今日前沿快报》：" +
        "按主题分组，每条一句话核心价值 + 与 TOE-SYLVA（量子引力/涌现时空/信息几何/形式化数学）的潜在关系。" +
        "严格基于给定材料，不得虚构任何论文或结论。",
      userPrompt: `日期：${date}\n新增 ${newEntries.length} 条（以下为前 ${llmEntries.length} 条摘要）：\n${brief}`,
      maxTokens: 8192,
      reasoningEffort: "none",
    });
    if (!r.content || r.content.trim().length < 20) {
      throw new Error("LLM 返回内容为空或过短");
    }
    return { date, newCount: newEntries.length, digest: r.content, digestSource: "llm", llmProvider: r.provider };
  } catch (e) {
    // 降级路径：原始摘要列表，绝不假造 AI 摘要
    const raw = [
      `【降级模式】LLM 通道不可用（${(e as Error).message.slice(0, 120)}），以下为原始摘要列表：`,
      "",
      ...newEntries.map(
        (en, i) => `${i + 1}. [${en.topic}][${en.tags.join("/") || "无标签"}] ${en.title}\n   ${en.link}\n   ${firstSentence(en.abstract)}`
      ),
    ].join("\n");
    return {
      date,
      newCount: newEntries.length,
      digest: raw,
      digestSource: "fallback-raw",
      llmError: (e as Error).message.slice(0, 300),
    };
  }
}

export function saveDigest(d: DigestResult) {
  fs.writeFileSync(path.join(dataRoot(), `digest_${d.date}.json`), JSON.stringify(d, null, 2), "utf-8");
}
export function loadDigest(date: string): DigestResult | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataRoot(), `digest_${date}.json`), "utf-8")) as DigestResult;
  } catch {
    return null;
  }
}

// ==================== 摄取主流程 ====================
export async function ingest(opts?: {
  topics?: string[];        // 主题 slug 子集；缺省全部
  maxResults?: number;
  digest?: boolean;         // 是否生成快报，默认 true
}): Promise<IngestReport> {
  ensureDirs();
  const date = todayUtc();
  const maxResults = opts?.maxResults ?? MAX_RESULTS_PER_TOPIC;
  const doDigest = opts?.digest ?? true;
  const topics = FRONTIER_TOPICS.filter((t) => !opts?.topics || opts.topics.includes(t.slug));

  const idx = loadIndex();
  const day = loadDayFile(date);
  const dayIds = new Set(day.entries.map((e) => e.baseId));

  const report: IngestReport = {
    ok: true,
    fetched: 0,
    newCount: 0,
    dayCount: 0,
    topics: [],
    kbCardsWritten: 0,
    errors: [],
  };

  const newEntries: ArxivEntry[] = [];
  const now = new Date().toISOString();

  for (const t of topics) {
    const tRep: { slug: string; fetched: number; new: number; error?: string } = { slug: t.slug, fetched: 0, new: 0 };
    try {
      const raw = await fetchTopic(t, maxResults);
      tRep.fetched = raw.length;
      report.fetched += raw.length;
      for (const r of raw) {
        if (idx[r.baseId] || dayIds.has(r.baseId)) continue; // 全局去重（按 arXiv id 去版本号）
        const entry: ArxivEntry = {
          ...r,
          topic: t.slug,
          tags: classifyTags(r.title, r.abstract),
          ingestedAt: now,
        };
        day.entries.push(entry);
        dayIds.add(entry.baseId);
        idx[entry.baseId] = { firstSeen: date, topics: [t.slug] };
        newEntries.push(entry);
        tRep.new += 1;
        report.newCount += 1;
        try {
          writeKbCard(entry);
          report.kbCardsWritten += 1;
        } catch (e) {
          report.errors.push(`KB 落卡失败 ${entry.baseId}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      tRep.error = (e as Error).message;
      report.errors.push(`主题 ${t.slug} 抓取失败: ${(e as Error).message}`);
    }
    report.topics.push(tRep);
    if (topics.indexOf(t) < topics.length - 1) await sleep(TOPIC_DELAY_MS);
  }

  saveDayFile(day);
  saveIndex(idx);
  report.dayCount = day.entries.length;

  if (doDigest) {
    report.digest = await generateDigest(date, newEntries);
    saveDigest(report.digest);
  }
  report.ok = report.errors.length === 0 || report.newCount > 0 || report.fetched > 0;
  return report;
}
