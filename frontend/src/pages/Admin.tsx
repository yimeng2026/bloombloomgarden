import { useState, useEffect } from 'react'
import { Shield, Users, Key, Database, Globe, Activity, Trash2, Plus, Search, Filter, ChevronDown, ChevronRight, Edit3, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { fetchAuthSessions } from '@/api/client'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  status: 'active' | 'inactive'
  createdAt: string
  lastLogin: string
  apiCalls: number
  avatar: string
}

const ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  admin: { color: '#ef4444', label: '管理员' },
  user: { color: '#3b82f6', label: '用户' },
  viewer: { color: '#6b7a5a', label: '访客' },
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'user' as const })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAuthSessions()
      .then((data: any) => {
        if (!cancelled) {
          const list = (data?.data || []).map((s: any) => ({
            id: s.id || s.userId || 'unknown',
            name: s.user?.name || s.user?.email || s.name || '用户',
            email: s.user?.email || s.email || '-',
            role: s.user?.role || s.role || 'user',
            status: s.status || 'active',
            createdAt: s.createdAt || s.created_at || new Date().toISOString().split('T')[0],
            lastLogin: s.lastLogin || s.last_login || '从未',
            apiCalls: s.apiCalls || s.api_calls || 0,
            avatar: s.user?.avatar || s.avatar || '👤',
          }))
          setUsers(list)
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载用户列表失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id))
  }

  const handleSubmit = () => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: form.name,
      email: form.email,
      role: form.role,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '从未',
      apiCalls: 0,
      avatar: '👤',
    }
    setUsers([...users, newUser])
    setShowModal(false)
    setForm({ name: '', email: '', role: 'user' })
  }

  const filtered = users.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  const activeCount = users.filter((u) => u.status === 'active').length
  const totalApiCalls = users.reduce((sum, u) => sum + u.apiCalls, 0)

  return (
    <div className="space-y-6">
      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="flex items-center gap-3 text-[var(--sage-500)]">
            <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
            <span className="text-sm">加载用户列表...</span>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">系统管理</h1>
            <p className="text-sm text-[var(--sage-500)]">用户与权限管理</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建用户
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <Users className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{users.length}</p>
          <p className="text-xs text-[var(--sage-500)]">总用户</p>
        </div>
        <div className="card p-4">
          <Activity className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">活跃用户</p>
        </div>
        <div className="card p-4">
          <Key className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{users.filter((u) => u.role === 'admin').length}</p>
          <p className="text-xs text-[var(--sage-500)]">管理员</p>
        </div>
        <div className="card p-4">
          <Globe className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{(totalApiCalls / 1000).toFixed(1)}K</p>
          <p className="text-xs text-[var(--sage-500)]">API调用</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input type="text" placeholder="搜索用户..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <option value="all">全部角色</option>
          <option value="admin">管理员</option>
          <option value="user">用户</option>
          <option value="viewer">访客</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">用户</th>
              <th className="text-left px-4 py-3 font-medium">邮箱</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">API调用</th>
              <th className="text-left px-4 py-3 font-medium">最后登录</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{user.avatar}</span>
                    <span className="font-medium text-[var(--sage-800)]">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--sage-500)]">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: ROLE_CONFIG[user.role].color + '15', color: ROLE_CONFIG[user.role].color }}>
                    {ROLE_CONFIG[user.role].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-[var(--sage-100)] text-[var(--sage-500)]'}`}>
                    {user.status === 'active' ? '活跃' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--sage-500)] font-mono">{user.apiCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-[var(--sage-400)]">{user.lastLogin}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(user.id)} className="p-1 text-[var(--sage-400)] hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && !loading && (
        <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建用户</h2>
            <div className="space-y-3">
              <input type="text" placeholder="用户名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="email" placeholder="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' | 'viewer' })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                <option value="user">用户</option>
                <option value="admin">管理员</option>
                <option value="viewer">访客</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} className="btn-primary flex-1">创建</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
    </div>
  )
}
