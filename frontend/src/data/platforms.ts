// SYLVA Platforms Data — 58 platforms: 31 CLI tools + 27 Chat channels
// File: src/data/platforms.ts

import type { LucideIcon } from 'lucide-react'

export interface ModelApi {
  id: string
  name: string
  modelId: string
  priority: number
  enabled: boolean
}

export interface PlatformInstance {
  id: string
  name: string
  endpoint: string
  status: 'online' | 'offline' | 'error' | 'configuring' | 'disabled'
  healthScore: number
  modelCount: number
  agentCount: number
  latency: string
  uptime: string
  credentials: string
}

export type PlatformCategory = 'cli' | 'coding' | 'local' | 'chat'

export interface PlatformType {
  id: string
  name: string
  description: string
  icon: string  // lucide-react icon name
  color: string  // tailwind text color class
  colorHex: string // hex color for UI rendering
  category: PlatformCategory
  modelApis: ModelApi[]
  instances: PlatformInstance[]
}

// ── Category metadata ──
export const CATEGORY_META: Record<PlatformCategory, { label: string; color: string; colorHex: string }> = {
  cli: { label: 'CLI Tools', color: 'text-sky-400', colorHex: '#38bdf8' },
  coding: { label: 'Coding Agents', color: 'text-emerald-400', colorHex: '#34d399' },
  local: { label: 'Local / Self-Hosted', color: 'text-amber-400', colorHex: '#fbbf24' },
  chat: { label: 'Chat Channels', color: 'text-violet-400', colorHex: '#a78bfa' },
}

// ═══════════════════════════════════════════════════════════════════════════════
//  31 CLI TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const CLI_PLATFORMS: PlatformType[] = [
  // ── CLI / Runtime ──
  {
    id: 'openclaw',
    name: 'OpenClaw',
    description: 'Agent runtime — WebSocket gateway, 100+ skills',
    icon: 'Zap',
    color: 'text-amber-500',
    colorHex: '#f59e0b',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'oc-1', name: 'OpenClaw Main', endpoint: 'wss://gateway.openclaw.ai/v1/stream', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    description: 'Nous Research — Self-improving agent, 70+ skills, cross-session memory',
    icon: 'Sparkles',
    color: 'text-purple-500',
    colorHex: '#a855f7',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'hm-1', name: 'Hermes Default', endpoint: 'memory://localhost/hermes', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'sylva',
    name: 'Sylva',
    description: 'Local orchestrator — multi-agent task scheduler',
    icon: 'Cpu',
    color: 'text-cyan-400',
    colorHex: '#22d3ee',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'sv-1', name: 'Sylva Local', endpoint: 'http://localhost:8080', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'aion-cli',
    name: 'Aion CLI',
    description: 'AionUi — Rust-based backend service (aionrs)',
    icon: 'Server',
    color: 'text-sky-500',
    colorHex: '#0ea5e9',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'aion-1', name: 'Aion CLI', endpoint: 'ipc://aionrs', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'snow',
    name: 'Snow CLI',
    description: 'Snow — Lightweight AI agent CLI',
    icon: 'Snowflake',
    color: 'text-gray-300',
    colorHex: '#d1d5db',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'sn-1', name: 'Snow', endpoint: 'cli://snow', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'nanobot',
    name: 'Nanobot',
    description: 'Python AI agent with Anthropic Claude integration',
    icon: 'Bot',
    color: 'text-lime-500',
    colorHex: '#84cc16',
    category: 'cli',
    modelApis: [],
    instances: [
      { id: 'nb-1', name: 'Nanobot', endpoint: 'cli://nanobot', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Coding Agents (17 platforms) ──
  {
    id: 'claudecode',
    name: 'Claude Code',
    description: 'Anthropic — Agentic coding tool with subagents',
    icon: 'Terminal',
    color: 'text-orange-500',
    colorHex: '#f97316',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'cc-1', name: 'Claude Code', endpoint: 'cli://claude-code', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'OpenAI — Terminal coding agent with cloud sandbox',
    icon: 'Code2',
    color: 'text-emerald-500',
    colorHex: '#10b981',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'cdx-1', name: 'Codex CLI', endpoint: 'cli://codex', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Anomaly — Model-agnostic coding agent, 75+ providers, LSP',
    icon: 'Wrench',
    color: 'text-pink-500',
    colorHex: '#ec4899',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'ocd-1', name: 'OpenCode', endpoint: 'cli://opencode', status: 'disabled', healthScore: 0, modelCount: 4, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'droid',
    name: 'Droid',
    description: 'Factory — Agent-native software development, IDE integration',
    icon: 'Bot',
    color: 'text-indigo-500',
    colorHex: '#6366f1',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'dr-1', name: 'Droid CLI', endpoint: 'cli://droid', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'pi',
    name: 'Pi',
    description: 'Mario Zechner — Minimal coding harness, plugin system',
    icon: 'Circle',
    color: 'text-rose-500',
    colorHex: '#f43f5e',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'pi-1', name: 'Pi Agent', endpoint: 'cli://pi', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'qwencode',
    name: 'Qwen Code',
    description: 'Alibaba — Qwen coding assistant',
    icon: 'Code',
    color: 'text-blue-500',
    colorHex: '#3b82f6',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'qw-1', name: 'Qwen Code', endpoint: 'cli://qwen-code', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'goose',
    name: 'Goose AI',
    description: 'Block — Open-source AI agent for software development',
    icon: 'Bird',
    color: 'text-green-500',
    colorHex: '#22c55e',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'gs-1', name: 'Goose', endpoint: 'cli://goose', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'augment',
    name: 'Augment Code',
    description: 'Augment — AI-native IDE and coding agent',
    icon: 'Diamond',
    color: 'text-violet-500',
    colorHex: '#8b5cf6',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'aug-1', name: 'Augment', endpoint: 'cli://augment', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'codebuddy',
    name: 'CodeBuddy',
    description: 'CodeBuddy — AI pair programmer',
    icon: 'Users',
    color: 'text-orange-400',
    colorHex: '#fb923c',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'cb-1', name: 'CodeBuddy', endpoint: 'cli://codebuddy', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'kimicli',
    name: 'Kimi CLI',
    description: 'Moonshot — Kimi command line interface',
    icon: 'Sparkles',
    color: 'text-rose-500',
    colorHex: '#e11d48',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'kc-1', name: 'Kimi CLI', endpoint: 'cli://kimi', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'GitHub — AI coding agent for IDE and terminal',
    icon: 'Github',
    color: 'text-white',
    colorHex: '#ffffff',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'ghc-1', name: 'Copilot', endpoint: 'ide://github-copilot', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'qoder',
    name: 'Qoder',
    description: 'Qoder CLI — Quick code generator',
    icon: 'Zap',
    color: 'text-teal-500',
    colorHex: '#14b8a6',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'qd-1', name: 'Qoder', endpoint: 'cli://qoder', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    description: 'Mistral AI — Vibe coding agent',
    icon: 'Waves',
    color: 'text-pink-400',
    colorHex: '#f472b6',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'mv-1', name: 'Mistral Vibe', endpoint: 'cli://mistral-vibe', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'kiro',
    name: 'Kiro',
    description: 'Kiro — AI development companion',
    icon: 'Hexagon',
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'kr-1', name: 'Kiro', endpoint: 'cli://kiro', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    description: 'Cursor — AI-native code editor agent mode',
    icon: 'MousePointer',
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'cu-1', name: 'Cursor Agent', endpoint: 'ide://cursor', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'Aider — AI pair programming with git integration',
    icon: 'GitBranch',
    color: 'text-green-400',
    colorHex: '#4ade80',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'aid-1', name: 'Aider', endpoint: 'cli://aider', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'continue',
    name: 'Continue',
    description: 'Continue — Open-source AI coding assistant',
    icon: 'Play',
    color: 'text-yellow-400',
    colorHex: '#facc15',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'cont-1', name: 'Continue', endpoint: 'ide://continue', status: 'disabled', healthScore: 0, modelCount: 3, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'supermaven',
    name: 'Supermaven',
    description: 'Supermaven — AI coding assistant with 1M token context',
    icon: 'Rocket',
    color: 'text-cyan-300',
    colorHex: '#67e8f9',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'sm-1', name: 'Supermaven', endpoint: 'ide://supermaven', status: 'disabled', healthScore: 0, modelCount: 1, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Windsurf (Codeium) — AI-native IDE with Cascade agent',
    icon: 'Wind',
    color: 'text-teal-300',
    colorHex: '#5eead4',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'ws-1', name: 'Windsurf', endpoint: 'ide://windsurf', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'tabnine',
    name: 'Tabnine',
    description: 'Tabnine — AI code completion and chat',
    icon: 'AlignLeft',
    color: 'text-indigo-300',
    colorHex: '#a5b4fc',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'tb-1', name: 'Tabnine', endpoint: 'ide://tabnine', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'replit',
    name: 'Replit Agent',
    description: 'Replit — AI coding agent in the cloud',
    icon: 'Cloud',
    color: 'text-orange-300',
    colorHex: '#fdba74',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'rp-1', name: 'Replit Agent', endpoint: 'cloud://replit', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'sourcegraph',
    name: 'Sourcegraph Cody',
    description: 'Sourcegraph — Cody AI coding assistant',
    icon: 'Search',
    color: 'text-red-400',
    colorHex: '#f87171',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'sg-1', name: 'Cody', endpoint: 'ide://cody', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'jetbrains-ai',
    name: 'JetBrains AI',
    description: 'JetBrains — AI Assistant built into IDE',
    icon: 'Boxes',
    color: 'text-purple-300',
    colorHex: '#c4b5fd',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'jb-1', name: 'JetBrains AI', endpoint: 'ide://jetbrains-ai', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q',
    description: 'Amazon Q Developer — AI coding assistant for AWS',
    icon: 'ShoppingCart',
    color: 'text-yellow-500',
    colorHex: '#eab308',
    category: 'coding',
    modelApis: [],
    instances: [
      { id: 'aq-1', name: 'Amazon Q', endpoint: 'ide://amazon-q', status: 'disabled', healthScore: 0, modelCount: 2, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Local / Self-Hosted ──
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local model runtime — optional, on-demand models',
    icon: 'HardDrive',
    color: 'text-green-500',
    colorHex: '#22c55e',
    category: 'local',
    modelApis: [],
    instances: [
      { id: 'o-1', name: 'Ollama Local', endpoint: 'http://localhost:11434', status: 'disabled', healthScore: 0, modelCount: 4, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  27 CHAT CHANNELS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAT_PLATFORMS: PlatformType[] = [
  // ── OpenClaw Channels ──
  {
    id: 'ch-openclaw-ws',
    name: 'OpenClaw WebSocket',
    description: 'Native WebSocket gateway to OpenClaw runtime. Bidirectional real-time stream.',
    icon: 'Wifi',
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-oc-ws-1', name: 'OpenClaw WS Gateway', endpoint: 'wss://gateway.openclaw.ai/v1/stream', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-openclaw-rest',
    name: 'OpenClaw REST',
    description: 'RESTful API endpoint for OpenClaw message exchange.',
    icon: 'Globe',
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-oc-rest-1', name: 'OpenClaw REST API', endpoint: 'https://gateway.openclaw.ai/v1/rest', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Hermes Channels (7) ──
  {
    id: 'ch-hermes-telegram',
    name: 'Hermes Telegram',
    description: 'Telegram Bot API integration via Hermes messaging layer.',
    icon: 'Send',
    color: 'text-sky-400',
    colorHex: '#38bdf8',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-tg-1', name: 'Telegram Bot', endpoint: 'https://api.telegram.org/bot', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-hermes-discord',
    name: 'Hermes Discord',
    description: 'Discord bot gateway integration via Hermes messaging layer.',
    icon: 'MessageSquare',
    color: 'text-indigo-400',
    colorHex: '#818cf8',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-dc-1', name: 'Discord Bot', endpoint: 'wss://gateway.discord.gg', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-hermes-slack',
    name: 'Hermes Slack',
    description: 'Slack App integration via Hermes messaging layer.',
    icon: 'Hash',
    color: 'text-purple-400',
    colorHex: '#a78bfa',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-sl-1', name: 'Slack App', endpoint: 'https://slack.com/api', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-hermes-whatsapp',
    name: 'Hermes WhatsApp',
    description: 'WhatsApp Business API integration via Hermes messaging layer.',
    icon: 'Smartphone',
    color: 'text-green-400',
    colorHex: '#4ade80',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-wa-1', name: 'WhatsApp Business', endpoint: 'https://graph.facebook.com/v18.0', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-hermes-signal',
    name: 'Hermes Signal',
    description: 'Signal Messenger integration via Hermes messaging layer.',
    icon: 'Radio',
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-sig-1', name: 'Signal Bridge', endpoint: 'signal://localhost', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'ch-hermes-email',
    name: 'Hermes Email',
    description: 'Email (IMAP/SMTP) integration via Hermes messaging layer.',
    icon: 'Mail',
    color: 'text-red-400',
    colorHex: '#f87171',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-em-1', name: 'Email IMAP/SMTP', endpoint: 'imap://mail.local', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-hermes-cli',
    name: 'Hermes CLI',
    description: 'Command-line interface channel via Hermes messaging layer.',
    icon: 'Terminal',
    color: 'text-gray-400',
    colorHex: '#9ca3af',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-hm-cli-1', name: 'Hermes CLI', endpoint: 'stdio://hermes', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },

  // ── Sylva Channels (3) ──
  {
    id: 'ch-sylva-ipc',
    name: 'Sylva IPC',
    description: 'Local Sylva orchestrator inter-process communication channel.',
    icon: 'Cpu',
    color: 'text-cyan-400',
    colorHex: '#22d3ee',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-sv-ipc-1', name: 'Sylva IPC', endpoint: 'ipc://sylva', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'ch-sylva-rest',
    name: 'Sylva REST',
    description: 'REST API endpoint for Sylva orchestrator.',
    icon: 'Globe',
    color: 'text-cyan-400',
    colorHex: '#22d3ee',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-sv-rest-1', name: 'Sylva REST', endpoint: 'http://localhost:8080/api', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-sylva-ws',
    name: 'Sylva WebSocket',
    description: 'WebSocket channel for real-time Sylva communication.',
    icon: 'Wifi',
    color: 'text-cyan-400',
    colorHex: '#22d3ee',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-sv-ws-1', name: 'Sylva WS', endpoint: 'ws://localhost:8080/ws', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Claude Code Channels (3) ──
  {
    id: 'ch-claude-rest',
    name: 'Claude REST Stream',
    description: 'Anthropic Claude API streaming endpoint. REST-based message stream.',
    icon: 'FileCode',
    color: 'text-orange-400',
    colorHex: '#fb923c',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-c-rest-1', name: 'Claude REST', endpoint: 'https://api.anthropic.com/v1/messages', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-claude-terminal',
    name: 'Claude Terminal',
    description: 'Claude Code terminal-based interactive channel.',
    icon: 'Terminal',
    color: 'text-orange-400',
    colorHex: '#fb923c',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-c-term-1', name: 'Claude Terminal', endpoint: 'pty://claude-code', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-claude-desktop',
    name: 'Claude Desktop',
    description: 'Claude Code desktop application channel.',
    icon: 'Monitor',
    color: 'text-orange-400',
    colorHex: '#fb923c',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-c-desk-1', name: 'Claude Desktop', endpoint: 'app://claude-desktop', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Codex Channels (2) ──
  {
    id: 'ch-codex-rest',
    name: 'Codex REST Stream',
    description: 'OpenAI Codex API streaming endpoint. REST-based message stream.',
    icon: 'FileCode',
    color: 'text-emerald-400',
    colorHex: '#34d399',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-cdx-rest-1', name: 'Codex REST', endpoint: 'https://api.openai.com/v1/chat/completions', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-codex-terminal',
    name: 'Codex Terminal',
    description: 'Codex CLI terminal-based interactive channel.',
    icon: 'Terminal',
    color: 'text-emerald-400',
    colorHex: '#34d399',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-cdx-term-1', name: 'Codex Terminal', endpoint: 'pty://codex', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── OpenCode Channels (4) ──
  {
    id: 'ch-opencode-terminal',
    name: 'OpenCode Terminal',
    description: 'OpenCode terminal-based text user interface channel.',
    icon: 'Terminal',
    color: 'text-pink-400',
    colorHex: '#f472b6',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ocd-term-1', name: 'OpenCode TUI', endpoint: 'pty://opencode', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-opencode-desktop',
    name: 'OpenCode Desktop',
    description: 'OpenCode native desktop application channel.',
    icon: 'Monitor',
    color: 'text-pink-400',
    colorHex: '#f472b6',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ocd-desk-1', name: 'OpenCode Desktop', endpoint: 'app://opencode', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-opencode-vscode',
    name: 'OpenCode VS Code',
    description: 'OpenCode Visual Studio Code extension channel.',
    icon: 'Code2',
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ocd-vsc-1', name: 'VS Code Extension', endpoint: 'ext://opencode-vscode', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-opencode-rest',
    name: 'OpenCode REST',
    description: 'OpenCode REST API channel for programmatic access.',
    icon: 'Globe',
    color: 'text-pink-400',
    colorHex: '#f472b6',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ocd-rest-1', name: 'OpenCode REST', endpoint: 'http://localhost:3000/api', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Droid Channels (3) ──
  {
    id: 'ch-droid-terminal',
    name: 'Droid Terminal',
    description: 'Droid terminal-based command-line channel.',
    icon: 'Terminal',
    color: 'text-indigo-400',
    colorHex: '#818cf8',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-dr-term-1', name: 'Droid Terminal', endpoint: 'pty://droid', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-droid-ide',
    name: 'Droid IDE Plugin',
    description: 'Droid IDE plugin channel (VS Code, Cursor, JetBrains, Vim, Zed).',
    icon: 'Code2',
    color: 'text-indigo-400',
    colorHex: '#818cf8',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-dr-ide-1', name: 'Droid IDE', endpoint: 'ext://droid-ide', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },
  {
    id: 'ch-droid-rest',
    name: 'Droid REST',
    description: 'Droid REST API channel for programmatic access.',
    icon: 'Globe',
    color: 'text-indigo-400',
    colorHex: '#818cf8',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-dr-rest-1', name: 'Droid REST', endpoint: 'http://localhost:4000/api', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Pi Channel ──
  {
    id: 'ch-pi-terminal',
    name: 'Pi Terminal',
    description: 'Pi minimal terminal channel. Lightweight, single-purpose.',
    icon: 'Terminal',
    color: 'text-rose-400',
    colorHex: '#fb7185',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-pi-term-1', name: 'Pi Terminal', endpoint: 'pty://pi', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: '' },
    ],
  },

  // ── Ollama Channels (2) ──
  {
    id: 'ch-ollama-local',
    name: 'Ollama Local Stream',
    description: 'Local Ollama server streaming endpoint. On-device inference.',
    icon: 'HardDrive',
    color: 'text-green-400',
    colorHex: '#4ade80',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ol-local-1', name: 'Ollama Local', endpoint: 'http://localhost:11434/api/chat', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
  {
    id: 'ch-ollama-rest',
    name: 'Ollama REST',
    description: 'Ollama REST API for local model inference.',
    icon: 'Globe',
    color: 'text-green-400',
    colorHex: '#4ade80',
    category: 'chat',
    modelApis: [],
    instances: [
      { id: 'ch-ol-rest-1', name: 'Ollama REST', endpoint: 'http://localhost:11434/api', status: 'disabled', healthScore: 0, modelCount: 0, agentCount: 0, latency: '—', uptime: '—', credentials: 'N/A' },
    ],
  },
]

// ── All 58 platforms ──
export const PLATFORMS: PlatformType[] = [...CLI_PLATFORMS, ...CHAT_PLATFORMS]

// ── Filter helpers ──
export const CLI_CODING_PLATFORMS = PLATFORMS.filter(p => p.category === 'cli' || p.category === 'coding')
export const CHAT_PLATFORMS_ALL = PLATFORMS.filter(p => p.category === 'chat')
export const LOCAL_PLATFORMS = PLATFORMS.filter(p => p.category === 'local')

// ── Dependencies (bundled in installer) ──
export const PLATFORM_DEPS: Record<string, string[]> = {
  'openclaw': ['Node.js 20+', 'pnpm', 'WebSocket client'],
  'hermes': ['Python 3.10+', 'SQLite', 'Telegram Bot API', 'Discord.py'],
  'sylva': ['Rust (aionrs)', 'SQLite', 'local IPC'],
  'aion-cli': ['Rust (aionrs)', 'SQLite'],
  'snow': ['Node.js 20+', 'npm'],
  'nanobot': ['Python 3.10+', 'pip', 'Anthropic SDK'],
  'claudecode': ['Node.js 20+', 'npm', 'Git', 'PTY (node-pty)'],
  'codex': ['Node.js 20+', 'npm', 'Rust (cloud sandbox)', 'Git'],
  'opencode': ['Node.js 20+', 'npm', 'Bun', 'Go (TUI)', 'LSP clients'],
  'droid': ['Node.js 20+', 'npm', 'Factory CLI', 'Git'],
  'pi': ['Node.js 20+', 'npm', 'Bun runtime'],
  'qwencode': ['Node.js 20+', 'npm', 'Dashscope SDK'],
  'goose': ['Node.js 20+', 'npm', 'OpenAI SDK'],
  'augment': ['Node.js 20+', 'npm', 'Augment IDE core'],
  'codebuddy': ['Node.js 20+', 'npm'],
  'kimicli': ['Node.js 20+', 'npm', 'Moonshot API client'],
  'github-copilot': ['VS Code extension host', 'GitHub auth'],
  'qoder': ['Node.js 20+', 'npm', 'Template engine'],
  'mistral-vibe': ['Node.js 20+', 'npm', 'Mistral SDK'],
  'kiro': ['Node.js 20+', 'npm'],
  'cursor-agent': ['Cursor IDE core', 'Node.js 20+'],
  'aider': ['Python 3.10+', 'pip', 'Git', 'aider-chat'],
  'continue': ['Node.js 20+', 'VS Code extension host'],
  'supermaven': ['Node.js 20+', 'IDE plugin host'],
  'windsurf': ['Node.js 20+', 'Windsurf IDE'],
  'tabnine': ['Node.js 20+', 'IDE plugin host'],
  'replit': ['Replit account', 'Cloud workspace'],
  'sourcegraph': ['Node.js 20+', 'Sourcegraph account'],
  'jetbrains-ai': ['JetBrains IDE', 'JetBrains account'],
  'amazon-q': ['AWS account', 'IDE plugin host'],
  'ollama': ['Ollama server', 'CUDA/ROCm (optional)', 'local models'],
}

// ── Icon mapping for lucide-react (string → component name) ──
// Usage in components: import * as Icons from 'lucide-react'; const Icon = Icons[iconName as keyof typeof Icons]
export const PLATFORM_ICONS = [
  'Zap', 'Sparkles', 'Cpu', 'Server', 'Snowflake', 'Bot', 'Terminal', 'Code2', 'Wrench',
  'Code', 'Bird', 'Diamond', 'Users', 'Github', 'Waves', 'Hexagon', 'MousePointer',
  'GitBranch', 'Play', 'Rocket', 'Wind', 'AlignLeft', 'Cloud', 'Search', 'Boxes',
  'ShoppingCart', 'HardDrive', 'Wifi', 'Globe', 'Send', 'MessageSquare', 'Hash',
  'Smartphone', 'Radio', 'Mail', 'FileCode', 'Monitor', 'Code2',
] as const

export type PlatformIconName = typeof PLATFORM_ICONS[number]
