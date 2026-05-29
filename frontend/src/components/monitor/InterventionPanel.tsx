import React from 'react'
import { useState, useRef } from 'react';
import {
  Pause, Play, Square, ArrowRightLeft, Settings, RotateCcw,
  Save, Clock, Shield, Bot, CheckCircle, Terminal,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { streamTokens, systemPrompt, jsonParams, checkpoints, interventionHistory } from './mockData';

const controlButtons = [
  { id: 'pause', label: '暂停', icon: Pause, color: '#d4a373', bg: 'rgba(212,163,115,0.2)', hoverBg: 'rgba(212,163,115,0.35)' },
  { id: 'continue', label: '继续', icon: Play, color: '#7fb89f', bg: 'rgba(127,184,159,0.2)', hoverBg: 'rgba(127,184,159,0.35)' },
  { id: 'abort', label: '终止', icon: Square, color: '#b85c5c', bg: 'rgba(184,92,92,0.2)', hoverBg: 'rgba(184,92,92,0.35)' },
  { id: 'redirect', label: '重定向', icon: ArrowRightLeft, color: '#7fa3b0', bg: 'rgba(127,163,176,0.2)', hoverBg: 'rgba(127,163,176,0.35)' },
  { id: 'modify', label: '修改参数', icon: Settings, color: '#a78b9a', bg: 'rgba(167,139,154,0.2)', hoverBg: 'rgba(167,139,154,0.35)' },
  { id: 'rollback', label: '回滚', icon: RotateCcw, color: '#c97b84', bg: 'rgba(201,123,132,0.2)', hoverBg: 'rgba(201,123,132,0.35)' },
];

export default function InterventionPanel() {
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [promptText, setPromptText] = useState(systemPrompt);
  const [jsonText, setJsonText] = useState(JSON.stringify(jsonParams, null, 2));
  const [saved, setSaved] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        {/* Stream Monitor */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(127,184,159,0.1)', borderBottom: '1px solid var(--dark-border)' }}>
            <Terminal size={14} style={{ color: 'var(--bloom-mint)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--bloom-mint)' }}>实时流输出</span>
            <span className="ml-auto w-2 h-2 rounded-full status-dot-pulse" style={{ background: 'var(--bloom-mint)' }} />
          </div>
          <div
            ref={streamRef}
            className="p-4 font-mono text-xs space-y-1 overflow-y-auto"
            style={{ maxHeight: 160, color: 'var(--dark-text)', lineHeight: 1.7 }}
          >
            {streamTokens.map((token, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ color: i === streamTokens.length - 1 ? 'var(--bloom-mint)' : 'var(--sage-300)' }}
              >
                <span style={{ color: 'var(--bloom-sky)' }}>&gt;</span> {token}
              </motion.div>
            ))}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ color: 'var(--bloom-mint)' }}
            >
              _
            </motion.span>
          </div>
        </div>

        {/* Active Control Buttons */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--sage-400)' }}>
            主动控制
          </div>
          <div className="grid grid-cols-3 gap-2">
            {controlButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <motion.button
                  key={btn.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveControl(activeControl === btn.id ? null : btn.id)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200"
                  style={{
                    background: activeControl === btn.id ? btn.hoverBg : btn.bg,
                    border: `1.5px solid ${activeControl === btn.id ? btn.color : 'transparent'}`,
                  }}
                >
                  <Icon size={20} style={{ color: btn.color }} />
                  <span className="text-[11px] font-bold" style={{ color: btn.color }}>
                    {btn.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Context Editor */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>
              系统提示词 (System Prompt)
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all hover:scale-105"
              style={{
                background: saved ? 'var(--bloom-mint)' : 'var(--dark-surface)',
                color: saved ? '#fff' : 'var(--sage-400)',
                border: '1px solid var(--dark-border)',
              }}
            >
              <Save size={12} />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full rounded-lg p-3 text-xs font-mono outline-none resize-none"
            style={{
              background: '#0d1117',
              color: 'var(--dark-text)',
              border: '1px solid var(--dark-border)',
              minHeight: 120,
              lineHeight: 1.7,
            }}
          />
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-4">
        {/* Parameter Modifier */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>
              参数编辑器 (JSON)
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all hover:scale-105"
              style={{
                background: saved ? 'var(--bloom-mint)' : 'var(--dark-surface)',
                color: saved ? '#fff' : 'var(--sage-400)',
                border: '1px solid var(--dark-border)',
              }}
            >
              <Save size={12} />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full rounded-lg p-3 text-xs font-mono outline-none resize-none"
            style={{
              background: '#0d1117',
              color: '#7fb89f',
              border: '1px solid var(--dark-border)',
              minHeight: 140,
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Checkpoint List */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--sage-400)' }}>
            检查点列表
          </div>
          <div className="space-y-2">
            {checkpoints.map((cp, i) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all hover:bg-white/5"
                style={{ background: 'var(--dark-surface)' }}
              >
                <Save size={14} style={{ color: 'var(--bloom-sky)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--dark-text)' }}>{cp.label}</div>
                  <div className="flex items-center gap-2">
                    <Clock size={10} style={{ color: 'var(--sage-400)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>{cp.timestamp}</span>
                    <Bot size={10} style={{ color: 'var(--sage-400)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>{cp.agent}</span>
                  </div>
                </div>
                <button
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-105 flex-shrink-0"
                  style={{ background: 'var(--bloom-sky)', color: '#fff' }}
                >
                  恢复
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Intervention History */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--sage-400)' }}>
            干预历史
          </div>
          <div className="space-y-2">
            {interventionHistory.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{ background: 'var(--dark-surface)' }}
              >
                <Shield size={13} style={{ color: 'var(--bloom-mint)', marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono" style={{ color: 'var(--bloom-sky)' }}>{rec.timestamp}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(127,184,159,0.15)', color: 'var(--bloom-mint)' }}>
                      {rec.user}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--dark-text)' }}>
                    <span className="font-semibold">{rec.action}</span>
                    {' '}
                    <span style={{ color: 'var(--sage-400)' }}>→ {rec.agent}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle size={10} style={{ color: 'var(--bloom-mint)' }} />
                    <span className="text-[11px]" style={{ color: 'var(--bloom-mint)' }}>{rec.result}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

