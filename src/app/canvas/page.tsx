"use client";

import { useState, useRef, useEffect } from "react";
import { Network, RefreshCw, Plus, Move } from "lucide-react";
import { Header } from "@/components/layout";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "agent" | "group";
  color: string;
}

interface Edge {
  from: string;
  to: string;
}

const initialNodes: Node[] = [
  { id: "a1", x: 100, y: 100, label: "Agent A", type: "agent", color: "#3b82f6" },
  { id: "a2", x: 300, y: 100, label: "Agent B", type: "agent", color: "#8b5cf6" },
  { id: "a3", x: 200, y: 250, label: "Agent C", type: "agent", color: "#10b981" },
  { id: "g1", x: 450, y: 180, label: "Group 1", type: "group", color: "#f59e0b" },
];

const initialEdges: Edge[] = [
  { from: "a1", to: "g1" },
  { from: "a2", to: "g1" },
  { from: "a3", to: "g1" },
];

export default function CanvasPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setNodes((prev) =>
      prev.map((n) => (n.id === dragging ? { ...n, x, y } : n))
    );
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="编排画布" subtitle="拖拽节点，编排智能体协作流程" />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {nodes.length} 节点 · {edges.length} 连接
            </span>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs hover:bg-slate-100">
              <RefreshCw className="w-3.5 h-3.5" />
              重排
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600">
              <Plus className="w-3.5 h-3.5" />
              添加节点
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-slate-50"
          style={{
            backgroundImage:
              "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge, i) => {
              const from = nodes.find((n) => n.id === edge.from);
              const to = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={i}
                  x1={from.x + 40}
                  y1={from.y + 40}
                  x2={to.x + 40}
                  y2={to.y + 40}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              <div
                className="w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 shadow-sm bg-white"
                style={{ borderColor: node.color + "40" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
                  style={{ backgroundColor: node.color + "15" }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center px-1">
                  {node.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
