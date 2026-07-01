# BloomBloomGarden 前端 MOCK→真实API 修复计划

**日期**: 2026-06-17  
**项目路径**: `C:\Users\一梦\Documents\kimi\workspace`  
**API客户端**: `frontend/src/api/client.ts`（已含130+接口）

---

## 阶段1：创建新页面 + Sidebar修复（并行）

### 1.1 创建 HandoffPage.tsx
- 对应后端 `/api/handoff`（13个接口）
- 功能：移交列表、创建移交、接受/拒绝/完成、自动路由
- 参考API：`fetchHandoffs`, `fetchPendingHandoffs`, `createHandoff`, `acceptHandoff`, `declineHandoff`, `completeHandoff`, `autoRouteHandoff`

### 1.2 创建 IntegrationsPage.tsx
- 对应后端 `/api/integrations`（8个接口）
- 功能：集成列表、创建/编辑/删除、测试/同步
- 参考API：`fetchIntegrations`, `createIntegration`, `testIntegration`, `syncIntegration`

### 1.3 修复 Sidebar.tsx
- 添加12个新导航项到 `navItems` 数组
- 添加所需图标 import（lucide-react）
- 展开默认状态配置

---

## 阶段2：P0 MOCK 修复（3批并行）

### 第1批（10个文件）
| 文件 | MOCK常量 | 对应API |
|------|---------|---------|
| Dashboard.tsx | MOCK_STATS, MOCK_ACTIVITIES, MOCK_SERVICES | fetchAgents, fetchTasks, fetchPlatforms, fetchChannels, fetchSkills, fetchMonitorData |
| SecurityCenter.tsx | MOCK_LOGS, MOCK_KEYS, MOCK_RULES | fetchSecurityLogs, fetchSecurityMetrics, fetchSecurityAudit |
| BackupManager.tsx | MOCK_BACKUPS | fetchBackups, fetchBackupStats |
| SpendTracker.tsx | MOCK_RECORDS, MOCK_DAILY | fetchSpendStats, fetchSpendSummary, fetchSpendBreakdown |
| ExternalIntegrations.tsx | PLATFORMS（硬编码） | fetchExternalIntegrations, fetchExternalStats |
| EventsPage.tsx | MOCK_EVENTS | fetchEvents, fetchEventStats |
| ProcessMonitor.tsx | MOCK_PROCESSES | fetchProcesses, fetchProcessStats |
| RegistryView.tsx | MOCK_REGISTRY | 无直接API，用fetchRegistry替代或fetchProcesses |
| AiSearch.tsx | MOCK_RESULTS | aiSearch |
| ChatAccountManager.tsx | MOCK_ACCOUNTS | fetchChatAccounts |

### 第2批（10个文件）
| 文件 | MOCK常量 | 对应API |
|------|---------|---------|
| Login.tsx | MOCK_USERS | login, register, getMe |
| Platforms.tsx | MOCK_PLATFORMS | fetchPlatforms |
| Admin.tsx | MOCK_ADMIN | fetchAuthSessions |
| SchedulerPage.tsx | MOCK_SCHEDULES | fetchSchedulerTasks |
| Sessions.tsx | MOCK_SESSIONS | fetchAuthSessions |
| Channels.tsx | MOCK_CHANNELS | fetchChannels |
| ChatChannels.tsx | MOCK_CHANNELS | fetchChannels |
| OllamaSettings.tsx | MOCK_OLLAMA | fetchOllamaModels |
| Workspaces.tsx | MOCK_WORKSPACES | fetchWorkspaces |
| WebhooksPage.tsx | MOCK_WEBHOOKS | fetchWebhooks |

### 第3批（11个文件）
| 文件 | MOCK常量 | 对应API |
|------|---------|---------|
| UploadsPage.tsx | MOCK_UPLOADS | uploadFile |
| TasksPage.tsx | MOCK_TASKS | fetchTasks |
| TasksAndChat.tsx | MOCK_TASKS | fetchTasks |
| MemoryExport.tsx | MOCK_EXPORTS | exportMemories |
| ContextMonitor.tsx | MOCK_CONTEXTS | fetchAgentContext |
| Collaboration.tsx | MOCK_COLLAB | fetchGroups, fetchAgents |
| SwarmPanel.tsx | MOCK_SWARM | fetchSwarms, coordinateSwarm |
| Skills.tsx | MOCK_SKILLS | fetchSkills |
| Memory.tsx | MOCK_MEMORIES | fetchMemories |
| KnowledgeHub.tsx | MOCK_KB, MOCK_DOCS | fetchKnowledgeBases |
| PlatformManager.tsx | MOCK_PLATFORMS, MOCK_DETAILS | fetchPlatforms, fetchProviders |

---

## 阶段3：验证与提交
- `npm run build` 零错误
- 检查浏览器控制台
- git add, commit, push

---

## 修改模式规范

### 模式1：MOCK常量 → 真实API
```typescript
// 删除：const MOCK_DATA = [...]
// 添加：
import { fetchData } from '@/api/client'
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
useEffect(() => {
  let cancelled = false
  setLoading(true)
  fetchData().then(res => {
    if (!cancelled) { setData(res.data || res || []); setLoading(false) }
  }).catch(err => {
    if (!cancelled) { setError(err.message || '加载失败'); setLoading(false) }
  })
  return () => { cancelled = true }
}, [])
```

### 模式2：删除 catch 中的 mock fallback
```typescript
// 删除：catch(e) { // Keep mock data on error }
// 改为：catch(e) { setError(...); } finally { setLoading(false) }
```

### 模式3：空数据渲染占位
```typescript
{data.length === 0 ? (
  <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
) : (
  data.map(...)
)}
```
