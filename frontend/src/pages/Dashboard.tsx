import { useState, useEffect } from 'react'
import {
  LayoutDashboard, TrendingUp, Users, Cpu, HardDrive, Globe,
  Zap, Activity, ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  AlertTriangle, MessageSquare, Bot, Layers, FileText, BarChart3,
  RefreshCw, ChevronRight,
} from 'lucide-react'
import { fetchAgents, fetchTasks, fetchPlatforms, fetchChannels, fetchSkills, fetchMonitorData } from '@/api/client'

interface StatCard {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

const MOCK_STATS: StatCard[] = [
  { label: '活跃智能体', value: '12', change: '+3', trend: 'up', icon: Bot, color: '#10b981' },
  { label: '今日任务', value: '234', change: '+12%', trend: 'up', icon: Layers, color: '#3b82f6' },
  { label: 'API调用', value: '15.2K', change: '+8%', trend: 'up', icon: Zap, color: '#f59e0b' },
  { label: '平均响应', value: '145ms', change: '-12ms', trend: 'up', icon: Clock, color: '#8b5cf6' },
]

const MOCK_ACTIVITIES = [
  { id: 1, type: 'agent', title: 'Agent-7 完成代码审查', time: '2分钟前', status: 'success' },
  { id: 2, type: 'task', title: '数据备份任务完成', time: '15分钟前', status: 'success' },
  { id: 3, type: 'alert', title: 'API响应时间超过阈值', time: '32分钟前', status: 'warning' },
  { id: 4, type: 'agent', title: 'Agent-3 启动新会话', time: '1小时前', status: 'neutral' },
  { id: 5, type: 'task', title: '周报生成任务失败', time: '2小时前', status: 'error' },
]

const MOCK_SERVICES = [
  { name: 'API Server', status: 'running', uptime: '15d 3h', load: 32 },
  { name: 'Frontend', status: 'running', uptime: '15d 3h', load: 18 },
  { name: 'Database', status: 'running', uptime: '15d 3h', load: 45 },
  { name: 'Redis', status: 'running', uptime: '15d 3h', load: 12 },
  { name: 'Ollama', status: 'running', uptime: '5d 12h', load: 78 },
  { name: 'Agent Zero', status: 'idle', uptime: '2d 8h', load: 5 },
]

export default function Dashboard() {
  const [stats, setStats] = useState<StatCard[]>(MOCK_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [agents, tasks, platforms, channels, skills, monitor] = await Promise.allSettled([
          fetchAgents(),
          fetchTasks(),
          fetchPlatforms(),
          fetchChannels(),
          fetchSkills(),
          fetchMonitorData(),
        ])

        const newStats = [...MOCK_STATS]

        if (agents.status === 'fulfilled' && agents.value?.data?.length > 0) {
          newStats[0] = { ...newStats[0], value: agents.value.data.length.toString() }
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

        setStats(newStats)
      } catch (e) {
        // Keep mock data on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
        <button className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

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
            {MOCK_ACTIVITIES.map((activity) => (
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
            ))}
          </div>
        </div>

        {/* Service Status */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--sage-100)' }}>
            <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
            <h2 className="font-semibold text-sm text-[var(--sage-800)]">服务状态</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
            {MOCK_SERVICES.map((service) => (
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
            ))}
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
