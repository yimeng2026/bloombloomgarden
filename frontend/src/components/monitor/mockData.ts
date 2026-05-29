// Agent Monitor Mock Data — comprehensive and realistic

export interface MonitorAgent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'handoff' | 'error' | 'paused';
  platform: string;
  currentTask: string;
  progress: number;
  avatar: string;
  accentColor: string;
  type: 'root' | 'sub' | 'task';
  position: { x: number; y: number };
}

export interface MonitorEdge {
  id: string;
  source: string;
  target: string;
  status: 'normal' | 'active' | 'error' | 'pending';
  label: string;
}

export interface MonitorTask {
  id: string;
  name: string;
  agents: string[];
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  startTime: string;
  estimatedComplete: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  agent: string;
  params: string;
  result: string;
  duration: string;
  status: 'success' | 'running' | 'failed' | 'pending';
  timestamp: string;
}

export interface HandoffRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  reason: string;
  status: 'auto-approved' | 'needs-review' | 'rejected' | 'timed-out';
  duration: string;
  dataSize: string;
}

export interface Checkpoint {
  id: string;
  label: string;
  timestamp: string;
  agent: string;
}

export interface InterventionRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  agent: string;
  result: string;
}

export const monitorAgents: MonitorAgent[] = [
  { id: 'root-1', name: '总调度器', status: 'active', platform: 'OpenAI', currentTask: '协调多智能体协作任务', progress: 78, avatar: 'tree', accentColor: '#c9a96e', type: 'root', position: { x: 400, y: 200 } },
  { id: 'ag-1', name: '代码助手-A', status: 'active', platform: 'OpenAI', currentTask: '代码审查与重构分析', progress: 65, avatar: 'leaf', accentColor: '#7fb89f', type: 'sub', position: { x: 150, y: 80 } },
  { id: 'ag-2', name: '数据分析-B', status: 'active', platform: 'Kimi', currentTask: 'Q4销售数据处理中', progress: 42, avatar: 'flower', accentColor: '#c97b84', type: 'sub', position: { x: 650, y: 80 } },
  { id: 'ag-3', name: '文档生成-C', status: 'idle', platform: 'Claude', currentTask: '等待手递手请求', progress: 0, avatar: 'fern', accentColor: '#a78b9a', type: 'sub', position: { x: 150, y: 320 } },
  { id: 'ag-4', name: '测试代理-D', status: 'active', platform: 'Ollama', currentTask: '运行集成测试套件', progress: 88, avatar: 'mushroom', accentColor: '#7fa3b0', type: 'sub', position: { x: 650, y: 320 } },
  { id: 'ag-5', name: '翻译专员-E', status: 'handoff', platform: 'GPT-4', currentTask: '技术文档翻译（日语）', progress: 55, avatar: 'vine', accentColor: '#d4a373', type: 'sub', position: { x: 100, y: 200 } },
  { id: 'ag-6', name: '代码审查-F', status: 'active', platform: 'Gemini', currentTask: 'PR #2847 代码审查', progress: 30, avatar: 'seed', accentColor: '#5b9a6d', type: 'sub', position: { x: 700, y: 200 } },
  { id: 'ag-7', name: '报告生成-G', status: 'paused', platform: 'OpenAI', currentTask: '已暂停-等待人工确认', progress: 15, avatar: 'petal', accentColor: '#b85c5c', type: 'sub', position: { x: 400, y: 380 } },
  { id: 'task-1', name: '数据处理节点', status: 'active', platform: 'Kimi', currentTask: '执行数据清洗管道', progress: 72, avatar: 'leaf', accentColor: '#6b8fa8', type: 'task', position: { x: 400, y: 60 } },
  { id: 'task-2', name: '验证节点', status: 'error', platform: 'Ollama', currentTask: '验证失败-重试中', progress: 10, avatar: 'flower', accentColor: '#b85c5c', type: 'task', position: { x: 400, y: 340 } },
];

export const monitorEdges: MonitorEdge[] = [
  { id: 'e1', source: 'root-1', target: 'ag-1', status: 'active', label: '派发任务' },
  { id: 'e2', source: 'root-1', target: 'ag-2', status: 'active', label: '数据请求' },
  { id: 'e3', source: 'root-1', target: 'ag-3', status: 'normal', label: '空闲连接' },
  { id: 'e4', source: 'root-1', target: 'ag-4', status: 'active', label: '测试指令' },
  { id: 'e5', source: 'root-1', target: 'ag-6', status: 'active', label: '审查任务' },
  { id: 'e6', source: 'root-1', target: 'task-1', status: 'active', label: '数据处理' },
  { id: 'e7', source: 'root-1', target: 'task-2', status: 'error', label: '验证失败' },
  { id: 'e8', source: 'ag-1', target: 'ag-3', status: 'normal', label: '代码→文档' },
  { id: 'e9', source: 'ag-2', target: 'ag-5', status: 'pending', label: '数据→翻译' },
  { id: 'e10', source: 'ag-4', target: 'ag-6', status: 'active', label: '测试→审查' },
  { id: 'e11', source: 'ag-5', target: 'task-1', status: 'active', label: '翻译输出' },
  { id: 'e12', source: 'ag-6', target: 'task-2', status: 'error', label: '审查结果' },
  { id: 'e13', source: 'task-1', target: 'ag-2', status: 'active', label: '清洗数据' },
  { id: 'e14', source: 'ag-7', target: 'root-1', status: 'normal', label: '暂停汇报' },
];

export const monitorTasks: MonitorTask[] = [
  { id: 'mt-1', name: '代码审查 PR#2847', agents: ['代码助手-A', '代码审查-F'], status: 'running', progress: 65, startTime: '14:32:15', estimatedComplete: '14:45:00', priority: 'high', description: '对 pull request #2847 进行全面代码审查，包括安全性检查和性能分析' },
  { id: 'mt-2', name: 'Q4 销售数据分析', agents: ['数据分析-B'], status: 'running', progress: 42, startTime: '14:28:00', estimatedComplete: '14:55:00', priority: 'high', description: '处理 Q4 季度销售数据，生成可视化报表和趋势分析' },
  { id: 'mt-3', name: 'API 文档生成', agents: ['文档生成-C'], status: 'pending', progress: 0, startTime: '--:--:--', estimatedComplete: '15:10:00', priority: 'medium', description: '根据 OpenAPI schema 自动生成 API 文档' },
  { id: 'mt-4', name: '集成测试运行', agents: ['测试代理-D'], status: 'running', progress: 88, startTime: '14:15:00', estimatedComplete: '14:38:00', priority: 'high', description: '执行完整的集成测试套件，验证 API 端点和数据流' },
  { id: 'mt-5', name: '技术文档日译', agents: ['翻译专员-E'], status: 'running', progress: 55, startTime: '14:20:00', estimatedComplete: '14:50:00', priority: 'medium', description: '将技术文档第三章翻译成日语，保持术语一致性' },
  { id: 'mt-6', name: '数据清洗管道', agents: ['数据处理节点'], status: 'running', progress: 72, startTime: '14:25:00', estimatedComplete: '14:42:00', priority: 'high', description: '执行数据清洗管道，去除重复记录并标准化格式' },
  { id: 'mt-7', name: '性能优化 #2846', agents: ['代码助手-A'], status: 'completed', progress: 100, startTime: '13:30:00', estimatedComplete: '14:30:00', priority: 'medium', description: '数据库查询性能优化，索引重建' },
  { id: 'mt-8', name: '安全审计扫描', agents: ['代码审查-F'], status: 'failed', progress: 30, startTime: '14:00:00', estimatedComplete: '--:--:--', priority: 'high', description: '安全漏洞扫描任务失败，需要人工干预' },
];

export const logEntries: LogEntry[] = [
  { id: 'l1', timestamp: '14:32:15.234', agent: '代码助手-A', level: 'INFO', message: '开始分析代码库结构...发现 156 个文件，15 个目录' },
  { id: 'l2', timestamp: '14:32:16.891', agent: '代码助手-A', level: 'DEBUG', message: '构建依赖关系图，深度 3 层，发现 23 个循环依赖' },
  { id: 'l3', timestamp: '14:32:18.445', agent: '数据分析-B', level: 'INFO', message: '收到手递手请求，开始数据处理...数据量 45.2 MB' },
  { id: 'l4', timestamp: '14:32:20.112', agent: 'SYSTEM', level: 'WARN', message: 'API 响应延迟增加到 230ms，超出阈值 200ms' },
  { id: 'l5', timestamp: '14:32:21.334', agent: '总调度器', level: 'INFO', message: '任务 mt-4 分配给测试代理-D，优先级 high' },
  { id: 'l6', timestamp: '14:32:22.556', agent: '测试代理-D', level: 'DEBUG', message: '加载测试套件: api_integration_tests v2.3' },
  { id: 'l7', timestamp: '14:32:24.778', agent: '翻译专员-E', level: 'INFO', message: '翻译进度 55%，当前段落: "系统架构概述"' },
  { id: 'l8', timestamp: '14:32:25.990', agent: 'SYSTEM', level: 'ERROR', message: '验证节点 task-2 失败: 断言错误 - expected 200, got 500' },
  { id: 'l9', timestamp: '14:32:27.112', agent: '代码审查-F', level: 'WARN', message: 'PR#2847 中发现潜在 SQL 注入风险，行 234' },
  { id: 'l10', timestamp: '14:32:28.445', agent: '文档生成-C', level: 'DEBUG', message: '等待手递手信号，当前队列位置: 2' },
  { id: 'l11', timestamp: '14:32:30.001', agent: '数据分析-B', level: 'INFO', message: 'Q4 数据清洗完成，生成 12 个分析维度' },
  { id: 'l12', timestamp: '14:32:32.123', agent: 'SYSTEM', level: 'INFO', message: 'AgentZero 自动批准手递手: ag-2 → ag-5 (置信度 0.94)' },
  { id: 'l13', timestamp: '14:32:33.456', agent: '测试代理-D', level: 'INFO', message: '测试用例 45/89 通过，剩余预计 6 分钟' },
  { id: 'l14', timestamp: '14:32:35.789', agent: '总调度器', level: 'DEBUG', message: 'Swarm 拓扑更新: 8 活跃节点, 2 等待, 1 暂停' },
  { id: 'l15', timestamp: '14:32:37.012', agent: 'SYSTEM', level: 'WARN', message: '内存使用率达到 78%，建议清理缓存' },
  { id: 'l16', timestamp: '14:32:38.334', agent: '代码助手-A', level: 'INFO', message: '代码审查完成: 发现 3 个问题，1 个严重，2 个建议' },
  { id: 'l17', timestamp: '14:32:40.556', agent: '翻译专员-E', level: 'DEBUG', message: '术语库匹配率 92%，3 个新术语需要确认' },
  { id: 'l18', timestamp: '14:32:42.778', agent: 'SYSTEM', level: 'ERROR', message: '平台 Gemini Pro 连接超时，已标记为降级' },
  { id: 'l19', timestamp: '14:32:44.001', agent: '数据处理节点', level: 'INFO', message: '管道阶段 3/5 完成: 数据标准化，处理 12,345 条记录' },
  { id: 'l20', timestamp: '14:32:46.223', agent: '代码审查-F', level: 'INFO', message: '安全扫描完成: 发现 1 个高危漏洞，已通知管理员' },
  { id: 'l21', timestamp: '14:32:48.445', agent: 'SYSTEM', level: 'DEBUG', message: 'WebSocket 心跳正常，延迟 23ms' },
  { id: 'l22', timestamp: '14:32:50.667', agent: '总调度器', level: 'INFO', message: '动态调整 ag-3 优先级: medium → high (负载均衡)' },
  { id: 'l23', timestamp: '14:32:52.889', agent: '测试代理-D', level: 'WARN', message: '测试用例 tc_api_042 不稳定，第 3 次重试' },
  { id: 'l24', timestamp: '14:32:55.012', agent: '数据分析-B', level: 'DEBUG', message: '聚合函数计算中: SUM, AVG, COUNT 并行执行' },
  { id: 'l25', timestamp: '14:32:57.234', agent: 'SYSTEM', level: 'INFO', message: '知识库同步完成: 技术文档 +12 条目' },
  { id: 'l26', timestamp: '14:32:59.456', agent: '文档生成-C', level: 'INFO', message: '接收手递手数据: 代码助手-A 的 API schema' },
  { id: 'l27', timestamp: '14:33:01.678', agent: '翻译专员-E', level: 'INFO', message: '第三章翻译完成，开始第四章: 部署指南' },
  { id: 'l28', timestamp: '14:33:03.901', agent: 'SYSTEM', level: 'WARN', message: '任务 mt-8 异常终止: 安全扫描超时' },
  { id: 'l29', timestamp: '14:33:06.123', agent: '代码助手-A', level: 'DEBUG', message: '缓存命中 89%，读取速度 1.2 GB/s' },
  { id: 'l30', timestamp: '14:33:08.345', agent: '总调度器', level: 'INFO', message: '报告生成-G 状态更新: paused → 等待人工确认' },
  { id: 'l31', timestamp: '14:33:10.567', agent: '测试代理-D', level: 'INFO', message: '集成测试完成 78/89，失败 3，跳过 8' },
  { id: 'l32', timestamp: '14:33:12.789', agent: '数据处理节点', level: 'DEBUG', message: '批处理进度: 批次 23/31，ETA 4 分钟' },
  { id: 'l33', timestamp: '14:33:15.012', agent: 'SYSTEM', level: 'INFO', message: 'AgentZero 干预就绪，当前自主级别: 3' },
  { id: 'l34', timestamp: '14:33:17.234', agent: '代码审查-F', level: 'WARN', message: '依赖库 lodash < 4.17.21 存在已知漏洞 CVE-2021-23337' },
  { id: 'l35', timestamp: '14:33:19.456', agent: '数据分析-B', level: 'INFO', message: 'Q4 报表生成完成: 收入 +23%，用户 +15%' },
  { id: 'l36', timestamp: '14:33:21.678', agent: 'SYSTEM', level: 'DEBUG', message: '拓扑优化: 减少 2 条冗余边，延迟降低 12ms' },
  { id: 'l37', timestamp: '14:33:23.901', agent: '翻译专员-E', level: 'DEBUG', message: '神经机器翻译 BLEU 分数: 42.3 (良好)' },
  { id: 'l38', timestamp: '14:33:26.123', agent: '文档生成-C', level: 'INFO', message: '生成 OpenAPI 文档: 156 个端点，覆盖率 98%' },
  { id: 'l39', timestamp: '14:33:28.345', agent: 'SYSTEM', level: 'WARN', message: '磁盘空间警告: /tmp 分区使用 87%' },
  { id: 'l40', timestamp: '14:33:30.567', agent: '测试代理-D', level: 'ERROR', message: '数据库连接池耗尽，无法创建新连接' },
  { id: 'l41', timestamp: '14:33:32.789', agent: '代码助手-A', level: 'INFO', message: '重构建议: 提取函数，减少圈复杂度从 23 → 8' },
  { id: 'l42', timestamp: '14:33:35.012', agent: '总调度器', level: 'DEBUG', message: '负载均衡: 将 mt-3 从 ag-3 迁移到 ag-1' },
  { id: 'l43', timestamp: '14:33:37.234', agent: '数据处理节点', level: 'INFO', message: '管道完成: 输出 8,234 条清洗记录到 /data/cleaned' },
  { id: 'l44', timestamp: '14:33:39.456', agent: 'SYSTEM', level: 'INFO', message: '自动保存检查点: checkpoint-20260115-143339' },
  { id: 'l45', timestamp: '14:33:41.678', agent: '翻译专员-E', level: 'WARN', message: '术语 "sharding" 翻译不确定，使用默认: 分片' },
  { id: 'l46', timestamp: '14:33:43.901', agent: '代码审查-F', level: 'INFO', message: 'PR#2847 审查完成: 1 修改请求，2 通过' },
  { id: 'l47', timestamp: '14:33:46.123', agent: 'SYSTEM', level: 'DEBUG', message: '内存 GC 完成: 释放 1.2 GB，当前使用 45%' },
  { id: 'l48', timestamp: '14:33:48.345', agent: '数据分析-B', level: 'INFO', message: '发送报表到邮件队列: report-q4-2026@company.com' },
  { id: 'l49', timestamp: '14:33:50.567', agent: '测试代理-D', level: 'INFO', message: '最终测试报告: 86.5% 通过率，建议人工复核' },
  { id: 'l50', timestamp: '14:33:52.789', agent: '总调度器', level: 'INFO', message: 'Swarm 会话总结: 7 完成, 3 运行中, 1 失败, 1 暂停' },
];

export const toolCalls: ToolCall[] = [
  { id: 'tc1', toolName: 'code_analysis', agent: '代码助手-A', params: '{"files": ["src/api/routes.ts", "src/db/queries.ts"], "depth": 3}', result: '{"issues": 3, "complexity": {"avg": 8.5, "max": 23}}', duration: '1.2s', status: 'success', timestamp: '14:32:15' },
  { id: 'tc2', toolName: 'data_query', agent: '数据分析-B', params: '{"table": "sales_q4", "aggregations": ["SUM", "AVG", "COUNT"], "filters": {"region": "APAC"}}', result: '{"rows": 1247, "revenue": 4523000, "growth": 0.23}', duration: '2.3s', status: 'success', timestamp: '14:32:18' },
  { id: 'tc3', toolName: 'translate_text', agent: '翻译专员-E', params: '{"text": "System Architecture Overview", "target": "ja", "context": "technical"}', result: '{"translation": "システムアーキテクチャ概要", "confidence": 0.94}', duration: '0.8s', status: 'running', timestamp: '14:32:24' },
  { id: 'tc4', toolName: 'run_tests', agent: '测试代理-D', params: '{"suite": "api_integration", "parallel": true, "timeout": 300}', result: '{"passed": 45, "failed": 3, "pending": 41}', duration: '6.5s', status: 'running', timestamp: '14:32:22' },
  { id: 'tc5', toolName: 'security_scan', agent: '代码审查-F', params: '{"target": "PR#2847", "rules": ["owasp-top-10", "cve-check"]}', result: '{"vulnerabilities": 1, "severity": "high", "cve": "CVE-2021-23337"}', duration: '3.1s', status: 'failed', timestamp: '14:32:27' },
  { id: 'tc6', toolName: 'generate_docs', agent: '文档生成-C', params: '{"schema": "/api/openapi.json", "template": "markdown"}', result: '{"endpoints": 156, "coverage": 0.98}', duration: '4.2s', status: 'success', timestamp: '14:33:26' },
  { id: 'tc7', toolName: 'data_pipeline', agent: '数据处理节点', params: '{"stages": ["clean", "normalize", "validate"], "input": "/data/raw/q4.csv"}', result: '{"records_in": 12345, "records_out": 8234, "rejected": 3111}', duration: '8.7s', status: 'success', timestamp: '14:33:37' },
  { id: 'tc8', toolName: 'memory_search', agent: '总调度器', params: '{"query": "Q4 sales report template", "top_k": 5}', result: '{"results": 3, "best_match": "template-sales-q4-v2"}', duration: '0.3s', status: 'success', timestamp: '14:32:30' },
  { id: 'tc9', toolName: 'send_email', agent: 'SYSTEM', params: '{"to": "team@company.com", "subject": "Q4 Report Ready", "attachment": "report.pdf"}', result: '{"status": "queued", "message_id": "msg_abc123"}', duration: '0.5s', status: 'success', timestamp: '14:33:48' },
  { id: 'tc10', toolName: 'db_migrate', agent: 'SYSTEM', params: '{"migration": "add_index_users_email", "dry_run": false}', result: '{"error": "Connection pool exhausted", "retry": true}', duration: '5.2s', status: 'failed', timestamp: '14:33:40' },
  { id: 'tc11', toolName: 'cache_clear', agent: 'SYSTEM', params: '{"pattern": "api:response:*", "async": true}', result: '{"cleared": 2341, "freed": "128MB"}', duration: '0.4s', status: 'success', timestamp: '14:32:48' },
  { id: 'tc12', toolName: 'code_format', agent: '代码助手-A', params: '{"files": ["*.ts", "*.tsx"], "formatter": "prettier"}', result: '{"formatted": 56, "unchanged": 12}', duration: '1.8s', status: 'success', timestamp: '14:32:50' },
];

export const handoffRecords: HandoffRecord[] = [
  { id: 'h1', fromAgent: '代码助手-A', toAgent: '文档生成-C', timestamp: '14:32:26', reason: '代码审查结果传递给文档团队', status: 'auto-approved', duration: '1.2s', dataSize: '256 KB' },
  { id: 'h2', fromAgent: '数据分析-B', toAgent: '翻译专员-E', timestamp: '14:32:32', reason: '分析报表需要翻译成日语', status: 'auto-approved', duration: '0.8s', dataSize: '1.2 MB' },
  { id: 'h3', fromAgent: '测试代理-D', toAgent: '代码审查-F', timestamp: '14:32:35', reason: '测试结果需要代码审查确认', status: 'needs-review', duration: '--', dataSize: '45 KB' },
  { id: 'h4', fromAgent: '数据处理节点', toAgent: '数据分析-B', timestamp: '14:33:15', reason: '清洗后的数据传递给分析', status: 'auto-approved', duration: '2.1s', dataSize: '8.2 MB' },
  { id: 'h5', fromAgent: '翻译专员-E', toAgent: '报告生成-G', timestamp: '14:33:20', reason: '翻译结果汇总到报告', status: 'needs-review', duration: '--', dataSize: '3.4 MB' },
  { id: 'h6', fromAgent: '代码审查-F', toAgent: '代码助手-A', timestamp: '14:33:25', reason: '审查反馈需要代码修改', status: 'rejected', duration: '--', dataSize: '12 KB' },
  { id: 'h7', fromAgent: '总调度器', toAgent: '测试代理-D', timestamp: '14:33:30', reason: '紧急测试任务分配', status: 'auto-approved', duration: '0.3s', dataSize: '8 KB' },
  { id: 'h8', fromAgent: '数据分析-B', toAgent: '总调度器', timestamp: '14:33:45', reason: 'Q4 报表完成汇报', status: 'auto-approved', duration: '0.5s', dataSize: '156 KB' },
];

export const checkpoints: Checkpoint[] = [
  { id: 'cp1', label: '初始状态检查点', timestamp: '14:30:00', agent: '总调度器' },
  { id: 'cp2', label: '数据处理前', timestamp: '14:32:00', agent: '数据处理节点' },
  { id: 'cp3', label: '代码审查完成', timestamp: '14:33:00', agent: '代码助手-A' },
  { id: 'cp4', label: '翻译第三章完成', timestamp: '14:33:15', agent: '翻译专员-E' },
  { id: 'cp5', label: '集成测试 78%', timestamp: '14:33:30', agent: '测试代理-D' },
];

export const interventionHistory: InterventionRecord[] = [
  { id: 'i1', timestamp: '14:30:15', user: '管理员', action: '调整自主级别 4 → 3', agent: '全局', result: '已应用，减少自动批准' },
  { id: 'i2', timestamp: '14:31:20', user: '管理员', action: '暂停报告生成-G', agent: '报告生成-G', result: '已暂停，等待确认' },
  { id: 'i3', timestamp: '14:32:10', user: 'AgentZero', action: '自动批准手递手 h2', agent: '数据分析-B → 翻译专员-E', result: '置信度 0.94，已批准' },
  { id: 'i4', timestamp: '14:32:45', user: '管理员', action: '要求复核安全扫描', agent: '代码审查-F', result: '等待人工确认' },
  { id: 'i5', timestamp: '14:33:05', user: 'AgentZero', action: '自动重试 db_migrate', agent: 'SYSTEM', result: '重试中...' },
];

export const streamTokens = [
  '正在分析代码库结构...',
  '发现 156 个文件，15 个目录',
  '构建依赖关系图...',
  '深度分析完成，复杂度评分: B+',
  '生成审查报告...',
  '发现 3 个问题: 1 严重, 2 建议',
  '正在写入结果...',
  '任务完成，准备手递手',
];

export const systemPrompt = `You are an expert code reviewer AI agent. Your responsibilities include:
- Analyzing code quality and maintainability
- Identifying security vulnerabilities
- Checking performance bottlenecks
- Ensuring coding standards compliance
- Providing actionable improvement suggestions

Current task: Review PR#2847 - API route optimization
Context: Node.js/TypeScript backend service
Priority: High
Deadline: 14:45:00`;

export const jsonParams = {
  "review_config": {
    "depth": 3,
    "check_security": true,
    "check_performance": true,
    "max_complexity": 15,
    "rules": ["owasp-top-10", "eslint-recommended", "typescript-strict"]
  },
  "output_format": "markdown",
  "notify_on_complete": true,
  "auto_handoff": true
};
