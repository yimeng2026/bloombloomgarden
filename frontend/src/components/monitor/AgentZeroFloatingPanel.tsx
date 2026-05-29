import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { Shield, Pause, Play, Square, ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentZeroFloatingPanelProps {
  autonomyLevel: number;
}

const autonomyLabels = ['全人工', '审批模式', '观察模式', '报告模式', '自主模式', '完全自主'];
const autonomyColors = ['#b85c5c', '#c97b84', '#d4a373', '#c9a96e', '#7fb89f', '#5b9a6d'];

export default function AgentZeroFloatingPanel({ autonomyLevel }: AgentZeroFloatingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: posStart.current.x + (e.clientX - dragStart.current.x),
        y: posStart.current.y + (e.clientY - dragStart.current.y),
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isVisible) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed z-40 flex items-center justify-center w-10 h-10 rounded-full shadow-lg"
        style={{
          bottom: 20,
          right: 20,
          background: 'var(--bloom-mint)',
          color: '#fff',
        }}
        onClick={() => setIsVisible(true)}
      >
        <Shield size={18} />
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed z-40 rounded-xl overflow-hidden"
      style={{
        bottom: 20 - position.y,
        right: 20 + position.x,
        width: isExpanded ? 320 : 280,
        background: 'var(--dark-elevated)',
        border: '1px solid var(--dark-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 select-none"
        style={{ background: 'var(--dark-surface)', borderBottom: '1px solid var(--dark-border)' }}
        onMouseDown={handleMouseDown}
      >
        <GripVertical size={14} style={{ color: 'var(--sage-400)', cursor: 'grab' }} />
        <Shield size={16} style={{ color: 'var(--bloom-mint)' }} />
        <span className="text-xs font-bold flex-1" style={{ color: 'var(--dark-text)' }}>
          AgentZero 干预
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded transition-colors hover:bg-white/10"
        >
          {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--sage-400)' }} /> : <ChevronUp size={14} style={{ color: 'var(--sage-400)' }} />}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded transition-colors hover:bg-white/10"
        >
          <X size={14} style={{ color: 'var(--sage-400)' }} />
        </button>
      </div>

      {/* Compact Info */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>当前智能体</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--bloom-mint)' }}>代码助手-A</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>自主级别</span>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {autonomyLabels.map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-1.5 rounded-full"
                  style={{
                    background: i <= autonomyLevel ? autonomyColors[autonomyLevel] : 'var(--dark-border)',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold" style={{ color: autonomyColors[autonomyLevel] }}>
              {autonomyLabels[autonomyLevel]}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>流状态</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full status-dot-pulse" style={{ background: 'var(--bloom-mint)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--bloom-mint)' }}>活跃</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        <button
          className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(212,163,115,0.2)', color: '#d4a373' }}
        >
          <Pause size={12} /> 暂停
        </button>
        <button
          className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(127,184,159,0.2)', color: '#7fb89f' }}
        >
          <Play size={12} /> 继续
        </button>
        <button
          className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(184,92,92,0.2)', color: '#b85c5c' }}
        >
          <Square size={12} /> 终止
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 py-2.5 space-y-2"
              style={{ borderTop: '1px solid var(--dark-border)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>
                最近干预
              </div>
              {[
                { time: '14:32:10', action: '自动批准手递手', target: '数据分析→翻译' },
                { time: '14:30:15', action: '调整自主级别', target: '4→3' },
                { time: '14:28:20', action: '暂停报告生成', target: '报告生成-G' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--dark-surface)' }}>
                  <Shield size={12} style={{ color: 'var(--bloom-mint)', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div className="text-[11px]" style={{ color: 'var(--dark-text)' }}>
                      <span className="font-semibold">{item.action}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--bloom-sky)' }}>{item.time}</span>
                      <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>{item.target}</span>
                    </div>
                  </div>
                </div>
              ))}

              <button
                className="w-full py-2 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.02] mt-1"
                style={{ background: 'var(--bloom-rose)', color: '#fff' }}
              >
                紧急停止所有
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

