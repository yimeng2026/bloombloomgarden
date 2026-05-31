import React, { useState, useEffect, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type ProtocolFamilyId = "mcp" | "acp" | "ogp" | "openai-compatible";

export interface PlatformRef {
 id: string;
 name: string;
 status: "active" | "beta" | "planned" | "deprecated";
}

export interface ToolRef {
 id: string;
 name: string;
 endpoint?: string;
 method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "SSE" | "WS";
 status: "active" | "beta" | "planned";
}

export interface ProtocolFamily {
 id: ProtocolFamilyId;
 name: string;
 description: string;
 color: string;
 platforms: PlatformRef[];
 tools: ToolRef[];
}

export interface ProtocolMatrix {
 families: ProtocolFamily[];
 updatedAt: string;
}

// ---------------------------------------------------------------------------
// 默认矩阵骨架（后端数据未就绪时的兜底）
// ---------------------------------------------------------------------------

export const DEFAULT_MATRIX: ProtocolMatrix = {
 families: [
 {
 id: "mcp",
 name: "MCP 族",
 description: "Model Context Protocol — 上下文管理与多轮对话协议",
 color: "#1677ff",
 platforms: [
 { id: "openai", name: "OpenAI", status: "active" },
 { id: "claude", name: "Claude (Anthropic)", status: "active" },
 { id: "kimi", name: "Kimi (Moonshot)", status: "active" },
 ],
 tools: [
 { id: "chat", name: "Chat Completion", endpoint: "/api/platforms/:id/chat", method: "POST", status: "active" },
 { id: "embeddings", name: "Embeddings", endpoint: "/api/platforms/:id/embeddings", method: "POST", status: "planned" },
 { id: "function-call", name: "Function Call", endpoint: "/api/platforms/:id/chat", method: "POST", status: "active" },
 { id: "vision", name: "Vision", endpoint: "/api/platforms/:id/chat", method: "POST", status: "active" },
 ],
 },
 {
 id: "acp",
 name: "ACP 族",
 description: "Agent Collaboration Protocol — 智能体协作与编排协议",
 color: "#52c41a",
 platforms: [
 { id: "openclaw", name: "OpenClaw", status: "active" },
 { id: "hermes", name: "Hermes", status: "beta" },
 ],
 tools: [
 { id: "agent-dispatch", name: "Agent Dispatch", endpoint: "/api/agents", method: "POST", status: "active" },
 { id: "task-orchestrate", name: "Task Orchestrate", endpoint: "/api/blueprints", method: "POST", status: "active" },
 { id: "handoff", name: "Handoff", endpoint: "/api/handoff", method: "POST", status: "active" },
 { id: "broadcast", name: "Broadcast", endpoint: "/api/coordinator/broadcast", method: "POST", status: "beta" },
 ],
 },
 {
 id: "ogp",
 name: "OGP 族",
 description: "Open Gateway Protocol — 开放网关与本地代理协议",
 color: "#faad14",
 platforms: [
 { id: "ollama", name: "Ollama (Local)", status: "active" },
 { id: "openclaw", name: "OpenClaw", status: "active" },
 ],
 tools: [
 { id: "local-model", name: "Local Model List", endpoint: "/api/platforms/:id/models", method: "GET", status: "active" },
 { id: "gateway-proxy", name: "Gateway Proxy", endpoint: "/api", method: "POST", status: "active" },
 { id: "health-check", name: "Health Check", endpoint: "/api/health", method: "GET", status: "active" },
 ],
 },
 {
 id: "openai-compatible",
 name: "OpenAI 兼容族",
 description: "OpenAI-compatible API — 通用兼容层",
 color: "#722ed1",
 platforms: [
 { id: "openai", name: "OpenAI", status: "active" },
 { id: "kimi", name: "Kimi (Moonshot)", status: "active" },
 { id: "ollama", name: "Ollama", status: "active" },
 { id: "hermes", name: "Hermes", status: "beta" },
 ],
 tools: [
 { id: "chat-completion", name: "Chat Completion", endpoint: "/v1/chat/completions", method: "POST", status: "active" },
 { id: "streaming", name: "Streaming SSE", endpoint: "/v1/chat/completions", method: "SSE", status: "active" },
 { id: "model-list", name: "Model List", endpoint: "/v1/models", method: "GET", status: "active" },
 ],
 },
 ],
 updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// API 调用层
// ---------------------------------------------------------------------------

const API_BASE = typeof window !== "undefined"
 ? (window as any).__API_BASE__ || ""
 : "";

/** 从后端拉取平台列表，与骨架融合 */
export async function fetchProtocolMatrix(): Promise<ProtocolMatrix> {
 try {
 const res = await fetch(`${API_BASE}/api/platforms`);
 if (!res.ok) throw new Error(`platforms fetch failed: ${res.status}`);
 const { platforms } = await res.json();

 // 将后端平台数据注入骨架，标记状态
 const matrix = JSON.parse(JSON.stringify(DEFAULT_MATRIX)) as ProtocolMatrix;
 const backendPlatformIds = new Set((platforms as any[]).map((p) => p.provider || p.id));

 for (const family of matrix.families) {
 for (const platform of family.platforms) {
 const matched = (platforms as any[]).find(
 (p) => p.provider === platform.id || p.id === platform.id
 );
 if (matched) {
 platform.status = matched.status === "inactive" ? "deprecated" : "active";
 } else {
 // 后端未注册该平台，标记为 planned
 platform.status = "planned";
 }
 }
 }

 matrix.updatedAt = new Date().toISOString();
 return matrix;
 } catch {
 // 兜底：返回默认骨架
 return { ...DEFAULT_MATRIX, updatedAt: new Date().toISOString() };
 }
}

/** 搜索过滤工具 */
export function filterMatrix(
 matrix: ProtocolMatrix,
 query: string,
 statusFilter: string[]
): ProtocolMatrix {
 const q = query.trim().toLowerCase();
 if (!q && statusFilter.length === 0) return matrix;

 return {
 ...matrix,
 families: matrix.families
 .map((family) => {
 const platforms = family.platforms.filter(
 (p) =>
 (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
 (statusFilter.length === 0 || statusFilter.includes(p.status))
 );
 const tools = family.tools.filter(
 (t) =>
 (!q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) &&
 (statusFilter.length === 0 || statusFilter.includes(t.status))
 );
 // 如果 family 下没有任何平台或工具匹配，仍然保留 family 卡片但显示为空列表
 return { ...family, platforms, tools };
 })
 .filter(
 (family) =>
 // 当搜索非空时，至少要有匹配的平台或工具才显示
 !q || family.platforms.length > 0 || family.tools.length > 0
 ),
 };
}

/** 状态标签映射 */
export const statusLabels: Record<string, string> = {
 active: "已接入",
 beta: "测试中",
 planned: "规划中",
 deprecated: "已停用",
};

export const statusColors: Record<string, string> = {
 active: "#52c41a",
 beta: "#faad14",
 planned: "#bfbfbf",
 deprecated: "#ff4d4f",
};
