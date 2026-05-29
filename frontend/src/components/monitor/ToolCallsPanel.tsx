import React from 'react'
import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, CheckCircle, Loader2, XCircle, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toolCalls } from './mockData';

const statusCfg: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  success: { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)', icon: CheckCircle, label: '成功' },
  running: { color: '#d4a373', bg: 'rgba(212,163,115,0.15)', icon: Loader2, label: '进行中' },
  failed: { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)', icon: XCircle, label: '失败' },
  pending: { color: '#8f9a7d', bg: 'rgba(143,154,125,0.15)', icon: Clock, label: '等待中' },
};

export default function ToolCallsPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2" style={{ maxHeight: 540, overflowY: 'auto', paddingRight: 4 }}>
      {toolCalls.map((tc, i) => {
        const cfg = statusCfg[tc.status];
        const Icon = cfg.icon;
        const isExpanded = expandedId === tc.id;
        return (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{
              background: 'var(--dark-elevated)',
              border: `1.5px solid ${isExpanded ? 'var(--bloom-mint)' : 'var(--dark-border)'}`,
            }}
          >
            {/* Row Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : tc.id)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: cfg.bg }}
              >
                <Icon size={16} style={{ color: cfg.color }} className={tc.status === 'running' ? 'animate-spin' : ''} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench size={13} style={{ color: 'var(--sage-400)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                    {tc.toolName}()
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>{tc.agent}</span>
                  <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>{tc.timestamp}</span>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--bloom-sky)' }}>{tc.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {tc.status === 'running' && (
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                    style={{ background: 'var(--bloom-rose)', color: '#fff' }}
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <Shield size={12} /> 打断
                  </button>
                )}
                {tc.status === 'failed' && (
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                    style={{ background: 'var(--bloom-mint)', color: '#fff' }}
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    重试
                  </button>
                )}
                {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--sage-400)' }} /> : <ChevronDown size={16} style={{ color: 'var(--sage-400)' }} />}
              </div>
            </div>

            {/* Expanded Detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-3" style={{ borderTop: '1px solid var(--dark-border)' }}>
                    <div className="pt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bloom-sky)' }}>Parameters</div>
                      <pre
                        className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                        style={{ background: '#0d1117', color: '#7fb89f', border: '1px solid var(--dark-border)', lineHeight: 1.6 }}
                      >
                        {tc.params}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bloom-mint)' }}>Result</div>
                      <pre
                        className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                        style={{ background: '#0d1117', color: tc.status === 'failed' ? '#b85c5c' : '#d4a373', border: '1px solid var(--dark-border)', lineHeight: 1.6 }}
                      >
                        {tc.result}
                      </pre>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>耗时: </span>
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--dark-text)' }}>{tc.duration}</span>
                      </div>
                      <div>
                        <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>状态: </span>
                        <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

