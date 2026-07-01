import { useState, useEffect } from 'react';

interface SystemMetrics {
  cpu: number;
  memory: number;
  requestsPerMin: number;
  activeConnections: number;
  avgLatency: number;
  uptime: number;
}

/**
 * SystemStatusBoard — 系统状态仪表盘
 * 模拟实时 CPU、内存、QPS、连接数、延迟指标
 */
export default function SystemStatusBoard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 12,
    memory: 34,
    requestsPerMin: 245,
    activeConnections: 18,
    avgLatency: 142,
    uptime: 86400,
  });
  const [history, setHistory] = useState<SystemMetrics[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const next = {
          cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(20, Math.min(80, prev.memory + (Math.random() - 0.5) * 5)),
          requestsPerMin: Math.max(50, Math.min(800, prev.requestsPerMin + Math.floor((Math.random() - 0.5) * 60))),
          activeConnections: Math.max(5, Math.min(50, prev.activeConnections + Math.floor((Math.random() - 0.5) * 4))),
          avgLatency: Math.max(50, Math.min(500, prev.avgLatency + Math.floor((Math.random() - 0.5) * 30))),
          uptime: prev.uptime + 2,
        };
        setHistory(h => [...h.slice(-30), next]);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}天 ${h}时 ${m}分`;
  };

  const sparkline = (data: number[], color: string, height = 30) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 100;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={points}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.8"
        />
        <polygon
          points={`0,${height} ${points} ${w},${height}`}
          fill={color}
          opacity="0.1"
        />
      </svg>
    );
  };

  const MetricCard = ({
    label,
    value,
    unit,
    color,
    data,
    warnThreshold,
  }: {
    label: string;
    value: number;
    unit: string;
    color: string;
    data: number[];
    warnThreshold?: number;
  }) => (
    <div className="bg-[#12121a] border border-gray-800 rounded-lg p-3 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        {warnThreshold && value > warnThreshold && (
          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded">高负载</span>
        )}
      </div>
      <div className="text-xl font-semibold text-gray-100 mb-2">
        {Math.round(value)}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </div>
      <div className="h-[30px]">{sparkline(data, color)}</div>
    </div>
  );

  return (
    <div className="bg-[#0a0a0f] border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">系统状态</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          运行中 · {formatUptime(metrics.uptime)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          label="CPU 使用率"
          value={metrics.cpu}
          unit="%"
          color="#6366f1"
          data={history.map(h => h.cpu)}
          warnThreshold={80}
        />
        <MetricCard
          label="内存占用"
          value={metrics.memory}
          unit="%"
          color="#8b5cf6"
          data={history.map(h => h.memory)}
          warnThreshold={70}
        />
        <MetricCard
          label="QPS"
          value={metrics.requestsPerMin}
          unit="/min"
          color="#10b981"
          data={history.map(h => h.requestsPerMin)}
        />
        <MetricCard
          label="活跃连接"
          value={metrics.activeConnections}
          unit=""
          color="#06b6d4"
          data={history.map(h => h.activeConnections)}
        />
        <MetricCard
          label="平均延迟"
          value={metrics.avgLatency}
          unit="ms"
          color="#f59e0b"
          data={history.map(h => h.avgLatency)}
          warnThreshold={300}
        />
      </div>
    </div>
  );
}
