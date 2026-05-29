import React from 'react'
import { useState } from 'react';
import { Play, Pause, Square, Plus, ChevronRight, Clock, Bot, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { monitorTasks } from './mockData';

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  running: { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)', icon: Loader2, label: '运行中' },
  completed: { color: '#5b9a6d', bg: 'rgba(91,154,109,0.15)', icon: CheckCircle, label: '已完成' },
  failed: { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)', icon: AlertTriangle, label: '失败' },
  pending: { color: '#d4a373', bg: 'rgba(212,163,115,0.15)', icon: Clock, label: '等待中' },
};

export default function TasksPanel() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTasks = filterStatus === 'all'
    ? monitorTasks
    : monitorTasks.filter((t) => t.status === filterStatus);

  const selected = monitorTasks.find((t) => t.id === selectedTask);

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 480 }}>
      {/* Task List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['all', 'running', 'completed', 'failed', 'pending'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: filterStatus === s ? 'var(--bloom-mint)' : 'var(--dark-elevated)',
                color: filterStatus === s ? '#fff' : 'var(--sage-400)',
                border: `1px solid ${filterStatus === s ? 'var(--bloom-mint)' : 'var(--dark-border)'}`,
              }}
            >
              {s === 'all' ? '全部' : statusConfig[s]?.label || s}
            </button>
          ))}
          <div className="flex-1" />
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--bloom-mint)', color: '#fff' }}
          >
            <Plus size={14} /> 新建任务
          </button>
        </div>

        {/* Task Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 520 }}>
          {filteredTasks.map((task, i) => {
            const cfg = statusConfig[task.status];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                onClick={() => setSelectedTask(task.id)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: selectedTask === task.id ? 'var(--dark-elevated)' : 'rgba(35,42,33,0.6)',
                  border: `1.5px solid ${selectedTask === task.id ? 'var(--bloom-mint)' : 'var(--dark-border)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={16} style={{ color: cfg.color }} className={task.status === 'running' ? 'animate-spin' : ''} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--dark-text)' }}>
                        {task.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Bot size={12} style={{ color: 'var(--sage-400)' }} />
                        <span className="text-xs" style={{ color: 'var(--sage-400)' }}>
                          {task.agents.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--sage-400)', flexShrink: 0 }} />
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <div className="flex-1" style={{ height: 6, borderRadius: 3, background: 'var(--dark-surface)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${task.progress}%`,
                        height: '100%',
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                        transition: 'width 0.8s var(--ease-gentle)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--sage-400)', minWidth: 32, textAlign: 'right' }}>
                    {task.progress}%
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[11px] font-mono" style={{ color: 'var(--sage-400)' }}>
                    {task.startTime}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--sage-400)' }}>
                    预计: {task.estimatedComplete}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto"
                    style={{
                      background: task.priority === 'high' ? 'rgba(184,92,92,0.2)' : task.priority === 'medium' ? 'rgba(212,163,115,0.2)' : 'rgba(127,184,159,0.2)',
                      color: task.priority === 'high' ? '#b85c5c' : task.priority === 'medium' ? '#d4a373' : '#7fb89f',
                    }}
                  >
                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 40, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 340 }}
            exit={{ opacity: 0, x: 40, width: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="flex-shrink-0 overflow-hidden"
            style={{ borderLeft: '1px solid var(--dark-border)' }}
          >
            <div className="pl-4" style={{ width: 340 }}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: statusConfig[selected.status].bg }}
                >
                  {(() => {
                    const Icon = statusConfig[selected.status].icon;
                    return <Icon size={20} style={{ color: statusConfig[selected.status].color }} className={selected.status === 'running' ? 'animate-spin' : ''} />;
                  })()}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>{selected.name}</div>
                  <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{selected.id}</div>
                </div>
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
              >
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sage-400)' }}>描述</div>
                  <div className="text-sm" style={{ color: 'var(--dark-text)' }}>{selected.description}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sage-400)' }}>执行智能体</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.agents.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'var(--dark-surface)', color: 'var(--bloom-mint)' }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sage-400)' }}>进度</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1" style={{ height: 8, borderRadius: 4, background: 'var(--dark-surface)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${selected.progress}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${statusConfig[selected.status].color}, ${statusConfig[selected.status].color}88)`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: statusConfig[selected.status].color }}>
                      {selected.progress}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>开始</div>
                    <div className="text-sm font-mono" style={{ color: 'var(--dark-text)' }}>{selected.startTime}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sage-400)' }}>预计完成</div>
                    <div className="text-sm font-mono" style={{ color: 'var(--dark-text)' }}>{selected.estimatedComplete}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {selected.status === 'running' && (
                  <>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105" style={{ background: 'var(--bloom-amber)', color: '#fff' }}>
                      <Pause size={14} /> 暂停
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105" style={{ background: 'var(--bloom-rose)', color: '#fff' }}>
                      <Square size={14} /> 终止
                    </button>
                  </>
                )}
                {selected.status === 'pending' && (
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105" style={{ background: 'var(--bloom-mint)', color: '#fff' }}>
                    <Play size={14} /> 开始
                  </button>
                )}
                {selected.status === 'failed' && (
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105" style={{ background: 'var(--bloom-mint)', color: '#fff' }}>
                    <Play size={14} /> 重试
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

