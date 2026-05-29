import React from 'react'
import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { monitorAgents, monitorEdges } from './mockData';

const avatarMap: Record<string, string> = {
  leaf: '\u{1F343}', flower: '\u{1F33C}', tree: '\u{1F332}', fern: '\u{1F33F}',
  mushroom: '\u{1F344}', vine: '\u{1F340}', seed: '\u{1F331}', petal: '\u{1F33A}',
};

const statusColorMap: Record<string, string> = {
  active: 'var(--bloom-mint)',
  idle: 'var(--sage-400)',
  handoff: 'var(--bloom-amber)',
  error: 'var(--bloom-rose)',
  paused: 'var(--bloom-amber)',
};

const statusGlowMap: Record<string, string> = {
  active: '0 0 12px rgba(127,184,159,0.5)',
  idle: 'none',
  handoff: '0 0 12px rgba(212,163,115,0.4)',
  error: '0 0 12px rgba(201,123,132,0.5)',
  paused: '0 0 8px rgba(212,163,115,0.3)',
};

function AgentNode({ data }: { data: Record<string, unknown> }) {
  const name = data.name as string;
  const status = data.status as string;
  const platform = data.platform as string;
  const progress = data.progress as number;
  const avatar = data.avatar as string;
  const type = data.type as string;
  const currentTask = data.currentTask as string;

  const borderColor = statusColorMap[status] || 'var(--sage-400)';
  const boxShadow = statusGlowMap[status] || 'none';
  const isRoot = type === 'root';
  const isTask = type === 'task';

  return (
    <div
      style={{
        width: isRoot ? 200 : isTask ? 140 : 170,
        padding: isRoot ? '14px' : isTask ? '10px' : '12px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, var(--dark-elevated) 0%, rgba(45,53,40,0.95) 100%)',
        border: `${isRoot ? 3 : 2}px solid ${borderColor}`,
        boxShadow,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: isRoot ? 40 : 32,
            height: isRoot ? 40 : 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isRoot ? 20 : 16,
            background: 'var(--dark-surface)',
            border: `2px solid ${borderColor}`,
            flexShrink: 0,
          }}
        >
          {avatarMap[avatar] || '\u{1F343}'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: isRoot ? 14 : 12,
              fontWeight: 700,
              color: 'var(--dark-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: 'var(--font-display)',
            }}
          >
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span
              className={status === 'active' ? 'status-dot-pulse' : ''}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: borderColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: 'var(--sage-400)',
                fontWeight: 600,
              }}
            >
              {platform}
            </span>
          </div>
        </div>
      </div>

      {!isTask && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--sage-400)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 6,
            paddingLeft: 2,
          }}
        >
          {currentTask}
        </div>
      )}

      {status === 'active' && (
        <div
          style={{
            width: '100%',
            height: 5,
            borderRadius: 3,
            background: 'var(--dark-surface)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(90deg, var(--bloom-mint), #5b9a6d)',
              transition: 'width 0.8s var(--ease-gentle)',
            }}
          />
        </div>
      )}

      {isRoot && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--bloom-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            boxShadow: '0 0 8px rgba(201,169,110,0.5)',
          }}
        >
          \u2605
        </div>
      )}
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

export default function TopologyView() {
  const initialNodes: Node[] = useMemo(() =>
    monitorAgents.map((agent) => ({
      id: agent.id,
      type: 'agentNode',
      position: agent.position,
      data: {
        name: agent.name,
        status: agent.status,
        platform: agent.platform,
        progress: agent.progress,
        avatar: agent.avatar,
        type: agent.type,
        currentTask: agent.currentTask,
      },
    })), []);

  const initialEdges: Edge[] = useMemo(() =>
    monitorEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: edge.status === 'active',
      style: {
        stroke: edge.status === 'active' ? 'var(--bloom-mint)' : edge.status === 'error' ? 'var(--bloom-rose)' : edge.status === 'pending' ? 'var(--bloom-amber)' : 'var(--sage-400)',
        strokeWidth: edge.status === 'active' ? 2.5 : 2,
        strokeDasharray: edge.status === 'pending' ? '6 3' : 'none',
      },
      labelStyle: {
        fill: 'var(--sage-400)',
        fontSize: 11,
        fontWeight: 600,
      },
    })), []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const connectionMode = 'loose' as const;

  const onConnect = useCallback(() => {
    // Intentionally empty — connections are predefined
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 560, position: 'relative' }}>
      {/* Hexagonal grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 0 L56 16 L56 50 L28 66 L0 50 L0 16 Z' fill='none' stroke='%23b5bda8' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 66px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        style={{ zIndex: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="var(--sage-400)"
          gap={24}
          size={1}
          style={{ opacity: 0.08 }}
        />
        <Controls
          style={{
            background: 'var(--dark-elevated)',
            border: '1px solid var(--dark-border)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const s = node.data?.status as string;
            return statusColorMap[s] || 'var(--sage-400)';
          }}
          style={{
            background: 'var(--dark-elevated)',
            border: '1px solid var(--dark-border)',
            borderRadius: 8,
          }}
          maskColor="rgba(26, 31, 24, 0.7)"
        />
      </ReactFlow>

      {/* Status legend */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(35, 42, 33, 0.85)',
          borderRadius: 10,
          padding: '12px 16px',
          border: '1px solid var(--dark-border)',
          zIndex: 5,
          minWidth: 140,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage-300)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          图例
        </div>
        {[
          { label: '运行中', color: 'var(--bloom-mint)' },
          { label: '空闲', color: 'var(--sage-400)' },
          { label: '交接中', color: 'var(--bloom-amber)' },
          { label: '错误', color: 'var(--bloom-rose)' },
          { label: '暂停', color: 'var(--bloom-amber)' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--sage-300)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

