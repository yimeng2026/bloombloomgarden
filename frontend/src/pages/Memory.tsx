import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Plus,
  Search,
  Clock,
  MessageSquare,
  GitBranch,
  Database,
  MoreVertical,
  Trash2,
  X,
  Check,
  Loader2,
  List,
  Share2,
  Sparkles,
  Import,
  FileText,
  HardDrive,
  Target,
  Zap,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────────── */

type Platform = 'Kimi' | 'Claude' | 'Ollama' | 'DeepSeek' | 'Gemini' | 'Grok' | 'Sylva'
type MemoryType = 'Memory' | 'Work Log' | 'Pattern'
type PatternType = 'Behavioral' | 'Knowledge' | 'Skill' | 'Preference'
type NodeType = 'Concept' | 'Entity' | 'Action' | 'Topic'

interface Pattern {
  id: string
  name: string
  type: PatternType
  confidence: number
  description: string
  evidence: string[]
  sourceMemory: string
}

interface KnowledgeNode {
  id: string
  name: string
  type: NodeType
  importance: number
}

interface KnowledgeEdge {
  source: string
  target: string
  label: string
  strength: number
}

interface Memory {
  id: string
  name: string
  description: string
  type: MemoryType
  sourceAgent: string
  platform: Platform
  patternCount: number
  knowledgeGraph: {
    nodes: number
    edges: number
  }
  createdAt: string
  updatedAt: string
  messageCount?: number
  linkedKnowledgeBase?: string
  patterns: Pattern[]
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

interface WorkLog {
  id: string
  name: string
  sourceTask: string
  agents: string[]
  duration: string
  log: string
  date: string
}

/* ── Platform Colors ────────────────────────────────────────────── */

const PLATFORM_COLORS: Record<Platform, string> = {
  Kimi: '#e11d48',
  Claude: '#d97706',
  Ollama: '#10b981',
  DeepSeek: '#1d4ed8',
  Gemini: '#8b5cf6',
  Grok: '#ffffff',
  Sylva: '#06b6d4',
}

const NODE_COLORS: Record<NodeType, string> = {
  Concept: '#1a56db',
  Entity: '#10b981',
  Action: '#f59e0b',
  Topic: '#8b5cf6',
}

/* ── Mock Data ──────────────────────────────────────────────────── */

const MOCK_PATTERNS: Pattern[] = [
  {
    id: 'pt-1',
    name: 'API-First Design Preference',
    type: 'Preference',
    confidence: 0.92,
    description: 'Agent consistently prefers API-first approaches over direct database access',
    evidence: ['Recommended REST API in 12 conversations', 'Suggested GraphQL for complex queries', 'Avoided raw SQL suggestions'],
    sourceMemory: 'Code Assistant Memory',
  },
  {
    id: 'pt-2',
    name: 'Error Handling Pattern',
    type: 'Behavioral',
    confidence: 0.87,
    description: 'Agent demonstrates structured error handling with specific retry strategies',
    evidence: ['Implemented exponential backoff in 8 solutions', 'Suggested circuit breaker pattern', 'Always includes error logging'],
    sourceMemory: 'Debug Agent Memory',
  },
  {
    id: 'pt-3',
    name: 'React Component Architecture',
    type: 'Knowledge',
    confidence: 0.95,
    description: 'Strong preference for compound component patterns with context API',
    evidence: ['Used compound pattern in 15 code examples', 'Recommended context over prop drilling', 'Suggested custom hooks for logic reuse'],
    sourceMemory: 'Frontend Expert Memory',
  },
  {
    id: 'pt-4',
    name: 'Pythonic Code Style',
    type: 'Skill',
    confidence: 0.89,
    description: 'Agent writes Python code following PEP8 and uses list comprehensions effectively',
    evidence: ['Used list comprehensions in 20+ examples', 'Recommended type hints consistently', 'Preferred pathlib over os.path'],
    sourceMemory: 'Python Mentor Memory',
  },
  {
    id: 'pt-5',
    name: 'Documentation-First Approach',
    type: 'Preference',
    confidence: 0.78,
    description: 'Agent prioritizes writing documentation before implementation',
    evidence: ['Suggested docstrings first in 6 sessions', 'Recommended README-driven development', 'Emphasized API documentation'],
    sourceMemory: 'Tech Lead Memory',
  },
]

const MOCK_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    name: 'Code Assistant Memory',
    description: 'Accumulated coding knowledge from 6 months of pair programming sessions. Covers API design, database patterns, and testing strategies.',
    type: 'Memory',
    sourceAgent: 'Code Assistant',
    platform: 'Claude',
    patternCount: 12,
    knowledgeGraph: { nodes: 48, edges: 87 },
    createdAt: '2 weeks ago',
    updatedAt: '5h ago',
    messageCount: 342,
    linkedKnowledgeBase: 'API Documentation',
    patterns: MOCK_PATTERNS.slice(0, 3),
    nodes: [
      { id: 'n1', name: 'REST API', type: 'Concept', importance: 0.9 },
      { id: 'n2', name: 'GraphQL', type: 'Concept', importance: 0.8 },
      { id: 'n3', name: 'PostgreSQL', type: 'Entity', importance: 0.7 },
      { id: 'n4', name: 'Authentication', type: 'Action', importance: 0.85 },
      { id: 'n5', name: 'Microservices', type: 'Topic', importance: 0.75 },
      { id: 'n6', name: 'JWT', type: 'Concept', importance: 0.8 },
      { id: 'n7', name: 'Redis', type: 'Entity', importance: 0.6 },
      { id: 'n8', name: 'Error Handling', type: 'Action', importance: 0.7 },
    ],
    edges: [
      { source: 'n1', target: 'n4', label: 'requires', strength: 0.9 },
      { source: 'n2', target: 'n4', label: 'requires', strength: 0.8 },
      { source: 'n3', target: 'n1', label: 'supports', strength: 0.7 },
      { source: 'n6', target: 'n4', label: 'implements', strength: 0.95 },
      { source: 'n5', target: 'n1', label: 'uses', strength: 0.8 },
      { source: 'n7', target: 'n4', label: 'caches', strength: 0.6 },
      { source: 'n8', target: 'n1', label: 'protects', strength: 0.75 },
    ],
  },
  {
    id: 'mem-2',
    name: 'System Architect Memory',
    description: 'Architecture decisions, design patterns, and infrastructure recommendations from collaborative design sessions.',
    type: 'Memory',
    sourceAgent: 'System Architect',
    platform: 'Kimi',
    patternCount: 8,
    knowledgeGraph: { nodes: 32, edges: 54 },
    createdAt: '1 month ago',
    updatedAt: '2d ago',
    messageCount: 198,
    linkedKnowledgeBase: 'Research Papers',
    patterns: [MOCK_PATTERNS[2]],
    nodes: [
      { id: 'n9', name: 'Event Sourcing', type: 'Concept', importance: 0.9 },
      { id: 'n10', name: 'CQRS', type: 'Concept', importance: 0.85 },
      { id: 'n11', name: 'Kafka', type: 'Entity', importance: 0.8 },
      { id: 'n12', name: 'Kubernetes', type: 'Entity', importance: 0.75 },
      { id: 'n13', name: 'Load Balancing', type: 'Action', importance: 0.7 },
      { id: 'n14', name: 'Distributed Systems', type: 'Topic', importance: 0.95 },
    ],
    edges: [
      { source: 'n9', target: 'n10', label: 'complements', strength: 0.9 },
      { source: 'n11', target: 'n9', label: 'enables', strength: 0.85 },
      { source: 'n12', target: 'n13', label: 'orchestrates', strength: 0.8 },
      { source: 'n14', target: 'n9', label: 'includes', strength: 0.75 },
    ],
  },
  {
    id: 'mem-3',
    name: 'Debug Session Archive',
    description: 'Collection of debugging sessions covering common errors, stack trace analysis, and troubleshooting workflows.',
    type: 'Work Log',
    sourceAgent: 'Debug Agent',
    platform: 'DeepSeek',
    patternCount: 15,
    knowledgeGraph: { nodes: 24, edges: 38 },
    createdAt: '3 weeks ago',
    updatedAt: '1d ago',
    messageCount: 256,
    patterns: [MOCK_PATTERNS[1]],
    nodes: [
      { id: 'n15', name: 'Stack Trace', type: 'Concept', importance: 0.8 },
      { id: 'n16', name: 'Breakpoint', type: 'Action', importance: 0.75 },
      { id: 'n17', name: 'Race Condition', type: 'Concept', importance: 0.85 },
      { id: 'n18', name: 'Memory Leak', type: 'Concept', importance: 0.9 },
    ],
    edges: [
      { source: 'n16', target: 'n15', label: 'reveals', strength: 0.8 },
      { source: 'n17', target: 'n18', label: 'causes', strength: 0.7 },
    ],
  },
  {
    id: 'mem-4',
    name: 'Frontend Expert Knowledge',
    description: 'Frontend development expertise accumulated over numerous React, Vue, and TypeScript discussions.',
    type: 'Memory',
    sourceAgent: 'Frontend Expert',
    platform: 'Gemini',
    patternCount: 10,
    knowledgeGraph: { nodes: 36, edges: 62 },
    createdAt: '1 week ago',
    updatedAt: '3d ago',
    messageCount: 187,
    linkedKnowledgeBase: 'Code Examples',
    patterns: MOCK_PATTERNS.slice(2, 4),
    nodes: [
      { id: 'n19', name: 'React Hooks', type: 'Concept', importance: 0.9 },
      { id: 'n20', name: 'TypeScript', type: 'Concept', importance: 0.85 },
      { id: 'n21', name: 'Tailwind CSS', type: 'Entity', importance: 0.7 },
      { id: 'n22', name: 'State Management', type: 'Topic', importance: 0.8 },
      { id: 'n23', name: 'Component Design', type: 'Action', importance: 0.75 },
    ],
    edges: [
      { source: 'n19', target: 'n20', label: 'pairs with', strength: 0.9 },
      { source: 'n22', target: 'n19', label: 'uses', strength: 0.85 },
      { source: 'n23', target: 'n21', label: 'styles with', strength: 0.7 },
    ],
  },
  {
    id: 'mem-5',
    name: 'Python Mentor Sessions',
    description: 'Python tutoring sessions covering advanced language features, best practices, and library recommendations.',
    type: 'Memory',
    sourceAgent: 'Python Mentor',
    platform: 'Ollama',
    patternCount: 6,
    knowledgeGraph: { nodes: 18, edges: 28 },
    createdAt: '3 days ago',
    updatedAt: '12h ago',
    messageCount: 94,
    patterns: [MOCK_PATTERNS[3]],
    nodes: [
      { id: 'n24', name: 'Generators', type: 'Concept', importance: 0.8 },
      { id: 'n25', name: 'Decorators', type: 'Concept', importance: 0.85 },
      { id: 'n26', name: 'FastAPI', type: 'Entity', importance: 0.75 },
    ],
    edges: [
      { source: 'n25', target: 'n26', label: 'powers', strength: 0.7 },
      { source: 'n24', target: 'n25', label: 'complements', strength: 0.6 },
    ],
  },
  {
    id: 'mem-6',
    name: 'Tech Lead Decisions',
    description: 'Technical leadership decisions, code review patterns, and team best practices documentation.',
    type: 'Memory',
    sourceAgent: 'Tech Lead',
    platform: 'Sylva',
    patternCount: 9,
    knowledgeGraph: { nodes: 28, edges: 45 },
    createdAt: '5 days ago',
    updatedAt: '1d ago',
    messageCount: 145,
    patterns: [MOCK_PATTERNS[4]],
    nodes: [
      { id: 'n27', name: 'Code Review', type: 'Action', importance: 0.9 },
      { id: 'n28', name: 'CI/CD', type: 'Topic', importance: 0.8 },
      { id: 'n29', name: 'Testing', type: 'Topic', importance: 0.85 },
      { id: 'n30', name: 'Documentation', type: 'Action', importance: 0.75 },
    ],
    edges: [
      { source: 'n27', target: 'n29', label: 'validates', strength: 0.85 },
      { source: 'n28', target: 'n27', label: 'automates', strength: 0.7 },
      { source: 'n30', target: 'n27', label: 'supports', strength: 0.8 },
    ],
  },
  {
    id: 'mem-7',
    name: 'Security Analyst Notes',
    description: 'Security audit findings, vulnerability patterns, and hardening recommendations across various systems.',
    type: 'Memory',
    sourceAgent: 'Security Analyst',
    platform: 'Grok',
    patternCount: 11,
    knowledgeGraph: { nodes: 22, edges: 35 },
    createdAt: '2 weeks ago',
    updatedAt: '4d ago',
    messageCount: 167,
    patterns: [],
    nodes: [
      { id: 'n31', name: 'OWASP', type: 'Concept', importance: 0.9 },
      { id: 'n32', name: 'Penetration Testing', type: 'Action', importance: 0.85 },
      { id: 'n33', name: 'Encryption', type: 'Concept', importance: 0.8 },
    ],
    edges: [
      { source: 'n32', target: 'n31', label: 'evaluates', strength: 0.9 },
      { source: 'n33', target: 'n31', label: 'mitigates', strength: 0.75 },
    ],
  },
  {
    id: 'mem-8',
    name: 'Data Science Insights',
    description: 'Data science workflows, model training sessions, and visualization techniques from collaborative analysis.',
    type: 'Memory',
    sourceAgent: 'Data Scientist',
    platform: 'Kimi',
    patternCount: 7,
    knowledgeGraph: { nodes: 30, edges: 48 },
    createdAt: '4 days ago',
    updatedAt: '6h ago',
    messageCount: 112,
    linkedKnowledgeBase: 'Product Knowledge',
    patterns: [],
    nodes: [
      { id: 'n34', name: 'Neural Networks', type: 'Concept', importance: 0.9 },
      { id: 'n35', name: 'Pandas', type: 'Entity', importance: 0.75 },
      { id: 'n36', name: 'Feature Engineering', type: 'Action', importance: 0.8 },
      { id: 'n37', name: 'Machine Learning', type: 'Topic', importance: 0.95 },
    ],
    edges: [
      { source: 'n36', target: 'n37', label: 'enables', strength: 0.85 },
      { source: 'n35', target: 'n36', label: 'supports', strength: 0.7 },
      { source: 'n34', target: 'n37', label: 'is part of', strength: 0.9 },
    ],
  },
]

const MOCK_WORK_LOGS: WorkLog[] = [
  {
    id: 'wl-1',
    name: 'Database Migration Task',
    sourceTask: 'Migrate users to new schema',
    agents: ['Code Assistant', 'System Architect'],
    duration: '45 min',
    log: '## Database Migration Log\n\n1. Analyzed current schema\n2. Created migration scripts\n3. Validated data integrity\n4. Deployed to staging\n5. Verified 100% success rate',
    date: '2h ago',
  },
  {
    id: 'wl-2',
    name: 'API Integration Sprint',
    sourceTask: 'Integrate third-party APIs',
    agents: ['Code Assistant', 'Debug Agent'],
    duration: '1h 20min',
    log: '## API Integration Log\n\n1. Reviewed API documentation\n2. Implemented auth flow\n3. Added rate limiting\n4. Created error handlers\n5. Wrote integration tests',
    date: '5h ago',
  },
  {
    id: 'wl-3',
    name: 'Security Audit',
    sourceTask: 'Full security audit',
    agents: ['Security Analyst'],
    duration: '2h 10min',
    log: '## Security Audit Log\n\n1. Scanned for vulnerabilities\n2. Reviewed auth mechanisms\n3. Checked data encryption\n4. Analyzed access patterns\n5. Generated report',
    date: '1d ago',
  },
  {
    id: 'wl-4',
    name: 'Frontend Optimization',
    sourceTask: 'Optimize React app performance',
    agents: ['Frontend Expert', 'Tech Lead'],
    duration: '55 min',
    log: '## Optimization Log\n\n1. Profiled render performance\n2. Identified bottlenecks\n3. Implemented memoization\n4. Lazy loaded components\n5. Reduced bundle size by 40%',
    date: '2d ago',
  },
]

/* ── Animation helpers ──────────────────────────────────────────── */

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function Memory() {
  const { addToast } = useToast()
  const [memories, setMemories] = useState<Memory[]>(MOCK_MEMORIES)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const [typeFilter, setTypeFilter] = useState<'All' | MemoryType>('All')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  /* Filter */
  const filtered = useMemo(() => {
    let result = memories
    if (typeFilter !== 'All') {
      result = result.filter((m) => m.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.sourceAgent.toLowerCase().includes(q)
      )
    }
    return result
  }, [memories, typeFilter, searchQuery])

  /* Derived stats */
  const stats = useMemo(() => {
    const totalPatterns = memories.reduce((s, m) => s + m.patternCount, 0)
    const totalNodes = memories.reduce((s, m) => s + m.knowledgeGraph.nodes, 0)
    const totalWorkLogs = memories.filter((m) => m.type === 'Work Log').length
    return { totalPatterns, totalNodes, totalWorkLogs }
  }, [memories])

  const deleteMemory = useCallback(
    (id: string) => {
      setMemories((prev) => prev.filter((m) => m.id !== id))
      setSelectedMemory(null)
      addToast({ type: 'success', title: 'Memory deleted' })
    },
    [addToast]
  )

  const createMemory = useCallback(
    (data: { name: string; description: string; content: string }) => {
      const newMemory: Memory = {
        id: `mem-${Date.now()}`,
        name: data.name,
        description: data.description,
        type: 'Memory',
        sourceAgent: 'Custom',
        platform: 'Sylva',
        patternCount: 0,
        knowledgeGraph: { nodes: 0, edges: 0 },
        createdAt: 'Just now',
        updatedAt: 'Just now',
        patterns: [],
        nodes: [],
        edges: [],
      }
      setMemories((prev) => [newMemory, ...prev])
      setShowNewModal(false)
      addToast({ type: 'success', title: 'Memory created', message: `"${data.name}" added to library` })
    },
    [addToast]
  )

  const importWorkLog = useCallback(
    (_logId: string) => {
      setShowImportModal(false)
      addToast({ type: 'success', title: 'Work log imported', message: 'Memory updated with work log data' })
    },
    [addToast]
  )

  const exportFromAgent = useCallback(
    (agent: string) => {
      setShowExportModal(false)
      addToast({ type: 'success', title: 'Memory exported', message: `Memory exported from ${agent}` })
    },
    [addToast]
  )

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className="flex h-full flex-col"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-surface-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-accent-purple" />
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">Memory Library</h1>
            <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-tertiary border border-surface-4">
              {memories.length} memories
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, patterns, work logs..."
                className="h-9 w-[280px] rounded-lg border border-surface-4 bg-surface-0 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand focus:ring-[3px] focus:ring-[var(--brand-glow)]"
              />
            </div>
            <div className="flex rounded-lg border border-surface-4 bg-surface-1 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'list' ? 'bg-surface-2 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'graph' ? 'bg-surface-2 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-all hover:brightness-110 hover:-translate-y-px hover:shadow-lg hover:shadow-[var(--brand-glow)] active:scale-[0.97]"
              style={{ background: 'var(--grad-brand)' }}
            >
              <Plus className="h-4 w-4" />
              New Memory
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="mt-4 flex gap-2">
          {(['All', 'Memory', 'Work Log', 'Pattern'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                typeFilter === t
                  ? 'bg-brand text-white'
                  : 'border border-surface-4 bg-surface-1 text-text-tertiary hover:bg-surface-2 hover:text-text-secondary'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{memories.length}</span>
            <span className="text-xs text-text-tertiary">memories</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{stats.totalPatterns.toLocaleString()}</span>
            <span className="text-xs text-text-tertiary">patterns</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{stats.totalNodes.toLocaleString()}</span>
            <span className="text-xs text-text-tertiary">nodes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{stats.totalWorkLogs}</span>
            <span className="text-xs text-text-tertiary">work logs</span>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6">
        <AnimatePresence mode="wait">
          {!selectedMemory ? (
            <motion.div
              key="list"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8 }}
            >
              {viewMode === 'list' ? (
                <div className="flex flex-col gap-3">
                  {filtered.map((memory) => (
                    <MemoryListItem
                      key={memory.id}
                      memory={memory}
                      onClick={() => setSelectedMemory(memory)}
                      onDelete={() => deleteMemory(memory.id)}
                    />
                  ))}
                </div>
              ) : (
                <GraphView memories={filtered} onSelectMemory={setSelectedMemory} />
              )}
              {filtered.length === 0 && <EmptyState onCreate={() => setShowNewModal(true)} />}
            </motion.div>
          ) : (
            <MemoryDetail
              key="detail"
              memory={selectedMemory}
              onBack={() => setSelectedMemory(null)}
              onDelete={() => deleteMemory(selectedMemory.id)}
              onImport={() => setShowImportModal(true)}
              onExport={() => setShowExportModal(true)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewModal && (
          <NewMemoryModal onClose={() => setShowNewModal(false)} onCreate={createMemory} />
        )}
        {showImportModal && (
          <ImportWorkLogModal onClose={() => setShowImportModal(false)} onImport={importWorkLog} />
        )}
        {showExportModal && (
          <ExportFromAgentModal onClose={() => setShowExportModal(false)} onExport={exportFromAgent} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Memory List Item
   ═══════════════════════════════════════════════════════════════ */

function MemoryListItem({
  memory,
  onClick,
  onDelete,
}: {
  memory: Memory
  onClick: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const typeBadgeColors: Record<MemoryType, string> = {
    Memory: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    'Work Log': 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20',
    Pattern: 'bg-accent-amber/15 text-accent-amber border-accent-amber/20',
  }

  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className="group flex cursor-pointer items-start gap-4 rounded-xl border border-surface-4 bg-surface-1 p-4 transition-all hover:border-accent-purple/30 hover:bg-surface-2"
    >
      {/* Left - Agent info */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold text-white"
          style={{ borderColor: PLATFORM_COLORS[memory.platform], backgroundColor: `${PLATFORM_COLORS[memory.platform]}40` }}
        >
          {memory.sourceAgent[0]}
        </div>
      </div>

      {/* Center - Memory info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[0.9375rem] font-medium text-text-primary">{memory.name}</h3>
          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium border', typeBadgeColors[memory.type])}>
            {memory.type}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{memory.description}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {memory.createdAt}</span>
          {memory.messageCount && (
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {memory.messageCount} messages</span>
          )}
          <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {memory.patternCount} patterns</span>
          <span className="flex items-center gap-1"><Database className="h-3 w-3" /> {memory.knowledgeGraph.nodes} nodes / {memory.knowledgeGraph.edges} edges</span>
          {memory.linkedKnowledgeBase && (
            <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {memory.linkedKnowledgeBase}</span>
          )}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {memory.patternCount > 0 && (
          <span className="rounded-md bg-accent-amber/10 px-2 py-0.5 text-xs text-accent-amber border border-accent-amber/20">
            {memory.patternCount} patterns
          </span>
        )}
        {memory.knowledgeGraph.nodes > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-purple">
            <GitBranch className="h-3 w-3" /> {memory.knowledgeGraph.nodes}
          </span>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-surface-4 bg-surface-2 p-1.5 shadow-xl">
                <button
                  onClick={() => { setMenuOpen(false); onClick() }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                >
                  <Brain className="h-4 w-4" /> View details
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                >
                  <GitBranch className="h-4 w-4" /> View knowledge graph
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent-coral hover:bg-[rgba(239,68,68,0.15)]"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Graph View (simplified network)
   ═══════════════════════════════════════════════════════════════ */

function GraphView({ memories, onSelectMemory }: { memories: Memory[]; onSelectMemory: (m: Memory) => void }) {
  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-text-primary">Knowledge Graph Network</h3>
        <span className="text-xs text-text-tertiary">{memories.length} memories &middot; Click a card to explore</span>
      </div>

      {/* Network layout - cards positioned as nodes */}
      <div className="relative min-h-[500px]">
        {/* Connection lines (SVG) */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          {memories.map((_mem, i) => {
            if (i >= memories.length - 1) return null
            const x1 = 25 + (i % 3) * 33
            const y1 = 20 + Math.floor(i / 3) * 45
            const x2 = 25 + ((i + 1) % 3) * 33
            const y2 = 20 + Math.floor((i + 1) / 3) * 45
            return (
              <line
                key={`line-${i}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="var(--surface-4)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )
          })}
        </svg>

        {/* Memory cards as nodes */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((memory, i) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => onSelectMemory(memory)}
              className="cursor-pointer rounded-xl border border-surface-4 bg-surface-0 p-4 transition-all hover:border-accent-purple/50 hover:shadow-[0_4px_16px_rgba(139,92,246,0.15)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-accent-purple" />
                <h4 className="text-sm font-medium text-text-primary truncate">{memory.name}</h4>
              </div>
              <p className="text-xs text-text-tertiary line-clamp-2 mb-3">{memory.description}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-accent-purple/10 px-1.5 py-0.5 text-accent-purple">{memory.knowledgeGraph.nodes} nodes</span>
                <span className="rounded bg-accent-cyan/10 px-1.5 py-0.5 text-accent-cyan">{memory.knowledgeGraph.edges} edges</span>
                <span className="rounded bg-accent-amber/10 px-1.5 py-0.5 text-accent-amber">{memory.patternCount} patterns</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLORS[memory.platform] }}
                />
                <span className="text-[10px] text-text-tertiary">{memory.sourceAgent}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Memory Detail View
   ═══════════════════════════════════════════════════════════════ */

function MemoryDetail({
  memory,
  onBack,
  onDelete,
  onImport,
  onExport,
}: {
  memory: Memory
  onBack: () => void
  onDelete: () => void
  onImport: () => void
  onExport: () => void
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'graph' | 'patterns' | 'activity'>('content')

  const typeBadgeColors: Record<MemoryType, string> = {
    Memory: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    'Work Log': 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20',
    Pattern: 'bg-accent-amber/15 text-accent-amber border-accent-amber/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        Memory Library / <span className="text-text-secondary">{memory.name}</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent-purple" />
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary">{memory.name}</h2>
          <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium border', typeBadgeColors[memory.type])}>
            {memory.type}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold text-white"
            style={{ borderColor: PLATFORM_COLORS[memory.platform], backgroundColor: `${PLATFORM_COLORS[memory.platform]}40` }}
          >
            {memory.sourceAgent[0]}
          </div>
          <span className="text-sm text-text-secondary">From agent: {memory.sourceAgent}</span>
          <span className="text-text-muted">&middot;</span>
          <span className="text-sm text-text-tertiary">Extracted {memory.createdAt}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary">
            <GitBranch className="h-4 w-4" />
            View Knowledge Graph
          </button>
          <button className="flex h-9 items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary">
            <Database className="h-4 w-4" />
            Export to KB
          </button>
          <button
            onClick={onImport}
            className="flex h-9 items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <Import className="h-4 w-4" />
            Import Work Log
          </button>
          <button
            onClick={onExport}
            className="flex h-9 items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Export from Agent
          </button>
          <button
            onClick={onDelete}
            className="flex h-9 items-center gap-2 rounded-lg border border-accent-coral/30 bg-[rgba(239,68,68,0.1)] px-4 text-sm font-medium text-accent-coral transition-colors hover:bg-[rgba(239,68,68,0.2)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-surface-4">
        <div className="flex gap-1">
          {(['content', 'graph', 'patterns', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-brand text-text-primary'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'content' && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {/* Main content */}
            <div className="lg:col-span-2 rounded-xl border border-surface-4 bg-surface-1 p-5">
              <h4 className="mb-3 font-display text-sm font-semibold text-text-primary">Memory Content</h4>
              <div className="space-y-3 text-sm text-text-secondary leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                <p>{memory.description}</p>
                <p>This memory contains {memory.patternCount} extracted patterns and {memory.knowledgeGraph.nodes} knowledge graph nodes.</p>
                <div className="rounded-lg bg-surface-0 p-4 border border-surface-4">
                  <h5 className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">Key Concepts</h5>
                  <div className="flex flex-wrap gap-2">
                    {memory.nodes.slice(0, 8).map((node) => (
                      <span
                        key={node.id}
                        className="rounded-md px-2 py-1 text-xs font-medium border"
                        style={{
                          borderColor: `${NODE_COLORS[node.type]}40`,
                          backgroundColor: `${NODE_COLORS[node.type]}15`,
                          color: NODE_COLORS[node.type],
                        }}
                      >
                        {node.name}
                      </span>
                    ))}
                  </div>
                </div>
                <p>Last updated {memory.updatedAt}. This memory was automatically generated from conversation history and contains structured knowledge extracted through the Hermes memory system.</p>
              </div>
            </div>

            {/* Metadata sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-4 bg-surface-1 p-4 space-y-3">
                <h4 className="font-display text-sm font-semibold text-text-primary">Agent Info</h4>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold text-white"
                    style={{ borderColor: PLATFORM_COLORS[memory.platform], backgroundColor: `${PLATFORM_COLORS[memory.platform]}40` }}
                  >
                    {memory.sourceAgent[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{memory.sourceAgent}</div>
                    <div className="text-xs text-text-tertiary">{memory.platform}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-surface-4 bg-surface-1 p-4 space-y-2">
                <h4 className="font-display text-sm font-semibold text-text-primary">Metadata</h4>
                {memory.messageCount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Messages</span>
                    <span className="text-text-primary">{memory.messageCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Created</span>
                  <span className="text-text-primary">{memory.createdAt}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Updated</span>
                  <span className="text-text-primary">{memory.updatedAt}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Patterns</span>
                  <span className="text-text-primary">{memory.patternCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Graph Nodes</span>
                  <span className="text-text-primary">{memory.knowledgeGraph.nodes}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Graph Edges</span>
                  <span className="text-text-primary">{memory.knowledgeGraph.edges}</span>
                </div>
                {memory.linkedKnowledgeBase && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Linked KB</span>
                    <span className="text-accent-cyan">{memory.linkedKnowledgeBase}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'graph' && (
          <motion.div
            key="graph"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <KnowledgeGraphViewer memory={memory} />
          </motion.div>
        )}

        {activeTab === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PatternsView memory={memory} />
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ActivityTimeline memory={memory} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Knowledge Graph Viewer
   ═══════════════════════════════════════════════════════════════ */

function KnowledgeGraphViewer({ memory }: { memory: Memory }) {
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)

  const nodeTypeFilters: NodeType[] = ['Concept', 'Entity', 'Action', 'Topic']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Graph area */}
      <div className="lg:col-span-2 rounded-xl border border-surface-4 bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-sm font-semibold text-text-primary">Graph Visualization</h4>
          <div className="flex gap-1.5">
            {nodeTypeFilters.map((t) => (
              <span key={t} className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NODE_COLORS[t] }} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-[400px] w-full rounded-lg bg-surface-0 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, var(--surface-4) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          {/* SVG Graph */}
          <svg className="absolute inset-0 h-full w-full">
            {/* Edges */}
            {memory.edges.map((edge, i) => {
              const srcIdx = memory.nodes.findIndex((n) => n.id === edge.source)
              const tgtIdx = memory.nodes.findIndex((n) => n.id === edge.target)
              if (srcIdx === -1 || tgtIdx === -1) return null
              const angle1 = (srcIdx / memory.nodes.length) * Math.PI * 2 - Math.PI / 2
              const angle2 = (tgtIdx / memory.nodes.length) * Math.PI * 2 - Math.PI / 2
              const r = 140
              const cx = 300
              const cy = 200
              const x1 = cx + Math.cos(angle1) * r
              const y1 = cy + Math.sin(angle1) * r
              const x2 = cx + Math.cos(angle2) * r
              const y2 = cy + Math.sin(angle2) * r

              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="var(--surface-4)"
                    strokeWidth={1 + edge.strength}
                    className="transition-all hover:stroke-text-tertiary"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 4}
                    className="text-[8px] fill-text-muted"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {memory.nodes.map((node, i) => {
              const angle = (i / memory.nodes.length) * Math.PI * 2 - Math.PI / 2
              const r = 140
              const cx = 300
              const cy = 200
              const x = cx + Math.cos(angle) * r
              const y = cy + Math.sin(angle) * r
              const size = 20 + node.importance * 15

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={size / 2}
                    fill={`${NODE_COLORS[node.type]}30`}
                    stroke={NODE_COLORS[node.type]}
                    strokeWidth="2"
                    className="transition-all hover:stroke-width-3"
                  />
                  <text
                    x={x}
                    y={y + 4}
                    className="text-[9px] font-medium"
                    fill={NODE_COLORS[node.type]}
                    textAnchor="middle"
                  >
                    {node.name.length > 10 ? node.name.slice(0, 8) + '...' : node.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Node/Edge list */}
      <div className="space-y-4">
        <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
          <h4 className="mb-3 font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" /> Graph Stats
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Nodes</span>
              <span className="text-text-primary font-medium">{memory.knowledgeGraph.nodes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Edges</span>
              <span className="text-text-primary font-medium">{memory.knowledgeGraph.edges}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Density</span>
              <span className="text-text-primary font-medium">
                {memory.knowledgeGraph.nodes > 0
                  ? (memory.knowledgeGraph.edges / (memory.knowledgeGraph.nodes * (memory.knowledgeGraph.nodes - 1) / 2)).toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Nodes table */}
        <div className="rounded-xl border border-surface-4 bg-surface-1 overflow-hidden max-h-[300px] overflow-y-auto">
          <div className="bg-surface-2 px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-secondary sticky top-0">
            Nodes ({memory.nodes.length})
          </div>
          {memory.nodes.map((node) => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-t border-surface-4 cursor-pointer transition-colors',
                selectedNode?.id === node.id ? 'bg-brand/5' : 'hover:bg-surface-2'
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[node.type] }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary truncate">{node.name}</div>
                <div className="text-[10px] text-text-tertiary">{node.type} &middot; importance: {node.importance.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected node detail */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-surface-4 bg-surface-1 p-4"
            >
              <h4 className="mb-2 font-display text-sm font-semibold text-text-primary">{selectedNode.name}</h4>
              <div className="space-y-1 text-xs text-text-secondary">
                <div>Type: <span style={{ color: NODE_COLORS[selectedNode.type] }}>{selectedNode.type}</span></div>
                <div>Importance: {selectedNode.importance.toFixed(2)}</div>
                <div>
                  Connected to: {memory.edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source
                      const other = memory.nodes.find((n) => n.id === otherId)
                      return other?.name ?? otherId
                    })
                    .join(', ')}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Patterns View
   ═══════════════════════════════════════════════════════════════ */

function PatternsView({ memory }: { memory: Memory }) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)

  const handleExtract = useCallback(() => {
    setIsExtracting(true)
    setExtractProgress(0)
    const interval = setInterval(() => {
      setExtractProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setIsExtracting(false)
          return 100
        }
        return p + 20
      })
    }, 600)
  }, [])

  const patternTypeColors: Record<PatternType, string> = {
    Behavioral: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
    Knowledge: 'bg-accent-mint/10 text-accent-mint border-accent-mint/20',
    Skill: 'bg-brand/10 text-brand border-brand/20',
    Preference: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  }

  return (
    <div className="space-y-5">
      {/* Extract button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display text-sm font-semibold text-text-primary">Extracted Patterns</h4>
          <p className="text-xs text-text-tertiary mt-0.5">{memory.patterns.length} patterns found</p>
        </div>
        <button
          onClick={handleExtract}
          disabled={isExtracting}
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all',
            isExtracting
              ? 'bg-surface-3 text-text-tertiary cursor-not-allowed'
              : 'bg-brand text-white hover:brightness-110 hover:-translate-y-px active:scale-[0.97]'
          )}
          style={!isExtracting ? { background: 'var(--grad-brand)' } : {}}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting... {extractProgress}%
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Extract Patterns
            </>
          )}
        </button>
      </div>

      {/* Extraction progress */}
      {isExtracting && (
        <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-text-secondary">Extracting patterns from memory...</span>
            <span className="text-brand font-medium">{extractProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand"
              initial={{ width: 0 }}
              animate={{ width: `${extractProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Pattern cards */}
      {memory.patterns.length === 0 ? (
        <div className="rounded-xl border border-surface-4 bg-surface-1 p-10 text-center">
          <Sparkles className="h-10 w-10 text-text-muted mx-auto" />
          <h4 className="mt-3 font-display text-sm font-semibold text-text-secondary">No patterns yet</h4>
          <p className="mt-1 text-xs text-text-tertiary">Click "Extract Patterns" to analyze this memory</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memory.patterns.map((pattern, i) => (
            <motion.div
              key={pattern.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-surface-4 bg-surface-1 p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent-amber" />
                  <h5 className="text-sm font-medium text-text-primary">{pattern.name}</h5>
                </div>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium border', patternTypeColors[pattern.type])}>
                  {pattern.type}
                </span>
              </div>

              <p className="text-xs text-text-secondary mb-3">{pattern.description}</p>

              {/* Confidence bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-text-tertiary">Confidence</span>
                  <span className="text-accent-amber font-medium">{Math.round(pattern.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-amber transition-all duration-500"
                    style={{ width: `${pattern.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Evidence */}
              <div className="mb-3">
                <div className="text-[10px] text-text-tertiary mb-1 uppercase tracking-wider">Evidence</div>
                <ul className="space-y-1">
                  {pattern.evidence.slice(0, 2).map((ev, j) => (
                    <li key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-accent-mint shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </li>
                  ))}
                  {pattern.evidence.length > 2 && (
                    <li className="text-xs text-text-muted">+{pattern.evidence.length - 2} more</li>
                  )}
                </ul>
              </div>

              {/* Source */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-4">
                <span className="text-[10px] text-text-tertiary">From: {pattern.sourceMemory}</span>
                <div className="flex gap-1">
                  <button className="rounded-md px-2 py-1 text-[10px] text-text-secondary bg-surface-2 hover:bg-surface-3 transition-colors">
                    Apply to agent
                  </button>
                  <button className="rounded-md px-2 py-1 text-[10px] text-text-secondary bg-surface-2 hover:bg-surface-3 transition-colors">
                    Export
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Activity Timeline
   ═══════════════════════════════════════════════════════════════ */

function ActivityTimeline({ memory }: { memory: Memory }) {
  const events = [
    { icon: Brain, color: 'text-accent-purple', label: 'Memory created', time: memory.createdAt },
    ...(memory.patternCount > 0 ? [{ icon: Sparkles, color: 'text-accent-amber', label: `${memory.patternCount} patterns extracted`, time: memory.updatedAt }] : []),
    ...(memory.linkedKnowledgeBase ? [{ icon: Database, color: 'text-accent-cyan', label: `Linked to ${memory.linkedKnowledgeBase}`, time: memory.updatedAt }] : []),
    ...(memory.type === 'Work Log' ? [{ icon: FileText, color: 'text-accent-mint', label: 'Work log imported', time: memory.createdAt }] : []),
    { icon: Clock, color: 'text-text-muted', label: 'Last updated', time: memory.updatedAt },
  ]

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-5">
        <h4 className="mb-4 font-display text-sm font-semibold text-text-primary">Activity Timeline</h4>
        <div className="space-y-0">
          {events.map((event, i) => {
            const Icon = event.icon
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-surface-2', event.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-surface-4 my-1" />}
                </div>
                <div className={cn('pb-5', i === events.length - 1 && 'pb-0')}>
                  <div className="text-sm font-medium text-text-primary">{event.label}</div>
                  <div className="text-xs text-text-tertiary">{event.time}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════ */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Brain className="h-12 w-12 text-text-muted" />
      <h3 className="mt-4 font-display text-lg font-semibold text-text-secondary">No memories yet</h3>
      <p className="mt-1 max-w-sm text-sm text-text-tertiary">
        Agent memories will appear here when exported from conversations or imported from work logs
      </p>
      <button
        onClick={onCreate}
        className="mt-4 flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-all hover:brightness-110"
        style={{ background: 'var(--grad-brand)' }}
      >
        <Plus className="h-4 w-4" />
        New Memory
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   New Memory Modal
   ═══════════════════════════════════════════════════════════════ */

function NewMemoryModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: { name: string; description: string; content: string }) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="w-full max-w-[560px] rounded-2xl border border-surface-4 bg-surface-1 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text-primary">New Memory</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Name <span className="text-accent-coral">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Memory"
              className="h-10 w-full rounded-lg border border-surface-4 bg-surface-0 px-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand focus:ring-[3px] focus:ring-[var(--brand-glow)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description..."
              className="w-full rounded-lg border border-surface-4 bg-surface-0 p-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand focus:ring-[3px] focus:ring-[var(--brand-glow)] resize-y"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Structured memory content..."
              className="w-full rounded-lg border border-surface-4 bg-surface-0 p-3 text-sm font-mono text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand focus:ring-[3px] focus:ring-[var(--brand-glow)] resize-y"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Source Agent</label>
            <select className="h-10 w-full rounded-lg border border-surface-4 bg-surface-0 px-3 text-sm text-text-primary outline-none focus:border-brand">
              <option value="">None (manual entry)</option>
              {['Code Assistant', 'System Architect', 'Debug Agent', 'Frontend Expert', 'Python Mentor', 'Tech Lead', 'Security Analyst', 'Data Scientist'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary hover:bg-surface-3"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate({ name, description, content })}
            disabled={!name.trim()}
            className={cn(
              'h-9 rounded-lg px-4 text-sm font-medium text-white transition-all',
              name.trim()
                ? 'bg-brand hover:brightness-110 hover:-translate-y-px active:scale-[0.97]'
                : 'bg-surface-4 text-text-muted cursor-not-allowed'
            )}
            style={name.trim() ? { background: 'var(--grad-brand)' } : {}}
          >
            Create
          </button>
        </div>
      </motion.div>
    </ModalOverlay>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Import Work Log Modal
   ═══════════════════════════════════════════════════════════════ */

function ImportWorkLogModal({ onClose, onImport }: { onClose: () => void; onImport: (logId: string) => void }) {
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [extractPatterns, setExtractPatterns] = useState(true)
  const [generateGraph, setGenerateGraph] = useState(true)
  const [linkSource, setLinkSource] = useState(true)
  const [importing, setImporting] = useState(false)

  const handleImport = useCallback(() => {
    if (!selectedLog) return
    setImporting(true)
    setTimeout(() => {
      setImporting(false)
      onImport(selectedLog)
    }, 2000)
  }, [selectedLog, onImport])

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="w-full max-w-[520px] rounded-2xl border border-surface-4 bg-surface-1 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text-primary">Import Work Log to Memory</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!importing ? (
          <>
            <p className="mb-3 text-sm text-text-secondary">Select a work log to import:</p>
            <div className="max-h-56 overflow-y-auto space-y-2 mb-4">
              {MOCK_WORK_LOGS.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
                    selectedLog === log.id
                      ? 'border-brand bg-brand/10'
                      : 'border-surface-4 bg-surface-0 hover:border-surface-3'
                  )}
                >
                  <FileText className={cn('h-5 w-5 shrink-0 mt-0.5', selectedLog === log.id ? 'text-brand' : 'text-text-tertiary')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary">{log.name}</div>
                    <div className="text-xs text-text-tertiary">{log.sourceTask} &middot; {log.agents.join(', ')} &middot; {log.duration}</div>
                  </div>
                  {selectedLog === log.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />}
                </button>
              ))}
            </div>

            {/* Target */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-text-secondary">Target</label>
              <select className="h-9 w-full rounded-lg border border-surface-4 bg-surface-0 px-3 text-sm text-text-primary outline-none focus:border-brand">
                <option>Create new memory</option>
                {MOCK_MEMORIES.slice(0, 4).map((m) => (
                  <option key={m.id} value={m.id}>Append to: {m.name}</option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={extractPatterns}
                  onChange={(e) => setExtractPatterns(e.target.checked)}
                  className="rounded border-surface-4"
                />
                Extract patterns automatically
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateGraph}
                  onChange={(e) => setGenerateGraph(e.target.checked)}
                  className="rounded border-surface-4"
                />
                Generate knowledge graph
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkSource}
                  onChange={(e) => setLinkSource(e.target.checked)}
                  className="rounded border-surface-4"
                />
                Link to source task
              </label>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand mb-3" />
            <p className="text-sm text-text-secondary">Importing work log...</p>
            <div className="w-48 h-1.5 bg-surface-3 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-brand rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'linear' }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary hover:bg-surface-3"
          >
            Cancel
          </button>
          {!importing && (
            <button
              onClick={handleImport}
              disabled={!selectedLog}
              className={cn(
                'h-9 rounded-lg px-4 text-sm font-medium text-white transition-all',
                selectedLog
                  ? 'bg-brand hover:brightness-110 hover:-translate-y-px active:scale-[0.97]'
                  : 'bg-surface-4 text-text-muted cursor-not-allowed'
              )}
              style={selectedLog ? { background: 'var(--grad-brand)' } : {}}
            >
              Import
            </button>
          )}
        </div>
      </motion.div>
    </ModalOverlay>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Export from Agent Modal
   ═══════════════════════════════════════════════════════════════ */

function ExportFromAgentModal({ onClose, onExport }: { onClose: () => void; onExport: (agent: string) => void }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const agents = [
    { name: 'Code Assistant', platform: 'Claude' as Platform, conversations: 24, lastActive: '2h ago' },
    { name: 'System Architect', platform: 'Kimi' as Platform, conversations: 12, lastActive: '5h ago' },
    { name: 'Debug Agent', platform: 'DeepSeek' as Platform, conversations: 18, lastActive: '1d ago' },
    { name: 'Frontend Expert', platform: 'Gemini' as Platform, conversations: 15, lastActive: '3d ago' },
    { name: 'Python Mentor', platform: 'Ollama' as Platform, conversations: 8, lastActive: '2d ago' },
    { name: 'Tech Lead', platform: 'Sylva' as Platform, conversations: 10, lastActive: '4h ago' },
  ]

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="w-full max-w-[480px] rounded-2xl border border-surface-4 bg-surface-1 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text-primary">Export from Agent</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-text-secondary">Select an agent to export memory from:</p>

        <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
          {agents.map((agent) => (
            <button
              key={agent.name}
              onClick={() => setSelectedAgent(agent.name)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                selectedAgent === agent.name
                  ? 'border-brand bg-brand/10'
                  : 'border-surface-4 bg-surface-0 hover:border-surface-3'
              )}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 shrink-0 text-xs font-bold text-white"
                style={{ borderColor: PLATFORM_COLORS[agent.platform], backgroundColor: `${PLATFORM_COLORS[agent.platform]}40` }}
              >
                {agent.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary">{agent.name}</div>
                <div className="text-xs text-text-tertiary">{agent.platform} &middot; {agent.conversations} conversations &middot; Last active {agent.lastActive}</div>
              </div>
              {selectedAgent === agent.name && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-surface-4 bg-surface-2 px-4 text-sm font-medium text-text-secondary hover:bg-surface-3"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedAgent && onExport(selectedAgent)}
            disabled={!selectedAgent}
            className={cn(
              'h-9 rounded-lg px-4 text-sm font-medium text-white transition-all',
              selectedAgent
                ? 'bg-brand hover:brightness-110 hover:-translate-y-px active:scale-[0.97]'
                : 'bg-surface-4 text-text-muted cursor-not-allowed'
            )}
            style={selectedAgent ? { background: 'var(--grad-brand)' } : {}}
          >
            Export
          </button>
        </div>
      </motion.div>
    </ModalOverlay>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Shared: Modal Overlay
   ═══════════════════════════════════════════════════════════════ */

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 11, 20, 0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {children}
    </motion.div>
  )
}

import { fetchMemories, createMemory, deleteMemory } from '@/api/client';