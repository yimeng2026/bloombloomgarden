import { useState } from 'react';
import { Eye, EyeOff, QrCode, Loader2, Smartphone } from 'lucide-react';

export type ChatChannelType = 'wechat' | 'discord' | 'telegram' | 'slack' | 'whatsapp' | 'line' | 'teams' | 'matrix';

export interface ChatAccountFormData {
  name: string;
  platformId: string;
  channelType: ChatChannelType;
  config: Record<string, string>;
}

const CHANNEL_TYPE_OPTIONS: { value: ChatChannelType; label: string }[] = [
  { value: 'wechat', label: '微信' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'slack', label: 'Slack' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'line', label: 'LINE' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'matrix', label: 'Matrix' },
];

const CONFIG_FIELDS: Record<ChatChannelType, { key: string; label: string; type?: string; placeholder?: string }[]> = {
  discord: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '请输入 Bot Token' },
    { key: 'guildId', label: 'Guild ID', placeholder: '请输入 Guild ID' },
  ],
  telegram: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '请输入 Bot Token' },
    { key: 'chatId', label: 'Chat ID', placeholder: '请输入 Chat ID' },
  ],
  slack: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
    { key: 'appToken', label: 'App Token', type: 'password', placeholder: 'xapp-...' },
    { key: 'signingSecret', label: 'Signing Secret', type: 'password', placeholder: '请输入 Signing Secret' },
  ],
  whatsapp: [
    { key: 'businessToken', label: 'Business Token', type: 'password', placeholder: '请输入 Business Token' },
    { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '请输入 Phone Number ID' },
  ],
  line: [
    { key: 'channelToken', label: 'Channel Token', type: 'password', placeholder: '请输入 Channel Token' },
    { key: 'channelSecret', label: 'Channel Secret', type: 'password', placeholder: '请输入 Channel Secret' },
  ],
  teams: [
    { key: 'tenantId', label: 'Tenant ID', placeholder: '请输入 Tenant ID' },
    { key: 'clientId', label: 'Client ID', placeholder: '请输入 Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '请输入 Client Secret' },
  ],
  matrix: [
    { key: 'token', label: 'Token / API Key', type: 'password', placeholder: '请输入 Token' },
    { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://...' },
  ],
  wechat: [
    { key: 'qrCode', label: '二维码', type: 'qr' },
  ],
};

interface ChatAccountFormProps {
  data: ChatAccountFormData;
  onChange: (data: ChatAccountFormData) => void;
  platforms: { id: string; name: string }[];
  onGenerateQR?: () => Promise<void>;
  qrCodeUrl?: string | null;
  qrStatus?: string | null;
  isEditing?: boolean;
}

export default function ChatAccountForm({ data, onChange, platforms, onGenerateQR, qrCodeUrl, qrStatus, isEditing }: ChatAccountFormProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [generatingQR, setGeneratingQR] = useState(false);

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerateQR = async () => {
    if (!onGenerateQR) return;
    setGeneratingQR(true);
    try {
      await onGenerateQR();
    } catch (e) {
      // error handled by parent
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    onChange({
      ...data,
      config: { ...data.config, [key]: value },
    });
  };

  const fields = CONFIG_FIELDS[data.channelType] || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">绑定平台</label>
        <select
          value={data.platformId}
          onChange={(e) => onChange({ ...data, platformId: e.target.value })}
          disabled={isEditing}
          className="w-full px-3 py-2 rounded-card border text-sm disabled:opacity-60"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-700)' }}
        >
          <option value="">选择平台...</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">聊天软件类型</label>
        <select
          value={data.channelType}
          onChange={(e) => onChange({ ...data, channelType: e.target.value as ChatChannelType, config: {} })}
          disabled={isEditing}
          className="w-full px-3 py-2 rounded-card border text-sm disabled:opacity-60"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-700)' }}
        >
          <option value="">选择类型...</option>
          {CHANNEL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">账号名称</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="例如：微信客服1号"
          className="w-full px-3 py-2 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-700)' }}
        />
      </div>

      {data.channelType && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h4 className="text-xs font-semibold text-[var(--sage-700)]">配置参数</h4>
          {fields.map((field) => {
            if (field.type === 'qr') {
              return (
                <div key={field.key} className="space-y-2">
                  {!qrCodeUrl ? (
                    <button
                      onClick={handleGenerateQR}
                      disabled={generatingQR}
                      className="flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
                    >
                      {generatingQR ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      {generatingQR ? '生成中...' : '点击生成二维码'}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-4 rounded-card border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}>
                      <img src={qrCodeUrl} alt="微信登录二维码" className="w-48 h-48 rounded-lg" />
                      <div className="flex items-center gap-2 text-xs text-[var(--sage-500)]">
                        <Smartphone className="w-4 h-4" />
                        <span>请使用微信扫码登录</span>
                      </div>
                      {qrStatus && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>
                          状态: {qrStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const isPassword = field.type === 'password';
            const revealedKey = `${data.channelType}-${field.key}`;
            const isRevealed = revealed.has(revealedKey);

            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type={isPassword && !isRevealed ? 'password' : 'text'}
                    value={data.config[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 px-3 py-2 rounded-card border text-sm"
                    style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-700)' }}
                  />
                  {isPassword && (
                    <button
                      onClick={() => toggleReveal(revealedKey)}
                      className="p-2 rounded hover:bg-[var(--sage-100)] transition-colors"
                      style={{ color: 'var(--sage-400)' }}
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
