import type {
  Agent,
  Task,
  Platform,
  KnowledgeBase,
  WorkspaceFile,
  ActivityEvent,
  HealthMetric,
  QuickAccessTile,
  StatusItem,
} from '@/types';

export const agents: Agent[] = [
  {
    id: 'agent-1',
    name: '代码助手-01',
    nameEn: 'Code Assistant-01',
    status: 'running',
    avatarType: 'leaf',
    accentColor: '#7fb89f',
    currentTask: '正在分析代码库结构并生成依赖关系图...',
    platform: 'OpenAI',
    progress: 67,
    createdAt: '2026-01-10T08:00:00',
  },
  {
    id: 'agent-2',
    name: '数据分析-A',
    nameEn: 'Data Analyst-A',
    status: 'running',
    avatarType: 'flower',
    accentColor: '#c97b84',
    currentTask: '处理销售数据报表 Q4 汇总...',
    platform: 'Kimi',
    progress: 34,
    createdAt: '2026-01-12T10:00:00',
  },
  {
    id: 'agent-3',
    name: '文档撰写-B',
    nameEn: 'Doc Writer-B',
    status: 'idle',
    avatarType: 'tree',
    accentColor: '#d4a373',
    currentTask: '等待新任务分配...',
    platform: 'Claude',
    progress: 0,
    createdAt: '2026-01-08T14:00:00',
  },
  {
    id: 'agent-4',
    name: '翻译专员',
    nameEn: 'Translator',
    status: 'running',
    avatarType: 'fern',
    accentColor: '#a78b9a',
    currentTask: '翻译技术文档至日语（第三章进行中）...',
    platform: 'GPT-4',
    progress: 91,
    createdAt: '2026-01-14T09:00:00',
  },
  {
    id: 'agent-5',
    name: '测试工程师',
    nameEn: 'Test Engineer',
    status: 'running',
    avatarType: 'mushroom',
    accentColor: '#7fa3b0',
    currentTask: '运行集成测试套件（API 模块）...',
    platform: 'Ollama',
    progress: 12,
    createdAt: '2026-01-15T06:00:00',
  },
];

export const tasks: Task[] = [
  { id: 'task-1', name: '代码审查 #2847', agentId: 'agent-1', agentName: '代码助手-01', status: 'completed', priority: 'high', progress: 100, createdAt: '2026-01-15T13:00:00', completedAt: '2026-01-15T14:32:00' },
  { id: 'task-2', name: '数据分析报表', agentId: 'agent-2', agentName: '数据分析-A', status: 'running', priority: 'high', progress: 34, createdAt: '2026-01-15T12:00:00' },
  { id: 'task-3', name: 'API文档撰写', agentId: 'agent-3', agentName: '文档撰写-B', status: 'pending', priority: 'medium', progress: 0, createdAt: '2026-01-15T11:00:00' },
  { id: 'task-4', name: '技术文档翻译', agentId: 'agent-4', agentName: '翻译专员', status: 'running', priority: 'medium', progress: 91, createdAt: '2026-01-15T10:00:00' },
  { id: 'task-5', name: '集成测试运行', agentId: 'agent-5', agentName: '测试工程师', status: 'running', priority: 'high', progress: 12, createdAt: '2026-01-15T09:00:00' },
  { id: 'task-6', name: '代码重构 #2846', agentId: 'agent-1', agentName: '代码助手-01', status: 'completed', priority: 'medium', progress: 100, createdAt: '2026-01-15T08:00:00', completedAt: '2026-01-15T12:30:00' },
  { id: 'task-7', name: '数据清洗任务', agentId: 'agent-2', agentName: '数据分析-A', status: 'completed', priority: 'low', progress: 100, createdAt: '2026-01-15T07:00:00', completedAt: '2026-01-15T11:45:00' },
  { id: 'task-8', name: '任务 #2845', agentId: 'agent-3', agentName: '文档撰写-B', status: 'failed', priority: 'high', progress: 45, createdAt: '2026-01-15T06:00:00' },
];

export const platforms: Platform[] = [
  { id: 'plat-1', name: 'OpenAI GPT-4', status: 'connected', latency: 23, model: 'gpt-4o', lastSeen: '刚刚' },
  { id: 'plat-2', name: 'Kimi k1.5', status: 'connected', latency: 156, model: 'moonshot-v1', lastSeen: '1分钟前' },
  { id: 'plat-3', name: 'Ollama (本地)', status: 'connected', latency: 12, model: 'llama3.1', lastSeen: '5分钟前' },
  { id: 'plat-4', name: 'Claude 3.5', status: 'connected', latency: 45, model: 'claude-sonnet', lastSeen: '2分钟前' },
  { id: 'plat-5', name: 'Gemini Pro', status: 'connected', latency: 67, model: 'gemini-1.5', lastSeen: '3分钟前' },
];

export const knowledgeBases: KnowledgeBase[] = [
  { id: 'kb-1', name: '技术文档', entryCount: 1247, lastUpdated: '2026-01-15T14:15:00', status: 'synced' },
  { id: 'kb-2', name: '产品知识库', entryCount: 356, lastUpdated: '2026-01-14T10:00:00', status: 'synced' },
  { id: 'kb-3', name: 'API 参考手册', entryCount: 892, lastUpdated: '2026-01-15T08:30:00', status: 'synced' },
  { id: 'kb-4', name: '设计规范', entryCount: 234, lastUpdated: '2026-01-13T16:00:00', status: 'synced' },
  { id: 'kb-5', name: '会议纪要', entryCount: 567, lastUpdated: '2026-01-15T12:00:00', status: 'syncing' },
];

export const workspaceFiles: WorkspaceFile[] = [
  { id: 'wf-1', name: 'project-spec.md', type: 'markdown', size: '24 KB', modifiedAt: '2026-01-15T14:00:00', agentId: 'agent-3' },
  { id: 'wf-2', name: 'api-schema.json', type: 'json', size: '156 KB', modifiedAt: '2026-01-15T13:30:00', agentId: 'agent-1' },
  { id: 'wf-3', name: 'sales-data-q4.csv', type: 'csv', size: '2.1 MB', modifiedAt: '2026-01-15T12:00:00', agentId: 'agent-2' },
  { id: 'wf-4', name: 'translation-ja.po', type: 'po', size: '89 KB', modifiedAt: '2026-01-15T11:00:00', agentId: 'agent-4' },
  { id: 'wf-5', name: 'test-results.xml', type: 'xml', size: '456 KB', modifiedAt: '2026-01-15T10:00:00', agentId: 'agent-5' },
];

export const activityEvents: ActivityEvent[] = [
  { id: 'evt-1', type: 'task_completed', title: 'Agent-代码助手 完成了任务 #2847: 代码审查', time: '14:32', timestamp: Date.now() - 120000 },
  { id: 'evt-2', type: 'agent_handoff', title: 'Agent-数据分析 → Agent-报告生成 手递手完成', time: '14:28', timestamp: Date.now() - 360000 },
  { id: 'evt-3', type: 'knowledge_update', title: "知识库 '技术文档' 更新了 12 个条目", time: '14:15', timestamp: Date.now() - 1140000 },
  { id: 'evt-4', type: 'agent_created', title: "新智能体 '测试工程师' 已创建", time: '13:50', timestamp: Date.now() - 2640000 },
  { id: 'evt-5', type: 'task_failed', title: '任务 #2845 失败: API超时 — 已自动重试', time: '13:45', timestamp: Date.now() - 2940000 },
  { id: 'evt-6', type: 'platform_event', title: "平台 'Ollama' 连接已恢复", time: '13:20', timestamp: Date.now() - 4440000 },
  { id: 'evt-7', type: 'task_completed', title: "协作群组 '开发团队' 启动新会话", time: '12:00', timestamp: Date.now() - 9120000 },
  { id: 'evt-8', type: 'system', title: '系统备份完成 · 备份大小 2.1 GB', time: '11:30', timestamp: Date.now() - 10920000 },
];

export const healthMetrics: HealthMetric[] = [
  { id: 'hm-1', name: 'API 响应延迟', nameEn: 'API Latency', value: '平均 45ms', current: 45, max: 200, unit: 'ms', status: '优秀', statusEn: 'Excellent' },
  { id: 'hm-2', name: '智能体内存占用', nameEn: 'Agent Memory', value: '2.3 GB / 8 GB', current: 2.3, max: 8, unit: 'GB', status: '正常', statusEn: 'Normal' },
  { id: 'hm-3', name: '知识库索引状态', nameEn: 'KB Index', value: '23 个索引 · 全部就绪', current: 100, max: 100, unit: '%', status: '已同步', statusEn: 'Synced' },
  { id: 'hm-4', name: '磁盘空间', nameEn: 'Disk Space', value: '47 GB / 256 GB', current: 47, max: 256, unit: 'GB', status: '充足', statusEn: 'Adequate' },
];

export const quickAccessTiles: QuickAccessTile[] = [
  { id: 'qa-1', label: '新建智能体', labelEn: 'New Agent', icon: 'Bot', color: '#6b7a5a', route: '/agents/create' },
  { id: 'qa-2', label: '新建任务', labelEn: 'New Task', icon: 'PlusCircle', color: '#7fb89f', route: '#' },
  { id: 'qa-3', label: '平台管理', labelEn: 'Platform Hub', icon: 'Server', color: '#c9a96e', route: '/platform' },
  { id: 'qa-4', label: '工作空间', labelEn: 'Workspace', icon: 'FolderOpen', color: '#d4a373', route: '/workspace' },
  { id: 'qa-5', label: '知识库', labelEn: 'Knowledge', icon: 'BookOpen', color: '#a78b9a', route: '/knowledge' },
  { id: 'qa-6', label: '监控中心', labelEn: 'Monitor', icon: 'Activity', color: '#c97b84', route: '/agents/monitor' },
];

export const statusItems: StatusItem[] = [
  { id: 'st-1', name: 'OpenAI GPT-4', status: 'online', detail: '正常 · 延迟 23ms', time: '刚刚' },
  { id: 'st-2', name: 'Kimi k1.5', status: 'online', detail: '正常 · 延迟 156ms', time: '1分钟前' },
  { id: 'st-3', name: 'Ollama (本地)', status: 'online', detail: '运行中 · 模型 loaded', time: '5分钟前' },
  { id: 'st-4', name: 'Agent-代码助手', status: 'busy', detail: '执行任务 #2847', time: '进行中' },
  { id: 'st-5', name: 'Agent-数据分析', status: 'busy', detail: '等待手递手', time: '10秒前' },
  { id: 'st-6', name: 'Agent-文档撰写', status: 'idle', detail: '空闲', time: '3分钟前' },
];

export const taskActivityData = {
  today: [
    { hour: '00:00', created: 2, completed: 1, failed: 0 },
    { hour: '01:00', created: 1, completed: 0, failed: 0 },
    { hour: '02:00', created: 0, completed: 1, failed: 0 },
    { hour: '03:00', created: 0, completed: 0, failed: 0 },
    { hour: '04:00', created: 0, completed: 0, failed: 0 },
    { hour: '05:00', created: 1, completed: 1, failed: 0 },
    { hour: '06:00', created: 3, completed: 2, failed: 1 },
    { hour: '07:00', created: 5, completed: 3, failed: 0 },
    { hour: '08:00', created: 8, completed: 6, failed: 1 },
    { hour: '09:00', created: 12, completed: 8, failed: 0 },
    { hour: '10:00', created: 15, completed: 10, failed: 1 },
    { hour: '11:00', created: 10, completed: 9, failed: 0 },
    { hour: '12:00', created: 7, completed: 8, failed: 1 },
    { hour: '13:00', created: 9, completed: 7, failed: 0 },
    { hour: '14:00', created: 11, completed: 8, failed: 1 },
    { hour: '15:00', created: 6, completed: 5, failed: 0 },
  ],
  week: [
    { hour: '周一', created: 45, completed: 38, failed: 3 },
    { hour: '周二', created: 52, completed: 48, failed: 1 },
    { hour: '周三', created: 38, completed: 35, failed: 2 },
    { hour: '周四', created: 61, completed: 54, failed: 4 },
    { hour: '周五', created: 42, completed: 40, failed: 1 },
    { hour: '周六', created: 28, completed: 25, failed: 2 },
    { hour: '周日', created: 15, completed: 12, failed: 1 },
  ],
  month: [
    { hour: '第1周', created: 180, completed: 165, failed: 8 },
    { hour: '第2周', created: 220, completed: 198, failed: 12 },
    { hour: '第3周', created: 195, completed: 185, failed: 5 },
    { hour: '第4周', created: 281, completed: 247, failed: 14 },
  ],
};

export const statsData = [
  { label: '运行中智能体', labelEn: 'Running Agents', value: 12, trend: '+3 今日新增', trendType: 'up' as const, color: '#7fb89f', icon: 'Bot' },
  { label: '今日任务', labelEn: 'Tasks Today', value: 48, trend: '89% 完成率', trendType: 'up' as const, color: '#7fa3b0', icon: 'CheckSquare' },
  { label: '已连接平台', labelEn: 'Platforms', value: 5, trend: '全部正常', trendType: 'neutral' as const, color: '#c9a96e', icon: 'Server' },
  { label: '知识库条目', labelEn: 'Knowledge Bases', value: 23, trend: '+156 本周新增', trendType: 'up' as const, color: '#a78b9a', icon: 'BookOpen' },
  { label: '工作文件', labelEn: 'Workspace Files', value: 1247, trend: '+89 今日', trendType: 'up' as const, color: '#d4a373', icon: 'FolderOpen' },
  { label: '协作群组', labelEn: 'Collaborations', value: 8, trend: '3 活跃中', trendType: 'up' as const, color: '#c97b84', icon: 'Users' },
];
