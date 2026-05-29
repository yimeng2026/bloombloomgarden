import { EventEmitter } from 'events';

export interface MetricPoint {
  timestamp: Date;
  value: number;
  labels: Record<string, string>;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export class MonitorService extends EventEmitter {
  private metrics = new Map<string, MetricPoint[]>();
  private logs: LogEntry[] = [];

  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    const point: MetricPoint = { timestamp: new Date(), value, labels };
    const series = this.metrics.get(name) || [];
    series.push(point);
    this.metrics.set(name, series);
    this.emit('metric', { name, point });
  }

  getMetrics(name?: string): MetricPoint[] | Map<string, MetricPoint[]> {
    if (name) return this.metrics.get(name) || [];
    return this.metrics;
  }

  getStats(): {
    agentCount: number;
    groupCount: number;
    taskCount: number;
    messageCount: number;
    avgResponseTime: number;
    errorRate: number;
  } {
    // 返回模拟统计数据
    return {
      agentCount: Math.floor(Math.random() * 50) + 10,
      groupCount: Math.floor(Math.random() * 10) + 2,
      taskCount: Math.floor(Math.random() * 200) + 50,
      messageCount: Math.floor(Math.random() * 5000) + 1000,
      avgResponseTime: Math.random() * 1000 + 200,
      errorRate: Math.random() * 0.05,
    };
  }

  addLog(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      level,
      source,
      message,
      metadata: metadata || {},
      timestamp: new Date(),
    };
    this.logs.unshift(entry);
    if (this.logs.length > 10000) this.logs.pop();
    this.emit('log', entry);
    return entry;
  }

  getLogs(filters?: { level?: string; source?: string; limit?: number }): LogEntry[] {
    let results = [...this.logs];
    if (filters?.level) results = results.filter(l => l.level === filters.level);
    if (filters?.source) results = results.filter(l => l.source.includes(filters.source!));
    if (filters?.limit) results = results.slice(0, filters.limit);
    return results;
  }

  getPerformance(): { cpu: number; memory: number; networkLatency: number } {
    return {
      cpu: Math.random() * 60 + 10,
      memory: Math.random() * 80 + 20,
      networkLatency: Math.random() * 100 + 20,
    };
  }
}
