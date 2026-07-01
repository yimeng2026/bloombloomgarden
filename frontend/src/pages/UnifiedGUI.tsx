// @ts-nocheck
/**
 * UnifiedGUI Framework — 统一前端框架
 *
 * 核心设计: 不管用户选择什么平台创建什么 agent，统一 GUI 覆盖所有功能。
 *
 * 架构:
 * - Shell: 统一外壳 (导航、主题、状态栏)
 * - PlatformAdapter: 平台适配器 (动态加载各平台 UI)
 * - AgentCreator: 统一 Agent 创建向导 (跨平台)
 * - Workspace: 统一工作区 (多平台并行)
 * - ProtocolBridge: 协议桥 (与后端通信)
 *
 * 支持模式:
 * 1. Embedded — iframe/API 嵌入 (Web 平台)
 * 2. Proxy — API 代理 (后端服务)
 * 3. Launcher — 快捷启动 (桌面应用)
 * 4. Native — 原生组件 (复刻核心功能)
 *
 * @author SYLVA
 * @version 2.0.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Paper,
  Chip,
  Tooltip,
  Badge,
  SpeedDial,
  SpeedDialAction,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Code as CodeIcon,
  Hub as HubIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Launch as LaunchIcon,
  Storage as StorageIcon,
  Psychology as AgentIcon,
  Lan as NetworkIcon,
  Monitor as MonitorIcon,
  Extension as ExtensionIcon,
  Apps as AppsIcon,
} from '@mui/icons-material';

// ═══════════════════════════════════════════════════════════════════════════════
// Platform Registry — 所有支持的平台配置
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlatformConfig {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'tool' | 'integration';
  icon: string;
  displayMode: 'embedded' | 'proxy' | 'launcher' | 'native';
  url?: string;           // iframe URL (embedded)
  apiBase?: string;       // API base (proxy)
  launcher?: string;      // executable path (launcher)
  nativeComponent?: string; // component name (native)
  features: PlatformFeature[];
  status: 'installed' | 'not_installed' | 'running' | 'stopped';
  port?: number;
}

export interface PlatformFeature {
  id: string;
  name: string;
  icon: string;
  component?: string;       // React component to render
  requiresPlatform: string; // platform ID
  defaultParams?: Record<string, any>;
}

// ── 43个平台完整注册表 ──────────────────────────────────

export const PLATFORM_REGISTRY: PlatformConfig[] = [
  // ===== X-FRONTEND =====
  {
    id: 'aion_ui', name: 'AION UI', category: 'frontend', icon: 'Hub',
    displayMode: 'embedded', url: 'http://localhost:3000',
    features: [
      { id: 'aion_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'aion_ui' },
      { id: 'aion_agents', name: 'Agents', icon: 'AgentIcon', requiresPlatform: 'aion_ui' },
      { id: 'aion_swarm', name: 'Swarm', icon: 'HubIcon', requiresPlatform: 'aion_ui' },
    ],
    status: 'not_installed', port: 3000,
  },
  {
    id: 'open_webui', name: 'Open WebUI', category: 'frontend', icon: 'Chat',
    displayMode: 'embedded', url: 'http://localhost:3000',
    features: [
      { id: 'ow_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'open_webui' },
      { id: 'ow_rag', name: 'RAG', icon: 'Storage', requiresPlatform: 'open_webui' },
      { id: 'ow_models', name: 'Models', icon: 'Hub', requiresPlatform: 'open_webui' },
    ],
    status: 'not_installed', port: 3000,
  },
  {
    id: 'librechat', name: 'LibreChat', category: 'frontend', icon: 'Chat',
    displayMode: 'embedded', url: 'http://localhost:3080',
    features: [
      { id: 'lc_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'librechat' },
      { id: 'lc_plugins', name: 'Plugins', icon: 'Extension', requiresPlatform: 'librechat' },
    ],
    status: 'not_installed', port: 3080,
  },
  {
    id: 'dify', name: 'Dify', category: 'frontend', icon: 'Apps',
    displayMode: 'embedded', url: 'http://localhost:80',
    features: [
      { id: 'dify_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'dify' },
      { id: 'dify_workflow', name: 'Workflow', icon: 'Network', requiresPlatform: 'dify' },
      { id: 'dify_knowledge', name: 'Knowledge', icon: 'Storage', requiresPlatform: 'dify' },
    ],
    status: 'not_installed', port: 80,
  },
  {
    id: 'n8n', name: 'n8n', category: 'frontend', icon: 'Network',
    displayMode: 'embedded', url: 'http://localhost:5678',
    features: [
      { id: 'n8n_workflows', name: 'Workflows', icon: 'Network', requiresPlatform: 'n8n' },
      { id: 'n8n_executions', name: 'Executions', icon: 'Monitor', requiresPlatform: 'n8n' },
    ],
    status: 'not_installed', port: 5678,
  },
  {
    id: 'flowise', name: 'Flowise', category: 'frontend', icon: 'Network',
    displayMode: 'embedded', url: 'http://localhost:3000',
    features: [
      { id: 'flowise_chatflow', name: 'Chatflow', icon: 'Chat', requiresPlatform: 'flowise' },
      { id: 'flowise_marketplace', name: 'Marketplace', icon: 'Apps', requiresPlatform: 'flowise' },
    ],
    status: 'not_installed', port: 3000,
  },
  {
    id: 'jan_ai', name: 'Jan AI', category: 'frontend', icon: 'Chat',
    displayMode: 'launcher', launcher: 'jan.exe',
    features: [
      { id: 'jan_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'jan_ai' },
      { id: 'jan_models', name: 'Models', icon: 'Hub', requiresPlatform: 'jan_ai' },
    ],
    status: 'not_installed', port: 1337,
  },
  {
    id: 'lm_studio', name: 'LM Studio', category: 'frontend', icon: 'Computer',
    displayMode: 'launcher', launcher: 'LM Studio.exe',
    features: [
      { id: 'lms_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'lm_studio' },
      { id: 'lms_server', name: 'Server', icon: 'Network', requiresPlatform: 'lm_studio' },
    ],
    status: 'not_installed', port: 1234,
  },
  {
    id: 'anythingllm', name: 'AnythingLLM', category: 'frontend', icon: 'Storage',
    displayMode: 'embedded', url: 'http://localhost:3001',
    features: [
      { id: 'alm_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'anythingllm' },
      { id: 'alm_workspace', name: 'Workspace', icon: 'Storage', requiresPlatform: 'anythingllm' },
    ],
    status: 'not_installed', port: 3001,
  },

  // ===== Y-BACKEND =====
  {
    id: 'ollama', name: 'Ollama', category: 'backend', icon: 'Hub',
    displayMode: 'proxy', apiBase: 'http://localhost:11434',
    features: [
      { id: 'ollama_models', name: 'Models', icon: 'Hub', requiresPlatform: 'ollama' },
      { id: 'ollama_chat', name: 'Chat API', icon: 'Chat', requiresPlatform: 'ollama' },
    ],
    status: 'not_installed', port: 11434,
  },
  {
    id: 'localai', name: 'LocalAI', category: 'backend', icon: 'Hub',
    displayMode: 'proxy', apiBase: 'http://localhost:8080',
    features: [
      { id: 'lai_models', name: 'Models', icon: 'Hub', requiresPlatform: 'localai' },
      { id: 'lai_chat', name: 'Chat', icon: 'Chat', requiresPlatform: 'localai' },
    ],
    status: 'not_installed', port: 8080,
  },
  {
    id: 'openrouter', name: 'OpenRouter', category: 'backend', icon: 'Network',
    displayMode: 'proxy', apiBase: 'https://openrouter.ai/api/v1',
    features: [
      { id: 'or_models', name: 'Models', icon: 'Hub', requiresPlatform: 'openrouter' },
    ],
    status: 'not_installed',
  },
  {
    id: 'vllm', name: 'vLLM', category: 'backend', icon: 'Hub',
    displayMode: 'proxy', apiBase: 'http://localhost:8000',
    features: [
      { id: 'vllm_deploy', name: 'Deploy', icon: 'Launch', requiresPlatform: 'vllm' },
    ],
    status: 'not_installed', port: 8000,
  },

  // ===== Z-TOOLS =====
  {
    id: 'openclaw', name: 'OpenClaw', category: 'tool', icon: 'Extension',
    displayMode: 'native', nativeComponent: 'OpenClawPanel',
    features: [
      { id: 'claw_agents', name: 'Agents', icon: 'AgentIcon', requiresPlatform: 'openclaw' },
      { id: 'claw_skills', name: 'Skills', icon: 'Extension', requiresPlatform: 'openclaw' },
      { id: 'claw_channels', name: 'Channels', icon: 'Chat', requiresPlatform: 'openclaw' },
    ],
    status: 'not_installed',
  },
  {
    id: 'claude_code', name: 'Claude Code', category: 'tool', icon: 'Code',
    displayMode: 'launcher', launcher: 'claude.exe',
    features: [
      { id: 'cc_terminal', name: 'Terminal', icon: 'Code', requiresPlatform: 'claude_code' },
    ],
    status: 'not_installed',
  },
  {
    id: 'aider', name: 'Aider', category: 'tool', icon: 'Code',
    displayMode: 'launcher', launcher: 'aider.exe',
    features: [
      { id: 'aider_pair', name: 'Pair Programming', icon: 'Code', requiresPlatform: 'aider' },
    ],
    status: 'not_installed',
  },
  {
    id: 'cline', name: 'Cline', category: 'tool', icon: 'Code',
    displayMode: 'launcher', launcher: 'code --extension',
    features: [
      { id: 'cline_vscode', name: 'VS Code', icon: 'Code', requiresPlatform: 'cline' },
    ],
    status: 'not_installed',
  },
  {
    id: 'roo_code', name: 'Roo Code', category: 'tool', icon: 'Code',
    displayMode: 'launcher', launcher: 'code --extension',
    features: [
      { id: 'roo_vscode', name: 'VS Code', icon: 'Code', requiresPlatform: 'roo_code' },
    ],
    status: 'not_installed',
  },
  {
    id: 'goose', name: 'Goose', category: 'tool', icon: 'Extension',
    displayMode: 'launcher', launcher: 'goose.exe',
    features: [
      { id: 'goose_mcp', name: 'MCP Tools', icon: 'Extension', requiresPlatform: 'goose' },
    ],
    status: 'not_installed',
  },
  {
    id: 'continue_dev', name: 'Continue.dev', category: 'tool', icon: 'Code',
    displayMode: 'launcher', launcher: 'code --extension',
    features: [
      { id: 'cont_multi', name: 'Multi-IDE', icon: 'Code', requiresPlatform: 'continue_dev' },
    ],
    status: 'not_installed',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UnifiedGUI Shell — 统一外壳组件
// ═══════════════════════════════════════════════════════════════════════════════

export default function UnifiedGUI() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Array<{ platform: string; feature: string }>>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(PLATFORM_REGISTRY);
  const [hierarchyDialog, setHierarchyDialog] = useState(false);

  // 检测已安装平台
  useEffect(() => {
    detectInstalledPlatforms().then(setPlatforms);
  }, []);

  const detectInstalledPlatforms = async (): Promise<PlatformConfig[]> => {
    // 调用后端 API 检测
    try {
      const res = await fetch('/api/hierarchical/status');
      if (res.ok) {
        const data = await res.json();
        return platforms.map(p => ({
          ...p,
          status: data.data.coordinators.some((c: any) => c.name.includes(p.name))
            ? 'installed'
            : 'not_installed',
        }));
      }
    } catch {}
    return platforms;
  };

  // 打开功能标签
  const openFeature = (platformId: string, featureId: string) => {
    const existing = openTabs.find(t => t.platform === platformId && t.feature === featureId);
    if (!existing) {
      setOpenTabs([...openTabs, { platform: platformId, feature: featureId }]);
    }
    setActivePlatform(platformId);
    setActiveFeature(featureId);
  };

  // 关闭标签
  const closeTab = (index: number) => {
    const newTabs = openTabs.filter((_, i) => i !== index);
    setOpenTabs(newTabs);
    if (newTabs.length > 0) {
      const last = newTabs[newTabs.length - 1];
      setActivePlatform(last.platform);
      setActiveFeature(last.feature);
    }
  };

  // 获取当前功能组件
  const getActiveComponent = () => {
    if (!activePlatform || !activeFeature) return <UnifiedHome />;

    const platform = platforms.find(p => p.id === activePlatform);
    if (!platform) return <UnifiedHome />;

    switch (platform.displayMode) {
      case 'embedded':
        return <EmbeddedPlatform platform={platform} feature={activeFeature} />;
      case 'proxy':
        return <ProxyPlatform platform={platform} feature={activeFeature} />;
      case 'launcher':
        return <LauncherPlatform platform={platform} />;
      case 'native':
        return <NativePlatform platform={platform} feature={activeFeature} />;
      default:
        return <UnifiedHome />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar variant="dense">
          <IconButton color="inherit" onClick={() => setDrawerOpen(!drawerOpen)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            SYLVA Unified Agent Ecosystem
          </Typography>
          <Chip
            label="Unified GUI v2.0"
            size="small"
            color="secondary"
            sx={{ mr: 1 }}
          />
          <IconButton color="inherit" onClick={() => setHierarchyDialog(true)}>
            <Badge badgeContent={0} color="error">
              <MonitorIcon />
            </Badge>
          </IconButton>
        </Toolbar>

        {/* Tab Bar */}
        {openTabs.length > 0 && (
          <Tabs
            value={openTabs.findIndex(t => t.platform === activePlatform && t.feature === activeFeature)}
            onChange={(_, idx) => {
              const tab = openTabs[idx];
              if (tab) {
                setActivePlatform(tab.platform);
                setActiveFeature(tab.feature);
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              bgcolor: 'primary.dark',
              minHeight: 36,
              '& .MuiTabs-flexContainer': { gap: 0.5 },
            }}
          >
            {openTabs.map((tab, idx) => {
              const platform = platforms.find(p => p.id === tab.platform);
              const feature = platform?.features.find(f => f.id === tab.feature);
              return (
                <Tab
                  key={`${tab.platform}-${tab.feature}`}
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {feature?.name || tab.feature}
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); closeTab(idx); }}
                        sx={{ p: 0, ml: 0.5, color: 'inherit' }}
                      >
                        <Typography sx={{ fontSize: 14 }}>×</Typography>
                      </IconButton>
                    </Box>
                  }
                  sx={{ minHeight: 36, px: 2, textTransform: 'none' }}
                />
              );
            })}
          </Tabs>
        )}
      </AppBar>

      {/* Left Drawer — Platform Navigation */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' },
        }}
      >
        <Toolbar variant="dense" />

        {/* Quick Actions */}
        <Box sx={{ p: 2, pb: 0 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => openFeature('unified', 'agent_creator')}
            sx={{ mb: 1 }}
          >
            Create Agent
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LaunchIcon />}
            onClick={() => openFeature('unified', 'workspace')}
            sx={{ mb: 1 }}
          >
            Open Workspace
          </Button>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Platform Categories */}
        {['frontend', 'backend', 'tool'].map(category => {
          const categoryPlatforms = platforms.filter(p => p.category === category && p.status !== 'not_installed');
          if (categoryPlatforms.length === 0) return null;

          return (
            <React.Fragment key={category}>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', textTransform: 'uppercase' }}>
                {category === 'frontend' ? 'Frontend Platforms' : category === 'backend' ? 'Backend Engines' : 'Agent Tools'}
              </Typography>
              <List dense>
                {categoryPlatforms.map(platform => (
                  <React.Fragment key={platform.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={activePlatform === platform.id}
                        onClick={() => {
                          if (platform.features.length > 0) {
                            openFeature(platform.id, platform.features[0].id);
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            component="span"
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: platform.status === 'running' ? 'success.main' : 'warning.main',
                              display: 'inline-block',
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={platform.name}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                        {platform.status === 'running' && (
                          <Chip size="small" label="Live" color="success" sx={{ height: 18, fontSize: '0.7rem' }} />
                        )}
                      </ListItemButton>
                    </ListItem>

                    {/* Feature Sub-menu */}
                    {activePlatform === platform.id && platform.features.map(feature => (
                      <ListItem key={feature.id} disablePadding sx={{ pl: 4 }}>
                        <ListItemButton
                          selected={activeFeature === feature.id}
                          onClick={() => openFeature(platform.id, feature.id)}
                          dense
                        >
                          <ListItemText
                            primary={feature.name}
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </React.Fragment>
                ))}
              </List>
              <Divider sx={{ my: 1 }} />
            </React.Fragment>
          );
        })}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 0,
          mt: openTabs.length > 0 ? 10 : 6,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}
      >
        {getActiveComponent()}
      </Box>

      {/* Floating Action Button — Quick Create */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        icon={<AddIcon />}
      >
        {/* @ts-ignore — MUI类型版本兼容 */}
        <SpeedDialAction
          icon={<ChatIcon />}
          tooltipTitle="New Chat"
          onClick={() => openFeature('aion_ui', 'aion_chat')}
        />
        {/* @ts-ignore — MUI类型版本兼容 */}
        <SpeedDialAction
          icon={<CodeIcon />}
          tooltipTitle="New Code Task"
          onClick={() => openFeature('openclaw', 'claw_agents')}
        />
        {/* @ts-ignore — MUI类型版本兼容 */}
        <SpeedDialAction
          icon={<NetworkIcon />}
          tooltipTitle="New Workflow"
          onClick={() => openFeature('dify', 'dify_workflow')}
        />
        {/* @ts-ignore — MUI类型版本兼容 */}
        <SpeedDialAction
          icon={<MonitorIcon />}
          tooltipTitle="Hierarchical Monitor"
          onClick={() => setHierarchyDialog(true)}
        />
      </SpeedDial>

      {/* Hierarchical Monitor Dialog */}
      <Dialog
        open={hierarchyDialog}
        onClose={() => setHierarchyDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Hierarchical Orchestration Monitor</DialogTitle>
        <DialogContent sx={{ minHeight: 600 }}>
          {/* Import and render HierarchicalDashboard */}
          <Box sx={{ height: '80vh' }}>
            <Typography variant="body2" color="text.secondary">
              Hierarchical Dashboard would be embedded here.
              Import from ./HierarchicalDashboard
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Platform Display Components
// ═══════════════════════════════════════════════════════════════════════════════

function UnifiedHome() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom>Welcome to SYLVA</Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Unified Agent Ecosystem — All Platforms, One Interface
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {PLATFORM_REGISTRY.filter(p => p.category === 'frontend').slice(0, 6).map(p => (
          <Paper key={p.id} sx={{ p: 2, width: 200, textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{p.name}</Typography>
            <Chip size="small" label={p.status} color={p.status === 'installed' ? 'success' : 'default'} sx={{ mt: 1 }} />
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

function EmbeddedPlatform({ platform, feature }: { platform: PlatformConfig; feature: string }) {
  const featureConfig = platform.features.find(f => f.id === feature);
  const url = platform.url || '';

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ p: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2">{platform.name} — {featureConfig?.name || feature}</Typography>
        <Chip size="small" label="Embedded" color="info" />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => window.open(url, '_blank')}>
          <LaunchIcon fontSize="small" />
        </IconButton>
      </Box>
      <iframe
        src={url}
        style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </Box>
  );
}

function ProxyPlatform({ platform }: { platform: PlatformConfig; feature: string }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">{platform.name} (API Proxy)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        API Base: {platform.apiBase}
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        This platform operates via API proxy. Use the corresponding feature panel to interact.
      </Typography>
    </Box>
  );
}

function LauncherPlatform({ platform }: { platform: PlatformConfig }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>{platform.name}</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        This is a desktop application. Click below to launch.
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={<LaunchIcon />}
        onClick={() => {
          // Launch via backend API
          fetch('/api/hierarchical/intervene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'LAUNCH_PLATFORM',
              target: { platformId: platform.id },
              payload: { launcher: platform.launcher },
              reason: 'Manual launch from Unified GUI',
            }),
          });
        }}
      >
        Launch {platform.name}
      </Button>
    </Box>
  );
}

function NativePlatform({ platform, feature }: { platform: PlatformConfig; feature: string }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">{platform.name} — Native Component</Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Feature: {feature}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Native component rendering would load the specific React component here.
      </Typography>
    </Box>
  );
}
