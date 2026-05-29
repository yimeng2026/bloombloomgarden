import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Palette,
  Bell,
  Shield,
  Plug,
  Globe,
  SlidersHorizontal,
  Info,
  Check,
  Sun,
  Moon,
  Monitor,
  Type,
  Maximize2,
  Minimize2,
  Zap,
  Volume2,
  VolumeX,
  Mail,
  Clock,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Github,
  FileText,
  MessageSquare,
  Heart,
  ChevronDown,
  Save,
  RotateCcw,
  AlertTriangle,
  Bug,
  Database,
  Trash2,
  Wifi,
  Loader2,
} from 'lucide-react';
import ContentCard from '@/components/ContentCard';

/* ──────────────────────── easing helper ──────────────────────── */

const easeGentle = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ──────────────────────── setting types ──────────────────────── */

interface SettingSection {
  label: string;
  description: string;
  control: React.ReactNode;
}

/* ──────────────────────── settings tabs config ──────────────────────── */

const settingsTabs = [
  { id: 'general', label: '通用', icon: Settings, en: 'General' },
  { id: 'appearance', label: '外观', icon: Palette, en: 'Appearance' },
  { id: 'notifications', label: '通知', icon: Bell, en: 'Notifications' },
  { id: 'security', label: '安全', icon: Shield, en: 'Security' },
  { id: 'integrations', label: '集成', icon: Plug, en: 'Integrations' },
  { id: 'language', label: '语言', icon: Globe, en: 'Language' },
  { id: 'advanced', label: '高级', icon: SlidersHorizontal, en: 'Advanced' },
  { id: 'about', label: '关于', icon: Info, en: 'About' },
] as const;

type SettingsTabId = (typeof settingsTabs)[number]['id'];

/* ──────────────────────── main component ──────────────────────── */

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [unsavedTabs, setUnsavedTabs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);

  const markUnsaved = useCallback((tabId: string) => {
    setUnsavedTabs((prev) => new Set(prev).add(tabId));
    setSavedConfirm(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setUnsavedTabs(new Set());
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 3000);
  };

  const handleReset = () => {
    setUnsavedTabs(new Set());
    setSavedConfirm(false);
  };

  const hasUnsaved = unsavedTabs.has(activeTab);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeGentle }}
      >
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--sage-800)' }}>
          设置
          <span className="ml-3 text-base font-normal" style={{ color: 'var(--sage-400)' }}>Settings</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sage-500)' }}>
          管理系统设置与个性化选项 · Manage system settings and preferences
        </p>
      </motion.div>

      {/* Settings Layout: vertical sidebar + content */}
      <div className="flex gap-6">
        {/* Settings Sidebar */}
        <motion.div
          className="w-52 flex-shrink-0 hidden md:block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: easeGentle, delay: 0.1 }}
        >
          <div
            className="rounded-card border p-2 space-y-1 sticky top-4"
            style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
          >
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? 'var(--sage-500)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--sage-600)',
                  }}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {unsavedTabs.has(tab.id) && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? '#fff' : 'var(--bloom-amber)' }} />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="settings-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-white"
                      transition={{ duration: 0.2, ease: easeGentle }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden w-full">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as SettingsTabId)}
              className="w-full px-4 py-3 rounded-card border text-sm font-medium appearance-none cursor-pointer"
              style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
            >
              {settingsTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} · {tab.en}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--sage-400)' }} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25, ease: easeGentle }}
            >
              {activeTab === 'general' && <GeneralSettings onChange={() => markUnsaved('general')} />}
              {activeTab === 'appearance' && <AppearanceSettings onChange={() => markUnsaved('appearance')} />}
              {activeTab === 'notifications' && <NotificationSettings onChange={() => markUnsaved('notifications')} />}
              {activeTab === 'security' && <SecuritySettings onChange={() => markUnsaved('security')} />}
              {activeTab === 'integrations' && <IntegrationSettings onChange={() => markUnsaved('integrations')} />}
              {activeTab === 'language' && <LanguageSettings onChange={() => markUnsaved('language')} />}
              {activeTab === 'advanced' && <AdvancedSettings onChange={() => markUnsaved('advanced')} />}
              {activeTab === 'about' && <AboutSection />}
            </motion.div>
          </AnimatePresence>

          {/* Save Bar */}
          {activeTab !== 'about' && (
            <motion.div
              className="mt-6 flex items-center justify-end gap-3 pt-4 border-t"
              style={{ borderColor: 'var(--sage-200)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {hasUnsaved && (
                <motion.span
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'var(--bloom-amber)' }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bloom-amber)' }} />
                  有未保存的更改
                </motion.span>
              )}
              {savedConfirm && (
                <motion.span
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'var(--success)' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Check size={14} />
                  设置已保存
                </motion.span>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:bg-[var(--sage-100)]"
                style={{ color: 'var(--sage-600)' }}
              >
                <RotateCcw size={14} />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-card-sm text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? '保存中...' : '保存更改'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Setting Row Component
   ═══════════════════════════════════════════════════════════════ */

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-4 border-b gap-6"
      style={{ borderColor: 'var(--sage-200)', minHeight: 72 }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Toggle Switch Component
   ═══════════════════════════════════════════════════════════════ */

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{ backgroundColor: enabled ? 'var(--sage-500)' : 'var(--sage-300)' }}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ left: enabled ? 22 : 2 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 1: General Settings
   ═══════════════════════════════════════════════════════════════ */

function GeneralSettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    appName: '千界花园',
    language: 'zh',
    autoSave: true,
    viewMode: 'grid',
    startupPage: 'dashboard',
    sessionTimeout: 30,
  });

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  return (
    <div className="space-y-6">
      <ContentCard title="通用" titleEn="General" subtitle="基础系统设置">
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
          <SettingRow label="系统名称" description="应用在界面中显示的名称">
            <input
              type="text"
              value={values.appName}
              onChange={(e) => update('appName', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-56"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            />
          </SettingRow>

          <SettingRow label="默认语言" description="系统界面的默认显示语言">
            <select
              value={values.language}
              onChange={(e) => update('language', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-56"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </SettingRow>

          <SettingRow label="自动保存" description="编辑内容时自动保存">
            <Toggle enabled={values.autoSave} onChange={() => update('autoSave', !values.autoSave)} />
          </SettingRow>

          <SettingRow label="默认视图模式" description="列表或网格视图">
            <div className="flex items-center border rounded-card-sm overflow-hidden" style={{ borderColor: 'var(--sage-200)' }}>
              <button
                onClick={() => update('viewMode', 'grid')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={{
                  backgroundColor: values.viewMode === 'grid' ? 'var(--sage-500)' : 'transparent',
                  color: values.viewMode === 'grid' ? '#fff' : 'var(--sage-600)',
                }}
              >
                <Zap size={14} />
                网格
              </button>
              <button
                onClick={() => update('viewMode', 'list')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={{
                  backgroundColor: values.viewMode === 'list' ? 'var(--sage-500)' : 'transparent',
                  color: values.viewMode === 'list' ? '#fff' : 'var(--sage-600)',
                }}
              >
                <Type size={14} />
                列表
              </button>
            </div>
          </SettingRow>

          <SettingRow label="启动页面" description="应用打开时默认显示的页面">
            <select
              value={values.startupPage}
              onChange={(e) => update('startupPage', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-56"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="dashboard">仪表盘</option>
              <option value="knowledge">知识库</option>
              <option value="agents">智能体</option>
              <option value="platform">平台中心</option>
            </select>
          </SettingRow>

          <SettingRow label="会话超时" description="无操作后自动登出的时间（分钟）">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={values.sessionTimeout}
                onChange={(e) => update('sessionTimeout', Number(e.target.value))}
                className="px-3 py-2 rounded-card-sm border text-sm w-20 text-center"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
                min={1}
                max={120}
              />
              <span className="text-xs" style={{ color: 'var(--sage-400)' }}>分钟</span>
            </div>
          </SettingRow>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 2: Appearance Settings
   ═══════════════════════════════════════════════════════════════ */

function AppearanceSettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    theme: 'light',
    accentColor: '#6b7a5a',
    fontSize: 15,
    compactMode: false,
    animationEnabled: true,
  });

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  const accentColors = [
    { hex: '#6b7a5a', name: '鼠尾草绿' },
    { hex: '#c97b84', name: '玫瑰粉' },
    { hex: '#d4a373', name: '琥珀' },
    { hex: '#c9a96e', name: '金色' },
    { hex: '#a78b9a', name: '薰衣草' },
    { hex: '#7fa3b0', name: '天蓝' },
    { hex: '#7fb89f', name: '薄荷绿' },
  ];

  const themeOptions = [
    { id: 'light', label: '浅色', icon: Sun },
    { id: 'dark', label: '深色', icon: Moon },
    { id: 'system', label: '跟随系统', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <ContentCard title="外观" titleEn="Appearance" subtitle="自定义界面主题和样式">
        {/* Theme */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--sage-700)' }}>主题模式</label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = values.theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => update('theme', opt.id)}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-all duration-200"
                  style={{
                    borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                    backgroundColor: isSelected ? 'rgba(107,122,90,0.05)' : '#fff',
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-500)' }}>
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <Icon size={24} style={{ color: isSelected ? 'var(--sage-500)' : 'var(--sage-400)' }} />
                  <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--sage-700)' : 'var(--sage-500)' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--sage-700)' }}>强调色</label>
          <div className="flex flex-wrap gap-3">
            {accentColors.map((c) => {
              const isSelected = values.accentColor === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => update('accentColor', c.hex)}
                  className="group relative w-10 h-10 rounded-full transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    outline: isSelected ? `3px solid ${c.hex}40` : '3px solid transparent',
                    outlineOffset: 2,
                  }}
                  title={c.name}
                >
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}>
                      <Check size={16} className="text-white mx-auto" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-0 divide-y pt-4" style={{ borderColor: 'var(--sage-200)' }}>
          {/* Font Size */}
          <SettingRow label="字体大小" description="界面文字的基础大小">
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--sage-400)' }}>小</span>
              <input
                type="range"
                min={12}
                max={20}
                value={values.fontSize}
                onChange={(e) => update('fontSize', Number(e.target.value))}
                className="w-32"
                style={{ accentColor: 'var(--sage-500)' }}
              />
              <span className="text-xs" style={{ color: 'var(--sage-400)' }}>大</span>
              <span className="text-xs font-mono ml-1" style={{ color: 'var(--sage-500)' }}>{values.fontSize}px</span>
            </div>
          </SettingRow>

          <SettingRow label="紧凑模式" description="减小间距以显示更多内容">
            <Toggle enabled={values.compactMode} onChange={() => update('compactMode', !values.compactMode)} />
          </SettingRow>

          <SettingRow label="启用动画" description="界面过渡动画效果">
            <Toggle enabled={values.animationEnabled} onChange={() => update('animationEnabled', !values.animationEnabled)} />
          </SettingRow>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 3: Notification Settings
   ═══════════════════════════════════════════════════════════════ */

function NotificationSettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    desktopNotif: true,
    soundEffects: false,
    emailNotif: true,
    taskComplete: true,
    taskFailed: true,
    errors: true,
    handoffRequests: true,
    securityAlerts: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  });

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  return (
    <div className="space-y-6">
      <ContentCard title="通知" titleEn="Notifications" subtitle="配置通知渠道和事件类型">
        {/* Channels */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>通知渠道</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="桌面通知" description="在浏览器中显示通知弹窗">
              <Toggle enabled={values.desktopNotif} onChange={() => update('desktopNotif', !values.desktopNotif)} />
            </SettingRow>
            <SettingRow label="音效" description="播放提示音">
              <Toggle enabled={values.soundEffects} onChange={() => update('soundEffects', !values.soundEffects)} />
            </SettingRow>
            <SettingRow label="邮件通知" description="通过邮件接收重要通知">
              <Toggle enabled={values.emailNotif} onChange={() => update('emailNotif', !values.emailNotif)} />
            </SettingRow>
          </div>
        </div>

        {/* Event Types */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>事件类型</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="任务完成" description="当智能体完成任务时通知">
              <Toggle enabled={values.taskComplete} onChange={() => update('taskComplete', !values.taskComplete)} />
            </SettingRow>
            <SettingRow label="任务失败" description="当任务执行失败时通知">
              <Toggle enabled={values.taskFailed} onChange={() => update('taskFailed', !values.taskFailed)} />
            </SettingRow>
            <SettingRow label="错误告警" description="系统错误和异常通知">
              <Toggle enabled={values.errors} onChange={() => update('errors', !values.errors)} />
            </SettingRow>
            <SettingRow label="手递手请求" description="智能体间协作请求通知">
              <Toggle enabled={values.handoffRequests} onChange={() => update('handoffRequests', !values.handoffRequests)} />
            </SettingRow>
            <SettingRow label="安全警告" description="安全相关事件始终通知">
              <Toggle enabled={values.securityAlerts} onChange={() => {}} />
            </SettingRow>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>免打扰时段</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="启用免打扰" description="在指定时间段内暂停通知">
              <Toggle enabled={values.quietHours} onChange={() => update('quietHours', !values.quietHours)} />
            </SettingRow>
            {values.quietHours && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-4 py-4"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: 'var(--sage-400)' }} />
                  <input
                    type="time"
                    value={values.quietStart}
                    onChange={(e) => update('quietStart', e.target.value)}
                    className="px-2 py-1.5 rounded-card-sm border text-sm"
                    style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--sage-400)' }}>至</span>
                  <input
                    type="time"
                    value={values.quietEnd}
                    onChange={(e) => update('quietEnd', e.target.value)}
                    className="px-2 py-1.5 rounded-card-sm border text-sm"
                    style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 4: Security Settings
   ═══════════════════════════════════════════════════════════════ */

function SecuritySettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    shieldLevel: 'standard',
    twoFactor: false,
    apiKeyVisible: false,
    autoLockTimeout: 15,
    sessionLimit: 3,
  });
  const [showAuditLog, setShowAuditLog] = useState(false);

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  const shieldOptions = [
    { id: 'standard', label: '标准', desc: '基础安全防护' },
    { id: 'high', label: '高', desc: '增强验证机制' },
    { id: 'maximum', label: '最高', desc: '最高安全级别' },
  ];

  const sessions = [
    { id: 's1', device: 'Chrome · macOS', ip: '192.168.1.42', location: '北京', time: '当前会话', active: true },
    { id: 's2', device: 'Safari · iOS', ip: '192.168.1.88', location: '北京', time: '2小时前', active: false },
  ];

  const auditLog = [
    { id: 'a1', time: '2026-01-15 14:32:05', user: 'admin', action: '登录', target: '系统', ip: '192.168.1.42', status: '成功' },
    { id: 'a2', time: '2026-01-15 14:28:12', user: 'admin', action: '更新知识库', target: '技术文档库', ip: '192.168.1.42', status: '成功' },
    { id: 'a3', time: '2026-01-15 13:45:33', user: 'system', action: '任务失败告警', target: '任务 #2845', ip: '-', status: '告警' },
    { id: 'a4', time: '2026-01-15 12:00:07', user: 'admin', action: '登出', target: '系统', ip: '192.168.1.88', status: '成功' },
  ];

  return (
    <div className="space-y-6">
      <ContentCard title="安全" titleEn="Security" subtitle="安全设置和访问控制">
        {/* Shield Level */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--sage-700)' }}>防护等级</label>
          <div className="grid grid-cols-3 gap-3">
            {shieldOptions.map((opt) => {
              const isSelected = values.shieldLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => update('shieldLevel', opt.id)}
                  className="relative flex flex-col items-center gap-1 p-4 rounded-card border-2 transition-all duration-200"
                  style={{
                    borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                    backgroundColor: isSelected ? 'rgba(107,122,90,0.05)' : '#fff',
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-500)' }}>
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <Shield size={20} style={{ color: isSelected ? 'var(--sage-500)' : 'var(--sage-400)' }} />
                  <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--sage-700)' : 'var(--sage-500)' }}>{opt.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--sage-400)' }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-0 divide-y pt-4" style={{ borderColor: 'var(--sage-200)' }}>
          <SettingRow label="双重验证 (2FA)" description="使用身份验证器应用增强账户安全">
            <Toggle enabled={values.twoFactor} onChange={() => update('twoFactor', !values.twoFactor)} />
          </SettingRow>

          <SettingRow label="API密钥可见性" description="在界面上显示API密钥">
            <div className="flex items-center gap-2">
              <Toggle enabled={values.apiKeyVisible} onChange={() => update('apiKeyVisible', !values.apiKeyVisible)} />
            </div>
          </SettingRow>

          <SettingRow label="自动锁定超时" description="无操作后自动锁定界面">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={values.autoLockTimeout}
                onChange={(e) => update('autoLockTimeout', Number(e.target.value))}
                className="px-3 py-2 rounded-card-sm border text-sm w-20 text-center"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                min={1}
                max={60}
              />
              <span className="text-xs" style={{ color: 'var(--sage-400)' }}>分钟</span>
            </div>
          </SettingRow>

          <SettingRow label="同时登录限制" description="同一账户允许的最大会话数">
            <input
              type="number"
              value={values.sessionLimit}
              onChange={(e) => update('sessionLimit', Number(e.target.value))}
              className="px-3 py-2 rounded-card-sm border text-sm w-20 text-center"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
              min={1}
              max={10}
            />
          </SettingRow>
        </div>

        {/* Active Sessions */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>活跃会话</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-card border" style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                    {s.active ? <Zap size={14} style={{ color: 'var(--bloom-mint)' }} /> : <Clock size={14} style={{ color: 'var(--sage-400)' }} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>{s.device}</div>
                    <div className="text-xs" style={{ color: 'var(--sage-400)' }}>{s.ip} · {s.location} · {s.time}</div>
                  </div>
                </div>
                {s.active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'rgba(91,154,109,0.12)', color: '#5b9a6d' }}>当前</span>
                ) : (
                  <button className="text-xs font-medium" style={{ color: 'var(--error)' }}>终止</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>审计日志</h3>
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: 'var(--sage-500)' }}
            >
              {showAuditLog ? '收起' : '查看全部'}
              {showAuditLog ? <ChevronDown size={12} /> : <ExternalLink size={12} />}
            </button>
          </div>
          <AnimatePresence>
            {showAuditLog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-card border overflow-hidden" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="grid grid-cols-[140px_80px_1fr_100px_80px_60px] gap-2 px-4 py-2 border-b text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-400)', borderColor: 'var(--sage-200)' }}>
                    <span>时间</span>
                    <span>用户</span>
                    <span>操作</span>
                    <span>目标</span>
                    <span>IP</span>
                    <span>状态</span>
                  </div>
                  {auditLog.map((log) => (
                    <div key={log.id}
                      className="grid grid-cols-[140px_80px_1fr_100px_80px_60px] gap-2 px-4 py-2 border-b text-xs items-center"
                      style={{ borderColor: 'var(--sage-100)' }}>
                      <span style={{ color: 'var(--sage-500)' }}>{log.time}</span>
                      <span style={{ color: 'var(--sage-600)' }}>{log.user}</span>
                      <span style={{ color: 'var(--sage-700)' }}>{log.action}</span>
                      <span style={{ color: 'var(--sage-500)' }}>{log.target}</span>
                      <span style={{ color: 'var(--sage-400)' }}>{log.ip}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-center"
                        style={{
                          backgroundColor: log.status === '成功' ? 'rgba(91,154,109,0.12)' : 'rgba(201,123,132,0.12)',
                          color: log.status === '成功' ? '#5b9a6d' : '#c97b84',
                        }}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 5: Integration Settings
   ═══════════════════════════════════════════════════════════════ */

function IntegrationSettings({ onChange }: { onChange: () => void }) {
  const [integrations, setIntegrations] = useState([
    { id: 'slack', name: 'Slack', icon: MessageSquare, color: '#a78b9a', description: '接收智能体通知到Slack频道', connected: false },
    { id: 'discord', name: 'Discord', icon: MessageSquare, color: '#7fa3b0', description: '接收智能体通知到Discord频道', connected: false },
    { id: 'github', name: 'GitHub', icon: Github, color: '#6b7a5a', description: '连接代码仓库，自动同步代码变更', connected: true },
    { id: 'notion', name: 'Notion', icon: FileText, color: '#8f9a7d', description: '同步知识库到Notion工作区', connected: true },
  ]);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, connected: !i.connected } : i));
    onChange();
  };

  return (
    <div className="space-y-6">
      <ContentCard title="集成" titleEn="Integrations" subtitle="连接第三方服务和平台">
        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration, i) => {
            const Icon = integration.icon;
            return (
              <motion.div
                key={integration.id}
                className="rounded-card border p-4 transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: easeGentle, delay: i * 0.08 }}
                whileHover={{ boxShadow: 'var(--shadow-card-hover)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-card flex items-center justify-center" style={{ backgroundColor: `${integration.color}15` }}>
                      <Icon size={20} style={{ color: integration.color }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{integration.name}</h4>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: integration.connected ? 'rgba(91,154,109,0.12)' : 'rgba(181,189,168,0.2)',
                          color: integration.connected ? '#5b9a6d' : 'var(--sage-400)',
                        }}
                      >
                        {integration.connected ? '已连接' : '未连接'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConnection(integration.id)}
                    className="px-3 py-1.5 rounded-card-sm text-xs font-medium transition-all duration-200"
                    style={{
                      backgroundColor: integration.connected ? 'rgba(201,123,132,0.1)' : 'var(--sage-100)',
                      color: integration.connected ? 'var(--error)' : 'var(--sage-600)',
                    }}
                  >
                    {integration.connected ? '断开' : '连接'}
                  </button>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--sage-500)' }}>{integration.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Webhook Configuration */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sage-700)' }}>Webhook 配置</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--sage-500)' }}>Webhook URL</label>
              <input
                type="text"
                placeholder="https://hooks.example.com/webhook"
                className="w-full px-3 py-2 rounded-card-sm border text-sm"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--sage-500)' }}>Secret Key</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-card-sm border text-sm"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* API Endpoint */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sage-700)' }}>API 端点</h3>
          <div className="p-3 rounded-card border" style={{ backgroundColor: 'var(--sage-50)', borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono" style={{ color: 'var(--sage-600)' }}>https://api.bloombloomgarden.local/v1</code>
              <button className="text-xs flex items-center gap-1" style={{ color: 'var(--sage-500)' }} onClick={onChange}>
                <CopyButton text="https://api.bloombloomgarden.local/v1" />
              </button>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 6: Language Settings
   ═══════════════════════════════════════════════════════════════ */

function LanguageSettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    primaryLang: 'zh',
    secondaryLang: 'en',
    techTerms: 'both',
    dateFormat: 'YYYY-MM-DD',
    timezone: 'Asia/Shanghai',
  });

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  return (
    <div className="space-y-6">
      <ContentCard title="语言" titleEn="Language" subtitle="语言和地区设置">
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
          <SettingRow label="主要语言" description="系统界面使用的语言">
            <select
              value={values.primaryLang}
              onChange={(e) => update('primaryLang', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-48"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </SettingRow>

          <SettingRow label="次要语言" description="辅助显示语言">
            <select
              value={values.secondaryLang}
              onChange={(e) => update('secondaryLang', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-48"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="none">无</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </SettingRow>

          <SettingRow label="技术术语显示" description="技术术语的显示方式">
            <select
              value={values.techTerms}
              onChange={(e) => update('techTerms', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-48"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="original">原文</option>
              <option value="translated">翻译</option>
              <option value="both">双语</option>
            </select>
          </SettingRow>

          <SettingRow label="日期格式" description="日期显示格式">
            <select
              value={values.dateFormat}
              onChange={(e) => update('dateFormat', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-48"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </SettingRow>

          <SettingRow label="时区" description="系统时区设置">
            <select
              value={values.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="px-3 py-2 rounded-card-sm border text-sm w-56"
              style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
            >
              <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
            </select>
          </SettingRow>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 7: Advanced Settings
   ═══════════════════════════════════════════════════════════════ */

function AdvancedSettings({ onChange }: { onChange: () => void }) {
  const [values, setValues] = useState({
    proxyEnabled: false,
    proxyUrl: '',
    debugMode: false,
    logLevel: 'info',
    cacheEnabled: true,
    experimental: false,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const update = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    onChange();
  };

  return (
    <div className="space-y-6">
      <ContentCard title="高级" titleEn="Advanced" subtitle="高级功能和开发者选项">
        {/* Proxy */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>代理设置</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="启用代理" description="通过代理服务器访问外部服务">
              <Toggle enabled={values.proxyEnabled} onChange={() => update('proxyEnabled', !values.proxyEnabled)} />
            </SettingRow>
            {values.proxyEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="py-4"
              >
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--sage-500)' }}>代理地址</label>
                <input
                  type="text"
                  placeholder="http://proxy.example.com:8080"
                  value={values.proxyUrl}
                  onChange={(e) => update('proxyUrl', e.target.value)}
                  className="w-full px-3 py-2 rounded-card-sm border text-sm"
                  style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Debug */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>调试</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="调试模式" description="显示调试信息和详细日志">
              <Toggle enabled={values.debugMode} onChange={() => update('debugMode', !values.debugMode)} />
            </SettingRow>

            <SettingRow label="日志级别" description="控制台日志的详细程度">
              <select
                value={values.logLevel}
                onChange={(e) => update('logLevel', e.target.value)}
                className="px-3 py-2 rounded-card-sm border text-sm w-36"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)', backgroundColor: '#fff' }}
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </SettingRow>
          </div>
        </div>

        {/* Cache */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>缓存管理</h3>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sage-200)' }}>
            <SettingRow label="启用缓存" description="缓存数据以提高性能">
              <Toggle enabled={values.cacheEnabled} onChange={() => update('cacheEnabled', !values.cacheEnabled)} />
            </SettingRow>
            <div className="flex items-center justify-between py-4">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--sage-700)' }}>清除缓存</div>
                <div className="text-xs" style={{ color: 'var(--sage-400)' }}>清除所有本地缓存数据</div>
              </div>
              <button
                onClick={onChange}
                className="flex items-center gap-1.5 px-3 py-2 rounded-card-sm text-xs font-medium"
                style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
              >
                <Trash2 size={12} />
                清除
              </button>
            </div>
          </div>
        </div>

        {/* Experimental */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sage-700)' }}>实验性功能</h3>
          <SettingRow
            label="启用实验性功能"
            description="使用尚未正式发布的功能（可能不稳定）"
          >
            <Toggle enabled={values.experimental} onChange={() => update('experimental', !values.experimental)} />
          </SettingRow>
          {values.experimental && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 mt-2 p-3 rounded-card"
              style={{ backgroundColor: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--bloom-amber)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'var(--bloom-amber)' }}>
                实验性功能可能会影响系统稳定性，请谨慎使用。
              </p>
            </motion.div>
          )}
        </div>

        {/* Reset */}
        <div className="pt-6 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--error)' }}>危险区域</h3>
          <div className="p-4 rounded-card border" style={{ backgroundColor: 'rgba(184,92,92,0.04)', borderColor: 'rgba(184,92,92,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--error)' }}>重置为默认设置</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>所有设置将恢复为默认值，此操作不可撤销</div>
              </div>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 rounded-card-sm text-xs font-medium text-white transition-all"
                  style={{ backgroundColor: 'var(--error)' }}
                >
                  重置
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-2 rounded-card-sm text-xs font-medium"
                    style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => { setShowResetConfirm(false); onChange(); }}
                    className="px-4 py-2 rounded-card-sm text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--error)' }}
                  >
                    确认重置
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 8: About Section
   ═══════════════════════════════════════════════════════════════ */

function AboutSection() {
  const links = [
    { label: '文档', icon: FileText, url: '#' },
    { label: 'GitHub', icon: Github, url: '#' },
    { label: '社区', icon: MessageSquare, url: '#' },
    { label: '更新日志', icon: RefreshCw, url: '#' },
  ];

  return (
    <div className="space-y-6">
      <ContentCard title="关于" titleEn="About">
        <div className="flex flex-col items-center text-center py-8">
          {/* Logo */}
          <motion.div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--sage-500)' }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 5C12 5 8 12 8 18C8 24 12 28 16 30C14 26 14 20 20 16C26 12 28 8 28 8C28 8 26 14 24 18C22 22 20 26 22 30C26 28 32 24 32 18C32 12 28 5 20 5Z" fill="white" fillOpacity="0.9" />
              <circle cx="20" cy="32" r="2" fill="white" fillOpacity="0.6" />
            </svg>
          </motion.div>

          <motion.h2
            className="text-xl font-semibold font-display"
            style={{ color: 'var(--sage-800)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            千界花园
          </motion.h2>
          <motion.p
            className="text-sm mt-1"
            style={{ color: 'var(--sage-400)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Bloombloomgarden
          </motion.p>

          <motion.div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <span>v1.0.0</span>
            <span>·</span>
            <span>build 2026.01.15</span>
          </motion.div>

          <motion.p
            className="text-sm mt-4 max-w-md"
            style={{ color: 'var(--sage-500)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            千界花园是一个智能体协作平台，融合 Swarm 多智能体协作与 AgentZero 主动干预能力，
            让智能体如花园中的生命般绽放、协作与进化。
          </motion.p>

          {/* Links */}
          <motion.div
            className="flex items-center gap-3 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.url}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: '#fff', borderColor: 'var(--sage-200)', color: 'var(--sage-600)', boxShadow: 'var(--shadow-card)' }}
                >
                  <Icon size={14} />
                  {link.label}
                </a>
              );
            })}
          </motion.div>

          {/* Check for updates */}
          <motion.button
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-card text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--sage-600)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <RefreshCw size={14} />
            检查更新
          </motion.button>

          {/* License */}
          <motion.div
            className="mt-8 pt-4 border-t text-xs"
            style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-400)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="flex items-center gap-1 justify-center">
              <Heart size={10} style={{ color: 'var(--bloom-rose)' }} />
              为智能体生态系统精心构建
            </p>
            <p className="mt-1">MIT License · 2026 千界花园团队</p>
          </motion.div>
        </div>
      </ContentCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Copy Button Helper
   ═══════════════════════════════════════════════════════════════ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs" style={{ color: 'var(--sage-500)' }}>
      {copied ? <Check size={12} /> : <CopyFallback />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function CopyFallback() {
  // Inline copy icon since lucide-react Copy might not be available
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
