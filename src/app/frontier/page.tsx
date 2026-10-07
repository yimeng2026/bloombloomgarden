"use client";

import { useState, useEffect, useCallback } from "react";

// ==================== 类型 ====================
interface ArxivEntry {
  id: string;
  baseId: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  link: string;
  categories: string[];
  topic: string;
  tags: string[];
  ingestedAt: string;
}

interface Digest {
  date: string;
  newCount: number;
  digest: string;
  digestSource: "llm" | "fallback-raw" | "empty";
  llmProvider?: string;
  llmError?: string;
}

interface IngestReport {
  ok: boolean;
  fetched: number;
  newCount: number;
  dayCount: number;
  topics: { slug: string; fetched: number; new: number; error?: string }[];
  kbCardsWritten: number;
  digest?: Digest;
  errors: string[];
}

const TAG_COLORS: Record<string, string> = {
  对接: "#22c55e",
  竞品: "#ef4444",
  可形式化: "#6366f1",
  可评论: "#f59e0b",
};
const ALL_TAGS = ["对接", "竞品", "可形式化", "可评论"];
const TOPIC_ICONS: Record<string, string> = {
  "quant-ph": "⚛️",
  "gr-qc": "🌌",
  "hep-th": "🧲",
  "math-ag": "📐",
  "math-nt": "🔢",
  "cs-lo": "📜",
};

// ==================== 主组件 ====================
export default function FrontierPage() {
  const [entries, setEntries] = useState<ArxivEntry[]>([]);
  const [topics, setTopics] = useState<{ slug: string; name: string }[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("all");
  const [activeTag, setActiveTag] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [lastReport, setLastReport] = useState<IngestReport | null>(null);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/frontier/arxiv?digest=1&limit=500");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEntries(data.entries || []);
      setTopics(data.topics || []);
      setDigest(data.digest || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const triggerIngest = async () => {
    setIngesting(true);
    setError("");
    try {
      const res = await fetch("/api/frontier/arxiv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: true }),
      });
      const data = await res.json();
      setLastReport(data);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIngesting(false);
    }
  };

  const filtered = entries.filter((e) => {
    if (activeTopic !== "all" && e.topic !== activeTopic) return false;
    if (activeTag && !e.tags.includes(activeTag)) return false;
    return true;
  });

  const grouped: Record<string, ArxivEntry[]> = {};
  for (const e of filtered) {
    (grouped[e.topic] = grouped[e.topic] || []).push(e);
  }
  const topicName = (slug: string) => topics.find((t) => t.slug === slug)?.name || slug;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 左侧导航条（与 graphrag 页同款） */}
      <aside className="w-16 bg-gradient-to-b from-purple-600 to-indigo-700 flex flex-col items-center py-4 gap-2 shrink-0">
        <a href="/" className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10" title="返回主页">
          🏠
        </a>
        <div className="w-8 h-px bg-white/20" />
        <a href="/research" className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10" title="学术研究">
          🔬
        </a>
        <a href="/graphrag" className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10" title="图谱">
          🕸️
        </a>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg bg-white/20 shadow-lg scale-110" title="前沿吞并引擎">
          🛰️
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🛰️ 前沿吞并引擎</h1>
              <p className="text-sm text-gray-500 mt-1">
                自动追踪 · 摄取 · 消化全球学术前沿 — arXiv 六主题监测 / 按 arXiv id 去重 / KB 摘要卡落盘
              </p>
            </div>
            <button
              onClick={triggerIngest}
              disabled={ingesting}
              className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all ${
                ingesting ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-md"
              }`}
            >
              {ingesting ? "⏳ 摄取中（arXiv 六主题轮询）…" : "🚀 触发摄取"}
            </button>
          </div>

          {/* 摄取报告 */}
          {lastReport && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${lastReport.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
              本次摄取：API 返回 {lastReport.fetched} 条 → 去重后新增 <b>{lastReport.newCount}</b> 条，KB 落卡 {lastReport.kbCardsWritten} 张
              {lastReport.digest && (
                <span className="ml-2">
                  ｜快报来源：{lastReport.digest.digestSource === "llm" ? `LLM（${lastReport.digest.llmProvider}）` : lastReport.digest.digestSource === "fallback-raw" ? "⚠️ 降级·原始摘要" : "无新增"}
                </span>
              )}
              {lastReport.errors.length > 0 && <div className="mt-1 text-xs opacity-80">{lastReport.errors.join("；")}</div>}
            </div>
          )}
          {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">错误：{error}</div>}

          {/* 今日前沿快报 */}
          {digest && digest.digestSource !== "empty" && (
            <div className="mb-6 bg-white rounded-xl shadow-sm p-5 border-l-4 border-indigo-500">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📰</span>
                <h2 className="text-lg font-semibold text-gray-900">今日前沿快报 · {digest.date}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs text-white ${digest.digestSource === "llm" ? "bg-indigo-500" : "bg-amber-500"}`}>
                  {digest.digestSource === "llm" ? `AI 生成 · ${digest.llmProvider}` : "降级 · 原始摘要"}
                </span>
                <span className="text-xs text-gray-400">新增 {digest.newCount} 条</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed max-h-96 overflow-y-auto">{digest.digest}</pre>
            </div>
          )}

          {/* 过滤器 */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setActiveTopic("all")}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${activeTopic === "all" ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              全部主题（{entries.length}）
            </button>
            {topics.map((t) => (
              <button
                key={t.slug}
                onClick={() => setActiveTopic(t.slug)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${activeTopic === t.slug ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              >
                {TOPIC_ICONS[t.slug] || "📄"} {t.name}（{entries.filter((e) => e.topic === t.slug).length}）
              </button>
            ))}
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => setActiveTag("")}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${activeTag === "" ? "bg-gray-800 text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              全部标签
            </button>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                className={`px-3 py-1.5 rounded-full text-sm text-white transition-all ${activeTag === tag ? "shadow ring-2 ring-offset-1 ring-gray-400" : "opacity-70 hover:opacity-100"}`}
                style={{ backgroundColor: TAG_COLORS[tag] }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* 卡片列表（按主题分组） */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="text-4xl mb-3">🛰️</div>
              <p className="text-gray-500">暂无前沿条目。点击右上角「触发摄取」从 arXiv 拉取真实数据。</p>
            </div>
          ) : (
            Object.entries(grouped).map(([topic, list]) => (
              <div key={topic} className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>{TOPIC_ICONS[topic] || "📄"}</span>
                  {topicName(topic)}
                  <span className="text-sm font-normal text-gray-400">{list.length} 条</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {list.map((e) => (
                    <div key={e.baseId} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <a href={e.link} target="_blank" rel="noreferrer" className="text-gray-900 font-medium leading-snug hover:text-indigo-600 transition-colors">
                          {e.title}
                        </a>
                      </div>
                      <div className="text-xs text-gray-500 mb-2 line-clamp-1">{e.authors.slice(0, 4).join(", ")}{e.authors.length > 4 ? " 等" : ""}</div>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">{e.abstract}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {e.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: TAG_COLORS[tag] || "#6b7280" }}>
                            {tag}
                          </span>
                        ))}
                        <span className="text-xs text-gray-400 ml-auto">
                          发布 {e.published.slice(0, 10)} ｜ 摄取 {new Date(e.ingestedAt).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
