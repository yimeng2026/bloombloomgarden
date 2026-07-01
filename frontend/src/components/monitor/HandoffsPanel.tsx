import React from 'react'
import { useState } from 'react';
import { CheckCircle, XCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HandoffRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  reason: string;
  status: 'auto-approved' | 'needs-review' | 'rejected' | 'timed-out';
  duration: string;
  dataSize: string;
}

const statusCfg: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  'auto-approved': { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)', border: 'rgba(127,184,159,0.3)', label: '自动批准', icon: CheckCircle },
  'needs-review': { color: '#d4a373', bg: 'rgba(212,163,115,0.2)', border: 'rgba(212,163,115,0.4)', label: '需审批', icon: Clock },
  'rejected': { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)', border: 'rgba(184,92,92,0.3)', label: '已拒绝', icon: XCircle },
  'timed-out': { color: '#8f9a7d', bg: 'rgba(143,154,125,0.15)', border: 'rgba(143,154,125,0.3)', label: '超时', icon: Clock },
};

export default function HandoffsPanel() {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [records, setRecords] = useState<HandoffRecord[]>([]);

  const filtered = filter === 'all'
    ? records
    : records.filter((h) => h.status === filter);

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
        {records.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--sage-400)' }}>
            暂无手递手记录
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((h, i) => {
              const cfg = statusCfg[h.status];
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: 'var(--dark-elevated)',
                    border: `1.5px solid ${cfg.border}`,
                  }}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}
                    >
                      <StatusIcon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--dark-text)' }}>
                          {h.fromAgent}
                        </span>
                        <ArrowRight size={14} style={{ color: 'var(--sage-400)' }} />
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--dark-text)' }}>
                          {h.toAgent}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                        {h.reason} · {h.duration}
                      </div>
                    </div>
                    <div className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </div>
                    {expandedId === h.id ? <ChevronUp size={14} style={{ color: 'var(--sage-400)' }} /> : <ChevronDown size={14} style={{ color: 'var(--sage-400)' }} />}
                  </div>
                  {expandedId === h.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-3 space-y-2"
                    >
                      <div className="text-xs" style={{ color: 'var(--sage-400)' }}>
                        <span className="font-semibold">时间:</span> {h.timestamp}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--sage-400)' }}>
                        <span className="font-semibold">数据大小:</span> {h.dataSize}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
