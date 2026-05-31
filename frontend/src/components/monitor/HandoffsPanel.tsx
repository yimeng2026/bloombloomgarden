import React from 'react'
import { useState } from 'react';
import { CheckCircle, XCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handoffRecords } from './mockData';

const statusCfg: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  'auto-approved': { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)', border: 'rgba(127,184,159,0.3)', label: '自动批准', icon: CheckCircle },
  'needs-review': { color: '#d4a373', bg: 'rgba(212,163,115,0.2)', border: 'rgba(212,163,115,0.4)', label: '需审批', icon: Clock },
  'rejected': { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)', border: 'rgba(184,92,92,0.3)', label: '已拒绝', icon: XCircle },
  'timed-out': { color: '#8f9a7d', bg: 'rgba(143,154,125,0.15)', border: 'rgba(143,154,125,0.3)', label: '超时', icon: Clock },
};

export default function HandoffsPanel() {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'all'
    ? handoffRecords
    : handoffRecords.filter((h) => h.status === filter);

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 480 }}>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        {['all', 'auto-approved', 'needs-review', 'rejected', 'timed-out'].map((s) => {
          const label = s === 'all' ? '全部' : statusCfg[s]?.label || s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: filter === s ? 'var(--sage-500)' : 'var(--dark-elevated)',
                color: filter === s ? '#fff' : 'var(--sage-400)',
                border: `1px solid ${filter === s ? 'var(--sage-500)' : 'var(--dark-border)'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Handoff Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 500 }}>
        <AnimatePresence mode="popLayout">
          {filtered.map((h, i) => {
            const cfg = statusCfg[h.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === h.id;
            const isPending = h.status === 'needs-review';

            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--dark-elevated)',
                  border: `1.5px solid ${isPending ? 'var(--bloom-amber)' : cfg.border}`,
                  boxShadow: isPending ? '0 0 12px rgba(212,163,115,0.15)' : 'none',
                }}
              >
                {/* Needs review banner */}
                {isPending && (
                  <div
                    className="px-4 py-1.5 flex items-center justify-between"
                    style={{ background: 'rgba(212,163,115,0.2)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: 'var(--bloom-amber)' }}>
                      需要审批 — 30秒后自动批准
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded-md text-[11px] font-bold transition-all hover:scale-105"
                        style={{ background: 'var(--bloom-mint)', color: '#fff' }}
                      >
                        批准
                      </button>
                      <button
                        className="px-3 py-1 rounded-md text-[11px] font-bold transition-all hover:scale-105"
                        style={{ background: 'var(--bloom-rose)', color: '#fff' }}
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--bloom-sky)' }}>{h.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon size={13} style={{ color: cfg.color }} />
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Agent Flow */}
                  <div className="flex items-center gap-4 py-2">
                    <div className="text-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg mx-auto mb-1"
                        style={{ background: 'var(--dark-surface)', border: `2px solid ${cfg.color}` }}
                      >
                        <BotIcon />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--dark-text)' }}>{h.fromAgent}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center">
                      <ArrowRight size={24} style={{ color: cfg.color }} />
                      <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--sage-400)' }}>手递手</span>
                    </div>

                    <div className="text-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg mx-auto mb-1"
                        style={{ background: 'var(--dark-surface)', border: `2px solid ${cfg.color}` }}
                      >
                        <BotIcon />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--dark-text)' }}>{h.toAgent}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-xs mt-2" style={{ color: 'var(--sage-400)' }}>
                    {h.reason}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>耗时: {h.duration}</span>
                    <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>数据: {h.dataSize}</span>
                    <button
                      className="ml-auto flex items-center gap-0.5 text-[11px] font-medium transition-colors"
                      style={{ color: 'var(--bloom-sky)' }}
                      onClick={() => setExpandedId(isExpanded ? null : h.id)}
                    >
                      {isExpanded ? '收起' : '详情'}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Expanded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--dark-border)' }}>
                          <div className="flex gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--sage-400)', minWidth: 60 }}>来源:</span>
                            <span className="text-xs" style={{ color: 'var(--dark-text)' }}>{h.fromAgent}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--sage-400)', minWidth: 60 }}>目标:</span>
                            <span className="text-xs" style={{ color: 'var(--dark-text)' }}>{h.toAgent}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--sage-400)', minWidth: 60 }}>原因:</span>
                            <span className="text-xs" style={{ color: 'var(--dark-text)' }}>{h.reason}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--sage-400)', minWidth: 60 }}>数据量:</span>
                            <span className="text-xs font-mono" style={{ color: 'var(--dark-text)' }}>{h.dataSize}</span>
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105" style={{ background: 'var(--dark-surface)', color: 'var(--bloom-sky)', border: '1px solid var(--dark-border)' }}>
                              回滚
                            </button>
                            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105" style={{ background: 'var(--dark-surface)', color: 'var(--bloom-amber)', border: '1px solid var(--dark-border)' }}>
                              干预
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sage-400)' }}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16.01" />
      <line x1="16" y1="16" x2="16" y2="16.01" />
    </svg>
  );
}

