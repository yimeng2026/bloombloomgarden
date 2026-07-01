import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Users, Cpu, HardDrive, Globe,
  Zap, Activity, ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  AlertTriangle, MessageSquare, Bot, Layers, FileText, BarChart3,
  RefreshCw, ChevronRight, Settings, Rocket, MessageCircle, BookOpen,
  Hexagon, Settings2, Plus, ArrowRight, XCircle, Wifi, Database, Server,
  Loader2, Minus,
} from 'lucide-react'
import { fetchAgents, fetchTasks, fetchPlatforms, fetchChannels, fetchSkills, fetchMonitorData } from '@/api/client'
import { DASHBOARD_MAP } from '@/components/dashboard'

interface StatCard {
  label: string
  value: string
  rawValue: number
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
  emptyRoute: string
  emptyLabel: string
}

interface QuickAction {
  icon: any
  title: string
  desc: string
  route: string
  color: string
  bgColor: string
}

interface AgentOption {
  id: string
  name: string
  dashboardType?: string
  protocolLevel?: number
}

interface ActivityItem {
  id: string
  title: string
  time: string
  status: 'success' | 'warning' | 'error' | 'pending'
  type?: string
  entityId?: string
  entityType?: string
}

interface ServiceItem {
  name: string
  status: string
  uptime: string
  load: number
}

interface HealthService {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Rocket,
    title: '创建 Agent',
    desc: '快速部署新智能体',
    route: '/agents/create',
    color: '#10b981',
    bgColor: '#10b98115',
  },
  {
    icon: MessageCircle,
    title: '开始对话',
    desc: '与智能体实时交流',
    route: '/chat',
    color: '#3b82f6',
    bgColor: '#3b82f615',
  },
  {
    icon: BookOpen,
    title: '创建知识库',
    desc: '构建结构化知识资产',
    route: '/knowledge',
    color: '#f59e0b',
    bgColor: '#f59e0b15',
  },
  {
    icon: Hexagon,
    title: '创建蜂群',
    desc: '编排多智能体协作',
    route: '/groups',
    color: '#8b5cf6',
    bgColor: '#8b5cf615',
  },
  {
    icon: Settings2,
    title: '配置平台',
    desc: '管理 LLM 提供商',
    route: '/platform',
    color: '#6b7280',
    bgColor: '#6b728015',
  },
  {
    icon: BarChart3,
    title: '查看监控',
    desc: '系统性能实时指标',
    route: '/monitoring',
    color: '#ec4899',
    bgColor: '#ec489915',
  },
]

const HEALTH_ICONS: Record<string, any> = {
  'API Gateway': Globe,
  'Database': Database,
  'Message Queue': Server,
  'Cache': Cpu,
  'Search': Wifi,
  'Storage': HardDrive,
}

function getActivityRoute(activity: ActivityItem): string | null {
  if (activity.entityType === 'agent' || activity.type?.includes('agent')) return '/agents'
  if (activity.entityType === 'task' || activity.type?.includes('task')) return '/tasks'
  if (activity.entityType === 'group' || activity.type?.includes('group')) return '/groups'
  if (activity.entityType === 'platform' || activity.type?.includes('platform')) return '/platform'
  if (activity.entityType === 'skill' || activity.type?.includes('skill')) return '/skills'
  if (activity.entityType === 'knowledge' || activity.type?.includes('knowledge')) return '/knowledge'
  if (activity.entityType === 'workflow' || activity.type?.includes('workflow')) return '/workflows'
  if (activity.entityId) {
    if (activity.type?.includes('agent')) return `/agents`
    if (activity.type?.includes('task')) return `/tasks`
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [healthServices, setHealthServices] = useState<HealthService[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [servicesLoading, setServicesLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [agentsRes, tasks, platforms, channels, skills, monitor] = await Promise.allSettled([
          fetchAgents(),
          fetchTasks(),
          fetchPlatforms(),
          fetchChannels(),
          fetchSkills(),
          fetchMonitorData(),
        ])

        const agentCount = agentsRes.status === 'fulfilled' && agentsRes.value?.data?.length > 0
          ? agentsRes.value.data.length
          : 0
        const taskCount = tasks.status === 'fulfilled' && tasks.value?.data?.length > 0
          ? tasks.value.data.length
          : 0
        const platformCount = platforms.status === 'fulfilled' && platforms.value?.data?.length > 0
          ? platforms.value.data.length
          : 0
        const skillCount = skills.status === 'fulfilled' && skills.value?.data?.length > 0
          ? skills.value.data.length
          : 0

        const newStats: StatCard[] = [
          {
            label: '活跃智能体',
            value: agentCount.toString(),
            rawValue: agentCount,
            change: '',
            trend: agentCount > 0 ? 'up' : 'down',
            icon: Bot,
            color: '#10b981',
            emptyRoute: '/agents/create',
            emptyLabel: '创建第一个 Agent',
          },
          {
            label: '今日任务',
            value: taskCount.toString(),
            rawValue: taskCount,
            change: '',
            trend: taskCount > 0 ? 'up' : 'neutral',
            icon: Layers,
            color: '#3b82f6',
            emptyRoute: '/tasks',
            emptyLabel: '查看任务中心',
          },
          {
            label: '已配置平台',
            value: platformCount.toString(),
            rawValue: platformCount,
            change: '',
            trend: platformCount > 0 ? 'up' : 'down',
            icon: Globe,
            color: '#f59e0b',
            emptyRoute: '/platform',
            emptyLabel: '配置第一个平台',
          },
          {
            label: '技能总数',
            value: skillCount.toString(),
            rawValue: skillCount,
            change: '',
            trend: skillCount > 0 ? 'up' : 'neutral',
            icon: Zap,
            color: '#8b5cf6',
            emptyRoute: '/skills',
            emptyLabel: '浏览技能库',
          },
        ]

        // Apply trend data from monitor if available
        if (monitor.status === 'fulfilled' && monitor.value?.data?.stats) {
          const mstats = monitor.value.data.stats
          newStats.forEach((stat, idx) => {
            const keyMap = ['agents', 'tasks', 'platforms', 'skills']
            const key = keyMap[idx]
            if (mstats[key]) {
              const s = mstats[key]
              if (s.change !== undefined) {
                stat.change = s.change
                stat.trend = s.trend || (s.change > 0 ? 'up' : s.change < 0 ? 'down' : 'neutral')
              } else if (s.count !== undefined) {
                stat.value = String(s.count)
                stat.rawValue = s.count
              }
            }
          })
        }

        // Fallback: if no change from monitor, show "实时" for active stats
        newStats.forEach((stat) => {
          if (!stat.change) {
            if (stat.rawValue > 0) {
              stat.change = '实时'
              stat.trend = 'up'
            } else {
              stat.change = '待配置'
              stat.trend = 'down'
            }
          }
        })

        if (agentsRes.status === 'fulfilled' && agentsRes.value?.data?.length > 0) {
          const agentList = agentsRes.value.data.map((a: any) => ({
            id: a.id,
            name: a.name,
            dashboardType: a.dashboardType || 'L1',
            protocolLevel: a.protocolLevel || 1,
          }))
          setAgents(agentList)
          if (agentList.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agentList[0].id)
            setSelectedAgent(agentList[0])
          }
        }

        if (monitor.status === 'fulfilled' && monitor.value?.data?.activities) {
          setActivities(monitor.value.data.activities)
          setActivitiesLoading(false)
        }
        if (monitor.status === 'fulfilled' && monitor.value?.data?.services) {
          setServices(monitor.value.data.services)
          setServicesLoading(false)
        }
        if (monitor.status === 'fulfilled' && monitor.value?.data?.health) {
          setHealthServices(monitor.value.data.health)
          setHealthLoading(false)
        } else if (monitor.status === 'fulfilled' && monitor.value?.data?.services) {
          // Derive health from services if no explicit health data
          const derivedHealth = monitor.value.data.services.map((s: ServiceItem) => ({
            name: s.name,
            status: s.status === 'running' ? 'healthy' as const : 'degraded' as const,
            latency: s.load,
          }))
          setHealthServices(derivedHealth)
          setHealthLoading(false)
        }

        setStats(newStats)
      } catch (e: any) {
        setError(e.message || '加载仪表盘数据失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId)
    const agent = agents.find(a => a.id === agentId)
    setSelectedAgent(agent || null)
  }

  const dashboardType = selectedAgent?.dashboardType || 'L1'
  const SpecificDashboard = DASHBOARD_MAP[dashboardType] || DASHBOARD_MAP['L1']

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">仪表盘</h1>
            <p className="text-sm text-[var(--sage-500)]">实时监控与系统概览</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {agents.length > 0 && (
            <select
              value={selectedAgentId}
              onChange={(e) => handleAgentSelect(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
            >
              <option value="">系统概览</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} (L{a.protocolLevel})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)] transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent-specific Dashboard */}
      {selectedAgent && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-[var(--sage-500)]" />
            <h2 className="font-semibold text-sm text-[var(--sage-800)]">
              {selectedAgent.name} 专用仪表盘
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">
                {dashboardType === 'L0' ? '基础设施' : dashboardType === 'L1' ? '单线程LLM' : dashboardType === 'L2' ? '多线程编排' : '网关聚合'}
              </span>
            </h2>
          </div>
          <SpecificDashboard agentId={selectedAgent.id} agentName={selectedAgent.name} />
        </div>
      )}

      {/* Quick Action Bar */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--sage-700)] mb-3">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.title}
                onClick={() => navigate(action.route)}
                className="card p-4 text-left hover:shadow-md transition-all group bg-white"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: action.bgColor }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <p className="text-sm font-medium text-[var(--sage-800)] group-hover:text-[var(--sage-900)]">
                  {action.title}
                </p>
                <p className="text-[11px] text-[var(--sage-400)] mt-0.5 leading-relaxed">
                  {action.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isEmpty = stat.rawValue === 0
          return (
            <div key={stat.label} className="card p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--sage-500)]">{stat.label}</span>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--sage-800)]">{stat.value}</span>
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    stat.trend === 'up'
                      ? 'text-green-600'
                      : stat.trend === 'down'
                        ? 'text-red-500'
                        : 'text-[var(--sage-400)]'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : stat.trend === 'down' ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {stat.change}
                </span>
              </div>
              {/* Empty state guidance */}
              {isEmpty && (
                <button
                  onClick={() => navigate(stat.emptyRoute)}
                  className="mt-3 text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)] hover:text-[var(--sage-700)] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {stat.emptyLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Two Column Layout: Activity + Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 card overflow-hidden bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--sage-100)' }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--sage-500)]" />
              <h2 className="font-semibold text-sm text-[var(--sage-800)]">最近活动</h2>
            </div>
            <button
              onClick={() => navigate('/monitoring')}
              className="text-xs text-[var(--sage-500)] hover:text-[var(--sage-700)] flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
            {activitiesLoading ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-8">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                加载中...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-[var(--sage-300)] mx-auto mb-2" />
                <p className="text-sm text-[var(--sage-400)]">暂无活动记录</p>
                <p className="text-xs text-[var(--sage-400)] mt-1">系统运行正常，等待新任务触发</p>
              </div>
            ) : (
              activities.map((activity) => {
                const route = getActivityRoute(activity)
                return (
                  <div
                    key={activity.id}
                    onClick={() => route && navigate(route)}
                    className={`flex items-center gap-3 px-4 py-3 ${route ? 'cursor-pointer hover:bg-[var(--sage-50)]' : ''} transition-colors`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          activity.status === 'success'
                            ? '#10b98115'
                            : activity.status === 'warning'
                              ? '#f59e0b15'
                              : activity.status === 'error'
                                ? '#ef444415'
                                : 'var(--sage-100)',
                      }}
                    >
                      {activity.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : activity.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : activity.status === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-[var(--sage-400)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--sage-800)] truncate">{activity.title}</p>
                      <p className="text-[10px] text-[var(--sage-400)]">{activity.time}</p>
                    </div>
                    {route && (
                      <ArrowRight className="w-3 h-3 text-[var(--sage-300)] shrink-0" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Service Status */}
        <div className="card overflow-hidden bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--sage-100)' }}>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
              <h2 className="font-semibold text-sm text-[var(--sage-800)]">服务状态</h2>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
            {servicesLoading ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-8">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                加载中...
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8">
                <Server className="w-8 h-8 text-[var(--sage-300)] mx-auto mb-2" />
                <p className="text-sm text-[var(--sage-400)]">暂无服务数据</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.name} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--sage-800)]">{service.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        service.status === 'running'
                          ? 'bg-green-500/10 text-green-600'
                          : service.status === 'error'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                      }`}
                    >
                      {service.status === 'running' ? '运行中' : service.status === 'error' ? '异常' : '空闲'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                    <span>运行 {service.uptime}</span>
                    <span>负载 {service.load}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-[var(--sage-100)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${service.load}%`,
                        backgroundColor:
                          service.load > 80 ? '#ef4444' : service.load > 50 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Health Services Row */}
      {(healthServices.length > 0 || !healthLoading) && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--sage-700)] mb-3">服务健康</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {healthLoading ? (
              <div className="col-span-full text-center py-4 text-sm text-[var(--sage-400)]">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                加载服务健康状态...
              </div>
            ) : healthServices.length === 0 ? (
              <div className="col-span-full card p-4 text-center text-sm text-[var(--sage-400)] bg-white">
                <Wifi className="w-6 h-6 mx-auto mb-2 text-[var(--sage-300)]" />
                服务健康数据未就绪
              </div>
            ) : (
              healthServices.map((hs) => {
                const Icon = HEALTH_ICONS[hs.name] || Server
                const isHealthy = hs.status === 'healthy'
                const isDegraded = hs.status === 'degraded'
                return (
                  <div
                    key={hs.name}
                    className="card p-3 bg-white flex items-center gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isHealthy
                          ? '#10b98115'
                          : isDegraded
                            ? '#f59e0b15'
                            : '#ef444415',
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{
                          color: isHealthy
                            ? '#10b981'
                            : isDegraded
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--sage-800)] truncate">{hs.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isHealthy ? 'bg-green-500' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-[10px] text-[var(--sage-400)]">
                          {isHealthy ? '正常' : isDegraded ? '降级' : '异常'}
                          {hs.latency !== undefined ? ` · ${hs.latency}ms` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Links (legacy, kept at bottom) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '智能体管理', icon: Bot, route: '/agents', desc: `${agents.length} 个活跃` },
          { label: '技能库', icon: Zap, route: '/skills', desc: '管理技能' },
          { label: '工作流', icon: Layers, route: '/workflows', desc: '编排流程' },
          { label: '系统监控', icon: BarChart3, route: '/monitoring', desc: '实时指标' },
        ].map((link) => {
          const Icon = link.icon
          return (
            <button
              key={link.label}
              onClick={() => navigate(link.route)}
              className="card p-4 hover:shadow-md transition-all group text-left bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-[var(--sage-500)]" />
                <ChevronRight className="w-4 h-4 text-[var(--sage-400)] group-hover:text-[var(--sage-600)] transition-colors" />
              </div>
              <p className="text-sm font-medium text-[var(--sage-800)]">{link.label}</p>
              <p className="text-[10px] text-[var(--sage-400)]">{link.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
