export type ThemeMode = 'light' | 'dark';
export type Language = 'zh' | 'en';

export interface Agent {
  id: string;
  name: string;
  nameEn: string;
  status: 'running' | 'idle' | 'waiting' | 'error';
  avatarType: 'leaf' | 'flower' | 'tree' | 'fern' | 'mushroom' | 'vine' | 'seed' | 'petal';
  accentColor: string;
  currentTask: string;
  platform: string;
  progress: number;
  createdAt: string;
}

export interface Task {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  createdAt: string;
  completedAt?: string;
}

export interface Platform {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  latency: number;
  model: string;
  lastSeen: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  entryCount: number;
  lastUpdated: string;
  status: 'synced' | 'syncing' | 'error';
}

export interface WorkspaceFile {
  id: string;
  name: string;
  type: string;
  size: string;
  modifiedAt: string;
  agentId?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'agent_created' | 'task_completed' | 'task_failed' | 'agent_handoff' | 'knowledge_update' | 'platform_event' | 'system';
  title: string;
  time: string;
  timestamp: number;
}

export interface HealthMetric {
  id: string;
  name: string;
  nameEn: string;
  value: string;
  current: number;
  max: number;
  unit: string;
  status: string;
  statusEn: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  read: boolean;
  timestamp: number;
}

export interface QuickAccessTile {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  route: string;
}

export interface StatusItem {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  detail: string;
  time: string;
}
