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
    // 从实际日志和指标计算统计数据
    const logs = this.getLogs();
    const errorLogs = logs.filter(l => l.level === 'error');
    const totalLogs = logs.length;
    const errorRate = totalLogs > 0 ? errorLogs.length / totalLogs : 0;
    
    // 从指标计算平均响应时间
    const responseMetrics = this.getMetrics('response_time') as MetricPoint[] || [];
    const avgResponseTime = responseMetrics.length > 0
      ? responseMetrics.reduce((sum, m) => sum + m.value, 0) / responseMetrics.length
      : 0;
    
    return {
      agentCount: 0, // 需从 AgentService 获取
      groupCount: 0, // 需从 GroupService 获取
      taskCount: 0,  // 需从 TaskService 获取
      messageCount: totalLogs,
      avgResponseTime,
      errorRate,
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
    // 获取真实的系统性能数据
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpu: cpuUsage.user / 1000000, // 转换为秒
      memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      networkLatency: 0, // 需通过真实网络探测获取
    };
  }
}
