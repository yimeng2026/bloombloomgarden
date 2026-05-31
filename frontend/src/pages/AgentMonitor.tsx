import { useState, useEffect } from 'react';
import {
  Network, GitBranch, Terminal, Wrench, ArrowRightLeft, Shield,
  Maximize, Minimize, RefreshCw, Radio,
} from 'lucide-react';
import { fetchMonitorData, fetchSystemMetrics } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import TopologyView from '@/components/monitor/TopologyView';
import TasksPanel from '@/components/monitor/TasksPanel';
import LogsPanel from '@/components/monitor/LogsPanel';
import ToolCallsPanel from '@/components/monitor/ToolCallsPanel';
import HandoffsPanel from '@/components/monitor/HandoffsPanel';
import InterventionPanel from '@/components/monitor/InterventionPanel';
import AgentZeroFloatingPanel from '@/components/monitor/AgentZeroFloatingPanel';

type TabId = 'topology' | 'tasks' | 'logs' | 'tools' | 'handoffs' | 'intervention';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'topology', label: '拓扑视图', icon: Network },
  { id: 'tasks', label: '任务面板', icon: GitBranch },
  { id: 'logs', label: '日志流', icon: Terminal },
  { id: 'tools', label: '工具调用', icon: Wrench },
  { id: 'handoffs', label: '交接记录', icon: ArrowRightLeft },
  { id: 'intervention', label: '干预面板', icon: Shield },
];

const categoryFilters = ['全部', '单智能体', '多智能体协作', '蜂群', '手动任务'];
const refreshOptions = ['实时', '1s', '5s', '暂停'];
const autonomyLabels = ['全人工', '审批模式', '观察模式', '报告模式', '自主模式', '完全自主'];

export default function AgentMonitor() {
  const [monitorData, setMonitorData] = useState<any>(null);
  const [mLoading, setMLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try { setMLoading(true); const res = await fetchMonitorData(); setMonitorData(res.data); } catch (e) { console.error(e); } finally { setMLoading(false); }
    }
    load();
  }, []);
  const [activeTab, setActiveTab] = useState<TabId>('topology');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [autonomyLevel, setAutonomyLevel] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshRate, setRefreshRate] = useState('实时');
  const [refreshSpin, setRefreshSpin] = useState(false);

  const handleRefresh = () => {
    setRefreshSpin(true);
    setTimeout(() => setRefreshSpin(false), 500);
  };

  // Handle fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'topology':
        return <TopologyView />;
      case 'tasks':
        return <TasksPanel />;
      case 'logs':
        return <LogsPanel />;
      case 'tools':
        return <ToolCallsPanel />;
      case 'handoffs':
        return <HandoffsPanel />;
      case 'intervention':
        return <InterventionPanel />;
      default:
        return <TopologyView />;
    }
  };

  return (
    <div
      className="flex flex-col w-full relative"
      style={{
        backgroundColor: 'var(--dark-bg)',
        minHeight: 'calc(100vh - var(--topbar-height))',
      }}
    >
      {/* Background overlay image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/status-flow.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.04,
        }}
      />

      {/* TOP BAR */}
      <div
        className="relative z-10 flex items-center flex-wrap gap-3 px-4 py-2.5"
        style={{
          background: 'linear-gradient(180deg, rgba(26,31,24,0.95) 0%, rgba(26,31,24,0.85) 100%)',
          borderBottom: '1px solid var(--dark-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Title with live pulse */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio size={18} style={{ color: 'var(--bloom-mint)' }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full status-dot-pulse"
              style={{ background: 'var(--bloom-mint)' }}
            />
          </div>
          <h1
            className="font-display text-lg font-bold tracking-tight"
            style={{ color: 'var(--dark-text)' }}
          >
            监控中心
          </h1>
        </div>

        <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--dark-border)' }} />

        {/* Category Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200"
              style={{
                background: categoryFilter === cat ? 'var(--sage-500)' : 'transparent',
                color: categoryFilter === cat ? '#fff' : 'var(--sage-400)',
                border: `1px solid ${categoryFilter === cat ? 'var(--sage-500)' : 'var(--dark-border)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Autonomy Slider */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--sage-400)' }}>自主</span>
            <input
              type="range"
              min={0}
              max={5}
              value={autonomyLevel}
              onChange={(e) => setAutonomyLevel(Number(e.target.value))}
              className="w-20 h-1 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(90deg, var(--bloom-rose) 0%, var(--bloom-amber) 50%, var(--bloom-mint) 100%)`,
                accentColor: autonomyLevel <= 1 ? '#b85c5c' : autonomyLevel <= 3 ? '#d4a373' : '#7fb89f',
              }}
            />
            <span
              className="text-[10px] font-bold min-w-[48px] text-center"
              style={{
                color: autonomyLevel <= 1 ? '#b85c5c' : autonomyLevel <= 3 ? '#d4a373' : '#7fb89f',
              }}
            >
              {autonomyLabels[autonomyLevel]}
            </span>
          </div>

          {/* Refresh Rate */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--dark-border)' }}>
            {refreshOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setRefreshRate(opt)}
                className="px-2 py-1 text-[10px] font-bold transition-all duration-200"
                style={{
                  background: refreshRate === opt ? 'var(--bloom-mint)' : 'var(--dark-elevated)',
                  color: refreshRate === opt ? '#fff' : 'var(--sage-400)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105 ${refreshSpin ? 'animate-spin' : ''}`}
            style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
          >
            <RefreshCw size={14} style={{ color: 'var(--sage-400)' }} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
            style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
          >
            {isFullscreen ? <Minimize size={14} style={{ color: 'var(--sage-400)' }} /> : <Maximize size={14} style={{ color: 'var(--sage-400)' }} />}
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div
        className="relative z-10 flex items-center justify-center gap-1 px-4 py-2"
        style={{
          background: 'rgba(26,31,24,0.8)',
          borderBottom: '1px solid var(--dark-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300"
              style={{
                color: isActive ? 'var(--dark-text)' : 'var(--sage-400)',
                background: isActive ? 'var(--dark-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--dark-border)' : '1px solid transparent',
              }}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                  style={{ width: '40%', background: 'var(--bloom-mint)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div
        className="relative z-10 flex-1 px-4 py-3 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* AGENT ZERO FLOATING PANEL */}
      <AgentZeroFloatingPanel autonomyLevel={autonomyLevel} />
    </div>
  );
}
