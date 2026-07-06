"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ==================== 类型 ====================
interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  description: string;
  source?: Entity;
  target?: Entity;
}

interface Document {
  id: string;
  title: string;
  content: string;
  status: string;
  chunkCount: number;
  entityCount: number;
  relationCount: number;
  createdAt: string;
  entities?: Entity[];
  relations?: Relation[];
  chunks?: { id: string; content: string }[];
}

interface GraphStats {
  documentCount: number;
  entityCount: number;
  relationCount: number;
  communityCount: number;
}

interface QueryResult {
  answer: string;
  sources: {
    entities: Entity[];
    relations: Relation[];
    chunks: { id: string; content: string }[];
  };
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  entity: Entity;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: Relation;
}

// ==================== 颜色映射 ====================
const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  organization: "#22c55e",
  concept: "#a855f7",
  location: "#f59e0b",
  event: "#ef4444",
  product: "#06b6d4",
  technology: "#6366f1",
  default: "#6b7280",
};

function getEntityColor(type: string): string {
  return ENTITY_TYPE_COLORS[type.toLowerCase()] || ENTITY_TYPE_COLORS.default;
}

// ==================== 主组件 ====================
export default function GraphRAGPage() {
  // 视图状态
  const [activeTab, setActiveTab] = useState<"upload" | "query" | "graph" | "docs" | "stats">("stats");

  // 上传状态
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ entityCount: number; relationCount: number } | null>(null);

  // 查询状态
  const [queryText, setQueryText] = useState("");
  const [queryMode, setQueryMode] = useState<"naive" | "local" | "global" | "mix">("mix");
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // 图谱状态
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [graphScale, setGraphScale] = useState(1);
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // 统计状态
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 文档列表状态
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // 错误状态
  const [error, setError] = useState<string | null>(null);

  // ==================== 加载统计 ====================
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/graphrag/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "加载统计失败");
      }
    } catch (e) {
      setError("加载统计请求失败");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ==================== 加载文档列表 ====================
  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/graphrag/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "加载文档失败");
      }
    } catch (e) {
      setError("加载文档请求失败");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // ==================== 加载图谱数据 ====================
  const loadGraphData = useCallback(async () => {
    setGraphLoading(true);
    try {
      const [entitiesRes, relationsRes] = await Promise.all([
        fetch("/api/graphrag/entities"),
        fetch("/api/graphrag/relations"),
      ]);
      let entitiesData: Entity[] = [];
      let relationsData: Relation[] = [];
      if (entitiesRes.ok) entitiesData = await entitiesRes.json();
      if (relationsRes.ok) relationsData = await relationsRes.json();
      setEntities(entitiesData);
      setRelations(relationsData);
      // 初始化节点位置
      const nodes: GraphNode[] = entitiesData.map((e, i) => ({
        id: e.id,
        x: 300 + Math.cos((i / Math.max(entitiesData.length, 1)) * 2 * Math.PI) * 200,
        y: 250 + Math.sin((i / Math.max(entitiesData.length, 1)) * 2 * Math.PI) * 200,
        vx: 0,
        vy: 0,
        entity: e,
      }));
      const edges: GraphEdge[] = relationsData.map(r => ({
        source: r.sourceId,
        target: r.targetId,
        relation: r,
      }));
      setGraphNodes(nodes);
      setGraphEdges(edges);
    } catch (e) {
      setError("加载图谱数据失败");
    } finally {
      setGraphLoading(false);
    }
  }, []);

  // ==================== 初始加载 ====================
  useEffect(() => {
    loadStats();
    loadDocuments();
  }, [loadStats, loadDocuments]);

  useEffect(() => {
    if (activeTab === "graph") {
      loadGraphData();
    }
  }, [activeTab, loadGraphData]);

  // ==================== 力导向图模拟 ====================
  useEffect(() => {
    if (activeTab !== "graph" || graphNodes.length === 0) return;
    const sim = () => {
      setGraphNodes(prev => {
        const nodes = prev.map(n => ({ ...n, vx: n.vx * 0.85, vy: n.vy * 0.85 }));
        const width = 800;
        const height = 500;
        // 斥力
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 3000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
        // 引力（边）
        for (const edge of graphEdges) {
          const s = nodes.find(n => n.id === edge.source);
          const t = nodes.find(n => n.id === edge.target);
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }
        // 中心引力
        for (const n of nodes) {
          const dx = width / 2 - n.x;
          const dy = height / 2 - n.y;
          n.vx += dx * 0.0005;
          n.vy += dy * 0.0005;
        }
        // 应用速度
        for (const n of nodes) {
          if (draggingNode === n.id) continue;
          n.x += n.vx;
          n.y += n.vy;
          // 边界约束
          n.x = Math.max(30, Math.min(width - 30, n.x));
          n.y = Math.max(30, Math.min(height - 30, n.y));
        }
        return nodes;
      });
      animationRef.current = requestAnimationFrame(sim);
    };
    animationRef.current = requestAnimationFrame(sim);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [activeTab, graphNodes.length, graphEdges, draggingNode]);

  // ==================== 文档上传 ====================
  const handleUpload = async () => {
    if (!docContent.trim()) return;
    setUploading(true);
    setUploadResult(null);
    setError(null);
    try {
      const res = await fetch("/api/graphrag/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: docTitle.trim() || "未命名文档", content: docContent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUploadResult({ entityCount: data.entityCount || 0, relationCount: data.relationCount || 0 });
        setDocTitle("");
        setDocContent("");
        loadStats();
        loadDocuments();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "上传失败");
      }
    } catch (e) {
      setError("上传请求失败");
    } finally {
      setUploading(false);
    }
  };

  // ==================== 查询 ====================
  const handleQuery = async () => {
    if (!queryText.trim()) return;
    setQuerying(true);
    setQueryResult(null);
    setError(null);
    try {
      const res = await fetch("/api/graphrag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText.trim(), mode: queryMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setQueryResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "查询失败");
      }
    } catch (e) {
      setError("查询请求失败");
    } finally {
      setQuerying(false);
    }
  };

  // ==================== 图谱交互 ====================
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setDraggingNode(nodeId);
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / graphScale - graphOffset.x;
    const y = (e.clientY - rect.top) / graphScale - graphOffset.y;
    if (draggingNode) {
      setGraphNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x, y, vx: 0, vy: 0 } : n));
    } else if (isPanning) {
      setGraphOffset(prev => ({
        x: prev.x + (e.clientX - panStart.x) / graphScale,
        y: prev.y + (e.clientY - panStart.y) / graphScale,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSvgMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setGraphScale(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  // ==================== 渲染 ====================
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ===== 左侧导航 ===== */}
      <aside className="w-16 bg-gradient-to-b from-purple-600 to-indigo-700 flex flex-col items-center py-4 gap-2 shrink-0">
        <a href="/" className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10" title="返回主页">
          🏠
        </a>
        <div className="w-8 h-px bg-white/20" />
        {[
          { t: "stats" as const, icon: "📊", tip: "统计" },
          { t: "upload" as const, icon: "📤", tip: "上传" },
          { t: "query" as const, icon: "🔍", tip: "查询" },
          { t: "graph" as const, icon: "🕸️", tip: "图谱" },
          { t: "docs" as const, icon: "📄", tip: "文档" },
        ].map(item => (
          <button key={item.t} onClick={() => setActiveTab(item.t)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all ${activeTab === item.t ? "bg-white/20 shadow-lg scale-110" : "hover:bg-white/10"}`}
            title={item.tip}>
            {item.icon}
          </button>
        ))}
        <div className="flex-1" />
      </aside>

      {/* ===== 主内容区 ===== */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* 页面标题 */}
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">📚 知识图谱 — GraphRAG 知识引擎</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>GraphRAG 就绪</span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-200 flex items-center justify-between">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ===== 统计面板 ===== */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {statsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))
                ) : stats ? (
                  [
                    { label: "文档数", value: stats.documentCount, icon: "📄", color: "from-blue-500 to-cyan-400" },
                    { label: "实体数", value: stats.entityCount, icon: "🔵", color: "from-purple-500 to-pink-400" },
                    { label: "关系数", value: stats.relationCount, icon: "🔗", color: "from-amber-500 to-orange-400" },
                    { label: "社区数", value: stats.communityCount, icon: "👥", color: "from-green-500 to-emerald-400" },
                  ].map(card => (
                    <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-5 text-white shadow-lg`}>
                      <div className="text-2xl mb-1">{card.icon}</div>
                      <div className="text-3xl font-bold">{card.value}</div>
                      <div className="text-sm opacity-80">{card.label}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-sm">暂无统计数据</div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-700 mb-3">🚀 快速开始</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setActiveTab("upload")} className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-left hover:bg-blue-100 transition">
                    <div className="text-2xl mb-1">📤</div>
                    <div className="font-bold text-sm text-blue-800">上传文档</div>
                    <div className="text-xs text-blue-600 mt-1">将文档内容摄入知识图谱</div>
                  </button>
                  <button onClick={() => setActiveTab("query")} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-left hover:bg-purple-100 transition">
                    <div className="text-2xl mb-1">🔍</div>
                    <div className="font-bold text-sm text-purple-800">知识查询</div>
                    <div className="text-xs text-purple-600 mt-1">使用 GraphRAG 查询知识</div>
                  </button>
                  <button onClick={() => setActiveTab("graph")} className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100 transition">
                    <div className="text-2xl mb-1">🕸️</div>
                    <div className="font-bold text-sm text-amber-800">查看图谱</div>
                    <div className="text-xs text-amber-600 mt-1">可视化实体与关系</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== 文档上传区域 ===== */}
          {activeTab === "upload" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-700 mb-4">📤 文档摄入</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">文档标题</label>
                    <input
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      placeholder="输入文档标题..."
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">文档内容</label>
                    <textarea
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      placeholder="粘贴文档内容..."
                      rows={10}
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !docContent.trim()}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        摄入中...
                      </>
                    ) : (
                      <>📤 摄入文档</>
                    )}
                  </button>
                </div>
              </div>
              {uploadResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700">
                  <div className="font-bold mb-1">✅ 已摄入！</div>
                  <div className="text-sm">提取了 {uploadResult.entityCount} 个实体，{uploadResult.relationCount} 个关系</div>
                </div>
              )}
            </div>
          )}

          {/* ===== 查询区域 ===== */}
          {activeTab === "query" && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-700 mb-4">🔍 知识查询</h2>
                <div className="flex gap-2 mb-4">
                  {(["naive", "local", "global", "mix"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setQueryMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${queryMode === mode ? "bg-purple-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {mode === "naive" ? "🧠 Naive" : mode === "local" ? "📍 Local" : mode === "global" ? "🌍 Global" : "🔀 Mix"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuery(); } }}
                    placeholder="输入查询问题..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={handleQuery}
                    disabled={querying || !queryText.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40 flex items-center gap-2"
                  >
                    {querying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        查询中...
                      </>
                    ) : (
                      <>🔍 查询</>
                    )}
                  </button>
                </div>
              </div>
              {queryResult && (
                <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">💡 回答</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{queryResult.answer}</div>
                  </div>
                  {queryResult.sources.entities.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 引用实体</h3>
                      <div className="flex flex-wrap gap-2">
                        {queryResult.sources.entities.map(e => (
                          <span key={e.id} className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getEntityColor(e.type) }}>
                            {e.name} ({e.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {queryResult.sources.relations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 引用关系</h3>
                      <div className="space-y-1">
                        {queryResult.sources.relations.map(r => (
                          <div key={r.id} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                            {r.source?.name || r.sourceId} → {r.target?.name || r.targetId}: {r.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {queryResult.sources.chunks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2">📄 引用来源</h3>
                      <div className="space-y-2">
                        {queryResult.sources.chunks.map((c, i) => (
                          <div key={c.id || i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="font-medium text-gray-600 mb-1">Chunk {i + 1}</div>
                            <div className="truncate">{c.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== 图谱可视化 ===== */}
          {activeTab === "graph" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-700">🕸️ 知识图谱</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{entities.length} 实体 · {relations.length} 关系</span>
                    <button onClick={() => { setGraphScale(1); setGraphOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">⟲ 重置</button>
                    <button onClick={loadGraphData} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">🔄 刷新</button>
                  </div>
                </div>
                {entities.length > 100 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm mb-2">
                    ⚠️ 实体过多（{entities.length} 个），请使用查询过滤或缩小范围
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mb-2">
                  {Object.entries(ENTITY_TYPE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
              <div ref={graphContainerRef} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: "500px" }}>
                {graphLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
                      <div className="text-sm">加载图谱中...</div>
                    </div>
                  </div>
                ) : entities.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🕸️</div>
                      <div className="text-sm">暂无图谱数据</div>
                      <div className="text-xs mt-1">先上传文档以构建知识图谱</div>
                    </div>
                  </div>
                ) : (
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    viewBox="0 0 800 500"
                    preserveAspectRatio="xMidYMid meet"
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                    onWheel={handleWheel}
                  >
                    <g transform={`translate(${graphOffset.x}, ${graphOffset.y}) scale(${graphScale})`}>
                      {/* 边 */}
                      {graphEdges.map((edge, i) => {
                        const s = graphNodes.find(n => n.id === edge.source);
                        const t = graphNodes.find(n => n.id === edge.target);
                        if (!s || !t) return null;
                        return (
                          <g key={i}>
                            <line
                              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                              stroke="#d1d5db" strokeWidth={1.5} opacity={0.6}
                            />
                            {/* 箭头 */}
                            <polygon
                              points={`0,-4 8,0 0,4`}
                              fill="#d1d5db"
                              opacity={0.6}
                              transform={`translate(${(s.x + t.x) / 2}, ${(s.y + t.y) / 2}) rotate(${Math.atan2(t.y - s.y, t.x - s.x) * 180 / Math.PI})`}
                            />
                          </g>
                        );
                      })}
                      {/* 节点 */}
                      {graphNodes.map(node => (
                        <g key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onMouseDown={e => handleNodeMouseDown(e, node.id)}
                          className="cursor-grab"
                        >
                          <circle
                            r={20}
                            fill={getEntityColor(node.entity.type)}
                            stroke="white"
                            strokeWidth={2}
                            className="drop-shadow-md"
                          />
                          <text
                            y={-28}
                            textAnchor="middle"
                            className="text-xs font-bold"
                            fill="#374151"
                            fontSize="10"
                          >
                            {node.entity.name}
                          </text>
                          <text
                            y={32}
                            textAnchor="middle"
                            fill="#6b7280"
                            fontSize="8"
                          >
                            {node.entity.type}
                          </text>
                          <title>{node.entity.name}\n类型: {node.entity.type}\n{node.entity.description || ""}</title>
                        </g>
                      ))}
                    </g>
                  </svg>
                )}
              </div>
            </div>
          )}

          {/* ===== 文档列表 ===== */}
          {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-700">📄 文档列表</h2>
                <button onClick={loadDocuments} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">🔄 刷新</button>
              </div>
              {docsLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-sm">暂无文档</div>
                  <div className="text-xs mt-1">切换到「上传」标签添加文档</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-gray-800 truncate">{doc.title || "未命名文档"}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${doc.status === "processed" ? "bg-green-100 text-green-700" : doc.status === "processing" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        <span className="mr-3">🧩 {doc.chunkCount} chunks</span>
                        <span className="mr-3">🔵 {doc.entityCount} 实体</span>
                        <span>🔗 {doc.relationCount} 关系</span>
                      </div>
                      <button
                        onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedDoc === doc.id ? "▲ 收起详情" : "▼ 查看详情"}
                      </button>
                      {expandedDoc === doc.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          {doc.entities && doc.entities.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-gray-600 mb-1">提取的实体:</div>
                              <div className="flex flex-wrap gap-1">
                                {doc.entities.map(e => (
                                  <span key={e.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: getEntityColor(e.type) }}>
                                    {e.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {doc.relations && doc.relations.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-gray-600 mb-1">提取的关系:</div>
                              <div className="space-y-1">
                                {doc.relations.map(r => (
                                  <div key={r.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                                    {r.source?.name || r.sourceId} → {r.target?.name || r.targetId}: {r.description}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {doc.chunks && doc.chunks.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-gray-600 mb-1">Chunks:</div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {doc.chunks.map(c => (
                                  <div key={c.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 truncate">
                                    {c.content}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
