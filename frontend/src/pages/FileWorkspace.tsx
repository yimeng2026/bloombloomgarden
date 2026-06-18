import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Folder,
  FileText,
  FileCode,
  FileJson,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  LayoutGrid,
  FolderTree,
  ArrowLeftRight,
  Download,
  X,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type NodeType = 'folder' | 'file'
type PlatformKey = 'claudecode' | 'codex' | 'hermes' | 'opencode' | 'shared'

interface FileNode {
  id: string
  name: string
  type: NodeType
  path: string
  children?: FileNode[]
  content?: string
  platform?: PlatformKey
  size?: string
  modified?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA — loaded from real API; empty root shown when no data
// ═══════════════════════════════════════════════════════════════════════════════

const WORKSPACE_ROOT: FileNode = {
  id: 'root',
  name: 'workspace',
  type: 'folder',
  path: 'workspace',
  children: [],
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const PLATFORM_META: Record<PlatformKey, { icon: typeof FileCode; color: string; label: string }> = {
  claudecode: { icon: FileCode, color: '#d97706', label: 'Claude Code' },
  codex: { icon: File, color: '#1a56db', label: 'Codex' },
  hermes: { icon: FileText, color: '#10b981', label: 'Hermes' },
  opencode: { icon: FileJson, color: '#f59e0b', label: 'OpenCode' },
  shared: { icon: FolderOpen, color: '#64748b', label: 'Shared' },
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return FileCode
    case 'json':
      return FileJson
    case 'md':
    case 'txt':
      return FileText
    default:
      return File
  }
}

function getLangFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'jsx',
    tsx: 'tsx',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
  }
  return map[ext || ''] || 'text'
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE TREE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function FileTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
  searchQuery,
}: {
  node: FileNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  selectedPath: string
  onSelect: (node: FileNode) => void
  searchQuery: string
}) {
  const isExpanded = expanded.has(node.id)
  const isFolder = node.type === 'folder'
  const isSelected = node.path === selectedPath

  // Filter: if search is active, only show matching nodes or their parents
  const matchesSearch =
    !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())

  const childMatches =
    isFolder &&
    node.children?.some(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.children?.some((cc) => cc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const shouldShow = !searchQuery || matchesSearch || childMatches || depth === 0

  if (!shouldShow) return null

  const indent = depth * 14
  const platformMeta = node.platform ? PLATFORM_META[node.platform] : undefined

  return (
    <div>
      {/* Node row */}
      <button
        onClick={() => {
          if (isFolder) onToggle(node.id)
          else onSelect(node)
        }}
        className={`group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left transition-colors ${
          isSelected && !isFolder
            ? 'bg-surface-2 text-text-primary'
            : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            )}
            {node.platform && platformMeta ? (
              <platformMeta.icon
                className="h-4 w-4 shrink-0"
                style={{ color: platformMeta.color }}
              />
            ) : (
              <FolderOpen className="h-4 w-4 shrink-0 text-accent-amber" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            {(() => {
              const Icon = getFileIcon(node.name)
              return <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />
            })()}
          </>
        )}
        <span className={`truncate text-sm ${isSelected && !isFolder ? 'font-medium text-text-primary' : ''}`}>
          {node.name}
        </span>
        {node.platform && platformMeta && isFolder && depth >= 2 && (
          <span
            className="ml-auto shrink-0 text-[10px] font-medium"
            style={{ color: platformMeta.color }}
          >
            {platformMeta.label}
          </span>
        )}
        {node.type === 'file' && node.size && (
          <span className="ml-auto shrink-0 text-[10px] text-text-muted">{node.size}</span>
        )}
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isFolder && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                selectedPath={selectedPath}
                onSelect={onSelect}
                searchQuery={searchQuery}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CodePreview({ filename, content }: { filename: string; content: string }) {
  const lang = getLangFromFilename(filename)
  const lines = content.split('\n')

  return (
    <div className="flex h-full flex-col"
    >
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-surface-4 bg-surface-1 px-4"
      >
        <div className="flex items-center gap-2"
        >
          {(() => {
            const Icon = getFileIcon(filename)
            return <Icon className="h-4 w-4 text-text-tertiary" />
          })()}
          <span className="text-sm font-medium text-text-primary">{filename}</span>
          <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-mono text-text-tertiary">
            {lang}
          </span>
        </div>
        <div className="flex items-center gap-2"
        >
          <span className="text-xs text-text-muted">{lines.length} lines</span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto bg-canvas"
      >
        <div className="flex"
        >
          {/* Line numbers */}
          <div className="sticky left-0 shrink-0 select-none border-r border-surface-4 bg-surface-1 py-4 text-right"
          >
            {lines.map((_, i) => (
              <div
                key={i}
                className="px-3 text-xs font-mono leading-6 text-text-muted"
              >
                {i + 1}
              </div>
            ))}
          </div>
          {/* Content */}
          <div className="min-w-0 flex-1 py-4"
          >
            <pre className="text-sm font-mono leading-6 text-text-primary"
            >
              <code>{content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-surface-4 bg-surface-1"
      >
        <ArrowLeftRight className="h-8 w-8 text-text-muted" />
      </div>
      <div className="text-center"
      >
        <h3 className="text-sm font-medium text-text-secondary"
        >Select a file to preview</h3>
        <p className="mt-1 max-w-[280px] text-xs text-text-muted"
        >
          Browse the shared workspace. All platform files live here — Claude Code, Codex, Hermes, OpenCode.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2"
      >
        {Object.entries(PLATFORM_META).map(([key, meta]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-4 bg-surface-1 px-3 py-1.5 text-xs"
          >
            <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function FileWorkspace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['root', 'chat-001', 'task-002'])
  )
  const [layoutMode, setLayoutMode] = useState<'tree' | 'grid'>('tree')
  const { addToast } = useToast()

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allIds = new Set<string>()
    function collect(node: FileNode) {
      allIds.add(node.id)
      node.children?.forEach(collect)
    }
    collect(WORKSPACE_ROOT)
    setExpanded(allIds)
  }, [])

  const collapseAll = useCallback(() => {
    setExpanded(new Set(['root']))
  }, [])

  // Flat file list for grid view
  const flatFiles = useMemo(() => {
    const files: FileNode[] = []
    function walk(node: FileNode, path: string) {
      if (node.type === 'file') {
        files.push({ ...node, name: `${path}/${node.name}` })
      }
      node.children?.forEach((c) => walk(c, path ? `${path}/${node.name}` : node.name))
    }
    WORKSPACE_ROOT.children?.forEach((c) => walk(c, ''))
    return files.filter((f) =>
      !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  const selectedFileCount = useMemo(() => {
    let count = 0
    function walk(node: FileNode) {
      if (node.type === 'file') count++
      node.children?.forEach(walk)
    }
    WORKSPACE_ROOT.children?.forEach(walk)
    return count
  }, [])

  const selectedFolderCount = useMemo(() => {
    let count = 0
    function walk(node: FileNode) {
      if (node.type === 'folder') count++
      node.children?.forEach(walk)
    }
    WORKSPACE_ROOT.children?.forEach(walk)
    return count
  }, [])

  return (
    <div className="flex h-full w-full"
    >
      {/* ── LEFT SIDEBAR: File Tree ── */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-surface-4 bg-canvas"
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-surface-4 px-4"
        >
          <div className="flex items-center gap-2"
          >
            <FolderTree className="h-5 w-5 text-accent-amber" />
            <h3 className="text-base font-medium text-text-primary font-display"
            >Files</h3>
          </div>
          <div className="flex items-center gap-1"
          >
            <button
              onClick={expandAll}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
              title="Expand all"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={collapseAll}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
              title="Collapse all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mx-3 my-3"
        >
          <div className="relative"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="h-9 w-full rounded-lg bg-surface-1 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mx-3 mb-2 flex items-center gap-3"
        >
          <span className="text-[10px] text-text-muted"
          >
            {selectedFileCount} files
          </span>
          <span className="text-[10px] text-text-muted"
          >
            {selectedFolderCount} folders
          </span>
          <span className="text-[10px] text-text-muted"
          >
            shared workspace
          </span>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 pb-2"
        >
          {layoutMode === 'tree' ? (
            <FileTreeNode
              node={WORKSPACE_ROOT}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpand}
              selectedPath={selectedNode?.path || ''}
              onSelect={(node) => {
                if (node.type === 'file') {
                  setSelectedNode(node)
                }
              }}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2"
            >
              {flatFiles.map((file) => {
                const Icon = getFileIcon(file.name)
                const platformColor = file.platform
                  ? PLATFORM_META[file.platform]?.color
                  : '#64748b'
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedNode(file)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                      selectedNode?.id === file.id
                        ? 'border-brand bg-[rgba(26,86,219,0.05)]'
                        : 'border-surface-4 bg-surface-1 hover:border-brand-muted'
                    }`}
                  >
                    <Icon
                      className="h-8 w-8"
                      style={{ color: platformColor }}
                    />
                    <span className="truncate text-xs font-medium text-text-primary w-full">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {file.size}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Layout toggle */}
        <div className="flex items-center justify-between border-t border-surface-4 px-4 py-2"
        >
          <div className="flex items-center gap-1 rounded-lg bg-surface-1 p-0.5"
          >
            <button
              onClick={() => setLayoutMode('tree')}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                layoutMode === 'tree'
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title="Tree view"
            >
              <FolderTree className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-[10px] text-text-muted"
          >{layoutMode} view</span>
        </div>
      </div>

      {/* ── RIGHT: Preview Area ── */}
      <div className="flex flex-1 flex-col min-w-0 bg-surface-0"
      >
        {selectedNode?.type === 'file' && selectedNode.content ? (
          <CodePreview
            filename={selectedNode.name}
            content={selectedNode.content}
          />
        ) : (
          <EmptyPreview />
        )}
      </div>
    </div>
  )
}

import { uploadFile } from '@/api/client';