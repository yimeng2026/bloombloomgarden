"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ==================== 类型 ====================
interface OntologyProperty {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  required: boolean;
  default?: string | number | boolean;
}

interface OntologyObjectType {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  properties: OntologyProperty[];
}

interface OntologyLinkType {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  cardinality: "one-to-one" | "one-to-many" | "many-to-many";
  properties: OntologyProperty[];
}

interface OntologyRule {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface OntologySchema {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  objectTypes: OntologyObjectType[];
  linkTypes: OntologyLinkType[];
  rules: OntologyRule[];
}

interface OntologyInstance {
  id: string;
  schemaId: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

interface OntologyRelation {
  id: string;
  schemaId: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
}

interface ExtractedEntity {
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

interface ExtractResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

interface QueryResult {
  instances: OntologyInstance[];
  relations: OntologyRelation[];
}

// ==================== 颜色映射 ====================
const DEFAULT_TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  organization: "#22c55e",
  concept: "#a855f7",
  location: "#f59e0b",
  event: "#ef4444",
  product: "#06b6d4",
  technology: "#6366f1",
  default: "#6b7280",
};

function getTypeColor(type: string, schema?: OntologySchema): string {
  if (schema) {
    const ot = schema.objectTypes.find(t => t.name === type || t.label === type);
    if (ot?.color) return ot.color;
  }
  return DEFAULT_TYPE_COLORS[type.toLowerCase()] || DEFAULT_TYPE_COLORS.default;
}

// ==================== 主组件 ====================
export default function OntologyPage() {
  const [activeTab, setActiveTab] = useState<"schemas" | "editor" | "extract" | "query" | "visualize">("schemas");
  const [schemas, setSchemas] = useState<OntologySchema[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<OntologySchema | null>(null);
  const [editingSchema, setEditingSchema] = useState<OntologySchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 创建 Schema 弹窗
  const [showCreateSchema, setShowCreateSchema] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [newSchemaDesc, setNewSchemaDesc] = useState("");

  // Schema 编辑器面板
  const [editorPanel, setEditorPanel] = useState<"objects" | "links" | "rules">("objects");
  const [editingObject, setEditingObject] = useState<OntologyObjectType | null>(null);
  const [editingLink, setEditingLink] = useState<OntologyLinkType | null>(null);
  const [editingRule, setEditingRule] = useState<OntologyRule | null>(null);

  // 文档抽取
  const [extractDocText, setExtractDocText] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);

  // 查询
  const [queryText, setQueryText] = useState("");
  const [queryMode, setQueryMode] = useState<"type_filter" | "relation_traverse" | "hybrid" | "temporal">("hybrid");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // 可视化
  const [instances, setInstances] = useState<OntologyInstance[]>([]);
  const [relations, setRelations] = useState<OntologyRelation[]>([]);
  const [graphNodes, setGraphNodes] = useState<{ id: string; x: number; y: number; vx: number; vy: number; instance: OntologyInstance }[]>([]);
  const [graphEdges, setGraphEdges] = useState<{ source: string; target: string; relation: OntologyRelation }[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [graphScale, setGraphScale] = useState(1);
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // ==================== 加载 Schema 列表 ====================
  const loadSchemas = useCallback(async () => {
    setSchemasLoading(true);
    try {
      const res = await fetch("/api/ontology/schemas");
      if (res.ok) {
        const data = await res.json();
        setSchemas(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "加载 Schema 失败");
      }
    } catch (e) {
      setError("加载 Schema 请求失败");
    } finally {
      setSchemasLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemas();
  }, [loadSchemas]);

  // ==================== 创建 Schema ====================
  const handleCreateSchema = async () => {
    if (!newSchemaName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/ontology/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchemaName.trim(),
          description: newSchemaDesc.trim() || "",
          version: "1.0.0",
          status: "draft",
          objectTypes: [],
          linkTypes: [],
          rules: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchemas(prev => [data, ...prev]);
        setShowCreateSchema(false);
        setNewSchemaName("");
        setNewSchemaDesc("");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "创建 Schema 失败");
      }
    } catch (e) {
      setError("创建 Schema 请求失败");
    }
  };

  // ==================== 保存 Schema ====================
  const handleSaveSchema = async () => {
    if (!editingSchema) return;
    setError(null);
    try {
      const res = await fetch(`/api/ontology/schemas/${editingSchema.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSchema),
      });
      if (res.ok) {
        const data = await res.json();
        setSchemas(prev => prev.map(s => s.id === data.id ? data : s));
        setSelectedSchema(data);
        setEditingSchema(null);
        setActiveTab("schemas");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "保存 Schema 失败");
      }
    } catch (e) {
      setError("保存 Schema 请求失败");
    }
  };

  // ==================== 选择并编辑 Schema ====================
  const handleEditSchema = (schema: OntologySchema) => {
    setSelectedSchema(schema);
    setEditingSchema(JSON.parse(JSON.stringify(schema))); // deep copy
    setEditorPanel("objects");
    setActiveTab("editor");
  };

  // ==================== Object Type 操作 ====================
  const addObjectType = () => {
    if (!editingSchema) return;
    const newObj: OntologyObjectType = {
      id: `ot-${Date.now()}`,
      name: "",
      label: "",
      description: "",
      color: "#6b7280",
      icon: "🔹",
      properties: [],
    };
    setEditingSchema({ ...editingSchema, objectTypes: [...editingSchema.objectTypes, newObj] });
    setEditingObject(newObj);
  };

  const updateObjectType = (obj: OntologyObjectType) => {
    if (!editingSchema) return;
    setEditingSchema({
      ...editingSchema,
      objectTypes: editingSchema.objectTypes.map(o => o.id === obj.id ? obj : o),
    });
    setEditingObject(null);
  };

  const removeObjectType = (id: string) => {
    if (!editingSchema) return;
    if (!confirm("确定要删除这个 Object Type 吗？")) return;
    setEditingSchema({
      ...editingSchema,
      objectTypes: editingSchema.objectTypes.filter(o => o.id !== id),
    });
  };

  // ==================== Link Type 操作 ====================
  const addLinkType = () => {
    if (!editingSchema) return;
    const newLink: OntologyLinkType = {
      id: `lt-${Date.now()}`,
      name: "",
      sourceType: editingSchema.objectTypes[0]?.name || "",
      targetType: editingSchema.objectTypes[0]?.name || "",
      cardinality: "one-to-many",
      properties: [],
    };
    setEditingSchema({ ...editingSchema, linkTypes: [...editingSchema.linkTypes, newLink] });
    setEditingLink(newLink);
  };

  const updateLinkType = (link: OntologyLinkType) => {
    if (!editingSchema) return;
    setEditingSchema({
      ...editingSchema,
      linkTypes: editingSchema.linkTypes.map(l => l.id === link.id ? link : l),
    });
    setEditingLink(null);
  };

  const removeLinkType = (id: string) => {
    if (!editingSchema) return;
    if (!confirm("确定要删除这个 Link Type 吗？")) return;
    setEditingSchema({
      ...editingSchema,
      linkTypes: editingSchema.linkTypes.filter(l => l.id !== id),
    });
  };

  // ==================== Rule 操作 ====================
  const addRule = () => {
    if (!editingSchema) return;
    const newRule: OntologyRule = {
      id: `rule-${Date.now()}`,
      name: "",
      type: "validation",
      config: {},
    };
    setEditingSchema({ ...editingSchema, rules: [...editingSchema.rules, newRule] });
    setEditingRule(newRule);
  };

  const updateRule = (rule: OntologyRule) => {
    if (!editingSchema) return;
    setEditingSchema({
      ...editingSchema,
      rules: editingSchema.rules.map(r => r.id === rule.id ? rule : r),
    });
    setEditingRule(null);
  };

  const removeRule = (id: string) => {
    if (!editingSchema) return;
    if (!confirm("确定要删除这个 Rule 吗？")) return;
    setEditingSchema({
      ...editingSchema,
      rules: editingSchema.rules.filter(r => r.id !== id),
    });
  };

  // ==================== 文档抽取 ====================
  const handleExtract = async () => {
    if (!selectedSchema || !extractDocText.trim()) return;
    setExtractLoading(true);
    setExtractResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ontology/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaId: selectedSchema.id,
          text: extractDocText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtractResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "抽取失败");
      }
    } catch (e) {
      setError("抽取请求失败");
    } finally {
      setExtractLoading(false);
    }
  };

  // ==================== 查询 ====================
  const handleQuery = async () => {
    if (!selectedSchema || !queryText.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ontology/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaId: selectedSchema.id,
          query: queryText.trim(),
          mode: queryMode,
        }),
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
      setQueryLoading(false);
    }
  };

  // ==================== 可视化数据加载 ====================
  const loadVisualData = useCallback(async () => {
    if (!selectedSchema) return;
    setGraphLoading(true);
    try {
      const [instRes, relRes] = await Promise.all([
        fetch(`/api/ontology/instances?schemaId=${selectedSchema.id}`),
        fetch(`/api/ontology/relations?schemaId=${selectedSchema.id}`),
      ]);
      let instData: OntologyInstance[] = [];
      let relData: OntologyRelation[] = [];
      if (instRes.ok) instData = await instRes.json();
      if (relRes.ok) relData = await relRes.json();
      setInstances(instData);
      setRelations(relData);
      const nodes = instData.map((inst, i) => ({
        id: inst.id,
        x: 400 + Math.cos((i / Math.max(instData.length, 1)) * 2 * Math.PI) * 200,
        y: 250 + Math.sin((i / Math.max(instData.length, 1)) * 2 * Math.PI) * 200,
        vx: 0,
        vy: 0,
        instance: inst,
      }));
      const edges = relData.map(r => ({
        source: r.sourceId,
        target: r.targetId,
        relation: r,
      }));
      setGraphNodes(nodes);
      setGraphEdges(edges);
    } catch (e) {
      setError("加载可视化数据失败");
    } finally {
      setGraphLoading(false);
    }
  }, [selectedSchema]);

  useEffect(() => {
    if (activeTab === "visualize" && selectedSchema) {
      loadVisualData();
    }
  }, [activeTab, selectedSchema, loadVisualData]);

  // ==================== 力导向图模拟 ====================
  useEffect(() => {
    if (activeTab !== "visualize" || graphNodes.length === 0) return;
    const sim = () => {
      setGraphNodes(prev => {
        const nodes = prev.map(n => ({ ...n, vx: n.vx * 0.85, vy: n.vy * 0.85 }));
        const width = 800;
        const height = 500;
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
        for (const n of nodes) {
          const dx = width / 2 - n.x;
          const dy = height / 2 - n.y;
          n.vx += dx * 0.0005;
          n.vy += dy * 0.0005;
        }
        for (const n of nodes) {
          if (draggingNode === n.id) continue;
          n.x += n.vx;
          n.y += n.vy;
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
          { t: "schemas" as const, icon: "📋", tip: "Schema 列表" },
          { t: "editor" as const, icon: "🧬", tip: "Schema 编辑器" },
          { t: "extract" as const, icon: "📤", tip: "文档抽取" },
          { t: "query" as const, icon: "🔍", tip: "查询" },
          { t: "visualize" as const, icon: "🕸️", tip: "可视化" },
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
          <h1 className="text-xl font-bold text-gray-800">🧬 Ontology 编辑器 — 本体管理</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Ontology 就绪</span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-200 flex items-center justify-between">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Schema 选择器（全局） */}
        {(activeTab === "extract" || activeTab === "query" || activeTab === "visualize") && (
          <div className="px-4 py-2 bg-white border-b flex items-center gap-3">
            <span className="text-sm text-gray-600">Schema:</span>
            <select
              value={selectedSchema?.id || ""}
              onChange={e => {
                const s = schemas.find(sch => sch.id === e.target.value);
                setSelectedSchema(s || null);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">请选择 Schema</option>
              {schemas.map(s => (
                <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>
              ))}
            </select>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ===== Schema 列表 ===== */}
          {activeTab === "schemas" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-700">📋 Schema 列表</h2>
                <button onClick={() => setShowCreateSchema(true)} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg">
                  + 创建 Schema
                </button>
              </div>
              {schemasLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : schemas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm">暂无 Schema</div>
                  <div className="text-xs mt-1">点击「创建 Schema」添加第一个本体</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {schemas.map(schema => (
                    <div key={schema.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-purple-200 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-gray-800">{schema.name}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${schema.status === "published" ? "bg-green-100 text-green-700" : schema.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                          {schema.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">{schema.description || "暂无描述"}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span>v{schema.version}</span>
                        <span>🧩 {schema.objectTypes.length} 类型</span>
                        <span>🔗 {schema.linkTypes.length} 关系</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSchema(schema)} className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-400">编辑</button>
                        <button onClick={() => { setSelectedSchema(schema); setActiveTab("extract"); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">📤</button>
                        <button onClick={() => { setSelectedSchema(schema); setActiveTab("query"); }} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs hover:bg-amber-100">🔍</button>
                        <button onClick={() => { setSelectedSchema(schema); setActiveTab("visualize"); }} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs hover:bg-green-100">🕸️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Schema 编辑器 ===== */}
          {activeTab === "editor" && editingSchema && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-700">🧬 编辑 Schema: {editingSchema.name}</h2>
                  <div className="text-xs text-gray-400">v{editingSchema.version} · {editingSchema.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab("schemas")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">← 返回</button>
                  <button onClick={handleSaveSchema} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg">💾 保存 Schema</button>
                </div>
              </div>

              {/* 编辑器面板切换 */}
              <div className="flex gap-2 border-b border-gray-200">
                {[
                  { p: "objects" as const, label: "Object Types", icon: "🧩" },
                  { p: "links" as const, label: "Link Types", icon: "🔗" },
                  { p: "rules" as const, label: "Rules", icon: "📏" },
                ].map(item => (
                  <button key={item.p} onClick={() => setEditorPanel(item.p)}
                    className={`px-4 py-2 text-sm font-medium transition ${editorPanel === item.p ? "text-purple-600 border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-700"}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>

              {/* Object Types 面板 */}
              {editorPanel === "objects" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Object Types ({editingSchema.objectTypes.length})</h3>
                    <button onClick={addObjectType} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-400">+ 添加类型</button>
                  </div>
                  {editingSchema.objectTypes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">🧩</div>
                      <div className="text-sm">暂无 Object Type</div>
                      <div className="text-xs mt-1">点击「添加类型」创建</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {editingSchema.objectTypes.map(obj => (
                        <div key={obj.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{obj.icon}</span>
                              <div className="font-bold text-gray-800">{obj.name || "（未命名）"}</div>
                              <span className="text-xs text-gray-400">{obj.label}</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingObject(obj)} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">编辑</button>
                              <button onClick={() => removeObjectType(obj.id)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100">删除</button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">{obj.description || "无描述"}</div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">颜色:</span>
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: obj.color }}></span>
                          </div>
                          <div className="text-xs text-gray-400">{obj.properties.length} 个属性</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Link Types 面板 */}
              {editorPanel === "links" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Link Types ({editingSchema.linkTypes.length})</h3>
                    <button onClick={addLinkType} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-400">+ 添加链接</button>
                  </div>
                  {editingSchema.linkTypes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">🔗</div>
                      <div className="text-sm">暂无 Link Type</div>
                      <div className="text-xs mt-1">点击「添加链接」创建</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {editingSchema.linkTypes.map(link => (
                        <div key={link.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-gray-800">{link.name || "（未命名）"}</div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingLink(link)} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">编辑</button>
                              <button onClick={() => removeLinkType(link.id)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100">删除</button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{link.sourceType}</span>
                            <span className="mx-1">→</span>
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full">{link.targetType}</span>
                            <span className="ml-2 text-gray-400">{link.cardinality}</span>
                          </div>
                          <div className="text-xs text-gray-400">{link.properties.length} 个属性</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rules 面板 */}
              {editorPanel === "rules" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Rules ({editingSchema.rules.length})</h3>
                    <button onClick={addRule} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-400">+ 添加规则</button>
                  </div>
                  {editingSchema.rules.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">📏</div>
                      <div className="text-sm">暂无 Rule</div>
                      <div className="text-xs mt-1">点击「添加规则」创建</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {editingSchema.rules.map(rule => (
                        <div key={rule.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-gray-800">{rule.name || "（未命名）"}</div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingRule(rule)} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">编辑</button>
                              <button onClick={() => removeRule(rule.id)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100">删除</button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">类型: {rule.type}</div>
                          <div className="text-xs text-gray-400 mt-1">{Object.keys(rule.config).length} 个配置项</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== 文档抽取 ===== */}
          {activeTab === "extract" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-700 mb-4">📤 按 Ontology 抽取</h2>
                {!selectedSchema ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-sm">请先选择一个 Schema</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-500 bg-purple-50 rounded-lg p-2">
                      当前 Schema: <span className="font-bold text-purple-700">{selectedSchema.name}</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">文档内容</label>
                      <textarea
                        value={extractDocText}
                        onChange={e => setExtractDocText(e.target.value)}
                        placeholder="粘贴文档内容..."
                        rows={10}
                        className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <button
                      onClick={handleExtract}
                      disabled={extractLoading || !extractDocText.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {extractLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          抽取中...
                        </>
                      ) : (
                        <>📤 按 Ontology 抽取</>
                      )}
                    </button>
                  </div>
                )}
              </div>
              {extractResult && (
                <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">🔵 抽取的实体 ({extractResult.entities.length})</h3>
                    {extractResult.entities.length === 0 ? (
                      <div className="text-xs text-gray-400">未抽取到实体</div>
                    ) : (
                      <div className="space-y-2">
                        {extractResult.entities.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: getTypeColor(e.type, selectedSchema || undefined) }}>
                              {e.type}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{e.name}</span>
                            <span className="text-xs text-gray-400">{Object.entries(e.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 抽取的关系 ({extractResult.relations.length})</h3>
                    {extractResult.relations.length === 0 ? (
                      <div className="text-xs text-gray-400">未抽取到关系</div>
                    ) : (
                      <div className="space-y-1">
                        {extractResult.relations.map((r, i) => (
                          <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="font-medium text-gray-700">{r.source}</span>
                            <span className="mx-1 text-purple-500">→</span>
                            <span className="font-medium text-gray-700">{r.target}</span>
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">{r.type}</span>
                            <span className="ml-2 text-gray-400">{Object.entries(r.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 查询 ===== */}
          {activeTab === "query" && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-700 mb-4">🔍 Ontology 查询</h2>
                {!selectedSchema ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-sm">请先选择一个 Schema</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-500 bg-purple-50 rounded-lg p-2">
                      当前 Schema: <span className="font-bold text-purple-700">{selectedSchema.name}</span>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {(["type_filter", "relation_traverse", "hybrid", "temporal"] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setQueryMode(mode)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${queryMode === mode ? "bg-purple-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          {mode === "type_filter" ? "🧩 Type Filter" : mode === "relation_traverse" ? "🔗 Relation" : mode === "hybrid" ? "🔀 Hybrid" : "⏰ Temporal"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={queryText}
                        onChange={e => setQueryText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuery(); } }}
                        placeholder="输入查询..."
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        onClick={handleQuery}
                        disabled={queryLoading || !queryText.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40 flex items-center gap-2"
                      >
                        {queryLoading ? (
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
                )}
              </div>
              {queryResult && (
                <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">🔵 实例 ({queryResult.instances.length})</h3>
                    {queryResult.instances.length === 0 ? (
                      <div className="text-xs text-gray-400">未找到实例</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {queryResult.instances.map(inst => (
                          <div key={inst.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: getTypeColor(inst.type, selectedSchema || undefined) }}>
                                {inst.type}
                              </span>
                              <span className="text-sm font-medium text-gray-700">{inst.name}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {Object.entries(inst.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {queryResult.relations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2">🔗 关系 ({queryResult.relations.length})</h3>
                      <div className="space-y-1">
                        {queryResult.relations.map(r => (
                          <div key={r.id} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="font-medium text-gray-700">{r.sourceId}</span>
                            <span className="mx-1 text-purple-500">→</span>
                            <span className="font-medium text-gray-700">{r.targetId}</span>
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">{r.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== 可视化 ===== */}
          {activeTab === "visualize" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-700">🕸️ 可视化</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{instances.length} 实例 · {relations.length} 关系</span>
                    <button onClick={() => { setGraphScale(1); setGraphOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">⟲ 重置</button>
                    <button onClick={loadVisualData} className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">🔄 刷新</button>
                  </div>
                </div>
                {instances.length > 100 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm mb-2">
                    ⚠️ 实例过多（{instances.length} 个），请使用查询过滤
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mb-2">
                  {selectedSchema?.objectTypes.map(ot => (
                    <span key={ot.id} className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ot.color }}></span>
                      {ot.label || ot.name}
                    </span>
                  ))}
                </div>
              </div>
              <div ref={graphContainerRef} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: "500px" }}>
                {graphLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
                      <div className="text-sm">加载可视化数据...</div>
                    </div>
                  </div>
                ) : instances.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🕸️</div>
                      <div className="text-sm">暂无实例数据</div>
                      <div className="text-xs mt-1">先进行文档抽取或查询</div>
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
                            <polygon
                              points="0,-4 8,0 0,4"
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
                            fill={getTypeColor(node.instance.type, selectedSchema || undefined)}
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
                            {node.instance.name}
                          </text>
                          <text
                            y={32}
                            textAnchor="middle"
                            fill="#6b7280"
                            fontSize="8"
                          >
                            {node.instance.type}
                          </text>
                          <title>{node.instance.name}\n类型: {node.instance.type}</title>
                        </g>
                      ))}
                    </g>
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== 创建 Schema 弹窗 ===== */}
      {showCreateSchema && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📋 创建 Schema</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">名称</label>
                <input
                  value={newSchemaName}
                  onChange={e => setNewSchemaName(e.target.value)}
                  placeholder="Schema 名称..."
                  className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">描述</label>
                <textarea
                  value={newSchemaDesc}
                  onChange={e => setNewSchemaDesc(e.target.value)}
                  placeholder="描述..."
                  rows={3}
                  className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreateSchema(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">取消</button>
              <button onClick={handleCreateSchema} disabled={!newSchemaName.trim()} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Object Type 编辑弹窗 ===== */}
      {editingObject && editingSchema && (
        <ObjectTypeEditorModal
          obj={editingObject}
          onSave={updateObjectType}
          onClose={() => setEditingObject(null)}
        />
      )}

      {/* ===== Link Type 编辑弹窗 ===== */}
      {editingLink && editingSchema && (
        <LinkTypeEditorModal
          link={editingLink}
          objectTypes={editingSchema.objectTypes}
          onSave={updateLinkType}
          onClose={() => setEditingLink(null)}
        />
      )}

      {/* ===== Rule 编辑弹窗 ===== */}
      {editingRule && editingSchema && (
        <RuleEditorModal
          rule={editingRule}
          onSave={updateRule}
          onClose={() => setEditingRule(null)}
        />
      )}
    </div>
  );
}

// ==================== Object Type 编辑弹窗 ====================
function ObjectTypeEditorModal({ obj, onSave, onClose }: {
  obj: OntologyObjectType;
  onSave: (obj: OntologyObjectType) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(obj.name);
  const [label, setLabel] = useState(obj.label);
  const [description, setDescription] = useState(obj.description);
  const [color, setColor] = useState(obj.color);
  const [icon, setIcon] = useState(obj.icon);
  const [properties, setProperties] = useState<OntologyProperty[]>(obj.properties);

  const handleAddProperty = () => {
    setProperties([...properties, { name: "", type: "string", required: false }]);
  };

  const handleUpdateProperty = (idx: number, prop: OntologyProperty) => {
    setProperties(properties.map((p, i) => i === idx ? prop : p));
  };

  const handleRemoveProperty = (idx: number) => {
    setProperties(properties.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ ...obj, name, label, description, color, icon, properties });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🧩 编辑 Object Type</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">名称</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="唯一标识名" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">标签</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="显示标签" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述..." rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">颜色</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200" />
                <input value={color} onChange={e => setColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">图标</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="emoji" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">属性 ({properties.length})</label>
              <button onClick={handleAddProperty} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100">+ 添加</button>
            </div>
            <div className="space-y-2">
              {properties.map((prop, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <input
                    value={prop.name}
                    onChange={e => handleUpdateProperty(idx, { ...prop, name: e.target.value })}
                    placeholder="属性名"
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <select
                    value={prop.type}
                    onChange={e => handleUpdateProperty(idx, { ...prop, type: e.target.value as OntologyProperty["type"] })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={prop.required}
                      onChange={e => handleUpdateProperty(idx, { ...prop, required: e.target.checked })}
                    />
                    required
                  </label>
                  <button onClick={() => handleRemoveProperty(idx)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">取消</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg">保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== Link Type 编辑弹窗 ====================
function LinkTypeEditorModal({ link, objectTypes, onSave, onClose }: {
  link: OntologyLinkType;
  objectTypes: OntologyObjectType[];
  onSave: (link: OntologyLinkType) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(link.name);
  const [sourceType, setSourceType] = useState(link.sourceType);
  const [targetType, setTargetType] = useState(link.targetType);
  const [cardinality, setCardinality] = useState(link.cardinality);
  const [properties, setProperties] = useState<OntologyProperty[]>(link.properties);

  const handleAddProperty = () => {
    setProperties([...properties, { name: "", type: "string", required: false }]);
  };

  const handleUpdateProperty = (idx: number, prop: OntologyProperty) => {
    setProperties(properties.map((p, i) => i === idx ? prop : p));
  };

  const handleRemoveProperty = (idx: number) => {
    setProperties(properties.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ ...link, name, sourceType, targetType, cardinality, properties });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔗 编辑 Link Type</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="唯一标识名" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">源类型</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">请选择</option>
                {objectTypes.map(ot => (
                  <option key={ot.id} value={ot.name}>{ot.label || ot.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">目标类型</label>
              <select value={targetType} onChange={e => setTargetType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">请选择</option>
                {objectTypes.map(ot => (
                  <option key={ot.id} value={ot.name}>{ot.label || ot.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">基数</label>
            <select value={cardinality} onChange={e => setCardinality(e.target.value as OntologyLinkType["cardinality"])} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
              <option value="one-to-one">one-to-one</option>
              <option value="one-to-many">one-to-many</option>
              <option value="many-to-many">many-to-many</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">属性 ({properties.length})</label>
              <button onClick={handleAddProperty} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100">+ 添加</button>
            </div>
            <div className="space-y-2">
              {properties.map((prop, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <input
                    value={prop.name}
                    onChange={e => handleUpdateProperty(idx, { ...prop, name: e.target.value })}
                    placeholder="属性名"
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <select
                    value={prop.type}
                    onChange={e => handleUpdateProperty(idx, { ...prop, type: e.target.value as OntologyProperty["type"] })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={prop.required}
                      onChange={e => handleUpdateProperty(idx, { ...prop, required: e.target.checked })}
                    />
                    required
                  </label>
                  <button onClick={() => handleRemoveProperty(idx)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">取消</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg">保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== Rule 编辑弹窗 ====================
function RuleEditorModal({ rule, onSave, onClose }: {
  rule: OntologyRule;
  onSave: (rule: OntologyRule) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule.name);
  const [type, setType] = useState(rule.type);
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    Object.entries(rule.config).forEach(([k, v]) => {
      result[k] = typeof v === "string" ? v : JSON.stringify(v);
    });
    return result;
  });

  const handleAddConfig = () => {
    setConfig({ ...config, "": "" });
  };

  const handleUpdateConfig = (oldKey: string, newKey: string, value: string) => {
    const newConfig = { ...config };
    delete newConfig[oldKey];
    newConfig[newKey] = value;
    setConfig(newConfig);
  };

  const handleRemoveConfig = (key: string) => {
    const newConfig = { ...config };
    delete newConfig[key];
    setConfig(newConfig);
  };

  const handleSave = () => {
    const parsedConfig: Record<string, unknown> = {};
    Object.entries(config).forEach(([k, v]) => {
      try { parsedConfig[k] = JSON.parse(v); } catch { parsedConfig[k] = v; }
    });
    onSave({ ...rule, name, type, config: parsedConfig });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[450px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📏 编辑 Rule</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="规则名称" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">类型</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
              <option value="validation">validation</option>
              <option value="inference">inference</option>
              <option value="constraint">constraint</option>
              <option value="transformation">transformation</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">配置 ({Object.keys(config).length})</label>
              <button onClick={handleAddConfig} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100">+ 添加</button>
            </div>
            <div className="space-y-2">
              {Object.entries(config).map(([key, value], idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <input
                    value={key}
                    onChange={e => handleUpdateConfig(key, e.target.value, value)}
                    placeholder="键"
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <input
                    value={value}
                    onChange={e => handleUpdateConfig(key, key, e.target.value)}
                    placeholder="值"
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button onClick={() => handleRemoveConfig(key)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">取消</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg">保存</button>
        </div>
      </div>
    </div>
  );
}
