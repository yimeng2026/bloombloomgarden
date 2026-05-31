import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'

/* ── Code Splitting — lazy load every page ─────────────────────── */

const Home           = lazy(() => import('@/pages/Home'))
const Dashboard      = lazy(() => import('@/pages/Dashboard'))
const PlatformHub    = lazy(() => import('@/pages/PlatformHub'))
const PlatformLibrary = lazy(() => import('@/pages/PlatformLibrary'))
const Platforms      = lazy(() => import('@/pages/Platforms'))
const WorkspaceHub   = lazy(() => import('@/pages/WorkspaceHub'))
const FileWorkspace  = lazy(() => import('@/pages/FileWorkspace'))
const KnowledgeHub   = lazy(() => import('@/pages/KnowledgeHub'))
const Memory         = lazy(() => import('@/pages/Memory'))
const MemoryExport   = lazy(() => import('@/pages/MemoryExport'))
const AgentCreator   = lazy(() => import('@/pages/AgentCreator'))
const Agents         = lazy(() => import('@/pages/Agents'))
const AgentCollab    = lazy(() => import('@/pages/AgentCollab'))
const AgentMonitor   = lazy(() => import('@/pages/AgentMonitor'))
const Monitoring     = lazy(() => import('@/pages/Monitoring'))
const Groups         = lazy(() => import('@/pages/Groups'))
const GroupDetail    = lazy(() => import('@/pages/GroupDetail'))
const Collaboration  = lazy(() => import('@/pages/Collaboration'))
const SwarmPanel     = lazy(() => import('@/pages/SwarmPanel'))
const SwarmArchitectures = lazy(() => import('@/pages/SwarmArchitectures'))
const SettingsHub    = lazy(() => import('@/pages/SettingsHub'))
const Admin          = lazy(() => import('@/pages/Admin'))
const Chat           = lazy(() => import('@/pages/Chat'))
const ChatChannels   = lazy(() => import('@/pages/ChatChannels'))
const TasksAndChat   = lazy(() => import('@/pages/TasksAndChat'))
const Channels       = lazy(() => import('@/pages/Channels'))
const Sessions       = lazy(() => import('@/pages/Sessions'))
const ContextMonitor = lazy(() => import('@/pages/ContextMonitor'))
const ModelBrowser   = lazy(() => import('@/pages/ModelBrowser'))
const Skills         = lazy(() => import('@/pages/Skills'))
const Workflows      = lazy(() => import('@/pages/Workflows'))
const WebhooksPage   = lazy(() => import('@/pages/WebhooksPage'))
const APITest        = lazy(() => import('@/pages/APITest'))
const StubPage       = lazy(() => import('@/pages/StubPage'))

/* ── 3DACP 新頁面 ─────────────────────────────────────────────── */
const UploadsPage            = lazy(() => import('@/pages/UploadsPage'))
const AiSearchPage           = lazy(() => import('@/pages/AiSearch'))
const TasksDeepPage          = lazy(() => import('@/pages/TasksPage'))
const BackupManagerPage      = lazy(() => import('@/pages/BackupManager'))
const ProcessMonitorPage     = lazy(() => import('@/pages/ProcessMonitor'))
const ExternalIntegrationsPage = lazy(() => import('@/pages/ExternalIntegrations'))
const RegistryViewPage       = lazy(() => import('@/pages/RegistryView'))
const BlueprintStudioPage    = lazy(() => import('@/pages/BlueprintStudio_3DACP'))
const InterventionCenterPage = lazy(() => import('@/pages/InterventionCenter'))
const IntegrationManagerPage = lazy(() => import('@/pages/IntegrationManager'))
const LoginPage              = lazy(() => import('@/pages/Login'))
const ApiKeysPage            = lazy(() => import('@/pages/APIKeys'))
const OllamaSettingsPage     = lazy(() => import('@/pages/OllamaSettings'))
const WorkspacesPage         = lazy(() => import('@/pages/Workspaces'))
const SecurityCenterPage     = lazy(() => import('@/pages/SecurityCenter'))
const EventsPage = lazy(() => import('@/pages/EventsPage'))
const EventsMonitorPage = lazy(() => import('@/pages/EventsMonitor'))
const SchedulerPage = lazy(() => import('@/pages/SchedulerPage'))
const TaskSchedulerPage      = lazy(() => import('@/pages/TaskScheduler'))
const TaskManagerPage        = lazy(() => import('@/pages/TaskManager'))
const SpendTrackerPage       = lazy(() => import('@/pages/SpendTracker'))
const KimiClusterPage        = lazy(() => import('@/pages/KimiClusterPage'))
const AgentContextPage       = lazy(() => import('@/pages/AgentContextPage'))
const HierarchicalDashboard  = lazy(() => import('@/pages/HierarchicalDashboard'))
const DialogCenter           = lazy(() => import('@/pages/DialogCenter'))
const UnifiedGUI             = lazy(() => import('@/pages/UnifiedGUI'))
const Ecosystem3D            = lazy(() => import('@/pages/Ecosystem3D'))
const ProtocolAdmin          = lazy(() => import('@/pages/ProtocolAdmin'))

/* ── Suspense fallback ───────────────────────────────────────── */

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-120px)]">
      <div className="flex items-center gap-3 text-[var(--sage-500)]">
        <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
        <span className="text-sm">加载中...</span>
      </div>
    </div>
  )
}

/* ── Router ──────────────────────────────────────────────────── */

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Platform */}
          <Route path="/platform" element={<PlatformHub />} />
          <Route path="/platform/api" element={<PlatformHub />} />
          <Route path="/platform/skills" element={<PlatformHub />} />
          <Route path="/platforms" element={<Platforms />} />
          <Route path="/platforms/list" element={<Platforms />} />
          <Route path="/platform-library" element={<PlatformLibrary />} />

          {/* Workspace */}
          <Route path="/workspace" element={<WorkspaceHub />} />
          <Route path="/files" element={<FileWorkspace />} />

          {/* Knowledge */}
          <Route path="/knowledge" element={<KnowledgeHub />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/memory/export" element={<MemoryExport />} />

          {/* Agents */}
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/create" element={<AgentCreator />} />
          <Route path="/agents/collab" element={<AgentCollab />} />
          <Route path="/agents/monitor" element={<AgentMonitor />} />

          {/* Chat & Communication */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/channels" element={<ChatChannels />} />
          <Route path="/tasks" element={<TasksAndChat />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/sessions" element={<Sessions />} />

          {/* Monitoring */}
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/context" element={<ContextMonitor />} />

          {/* Tools */}
          <Route path="/model-browser" element={<ModelBrowser />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/scheduler" element={<TaskSchedulerPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/api-test" element={<APITest />} />

          {/* Groups & Swarm */}
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/collaboration" element={<Collaboration />} />
          <Route path="/swarm" element={<SwarmPanel />} />
          <Route path="/swarm-architectures" element={<SwarmArchitectures />} />

          {/* Settings & Admin */}
          <Route path="/settings" element={<SettingsHub />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />

          {/* Fallback */}
          <Route path="/uploads" element={<UploadsPage />} />
          <Route path="/intervention" element={<InterventionCenterPage />} />
          <Route path="/integration-manager" element={<IntegrationManagerPage />} />
          <Route path="/ai-search" element={<AiSearchPage />} />
          <Route path="/events" element={<EventsMonitorPage />} />
          <Route path="/events-page" element={<EventsPage />} />
          <Route path="/scheduler" element={<TaskSchedulerPage />} />
          <Route path="/scheduler-page" element={<SchedulerPage />} />
          <Route path="/tasks-deep" element={<TasksDeepPage />} />
          <Route path="/backups" element={<BackupManagerPage />} />
          <Route path="/processes" element={<ProcessMonitorPage />} />
          <Route path="/external-integrations" element={<ExternalIntegrationsPage />} />
          <Route path="/registry" element={<RegistryViewPage />} />
          <Route path="/blueprints" element={<BlueprintStudioPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/ollama" element={<OllamaSettingsPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/security" element={<SecurityCenterPage />} />
          <Route path="/task-manager" element={<TaskManagerPage />} />
          <Route path="/spend" element={<SpendTrackerPage />} />
          <Route path="/kimi-cluster" element={<KimiClusterPage />} />
          <Route path="/agent-contexts" element={<AgentContextPage />} />
          <Route path="/hierarchical" element={<HierarchicalDashboard />} />
          <Route path="/dialog-center" element={<DialogCenter />} />
          <Route path="/unified" element={<UnifiedGUI />} />
          <Route path="/ecosystem" element={<Ecosystem3D />} />
          <Route path="/protocol-admin" element={<ProtocolAdmin />} />
          <Route path="*" element={<StubPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
// trigger 1780265431
// trigger 1780265564
// trigger 1780265717
// trigger 1780266033
