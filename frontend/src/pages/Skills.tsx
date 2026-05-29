import { useState, useEffect } from 'react'
import {
  Wrench, Plus, Search, Zap, Trash2, Copy, Check, X, Code,
  Terminal, Database, Globe, Mail, Image, BarChart3, Shield,
  Workflow, FileCode, FileText, Music, Video, MapPin, Calculator,
} from 'lucide-react'
import { fetchSkills, createSkill, updateSkill, deleteSkill } from '@/api/client'
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

const MOCK_SKILLS: Skill[] = [
  {
    id: 'sk-1',
    name: 'Web Search',
    description: 'Search the web for real-time information. Supports multiple search engines and result filtering.',
    platforms: ['Kimi', 'Claude', 'Gemini', 'Grok', 'DeepSeek'],
    category: 'Web Search',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query string' },
      { name: 'engine', type: 'string', required: false, default: 'google', description: 'Search engine to use' },
      { name: 'results_count', type: 'number', required: false, default: 10, description: 'Number of results to return' },
    ],
    usageCount: 156,
    enabled: true,
    icon: 'Globe',
    codeSnippet: `async function webSearch({ query, engine = 'google', results_count = 10 }) {
  const results = await searchEngine[engine].query(query, { limit: results_count });
  return results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
}`,
    usageExample: 'webSearch({ query: "latest AI news", engine: "google", results_count: 5 })',
  },
  {
    id: 'sk-2',
    name: 'Code Runner',
    description: 'Execute code in sandboxed environments. Supports Python, JavaScript, TypeScript, and more.',
    platforms: ['Kimi', 'Claude', 'Gemini', 'Grok', 'DeepSeek'],
    category: 'Code Execution',
    params: [
      { name: 'code', type: 'string', required: true, description: 'Code to execute' },
      { name: 'language', type: 'string', required: true, default: 'python', description: 'Programming language' },
      { name: 'timeout', type: 'number', required: false, default: 30, description: 'Execution timeout in seconds' },
    ],
    usageCount: 234,
    enabled: true,
    icon: 'Terminal',
    codeSnippet: `async function runCode({ code, language = 'python', timeout = 30 }) {
  const sandbox = await createSandbox(language, { timeout });
  const result = await sandbox.execute(code);
  return { output: result.stdout, errors: result.stderr, exitCode: result.code };
}`,
    usageExample: 'runCode({ code: "print(1+1)", language: "python" })',
  },
  {
    id: 'sk-3',
    name: 'File Manager',
    description: 'Manage files with read, write, delete, and search operations. Supports multiple storage backends.',
    platforms: ['Kimi', 'Claude', 'Sylva'],
    category: 'File Operations',
    params: [
      { name: 'operation', type: 'string', required: true, description: 'Operation type: read, write, delete, list' },
      { name: 'path', type: 'string', required: true, description: 'File or directory path' },
      { name: 'content', type: 'string', required: false, description: 'Content for write operations' },
    ],
    usageCount: 89,
    enabled: true,
    icon: 'FileCode',
    codeSnippet: `async function fileManager({ operation, path, content }) {
  switch (operation) {
    case 'read': return await fs.readFile(path, 'utf8');
    case 'write': return await fs.writeFile(path, content);
    case 'delete': return await fs.unlink(path);
    case 'list': return await fs.readdir(path);
  }
}`,
    usageExample: 'fileManager({ operation: "read", path: "/docs/readme.md" })',
  },
  {
    id: 'sk-4',
    name: 'Data Analyzer',
    description: 'Perform statistical analysis on datasets. Supports descriptive statistics, correlation analysis, and data visualization.',
    platforms: ['Kimi', 'Claude', 'Gemini', 'Grok', 'DeepSeek'],
    category: 'Data Analysis',
    params: [
      { name: 'dataset', type: 'string', required: true, description: 'Dataset identifier or file path' },
      { name: 'analysis_type', type: 'string', required: true, default: 'descriptive', description: 'Type of analysis to perform' },
      { name: 'columns', type: 'array', required: false, description: 'Columns to analyze' },
    ],
    usageCount: 67,
    enabled: true,
    icon: 'BarChart3',
    codeSnippet: `async function analyzeData({ dataset, analysis_type = 'descriptive', columns = [] }) {
  const data = await loadDataset(dataset);
  const analyzer = new DataAnalyzer(data);
  return await analyzer[analysis_type](columns);
}`,
    usageExample: 'analyzeData({ dataset: "sales_2024.csv", analysis_type: "correlation" })',
  },
  {
    id: 'sk-5',
    name: 'Image Generator',
    description: 'Generate images from text descriptions using AI models. Supports various styles and resolutions.',
    platforms: ['Kimi', 'Claude', 'Gemini'],
    category: 'Image Generation',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Image description' },
      { name: 'style', type: 'string', required: false, default: 'realistic', description: 'Image style' },
      { name: 'size', type: 'string', required: false, default: '1024x1024', description: 'Image dimensions' },
    ],
    usageCount: 45,
    enabled: true,
    icon: 'Image',
    codeSnippet: `async function generateImage({ prompt, style = 'realistic', size = '1024x1024' }) {
  const [width, height] = size.split('x').map(Number);
  return await imageModel.generate(prompt, { style, width, height });
}`,
    usageExample: 'generateImage({ prompt: "A futuristic city at sunset", style: "cyberpunk" })',
  },
  {
    id: 'sk-6',
    name: 'Email Sender',
    description: 'Send emails with support for templates, attachments, and scheduling.',
    platforms: ['Kimi', 'Claude', 'Sylva'],
    category: 'Communication',
    params: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body content' },
      { name: 'template', type: 'string', required: false, description: 'Template name to use' },
    ],
    usageCount: 123,
    enabled: true,
    icon: 'Mail',
    codeSnippet: `async function sendEmail({ to, subject, body, template }) {
  const email = template ? await renderTemplate(template, { to, subject, body }) : { to, subject, body };
  return await emailService.send(email);
}`,
    usageExample: 'sendEmail({ to: "user@example.com", subject: "Welcome", body: "Hello!" })',
  },
  {
    id: 'sk-7',
    name: 'System Monitor',
    description: 'Monitor system health, resource usage, and service status in real-time.',
    platforms: ['Kimi', 'Claude', 'DeepSeek', 'Sylva'],
    category: 'System',
    params: [
      { name: 'metric', type: 'string', required: true, description: 'Metric to monitor: cpu, memory, disk, network' },
      { name: 'duration', type: 'number', required: false, default: 60, description: 'Monitoring duration in seconds' },
    ],
    usageCount: 78,
    enabled: true,
    icon: 'Shield',
    codeSnippet: `async function monitorSystem({ metric, duration = 60 }) {
  const monitor = new SystemMonitor();
  return await monitor.collect(metric, { duration, interval: 1 });
}`,
    usageExample: 'monitorSystem({ metric: "cpu", duration: 120 })',
  },
  {
    id: 'sk-8',
    name: 'Workflow Engine',
    description: 'Create and execute automated workflows with conditional logic and parallel execution.',
    platforms: ['Kimi', 'Claude', 'Sylva'],
    category: 'System',
    params: [
      { name: 'workflow_id', type: 'string', required: true, description: 'Workflow identifier' },
      { name: 'inputs', type: 'object', required: false, description: 'Workflow input parameters' },
      { name: 'async', type: 'boolean', required: false, default: false, description: 'Run asynchronously' },
    ],
    usageCount: 156,
    enabled: true,
    icon: 'Workflow',
    codeSnippet: `async function runWorkflow({ workflow_id, inputs = {}, async = false }) {
  const workflow = await loadWorkflow(workflow_id);
  const runner = new WorkflowRunner(workflow);
  return async ? runner.runAsync(inputs) : runner.run(inputs);
}`,
    usageExample: 'runWorkflow({ workflow_id: "data-pipeline", inputs: { source: "db" } })',
  },
  {
    id: 'sk-9',
    name: 'Document Parser',
    description: 'Extract text and structured data from PDF, DOCX, and other document formats.',
    platforms: ['Kimi', 'Claude', 'Gemini'],
    category: 'File Operations',
    params: [
      { name: 'file_path', type: 'string', required: true, description: 'Path to the document file' },
      { name: 'output_format', type: 'string', required: false, default: 'text', description: 'Output format: text, json, markdown' },
    ],
    usageCount: 34,
    enabled: true,
    icon: 'FileText',
    codeSnippet: `async function parseDocument({ file_path, output_format = 'text' }) {
  const parser = await DocumentParser.create(file_path);
  return await parser.extract({ format: output_format });
}`,
    usageExample: 'parseDocument({ file_path: "/docs/report.pdf", output_format: "markdown" })',
  },
  {
    id: 'sk-10',
    name: 'Database Query',
    description: 'Execute SQL queries and manage database connections. Supports multiple database types.',
    platforms: ['Kimi', 'Claude', 'DeepSeek', 'Sylva'],
    category: 'Data Analysis',
    params: [
      { name: 'query', type: 'string', required: true, description: 'SQL query string' },
      { name: 'connection', type: 'string', required: true, description: 'Database connection string' },
      { name: 'params', type: 'array', required: false, description: 'Query parameters' },
    ],
    usageCount: 189,
    enabled: true,
    icon: 'Database',
    codeSnippet: `async function queryDatabase({ query, connection, params = [] }) {
  const db = await Database.connect(connection);
  return await db.query(query, params);
}`,
    usageExample: 'queryDatabase({ query: "SELECT * FROM users WHERE age > ?", connection: "postgres://...", params: [18] })',
  },
  {
    id: 'sk-11',
    name: 'Audio Transcription',
    description: 'Convert audio files to text using speech recognition. Supports multiple languages.',
    platforms: ['Kimi', 'Claude', 'Gemini'],
    category: 'Custom',
    params: [
      { name: 'audio_path', type: 'string', required: true, description: 'Path to audio file' },
      { name: 'language', type: 'string', required: false, default: 'auto', description: 'Audio language' },
      { name: 'speaker_detection', type: 'boolean', required: false, default: false, description: 'Enable speaker detection' },
    ],
    usageCount: 23,
    enabled: true,
    icon: 'Music',
    codeSnippet: `async function transcribeAudio({ audio_path, language = 'auto', speaker_detection = false }) {
  const transcriber = new AudioTranscriber({ language, speaker_detection });
  return await transcriber.process(audio_path);
}`,
    usageExample: 'transcribeAudio({ audio_path: "/meeting.mp3", speaker_detection: true })',
  },
  {
    id: 'sk-12',
    name: 'Video Analyzer',
    description: 'Analyze video content for objects, scenes, and text. Generate summaries and timestamps.',
    platforms: ['Kimi', 'Claude', 'Gemini'],
    category: 'Custom',
    params: [
      { name: 'video_path', type: 'string', required: true, description: 'Path to video file' },
      { name: 'analysis_type', type: 'string', required: false, default: 'summary', description: 'Analysis type' },
    ],
    usageCount: 12,
    enabled: false,
    icon: 'Video',
    codeSnippet: `async function analyzeVideo({ video_path, analysis_type = 'summary' }) {
  const analyzer = new VideoAnalyzer();
  return await analyzer.analyze(video_path, { type: analysis_type });
}`,
    usageExample: 'analyzeVideo({ video_path: "/lecture.mp4", analysis_type: "chapters" })',
  },
]

const PLATFORM_OPTIONS = ['All', 'Kimi', 'Claude', 'Ollama', 'DeepSeek', 'Gemini', 'Grok', 'Sylva']
const CATEGORY_OPTIONS = ['All', 'Web Search', 'Code Execution', 'File Operations', 'Data Analysis', 'Image Generation', 'Communication', 'System', 'Custom']

/* ── Component ────────────────────────────────────────────────── */

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
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
        const res = await fetchSkills()
        setSkills(res.data?.length > 0 ? res.data : MOCK_SKILLS)
      } catch (e) {
        setSkills(MOCK_SKILLS)
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

      {/* Skills Grid */}
      {loading ? (
        <div className="text-center py-16 text-[var(--sage-500)]">Loading...</div>
      ) : filtered.length === 0 ? (
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
