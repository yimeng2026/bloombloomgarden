import { useState, useEffect } from 'react'
import { fetchSkills } from '@/api/client'
import {
  Wrench, Plus, Search, Zap, Trash2, Copy, Check, X, Code,
  Terminal, Database, Globe, Mail, Image, BarChart3, Shield,
  Workflow, FileCode, FileText, Music, Video, MapPin, Calculator,
  AlertTriangle, Loader2,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

/* ── Types ──────────────────────────────────────────────────────── */

type Platform = 'Kimi' | 'Claude' | 'Ollama' | 'DeepSeek' | 'Gemini' | 'Grok' | 'Sylva'
type Category = 'Web Search' | 'Code Execution' | 'File Operations' | 'Data Analysis' | 'Image Generation' | 'Communication' | 'System' | 'Custom'

interface SkillParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  default?: string | number | boolean
  description: string
}

interface Skill {
  id: string
  name: string
  description: string
  platforms: Platform[]
  category: Category
  params: SkillParam[]
  usageCount: number
  enabled: boolean
  codeSnippet?: string
  usageExample?: string
  icon: string
}

const CATEGORY_ICONS: Record<string, any> = {
  'Web Search': Globe,
  'Code Execution': Terminal,
  'File Operations': FileCode,
  'Data Analysis': BarChart3,
  'Image Generation': Image,
  'Communication': Mail,
  'System': Shield,
  'Custom': Wrench,
}

const CATEGORY_COLORS: Record<string, string> = {
  'Web Search': '#06b6d4',
  'Code Execution': '#10b981',
  'File Operations': '#f59e0b',
  'Data Analysis': '#8b5cf6',
  'Image Generation': '#ec4899',
  'Communication': '#3b82f6',
  'System': '#6b7a5a',
  'Custom': '#c97b84',
}

const PLATFORM_OPTIONS = ['All', 'Kimi', 'Claude', 'Ollama', 'DeepSeek', 'Gemini', 'Grok', 'Sylva']
const CATEGORY_OPTIONS = ['All', 'Web Search', 'Code Execution', 'File Operations', 'Data Analysis', 'Image Generation', 'Communication', 'System', 'Custom']

/* ── Component ────────────────────────────────────────────────── */

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selected, setSelected] = useState<Skill | null>(null)
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchSkills()
        const data = res.data || res
        setSkills(Array.isArray(data) ? data : [])
      } catch (e: any) {
        setError(e?.message || '加载技能失败')
        setSkills([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = skills.filter((s) => {
    if (platformFilter !== 'All' && !s.platforms.includes(platformFilter as Platform)) return false
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteSkill(id)
      setSkills((prev) => prev.filter((s) => s.id !== id))
      if (selected?.id === id) setSelected(null)
      addToast({ type: 'success', title: 'Skill deleted' })
    } catch (e) {
      setSkills((prev) => prev.filter((s) => s.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const duplicateSkill = (skill: Skill) => {
    const newSkill: Skill = {
      ...skill,
      id: `sk-${Date.now()}`,
      name: `${skill.name} (Copy)`,
      usageCount: 0,
    }
    setSkills([...skills, newSkill])
    addToast({ type: 'success', title: 'Skill duplicated' })
  }

  const copySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleEnabled = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">Skills Library</h1>
            <p className="text-sm text-[var(--sage-500)]">{skills.length} skills · {skills.filter((s) => s.enabled).length} enabled</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Skill
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>{p === 'All' ? 'All Platforms' : p}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-16 text-[var(--sage-500)]">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading...</p>
        </div>
      )}
      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Skills Grid */}
      {!loading && !error && filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Zap className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">No skills found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const Icon = CATEGORY_ICONS[skill.category] || Wrench
            const color = CATEGORY_COLORS[skill.category] || '#6b7a5a'
            return (
              <div
                key={skill.id}
                onClick={() => setSelected(selected?.id === skill.id ? null : skill)}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                  selected?.id === skill.id ? 'ring-2 ring-[var(--sage-500)]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: color + '15' }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{skill.name}</h3>
                      <span className="text-[10px] text-[var(--sage-500)]">{skill.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleEnabled(skill.id)
                    }}
                    className={`text-[10px] px-2 py-1 rounded-full ${
                      skill.enabled
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                    }`}
                  >
                    {skill.enabled ? 'On' : 'Off'}
                  </button>
                </div>
                <p className="text-xs text-[var(--sage-500)] line-clamp-2 mb-3">{skill.description}</p>
                <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                  <span>{skill.platforms.join(', ')}</span>
                  <span>{skill.usageCount} uses</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {(() => {
                const DetailIcon = CATEGORY_ICONS[selected.category] || Wrench
                return <DetailIcon className="w-6 h-6" style={{ color: CATEGORY_COLORS[selected.category] || '#6b7a5a' }} />
              })()}
              <div>
                <h2 className="text-lg font-bold text-[var(--sage-800)]">{selected.name}</h2>
                <span className="text-xs text-[var(--sage-500)]">
                  {selected.category} · {selected.platforms.join(', ')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => duplicateSkill(selected)}
                className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-[var(--sage-600)] mb-4">{selected.description}</p>

          {/* Parameters */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-2">Parameters</h3>
            <div className="space-y-2">
              {selected.params.map((param) => (
                <div key={param.name} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-[var(--sage-700)]">{param.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{param.type}</span>
                  {param.required && <span className="text-[10px] text-red-500">required</span>}
                  <span className="text-xs text-[var(--sage-400)]">{param.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Snippet */}
          {selected.codeSnippet && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--sage-800)]">Code Snippet</h3>
                <button
                  onClick={() => copySnippet(selected.codeSnippet!)}
                  className="text-xs flex items-center gap-1 text-[var(--sage-500)] hover:text-[var(--sage-700)]"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-[var(--sage-50)] p-3 rounded-lg text-xs font-mono text-[var(--sage-600)] overflow-x-auto">
                {selected.codeSnippet}
              </pre>
            </div>
          )}

          {/* Usage Example */}
          {selected.usageExample && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-2">Usage Example</h3>
              <code className="bg-[var(--sage-50)] p-3 rounded-lg text-xs font-mono text-[var(--sage-600)] block">
                {selected.usageExample}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
