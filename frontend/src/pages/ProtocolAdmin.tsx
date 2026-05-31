import React, { useState, useEffect, useMemo } from "react";
import {
 ProtocolMatrix,
 ProtocolFamily,
 fetchProtocolMatrix,
 filterMatrix,
 statusLabels,
 statusColors,
} from "../api/protocolMatrix";

const ProtocolAdmin: React.FC = () => {
 const [matrix, setMatrix] = useState<ProtocolMatrix | null>(null);
 const [loading, setLoading] = useState(true);
 const [query, setQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string[]>(["active", "beta"]);

 useEffect(() => {
 let cancelled = false;
 fetchProtocolMatrix().then((m) => {
 if (!cancelled) {
 setMatrix(m);
 setLoading(false);
 }
 });
 return () => { cancelled = true; };
 }, []);

 const filtered = useMemo(
 () => (matrix ? filterMatrix(matrix, query, statusFilter) : null),
 [matrix, query, statusFilter]
 );

 const toggleStatus = (s: string) => {
 setStatusFilter((prev) =>
 prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
 );
 };

 if (loading || !filtered) {
 return (
 <div style={styles.page}>
 <div style={styles.loading}>加载协议矩阵中...</div>
 </div>
 );
 }

 return (
 <div style={styles.page}>
 <header style={styles.header}>
 <h1 style={styles.title}>协议矩阵管理</h1>
 <div style={styles.meta}>
 最后更新: {new Date(filtered.updatedAt).toLocaleString()}
 </div>
 </header>

 <div style={styles.toolbar}>
 <input
 style={styles.search}
 type="text"
 placeholder="搜索平台 / 工具 / 端点..."
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 />
 <div style={styles.filters}>
 {(["active", "beta", "planned", "deprecated"] as const).map((s) => (
 <label key={s} style={styles.filterLabel}>
 <input
 type="checkbox"
 checked={statusFilter.includes(s)}
 onChange={() => toggleStatus(s)}
 />
 <span
 style={{
 ...styles.filterDot,
 background: statusColors[s] || "#999",
 }}
 />
 {statusLabels[s] || s}
 </label>
 ))}
 </div>
 </div>

 <div style={styles.grid}>
 {filtered.families.map((family) => (
 <FamilyCard key={family.id} family={family} />
 ))}
 </div>
 </div>
 );
};

const FamilyCard: React.FC<{ family: ProtocolFamily }> = ({ family }) => {
 const [expanded, setExpanded] = useState(true);

 return (
 <div style={{ ...styles.card, borderColor: family.color }}>
 <div
 style={{ ...styles.cardHeader, background: `${family.color}10` }}
 onClick={() => setExpanded((v) => !v)}
 >
 <div style={styles.cardTitleRow}>
 <div style={{ ...styles.cardDot, background: family.color }} />
 <h2 style={styles.cardTitle}>{family.name}</h2>
 </div>
 <span style={styles.cardToggle}>{expanded ? "▾" : "▸"}</span>
 </div>

 {expanded && (
 <div style={styles.cardBody}>
 <p style={styles.cardDesc}>{family.description}</p>

 <div style={styles.section}>
 <h3 style={styles.sectionTitle}>平台 ({family.platforms.length})</h3>
 {family.platforms.length === 0 && (
 <div style={styles.empty}>无匹配平台</div>
 )}
 <div style={styles.tagList}>
 {family.platforms.map((p) => (
 <span
 key={p.id}
 style={{
 ...styles.tag,
 borderColor: statusColors[p.status] || "#999",
 color: statusColors[p.status] || "#666",
 }}
 title={p.id}
 >
 {p.name}
 <span style={styles.tagStatus}>
 {statusLabels[p.status] || p.status}
 </span>
 </span>
 ))}
 </div>
 </div>

 <div style={styles.section}>
 <h3 style={styles.sectionTitle}>工具 ({family.tools.length})</h3>
 {family.tools.length === 0 && (
 <div style={styles.empty}>无匹配工具</div>
 )}
 <div style={styles.toolList}>
 {family.tools.map((t) => (
 <div key={t.id} style={styles.toolRow}>
 <div style={styles.toolName}>{t.name}</div>
 <div style={styles.toolMeta}>
 {t.method && (
 <span style={styles.methodBadge}>{t.method}</span>
 )}
 {t.endpoint && (
 <code style={styles.endpoint}>{t.endpoint}</code>
 )}
 <span
 style={{
 ...styles.statusBadge,
 color: statusColors[t.status] || "#666",
 borderColor: statusColors[t.status] || "#999",
 }}
 >
 {statusLabels[t.status] || t.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

// ========== 内联样式（最小依赖） ==========

const styles: Record<string, React.CSSProperties> = {
 page: {
 fontFamily:
 "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
 maxWidth: 960,
 margin: "0 auto",
 padding: "24px 16px",
 },
 header: {
 display: "flex",
 justifyContent: "space-between",
 alignItems: "baseline",
 marginBottom: 20,
 borderBottom: "1px solid #f0f0f0",
 paddingBottom: 12,
 },
 title: {
 margin: 0,
 fontSize: 22,
 fontWeight: 600,
 color: "#1f1f1f",
 },
 meta: {
 fontSize: 12,
 color: "#8c8c8c",
 },
 toolbar: {
 display: "flex",
 flexWrap: "wrap",
 gap: 12,
 marginBottom: 20,
 alignItems: "center",
 },
 search: {
 flex: 1,
 minWidth: 240,
 padding: "8px 12px",
 fontSize: 14,
 border: "1px solid #d9d9d9",
 borderRadius: 6,
 outline: "none",
 },
 filters: {
 display: "flex",
 gap: 12,
 flexWrap: "wrap",
 },
 filterLabel: {
 display: "flex",
 alignItems: "center",
 gap: 6,
 fontSize: 13,
 color: "#595959",
 cursor: "pointer",
 userSelect: "none",
 },
 filterDot: {
 width: 8,
 height: 8,
 borderRadius: "50%",
 display: "inline-block",
 },
 grid: {
 display: "flex",
 flexDirection: "column",
 gap: 16,
 },
 card: {
 border: "1px solid",
 borderRadius: 8,
 background: "#fff",
 boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
 overflow: "hidden",
 },
 cardHeader: {
 display: "flex",
 justifyContent: "space-between",
 alignItems: "center",
 padding: "12px 16px",
 cursor: "pointer",
 userSelect: "none",
 },
 cardTitleRow: {
 display: "flex",
 alignItems: "center",
 gap: 10,
 },
 cardDot: {
 width: 10,
 height: 10,
 borderRadius: "50%",
 flexShrink: 0,
 },
 cardTitle: {
 margin: 0,
 fontSize: 16,
 fontWeight: 600,
 color: "#262626",
 },
 cardToggle: {
 fontSize: 14,
 color: "#8c8c8c",
 },
 cardBody: {
 padding: "12px 16px 16px",
 },
 cardDesc: {
 margin: "0 0 14px 0",
 fontSize: 13,
 color: "#8c8c8c",
 lineHeight: 1.5,
 },
 section: {
 marginTop: 12,
 },
 sectionTitle: {
 margin: "0 0 8px 0",
 fontSize: 13,
 fontWeight: 600,
 color: "#595959",
 },
 empty: {
 fontSize: 13,
 color: "#bfbfbf",
 padding: "6px 0",
 },
 tagList: {
 display: "flex",
 flexWrap: "wrap",
 gap: 8,
 },
 tag: {
 display: "inline-flex",
 alignItems: "center",
 gap: 6,
 padding: "4px 10px",
 fontSize: 13,
 border: "1px solid",
 borderRadius: 12,
 background: "#fafafa",
 },
 tagStatus: {
 fontSize: 11,
 opacity: 0.75,
 },
 toolList: {
 display: "flex",
 flexDirection: "column",
 gap: 8,
 },
 toolRow: {
 display: "flex",
 justifyContent: "space-between",
 alignItems: "center",
 padding: "8px 10px",
 background: "#fafafa",
 borderRadius: 6,
 flexWrap: "wrap",
 gap: 8,
 },
 toolName: {
 fontSize: 13,
 fontWeight: 500,
 color: "#262626",
 },
 toolMeta: {
 display: "flex",
 alignItems: "center",
 gap: 8,
 flexWrap: "wrap",
 },
 methodBadge: {
 fontSize: 11,
 padding: "2px 6px",
 borderRadius: 4,
 background: "#e6f7ff",
 color: "#1890ff",
 fontWeight: 600,
 },
 endpoint: {
 fontSize: 12,
 color: "#8c8c8c",
 background: "#f5f5f5",
 padding: "2px 6px",
 borderRadius: 4,
 },
 statusBadge: {
 fontSize: 11,
 padding: "2px 8px",
 borderRadius: 10,
 border: "1px solid",
 },
 loading: {
 textAlign: "center",
 padding: 60,
 color: "#999",
 fontSize: 14,
 },
};

export default ProtocolAdmin;
