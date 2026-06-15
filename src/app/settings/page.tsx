"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Palette,
  Bell,
  Shield,
  Plug,
  Globe,
  SlidersHorizontal,
  Info,
  Flower2,
  Sun,
  Moon,
  Monitor,
  Check,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitBranch,
  MessageSquare,
  Mail,
  FileText,
  Zap,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  X,
} from "lucide-react";
import { Header } from "@/components/layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabId =
  | "general"
  | "appearance"
  | "notifications"
  | "security"
  | "integrations"
  | "language"
  | "advanced"
  | "about";

type Theme = "light" | "dark" | "system";
type AccentColor = "emerald" | "blue" | "violet" | "amber" | "rose" | "teal";
type FontSize = "small" | "medium" | "large";
type InterfaceLang = "zh" | "en";
type LlmLang = "zh" | "en" | "multilingual";
type DateFormat = "yyyy-mm-dd" | "mm/dd/yyyy";
type Timezone = "asia-shanghai" | "utc" | "america-new_york";

interface ApiKey {
  id: string;
  provider: string;
  prefix: string;
  status: "active" | "inactive";
}

interface IntegrationItem {
  id: string;
  name: string;
  icon: any;
  connected: boolean;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const tabsConfig: { id: TabId; label: string; icon: any }[] = [
  { id: "general", label: "通用", icon: Settings },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "notifications", label: "通知", icon: Bell },
  { id: "security", label: "安全", icon: Shield },
  { id: "integrations", label: "集成", icon: Plug },
  { id: "language", label: "语言", icon: Globe },
  { id: "advanced", label: "高级", icon: SlidersHorizontal },
  { id: "about", label: "关于", icon: Info },
];

const accentColorMap: Record<AccentColor, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
};

const accentColorRing: Record<AccentColor, string> = {
  emerald: "ring-emerald-500",
  blue: "ring-blue-500",
  violet: "ring-violet-500",
  amber: "ring-amber-500",
  rose: "ring-rose-500",
  teal: "ring-teal-500",
};

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center p-0.5 shrink-0 ${
        checked ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {description && (
          <div className="text-xs text-slate-400 mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  useEffect(() => {
    // 设置页面已加载
  }, []);

  /* ---------- Active Tab ---------- */
  const [activeTab, setActiveTab] = useState<TabId>("general");

  /* ---------- General ---------- */
  const [systemName, setSystemName] = useState("BloomGarden");
  const [workspacePath, setWorkspacePath] = useState("/workspace/bloombloomgarden");
  const [autoSave, setAutoSave] = useState(true);
  const [concurrency, setConcurrency] = useState(4);
  const [heartbeatInterval, setHeartbeatInterval] = useState(30);

  /* ---------- Appearance ---------- */
  const [theme, setTheme] = useState<Theme>("light");
  const [accentColor, setAccentColor] = useState<AccentColor>("emerald");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  /* ---------- Notifications ---------- */
  const [desktopNotify, setDesktopNotify] = useState(true);
  const [soundAlert, setSoundAlert] = useState(true);
  const [taskCompleteNotify, setTaskCompleteNotify] = useState(true);
  const [errorAlert, setErrorAlert] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  /* ---------- Security ---------- */
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: "1", provider: "OpenAI", prefix: "sk-...xxxx", status: "active" },
    { id: "2", provider: "Zhipu", prefix: "sk-...yyyy", status: "active" },
    { id: "3", provider: "Claude", prefix: "sk-...zzzz", status: "inactive" },
  ]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState("OpenAI");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [autoLock, setAutoLock] = useState(false);

  /* ---------- Integrations ---------- */
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    { id: "github", name: "GitHub", icon: GitBranch, connected: true, color: "#333" },
    { id: "slack", name: "Slack", icon: MessageSquare, connected: false, color: "#4A154B" },
    { id: "discord", name: "Discord", icon: MessageSquare, connected: false, color: "#5865F2" },
    { id: "feishu", name: "Feishu", icon: Mail, connected: false, color: "#3370FF" },
    { id: "notion", name: "Notion", icon: FileText, connected: true, color: "#000" },
    { id: "linear", name: "Linear", icon: Zap, connected: false, color: "#5E6AD2" },
  ]);
  const [showWebhook, setShowWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  /* ---------- Language ---------- */
  const [interfaceLang, setInterfaceLang] = useState<InterfaceLang>("zh");
  const [llmLang, setLlmLang] = useState<LlmLang>("zh");
  const [dateFormat, setDateFormat] = useState<DateFormat>("yyyy-mm-dd");
  const [timezone, setTimezone] = useState<Timezone>("asia-shanghai");

  /* ---------- Advanced ---------- */
  const [debugMode, setDebugMode] = useState(false);
  const [verboseLog, setVerboseLog] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [experimental, setExperimental] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  /* ---------- Dirty & Save ---------- */
  const [dirtyTabs, setDirtyTabs] = useState<Set<TabId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const markDirty = (tab: TabId) => {
    setDirtyTabs((prev) => new Set(prev).add(tab));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setDirtyTabs(new Set());
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 800);
  };

  const handleReset = () => {
    setSystemName("BloomGarden");
    setWorkspacePath("/workspace/bloombloomgarden");
    setAutoSave(true);
    setConcurrency(4);
    setHeartbeatInterval(30);
    setTheme("light");
    setAccentColor("emerald");
    setFontSize("medium");
    setSidebarCollapsedDefault(false);
    setCompactMode(false);
    setDesktopNotify(true);
    setSoundAlert(true);
    setTaskCompleteNotify(true);
    setErrorAlert(true);
    setDailyReport(false);
    setQuietStart("22:00");
    setQuietEnd("08:00");
    setApiKeys([
      { id: "1", provider: "OpenAI", prefix: "sk-...xxxx", status: "active" },
      { id: "2", provider: "Zhipu", prefix: "sk-...yyyy", status: "active" },
      { id: "3", provider: "Claude", prefix: "sk-...zzzz", status: "inactive" },
    ]);
    setSessionTimeout(30);
    setAutoLock(false);
    setShowAddKey(false);
    setNewKeyProvider("OpenAI");
    setNewKeyValue("");
    setIntegrations([
      { id: "github", name: "GitHub", icon: GitBranch, connected: true, color: "#333" },
      { id: "slack", name: "Slack", icon: MessageSquare, connected: false, color: "#4A154B" },
      { id: "discord", name: "Discord", icon: MessageSquare, connected: false, color: "#5865F2" },
      { id: "feishu", name: "Feishu", icon: Mail, connected: false, color: "#3370FF" },
      { id: "notion", name: "Notion", icon: FileText, connected: true, color: "#000" },
      { id: "linear", name: "Linear", icon: Zap, connected: false, color: "#5E6AD2" },
    ]);
    setShowWebhook(false);
    setWebhookUrl("");
    setInterfaceLang("zh");
    setLlmLang("zh");
    setDateFormat("yyyy-mm-dd");
    setTimezone("asia-shanghai");
    setDebugMode(false);
    setVerboseLog(false);
    setAutoUpdate(true);
    setExperimental(false);
    setCacheClearing(false);
    setCacheCleared(false);
    setResetConfirm(false);
    setDirtyTabs(new Set());
  };

  const handleClearCache = () => {
    setCacheClearing(true);
    setTimeout(() => {
      setCacheClearing(false);
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    }, 1200);
  };

  const handleAddKey = () => {
    if (!newKeyValue.trim()) return;
    const prefix = newKeyValue.slice(0, 6) + "..." + newKeyValue.slice(-4);
    setApiKeys((prev) => [
      ...prev,
      { id: Date.now().toString(), provider: newKeyProvider, prefix, status: "active" },
    ]);
    setNewKeyValue("");
    setShowAddKey(false);
    markDirty("security");
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    markDirty("security");
  };

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
    markDirty("integrations");
  };

  /* ---------- Render Helpers ---------- */

  const renderGeneral = () => (
    <div className="space-y-5">
      <SectionCard title="基本信息">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">系统名称</label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                markDirty("general");
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">工作区路径</label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => {
                setWorkspacePath(e.target.value);
                markDirty("general");
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="行为设置">
        <SettingRow label="自动保存" description="修改后自动保存设置">
          <ToggleSwitch
            checked={autoSave}
            onChange={(v) => {
              setAutoSave(v);
              markDirty("general");
            }}
          />
        </SettingRow>
        <SettingRow label="默认并发数" description={`当前: ${concurrency} 个任务`}>
          <div className="w-48">
            <input
              type="range"
              min={1}
              max={10}
              value={concurrency}
              onChange={(e) => {
                setConcurrency(Number(e.target.value));
                markDirty("general");
              }}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </SettingRow>
        <SettingRow label="心跳间隔" description={`当前: ${heartbeatInterval} 秒`}>
          <div className="w-48">
            <input
              type="range"
              min={5}
              max={60}
              value={heartbeatInterval}
              onChange={(e) => {
                setHeartbeatInterval(Number(e.target.value));
                markDirty("general");
              }}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>
        </SettingRow>
      </SectionCard>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-5">
      <SectionCard title="主题">
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: "light" as Theme, label: "浅色", icon: Sun },
            { id: "dark" as Theme, label: "深色", icon: Moon },
            { id: "system" as Theme, label: "跟随系统", icon: Monitor },
          ]).map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setTheme(opt.id);
                  markDirty("appearance");
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span className={`text-sm font-medium ${isActive ? "text-emerald-700" : "text-slate-600"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="强调色">
        <div className="flex items-center gap-3">
          {(
            [
              { id: "emerald" as AccentColor, label: "翠绿" },
              { id: "blue" as AccentColor, label: "蓝色" },
              { id: "violet" as AccentColor, label: "紫色" },
              { id: "amber" as AccentColor, label: "琥珀" },
              { id: "rose" as AccentColor, label: "玫瑰" },
              { id: "teal" as AccentColor, label: "青色" },
            ]
          ).map((color) => {
            const isActive = accentColor === color.id;
            return (
              <button
                key={color.id}
                onClick={() => {
                  setAccentColor(color.id);
                  markDirty("appearance");
                }}
                className={`flex flex-col items-center gap-1.5 transition-all ${isActive ? "scale-110" : ""}`}
                title={color.label}
              >
                <div
                  className={`w-8 h-8 rounded-full ${accentColorMap[color.id]} ${
                    isActive ? `ring-2 ring-offset-2 ${accentColorRing[color.id]}` : ""
                  }`}
                />
                <span className="text-xs text-slate-500">{color.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="显示">
        <SettingRow label="字体大小">
          <div className="flex items-center gap-2">
            {(
              [
                { id: "small" as FontSize, label: "小" },
                { id: "medium" as FontSize, label: "中" },
                { id: "large" as FontSize, label: "大" },
              ]
            ).map((fs) => {
              const isActive = fontSize === fs.id;
              return (
                <button
                  key={fs.id}
                  onClick={() => {
                    setFontSize(fs.id);
                    markDirty("appearance");
                  }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {fs.label}
                </button>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow label="侧边栏默认折叠" description="启动时自动折叠侧边栏">
          <ToggleSwitch
            checked={sidebarCollapsedDefault}
            onChange={(v) => {
              setSidebarCollapsedDefault(v);
              markDirty("appearance");
            }}
          />
        </SettingRow>
        <SettingRow label="紧凑模式" description="减小间距和元素尺寸">
          <ToggleSwitch
            checked={compactMode}
            onChange={(v) => {
              setCompactMode(v);
              markDirty("appearance");
            }}
          />
        </SettingRow>
      </SectionCard>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-5">
      <SectionCard title="通知开关">
        <SettingRow label="桌面通知" description="在桌面显示系统通知">
          <ToggleSwitch
            checked={desktopNotify}
            onChange={(v) => {
              setDesktopNotify(v);
              markDirty("notifications");
            }}
          />
        </SettingRow>
        <SettingRow label="声音提示" description="播放提示音">
          <ToggleSwitch
            checked={soundAlert}
            onChange={(v) => {
              setSoundAlert(v);
              markDirty("notifications");
            }}
          />
        </SettingRow>
        <SettingRow label="任务完成通知" description="任务完成后发送通知">
          <ToggleSwitch
            checked={taskCompleteNotify}
            onChange={(v) => {
              setTaskCompleteNotify(v);
              markDirty("notifications");
            }}
          />
        </SettingRow>
        <SettingRow label="错误告警" description="发生错误时立即通知">
          <ToggleSwitch
            checked={errorAlert}
            onChange={(v) => {
              setErrorAlert(v);
              markDirty("notifications");
            }}
          />
        </SettingRow>
        <SettingRow label="每日报告" description="每天发送一次运行报告">
          <ToggleSwitch
            checked={dailyReport}
            onChange={(v) => {
              setDailyReport(v);
              markDirty("notifications");
            }}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="静默时段">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1.5">开始时间</label>
            <input
              type="time"
              value={quietStart}
              onChange={(e) => {
                setQuietStart(e.target.value);
                markDirty("notifications");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="text-slate-400 pt-5">—</div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1.5">结束时间</label>
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => {
                setQuietEnd(e.target.value);
                markDirty("notifications");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-5">
      <SectionCard title="API Key 管理">
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">{key.provider}</div>
                  <div className="text-xs text-slate-400">{key.prefix}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    key.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {key.status === "active" ? "已启用" : "已禁用"}
                </span>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {!showAddKey ? (
          <button
            onClick={() => setShowAddKey(true)}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加 Key
          </button>
        ) : (
          <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">添加新 Key</span>
              <button
                onClick={() => setShowAddKey(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">提供商</label>
              <select
                value={newKeyProvider}
                onChange={(e) => setNewKeyProvider(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
              >
                <option>OpenAI</option>
                <option>Zhipu</option>
                <option>Claude</option>
                <option>Kimi</option>
                <option>Gemini</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">API Key</label>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <button
              onClick={handleAddKey}
              disabled={!newKeyValue.trim()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认添加
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="会话安全">
        <SettingRow label="会话超时" description={`${sessionTimeout} 分钟后自动退出`}>
          <div className="w-48">
            <input
              type="range"
              min={15}
              max={120}
              value={sessionTimeout}
              onChange={(e) => {
                setSessionTimeout(Number(e.target.value));
                markDirty("security");
              }}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>15m</span>
              <span>120m</span>
            </div>
          </div>
        </SettingRow>
        <SettingRow label="自动锁定" description="闲置后自动锁定界面">
          <ToggleSwitch
            checked={autoLock}
            onChange={(v) => {
              setAutoLock(v);
              markDirty("security");
            }}
          />
        </SettingRow>
      </SectionCard>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-5">
      <SectionCard title="平台集成">
        <div className="space-y-3">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: item.color + "15" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="text-sm font-medium text-slate-700">{item.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={item.connected}
                    onChange={() => toggleIntegration(item.id)}
                  />
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                    配置
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Webhook">
        <button
          onClick={() => setShowWebhook(!showWebhook)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
        >
          {showWebhook ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Webhook 配置
        </button>
        {showWebhook && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1.5">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                markDirty("integrations");
              }}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        )}
      </SectionCard>
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-5">
      <SectionCard title="界面语言">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { id: "zh" as InterfaceLang, label: "中文", sub: "简体中文" },
              { id: "en" as InterfaceLang, label: "English", sub: "English" },
            ]
          ).map((lang) => {
            const isActive = interfaceLang === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => {
                  setInterfaceLang(lang.id);
                  markDirty("language");
                }}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className={`text-sm font-medium ${isActive ? "text-emerald-700" : "text-slate-700"}`}>
                  {lang.label}
                </span>
                <span className="text-xs text-slate-400">{lang.sub}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="默认 LLM 语言">
        <div className="flex items-center gap-2">
          {(
            [
              { id: "zh" as LlmLang, label: "中文" },
              { id: "en" as LlmLang, label: "English" },
              { id: "multilingual" as LlmLang, label: "多语言" },
            ]
          ).map((lang) => {
            const isActive = llmLang === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => {
                  setLlmLang(lang.id);
                  markDirty("language");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="格式与时区">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">日期格式</label>
            <div className="flex items-center gap-2">
              {(
                [
                  { id: "yyyy-mm-dd" as DateFormat, label: "YYYY-MM-DD" },
                  { id: "mm/dd/yyyy" as DateFormat, label: "MM/DD/YYYY" },
                ]
              ).map((fmt) => {
                const isActive = dateFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      setDateFormat(fmt.id);
                      markDirty("language");
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">时区</label>
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value as Timezone);
                markDirty("language");
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
            >
              <option value="asia-shanghai">Asia/Shanghai (UTC+8)</option>
              <option value="utc">UTC (UTC+0)</option>
              <option value="america-new_york">America/New_York (UTC-5/4)</option>
            </select>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderAdvanced = () => (
    <div className="space-y-5">
      <SectionCard title="开发者选项">
        <SettingRow label="调试模式" description="显示调试信息和日志">
          <ToggleSwitch
            checked={debugMode}
            onChange={(v) => {
              setDebugMode(v);
              markDirty("advanced");
            }}
          />
        </SettingRow>
        <SettingRow label="详细日志" description="记录更多运行日志">
          <ToggleSwitch
            checked={verboseLog}
            onChange={(v) => {
              setVerboseLog(v);
              markDirty("advanced");
            }}
          />
        </SettingRow>
        <SettingRow label="实验性功能" description="启用未发布的功能预览">
          <ToggleSwitch
            checked={experimental}
            onChange={(v) => {
              setExperimental(v);
              markDirty("advanced");
            }}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="更新与维护">
        <SettingRow label="自动更新" description="启动时检查新版本">
          <ToggleSwitch
            checked={autoUpdate}
            onChange={(v) => {
              setAutoUpdate(v);
              markDirty("advanced");
            }}
          />
        </SettingRow>
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
          <div>
            <div className="text-sm font-medium text-slate-700">缓存清理</div>
            <div className="text-xs text-slate-400 mt-0.5">清除本地缓存数据</div>
          </div>
          <button
            onClick={handleClearCache}
            disabled={cacheClearing}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              cacheCleared
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cacheClearing ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                清理中...
              </span>
            ) : cacheCleared ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                已清理
              </span>
            ) : (
              "清理缓存"
            )}
          </button>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="text-sm font-medium text-slate-700">重置所有设置</div>
            <div className="text-xs text-slate-400 mt-0.5">恢复为默认配置</div>
          </div>
          {resetConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleReset();
                  setResetConfirm(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                确认重置
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              重置
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
          <Flower2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">BloomGarden</h2>
        <p className="text-sm text-slate-400 mt-1">智能体协作平台</p>

        <div className="flex items-center justify-center gap-4 mt-6 text-sm text-slate-500">
          <span>版本 v4.0.0</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>构建 2026-06-15</span>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {["Next.js 16", "React 19", "Tailwind CSS", "Prisma"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <SectionCard title="链接">
        <div className="space-y-2">
          {(
            [
              { label: "GitHub", url: "https://github.com/bloombloomgarden" },
              { label: "文档", url: "https://docs.bloombloomgarden.dev" },
              { label: "报告问题", url: "https://github.com/bloombloomgarden/issues" },
            ]
          ).map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <span className="text-sm font-medium text-slate-700">{link.label}</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          ))}
        </div>
      </SectionCard>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
        <p className="text-xs text-slate-400">
          感谢使用 BloomGarden。特别致谢开源社区、贡献者以及所有提供反馈的用户。
        </p>
        <p className="text-xs text-slate-400 mt-2">
          © 2026 BloomGarden Team. 保留所有权利。
        </p>
      </div>
    </div>
  );

  /* ---------- Main Render ---------- */

  const tabContentMap: Record<TabId, React.ReactNode> = {
    general: renderGeneral(),
    appearance: renderAppearance(),
    notifications: renderNotifications(),
    security: renderSecurity(),
    integrations: renderIntegrations(),
    language: renderLanguage(),
    advanced: renderAdvanced(),
    about: renderAbout(),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="设置中心" subtitle="系统配置与个性化" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Tabs */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-1">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDirty = dirtyTabs.has(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {isDirty && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {tabContentMap[activeTab]}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="shrink-0 h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between">
            <div>
              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  保存成功
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
              <button
                onClick={handleSave}
                disabled={saving || dirtyTabs.size === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
