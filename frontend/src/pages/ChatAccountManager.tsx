import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Loader2,
  Search,
  X,
  Check,
} from 'lucide-react';
import ChatAccountForm, { ChatAccountFormData, ChatChannelType } from '@/components/ChatAccountForm';
import ChatAccountCard, { ChatAccount, ChatAccountStatus } from '@/components/ChatAccountCard';
import {
  fetchChatAccounts,
  createChatAccount,
  updateChatAccount,
  deleteChatAccount,
  connectChatAccount,
  disconnectChatAccount,
  testChatAccount,
  generateQRCode,
  getQRStatus,
  fetchPlatforms,
} from '@/api/client';

/* ── Mock fallback removed ── */

export default function ChatAccountManager() {
  const [accounts, setAccounts] = useState<ChatAccount[]>([]);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChatAccountFormData>({
    name: '',
    platformId: '',
    channelType: 'wechat',
    config: {},
  });
  const [saving, setSaving] = useState(false);

  // QR
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [qrInterval, setQrInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load
  useEffect(() => {
    async function load() {
      try {
        const [accRes, platRes]: any = await Promise.all([
          fetchChatAccounts().catch(() => null),
          fetchPlatforms().catch(() => null),
        ]);
        const accData = accRes?.data || accRes || [];
        const platData = platRes?.data || platRes || [];
        const mappedAccounts = Array.isArray(accData)
          ? accData.map((a: any) => ({
              id: a.id,
              name: a.name,
              platformId: a.platformId,
              platformName: a.platformName || a.platform?.name || '未知平台',
              channelType: a.channelType,
              status: a.status || 'pending',
              connectedAt: a.connectedAt,
              lastMessageAt: a.lastMessageAt,
              config: a.config || {},
            }))
          : [];
        setAccounts(mappedAccounts);
        setPlatforms(Array.isArray(platData) ? platData.map((p: any) => ({ id: p.id, name: p.name })) : []);
      } catch (e) {
        console.error('Failed to load chat accounts:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (qrInterval) clearInterval(qrInterval);
    };
  }, [qrInterval]);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.platformName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.channelType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({ name: '', platformId: '', channelType: 'wechat', config: {} });
    setQrCodeUrl(null);
    setQrStatus(null);
    setShowModal(true);
  };

  const openEdit = (account: ChatAccount) => {
    setModalMode('edit');
    setEditingId(account.id);
    setFormData({
      name: account.name,
      platformId: account.platformId,
      channelType: account.channelType as ChatChannelType,
      config: account.config || {},
    });
    setQrCodeUrl(null);
    setQrStatus(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    if (qrInterval) {
      clearInterval(qrInterval);
      setQrInterval(null);
    }
    setQrCodeUrl(null);
    setQrStatus(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.platformId || !formData.channelType) return;
    setSaving(true);
    try {
      if (editingId) {
        const res: any = await updateChatAccount(editingId, {
          name: formData.name,
          config: formData.config,
        });
        const updated = res?.data || res;
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  ...updated,
                  name: formData.name,
                  platformName: platforms.find((p) => p.id === formData.platformId)?.name || a.platformName,
                }
              : a
          )
        );
      } else {
        const res: any = await createChatAccount({
          name: formData.name,
          platformId: formData.platformId,
          channelType: formData.channelType,
          config: formData.config,
        });
        const newAccount = res?.data || res;
        setAccounts((prev) => [
          {
            id: newAccount.id || `ca-${Date.now()}`,
            name: formData.name,
            platformId: formData.platformId,
            platformName: platforms.find((p) => p.id === formData.platformId)?.name || '',
            channelType: formData.channelType,
            status: 'pending',
            config: formData.config,
          },
          ...prev,
        ]);
      }
      closeModal();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此聊天账号？')) return;
    try {
      await deleteChatAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      await connectChatAccount(id);
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'connected' as ChatAccountStatus, connectedAt: new Date().toISOString().split('T')[0] }
            : a
        )
      );
    } catch (e) {
      console.error('Connect failed:', e);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectChatAccount(id);
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'disconnected' as ChatAccountStatus } : a)));
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await testChatAccount(id);
      alert('测试消息已发送');
    } catch (e) {
      alert('测试失败');
      console.error('Test failed:', e);
    }
  };

  const handleGenerateQR = async () => {
    try {
      let targetId = editingId;
      if (!targetId) {
        const res: any = await createChatAccount({
          name: formData.name || '微信账号',
          platformId: formData.platformId,
          channelType: 'wechat',
          config: {},
        });
        targetId = res?.data?.id || res?.id;
        if (targetId) {
          setEditingId(targetId);
          setAccounts((prev) => [
            {
              id: targetId,
              name: formData.name || '微信账号',
              platformId: formData.platformId,
              platformName: platforms.find((p) => p.id === formData.platformId)?.name || '',
              channelType: 'wechat',
              status: 'configuring',
              config: {},
            },
            ...prev,
          ]);
        }
      }
      if (!targetId) return;
      const qrRes: any = await generateQRCode(targetId);
      const url = qrRes?.qrCodeUrl || qrRes?.data?.qrCodeUrl || qrRes?.url;
      setQrCodeUrl(url);
      if (qrInterval) clearInterval(qrInterval);
      const interval = setInterval(async () => {
        try {
          const statusRes: any = await getQRStatus(targetId);
          const status = statusRes?.status || statusRes?.data?.status;
          setQrStatus(status);
          if (status === 'connected' || status === 'expired' || status === 'error') {
            clearInterval(interval);
            setQrInterval(null);
            if (status === 'connected') {
              setAccounts((prev) => prev.map((a) => (a.id === targetId ? { ...a, status: 'connected' as ChatAccountStatus } : a)));
            }
          }
        } catch (err) {
          clearInterval(interval);
          setQrInterval(null);
        }
      }, 3000);
      setQrInterval(interval);
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  };

  const connectedCount = accounts.filter((a) => a.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">聊天账号管理</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {accounts.length} 账号 · {connectedCount} 已连接
            </p>
          </div>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索账号..."
            className="w-full pl-10 pr-4 py-2 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
      </div>

      {/* Stats + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="card p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-[var(--sage-700)]">{connectedCount} 已连接</span>
          </div>
          <div className="card p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--sage-400)]" />
            <span className="text-sm font-medium text-[var(--sage-700)]">{accounts.length - connectedCount} 未连接</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--sage-300)]" />
          <p className="text-sm text-[var(--sage-500)]">暂无聊天账号</p>
          <button onClick={openAdd} className="mt-3 text-sm text-[var(--sage-600)] hover:underline">
            立即添加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <ChatAccountCard
              key={account.id}
              account={account}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onEdit={openEdit}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-[480px] max-w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--sage-800)]">
                {modalMode === 'add' ? '添加聊天账号' : '编辑聊天账号'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                style={{ color: 'var(--sage-400)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ChatAccountForm
              data={formData}
              onChange={setFormData}
              platforms={platforms}
              onGenerateQR={handleGenerateQR}
              qrCodeUrl={qrCodeUrl}
              qrStatus={qrStatus}
              isEditing={modalMode === 'edit'}
            />
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.platformId || !formData.channelType}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
