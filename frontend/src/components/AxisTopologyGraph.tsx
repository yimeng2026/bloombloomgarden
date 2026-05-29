import { useEffect, useRef, useState } from 'react';

interface AxisNode {
  id: string;
  label: string;
  axis: 'X' | 'Y' | 'Z';
  x: number;
  y: number;
  connections: string[];
  status: 'active' | 'idle' | 'error';
}

const MOCK_NODES: AxisNode[] = [
  // X轴 — 前端平台
  { id: 'x1', label: 'AION UI', axis: 'X', x: 100, y: 150, connections: ['y1', 'y3', 'z5'], status: 'active' },
  { id: 'x2', label: 'Open WebUI', axis: 'X', x: 80, y: 200, connections: ['y2', 'z2'], status: 'active' },
  { id: 'x3', label: 'LibreChat', axis: 'X', x: 120, y: 100, connections: ['y1', 'z1'], status: 'idle' },
  { id: 'x4', label: 'Cherry Studio', axis: 'X', x: 140, y: 250, connections: ['y4', 'z3'], status: 'active' },
  { id: 'x5', label: 'Dify', axis: 'X', x: 60, y: 300, connections: ['y5', 'z4'], status: 'active' },
  // Y轴 — 后端服务
  { id: 'y1', label: 'Ollama', axis: 'Y', x: 350, y: 120, connections: ['x1', 'x3', 'z1'], status: 'active' },
  { id: 'y2', label: 'vLLM', axis: 'Y', x: 380, y: 180, connections: ['x2', 'z2'], status: 'active' },
  { id: 'y3', label: 'OpenRouter', axis: 'Y', x: 320, y: 220, connections: ['x1', 'z5'], status: 'active' },
  { id: 'y4', label: 'LocalAI', axis: 'Y', x: 400, y: 280, connections: ['x4', 'z3'], status: 'idle' },
  { id: 'y5', label: 'TGI', axis: 'Y', x: 340, y: 340, connections: ['x5', 'z4'], status: 'error' },
  // Z轴 — 子工具
  { id: 'z1', label: 'Kimi CLI', axis: 'Z', x: 600, y: 100, connections: ['x3', 'y1'], status: 'active' },
  { id: 'z2', label: 'Claude Code', axis: 'Z', x: 650, y: 160, connections: ['x2', 'y2'], status: 'active' },
  { id: 'z3', label: 'Aider', axis: 'Z', x: 620, y: 240, connections: ['x4', 'y4'], status: 'idle' },
  { id: 'z4', label: 'Goose', axis: 'Z', x: 680, y: 300, connections: ['x5', 'y5'], status: 'active' },
  { id: 'z5', label: 'Cline', axis: 'Z', x: 580, y: 360, connections: ['x1', 'y3'], status: 'active' },
];

/**
 * AxisTopologyGraph — 3DACP 三维坐标拓扑图
 * 纯 Canvas 2D 绘制，展示 X/Y/Z 三轴节点及其互联关系
 */
export default function AxisTopologyGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let pulsePhase = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // 背景网格
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 轴线标注
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#6366f1';
      ctx.fillText('X轴 — 前端平台', 20, 30);
      ctx.fillStyle = '#8b5cf6';
      ctx.fillText('Y轴 — 后端服务', w / 2 - 50, 30);
      ctx.fillStyle = '#ec4899';
      ctx.fillText('Z轴 — 子工具', w - 120, 30);

      // 连线（带脉冲动画）
      pulsePhase += 0.02;
      MOCK_NODES.forEach(node => {
        node.connections.forEach(targetId => {
          const target = MOCK_NODES.find(n => n.id === targetId);
          if (!target) return;

          const isActive = node.status === 'active' && target.status === 'active';
          const alpha = isActive ? 0.4 + Math.sin(pulsePhase) * 0.2 : 0.1;

          ctx.strokeStyle = isActive
            ? `rgba(99, 102, 241, ${alpha})`
            : `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.setLineDash(isActive ? [] : [5, 5]);

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        });
      });
      ctx.setLineDash([]);

      // 节点
      MOCK_NODES.forEach(node => {
        const isHovered = hovered === node.id;
        const radius = isHovered ? 18 : 12;
        const colorMap = { X: '#6366f1', Y: '#8b5cf6', Z: '#ec4899' };
        const statusColor = {
          active: '#10b981',
          idle: '#f59e0b',
          error: '#ef4444',
        };

        // 外发光
        if (node.status === 'active' || isHovered) {
          ctx.shadowColor = colorMap[node.axis];
          ctx.shadowBlur = isHovered ? 20 : 12;
        }

        // 节点圆
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = colorMap[node.axis];
        ctx.globalAlpha = node.status === 'error' ? 0.5 : 0.9;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // 状态指示点
        ctx.beginPath();
        ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 4, 0, Math.PI * 2);
        ctx.fillStyle = statusColor[node.status];
        ctx.fill();

        // 标签
        ctx.font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + radius + 16);
      });

      // 活跃消息粒子
      if (activeMessage) {
        const [from, to] = activeMessage.split('->');
        const fromNode = MOCK_NODES.find(n => n.id === from);
        const toNode = MOCK_NODES.find(n => n.id === to);
        if (fromNode && toNode) {
          const t = (Math.sin(pulsePhase * 2) + 1) / 2;
          const mx = fromNode.x + (toNode.x - fromNode.x) * t;
          const my = fromNode.y + (toNode.y - fromNode.y) * t;
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [hovered, activeMessage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: string | null = null;
    MOCK_NODES.forEach(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        found = node.id;
      }
    });
    setHovered(found);
  };

  const handleClick = () => {
    if (hovered) {
      const node = MOCK_NODES.find(n => n.id === hovered);
      if (node && node.connections.length > 0) {
        const target = node.connections[Math.floor(Math.random() * node.connections.length)];
        setActiveMessage(`${hovered}->${target}`);
        setTimeout(() => setActiveMessage(null), 2000);
      }
    }
  };

  return (
    <div className="relative w-full h-[400px] bg-[#0a0a0f] rounded-xl border border-gray-800 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {hovered && (
        <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-gray-900/90 border border-gray-700 rounded-lg text-xs text-gray-300">
          {MOCK_NODES.find(n => n.id === hovered)?.label} — 点击发送测试消息
        </div>
      )}
    </div>
  );
}
