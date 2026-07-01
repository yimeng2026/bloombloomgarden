import { Link, Unlink, Edit3, Trash2, TestTube, MessageSquare, Smartphone, Globe, Layers } from 'lucide-react';

export type ChatAccountStatus = 'pending' | 'configuring' | 'connected' | 'disconnected' | 'error';

export interface ChatAccount {
  id: string;
  name: string;
  platformId: string;
  platformName: string;
  channelType: string;
  status: ChatAccountStatus;
  connectedAt?: string;
  lastMessageAt?: string;
  config: Record<string, string>;
}

const STATUS_CONFIG: Record<ChatAccountStatus, { color: string; bg: string; label: string }> = {
  pending: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: '待配置' },
  configuring: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '配置中' },
  connected: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '已连接' },
  disconnected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '已断开' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '错误' },
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  wechat: Smartphone,
  discord: MessageSquare,
  telegram: MessageSquare,
  slack: MessageSquare,
  whatsapp: MessageSquare,
  line: MessageSquare,
  teams: Globe,
  matrix: Layers,
};

interface ChatAccountCardProps {
  account: ChatAccount;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (account: ChatAccount) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

export default function ChatAccountCard({ account, onConnect, onDisconnect, onEdit, onDelete, onTest }: ChatAccountCardProps) {
  const status = STATUS_CONFIG[account.status] || STATUS_CONFIG.pending;
  const ChannelIcon = CHANNEL_ICONS[account.channelType] || MessageSquare;

  return (
    <div className="card p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
            <ChannelIcon className="w-5 h-5 text-[var(--sage-500)]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--sage-800)]">{account.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-[var(--sage-500)]">{account.platformName}</span>
              <span className="text-[10px] text-[var(--sage-300)]">·</span>
              <span className="text-[10px] text-[var(--sage-500)]">{account.channelType}</span>
            </div>
          </div>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-semibold"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
        <span>
          {account.connectedAt
            ? `连接: ${account.connectedAt}`
            : account.lastMessageAt
            ? `最后消息: ${account.lastMessageAt}`
            : '未连接'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {account.status === 'connected' ? (
          <button
            onClick={() => onDisconnect(account.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]"
            style={{ color: 'var(--error)' }}
            title="断开"
          >
            <Unlink className="w-3.5 h-3.5" />
            断开
          </button>
        ) : (
          <button
            onClick={() => onConnect(account.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]"
            style={{ color: '#10b981' }}
            title="连接"
          >
            <Link className="w-3.5 h-3.5" />
            连接
          </button>
        )}
        <button
          onClick={() => onTest(account.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]"
          style={{ color: 'var(--sage-500)' }}
          title="测试"
        >
          <TestTube className="w-3.5 h-3.5" />
          测试
        </button>
        <button
          onClick={() => onEdit(account)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]"
          style={{ color: 'var(--sage-500)' }}
          title="编辑"
        >
          <Edit3 className="w-3.5 h-3.5" />
          编辑
        </button>
        <button
          onClick={() => onDelete(account.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-card-sm text-xs font-medium transition-all hover:bg-[var(--sage-100)]"
          style={{ color: 'var(--error)' }}
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </button>
      </div>
    </div>
  );
}
