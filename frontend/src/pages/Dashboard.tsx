import { useState, useEffect } from 'react'
import {
  LayoutDashboard, TrendingUp, Users, Cpu, HardDrive, Globe,
  Zap, Activity, ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  AlertTriangle, MessageSquare, Bot, Layers, FileText, BarChart3,
  RefreshCw, ChevronRight, Settings,
} from 'lucide-react'
import { fetchAgents, fetchTasks, fetchPlatforms, fetchChannels, fetchSkills, fetchMonitorData } from '@/api/client'
import { DASHBOARD_MAP } from '@/components/dashboard'

interface StatCard {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

interface AgentOption {
  id: string
  name: string
  dashboardType?: string
  protocolLevel?: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [servicesLoading, setServicesLoading] = useState(true)

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

        const newStats: StatCard[] = [
          { label: '活跃智能体', value: '0', change: '+0', trend: 'up', icon: Bot, color: '#10b981' },
          { label: '今日任务', value: '0', change: '+0%', trend: 'up', icon: Layers, color: '#3b82f6' },
          { label: 'API调用', value: '0', change: '+0%', trend: 'up', icon: Zap, color: '#f59e0b' },
          { label: '平均响应', value: '0', change: '-0ms', trend: 'up', icon: Clock, color: '#8b5cf6' },
        ]

        if (agentsRes.status === 'fulfilled' && agentsRes.value?.data?.length > 0) {
          newStats[0] = { ...newStats[0], value: agentsRes.value.data.length.toString() }
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
        if (tasks.status === 'fulfilled' && tasks.value?.data?.length > 0) {
          newStats[1] = { ...newStats[1], value: tasks.value.data.length.toString() }
        }
        if (platforms.status === 'fulfilled' && platforms.value?.data?.length > 0) {
          newStats[2] = { ...newStats[2], value: platforms.value.data.length.toString() }
        }
        if (channels.status === 'fulfilled' && channels.value?.data?.length > 0) {
          newStats[3] = { ...newStats[3], value: channels.value.data.length.toString() }
        }

        if (monitor.status === 'fulfilled' && monitor.value?.data?.activities) {
          setActivities(monitor.value.data.activities)
          setActivitiesLoading(false)
        }
        if (monitor.status === 'fulfilled' && monitor.value?.data?.services) {
          setServices(monitor.value.data.services)
          setServicesLoading(false)
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

  // Determine which dashboard to render
  const dashboardType = selectedAgent?.dashboardType || 'L1'
  const SpecificDashboard = DASHBOARD_MAP[dashboardType] || DASHBOARD_MAP['L1']

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
          {/* Agent Selector */}
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
          <button className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--sage-500)]">{stat.label}</span>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--sage-800)]">{stat.value}</span>
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--sage-100)' }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--sage-500)]" />
              <h2 className="font-semibold text-sm text-[var(--sage-800)]">最近活动</h2>
            </div>
            <button className="text-xs text-[var(--sage-500)] hover:text-[var(--sage-700)] flex items-center gap-1">
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
            {activitiesLoading ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-4">加载中...</div>
            ) : activities.length === 0 ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-4">暂无数据</div>
            ) : (
              activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
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
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-[var(--sage-400)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--sage-800)] truncate">{activity.title}</p>
                  <p className="text-[10px] text-[var(--sage-400)]">{activity.time}</p>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Service Status */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--sage-100)' }}>
            <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
            <h2 className="font-semibold text-sm text-[var(--sage-800)]">服务状态</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
            {servicesLoading ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-4">加载中...</div>
            ) : services.length === 0 ? (
              <div className="text-center text-sm text-[var(--sage-400)] py-4">暂无数据</div>
            ) : (
              services.map((service) => (
              <div key={service.name} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--sage-800)]">{service.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      service.status === 'running'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                    }`}
                  >
                    {service.status === 'running' ? '运行中' : '空闲'}
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
            )))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '智能体管理', icon: Bot, route: '/agents', desc: '12 个活跃' },
          { label: '技能库', icon: Zap, route: '/skills', desc: '36 个技能' },
          { label: '工作流', icon: Layers, route: '/workflows', desc: '8 个工作流' },
          { label: '系统监控', icon: BarChart3, route: '/monitoring', desc: '实时指标' },
        ].map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.label}
              href={`#${link.route}`}
              className="card p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-[var(--sage-500)]" />
                <ChevronRight className="w-4 h-4 text-[var(--sage-400)] group-hover:text-[var(--sage-600)] transition-colors" />
              </div>
              <p className="text-sm font-medium text-[var(--sage-800)]">{link.label}</p>
              <p className="text-[10px] text-[var(--sage-400)]">{link.desc}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
