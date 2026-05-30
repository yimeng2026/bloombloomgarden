import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Box, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Activity
} from 'lucide-react';

interface EcosystemNode {
  id: string;
  name: string;
  category: string;
  axis: 'X' | 'Y' | 'Z';
  status: 'active' | 'ready' | 'planned' | 'locked';
  protocols?: string[];
  description?: string;
}

const ECOSYSTEM_DATA: EcosystemNode[] = [
  // X轴 — 前端平台 (15个)
  { id: 'sylva-dashboard', name: 'Sylva Dashboard', category: 'native', axis: 'X', status: 'active', protocols: ['HTTP REST', 'WebSocket'], description: '千界花园原生前端' },
  { id: 'aion-ui', name: 'AION UI', category: 'desktop', axis: 'X', status: 'planned', protocols: ['ACP', 'OGP'], description: '原生多Agent协调' },
  { id: 'open-webui', name: 'Open WebUI', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'WebSocket'], description: '浏览器版ChatGPT' },
  { id: 'jan-ai', name: 'Jan AI', category: 'desktop', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'IPC'], description: '跨平台桌面客户端' },
  { id: 'librechat', name: 'LibreChat', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'MCP'], description: '统一对话界面' },
  { id: 'anythingllm', name: 'AnythingLLM', category: 'desktop', axis: 'X', status: 'planned', protocols: ['HTTP REST'], description: '企业RAG知识库' },
  { id: 'dify', name: 'Dify', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'Plugin'], description: 'LLMOps工作流编排' },
  { id: 'flowise', name: 'Flowise', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'LangChain'], description: '低代码拖拽构建' },
  { id: 'n8n', name: 'n8n', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'WebSocket'], description: '工作流自动化' },
  { id: 'langgraph-studio', name: 'LangGraph Studio', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'LangGraph'], description: '图结构Agent编排' },
  { id: 'lobechat', name: 'LobeChat', category: 'browser', axis: 'X', status: 'planned', protocols: ['HTTP REST', 'Plugin'], description: '现代化UI插件市场' },
  { id: 'cherry-studio', name: 'Cherry Studio', category: 'desktop', axis: 'X', status: 'planned', protocols: ['HTTP REST'], description: '国产开源知识库' },
  { id: 'chatbox', name: 'Chatbox', category: 'desktop', axis: 'X', status: 'planned', protocols: ['HTTP REST'], description: '轻量跨平台客户端' },
  { id: 'lm-studio-ui', name: 'LM Studio UI', category: 'desktop', axis: 'X', status: 'planned', protocols: ['Internal HTTP'], description: 'GUI与Server一体化' },
  { id: 'gpt4all-ui', name: 'GPT4All UI', category: 'desktop', axis: 'X', status: 'planned', protocols: ['Internal Protocol'], description: '隐私优先桌面' },

  // Y轴 — 后端/推理平台 (15个)
  { id: 'ollama', name: 'Ollama', category: 'local', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'OpenAI-compatible'], description: '本地模型管理100+' },
  { id: 'lm-studio', name: 'LM Studio Server', category: 'local', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: '本地模型服务器' },
  { id: 'vllm', name: 'vLLM', category: 'local', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'OpenAI-compatible'], description: '高性能推理引擎' },
  { id: 'localai', name: 'LocalAI', category: 'local', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'gRPC'], description: '通用模型适配层' },
  { id: 'openrouter', name: 'OpenRouter', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'Bearer Token'], description: '云端+本地混合路由' },
  { id: 'openai', name: 'OpenAI', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'GPT-4/Claude等' },
  { id: 'anthropic', name: 'Anthropic', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'Claude系列' },
  { id: 'moonshot', name: 'Moonshot/Kimi', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'Kimi智能助手' },
  { id: 'google', name: 'Google Gemini', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'Gemini系列' },
  { id: 'groq', name: 'Groq', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: '高速推理' },
  { id: 'fireworks', name: 'Fireworks', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: '快速推理' },
  { id: 'together', name: 'Together AI', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: '开源模型托管' },
  { id: 'deepseek', name: 'DeepSeek', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'DeepSeek系列' },
  { id: 'mistral', name: 'Mistral AI', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'Mistral系列' },
  { id: 'cohere', name: 'Cohere', category: 'cloud', axis: 'Y', status: 'active', protocols: ['HTTP REST', 'API Key'], description: 'Cohere系列' },

  // Z轴 — 子工具/CLI Agent (20个)
  { id: 'claude-code', name: 'Claude Code', category: 'coding', axis: 'Z', status: 'active', protocols: ['ACP', 'stdio'], description: 'Anthropic终端编程' },
  { id: 'codex-cli', name: 'Codex CLI', category: 'coding', axis: 'Z', status: 'active', protocols: ['ACP', 'stdio'], description: 'OpenAI代码生成' },
  { id: 'qwen-code', name: 'Qwen Code', category: 'coding', axis: 'Z', status: 'active', protocols: ['ACP', 'stdio'], description: '阿里代码助手' },
  { id: 'goose', name: 'Goose', category: 'coding', axis: 'Z', status: 'active', protocols: ['MCP', 'stdio'], description: 'Block出品Rust编写' },
  { id: 'openclaw', name: 'OpenClaw', category: 'agent', axis: 'Z', status: 'active', protocols: ['ACP', 'OGP'], description: '千界花园原生Agent' },
  { id: 'iflow', name: 'iFlow', category: 'workflow', axis: 'Z', status: 'active', protocols: ['HTTP'], description: '工作流引擎' },
  { id: 'hermes-agent', name: 'Hermes Agent', category: 'agent', axis: 'Z', status: 'ready', protocols: ['OGP', 'HTTP'], description: '联邦协议通信' },
  { id: 'aider', name: 'Aider', category: 'coding', axis: 'Z', status: 'ready', protocols: ['MCP', 'stdio'], description: '终端结对编程' },
  { id: 'continue-dev', name: 'Continue.dev', category: 'coding', axis: 'Z', status: 'ready', protocols: ['MCP', 'LSP'], description: '多IDE支持' },
  { id: 'roo-code', name: 'Roo Code', category: 'coding', axis: 'Z', status: 'ready', protocols: ['MCP', 'VSCode'], description: 'Cline分支' },
  { id: 'cline', name: 'Cline', category: 'coding', axis: 'Z', status: 'planned', protocols: ['MCP', 'VSCode'], description: 'VS Code插件代理' },
  { id: 'kimi-cli', name: 'Kimi CLI', category: 'coding', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '月之暗面CLI' },
  { id: 'mistral-vibe', name: 'Mistral Vibe', category: 'coding', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: 'Mistral CLI' },
  { id: 'augment-code', name: 'Augment Code', category: 'coding', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '代码增强' },
  { id: 'droid', name: 'Droid', category: 'automation', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '自动化Agent' },
  { id: 'pi', name: 'Pi', category: 'assistant', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '轻量助手' },
  { id: 'pool', name: 'Pool', category: 'collaboration', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '协作Agent' },
  { id: 'devika', name: 'Devika', category: 'software-engineering', axis: 'Z', status: 'planned', protocols: ['HTTP'], description: '软件工程Agent' },
  { id: 'crush', name: 'Crush', category: 'terminal', axis: 'Z', status: 'planned', protocols: ['ACP', 'stdio'], description: '终端编码' },
  { id: 'cursor-agent', name: 'Cursor Agent', category: 'coding', axis: 'Z', status: 'planned', protocols: ['MCP', 'IDE'], description: 'Cursor IDE' },
];

const STATUS_COLORS = {
  active: 'bg-green-500',
  ready: 'bg-blue-500',
  planned: 'bg-gray-400',
  locked: 'bg-red-400',
};

const STATUS_LABELS = {
  active: '运行中',
  ready: '就绪',
  planned: '规划中',
  locked: '锁定',
};

const AXIS_COLORS = {
  X: 'text-red-500',
  Y: 'text-blue-500',
  Z: 'text-green-500',
};

const AXIS_ICONS = {
  X: Box,
  Y: Layers,
  Z: Terminal,
};

export default function Ecosystem3DPage() {
  const [selectedAxis, setSelectedAxis] = useState<'all' | 'X' | 'Y' | 'Z'>('all');
  const [stats, setStats] = useState({ total: 0, active: 0, ready: 0, planned: 0 });

  useEffect(() => {
    const filtered = selectedAxis === 'all' 
      ? ECOSYSTEM_DATA 
      : ECOSYSTEM_DATA.filter(n => n.axis === selectedAxis);
    setStats({
      total: filtered.length,
      active: filtered.filter(n => n.status === 'active').length,
      ready: filtered.filter(n => n.status === 'ready').length,
      planned: filtered.filter(n => n.status === 'planned').length,
    });
  }, [selectedAxis]);

  const filteredNodes = selectedAxis === 'all' 
    ? ECOSYSTEM_DATA 
    : ECOSYSTEM_DATA.filter(n => n.axis === selectedAxis);

  const groupedByAxis = {
    X: ECOSYSTEM_DATA.filter(n => n.axis === 'X'),
    Y: ECOSYSTEM_DATA.filter(n => n.axis === 'Y'),
    Z: ECOSYSTEM_DATA.filter(n => n.axis === 'Z'),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">3D Agent 生态坐标系</h1>
          <p className="text-muted-foreground mt-1">
            千界花园 v1.0.0 — 完整架构视图 (50组件)
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="w-3 h-3" />
            {stats.active} 运行
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {stats.ready} 就绪
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Circle className="w-3 h-3" />
            {stats.planned} 规划
          </Badge>
        </div>
      </div>

      {/* Axis Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['X', 'Y', 'Z'] as const).map(axis => {
          const AxisIcon = AXIS_ICONS[axis];
          const nodes = groupedByAxis[axis];
          return (
            <Card 
              key={axis}
              className={`cursor-pointer transition-all ${selectedAxis === axis ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedAxis(selectedAxis === axis ? 'all' : axis)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AxisIcon className={`w-5 h-5 ${AXIS_COLORS[axis]}`} />
                  {axis === 'X' ? 'X轴 — 前端平台' : axis === 'Y' ? 'Y轴 — 后端推理' : 'Z轴 — 子工具'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{nodes.length}</div>
                <div className="text-sm text-muted-foreground">
                  {nodes.filter(n => n.status === 'active').length} 运行 / 
                  {nodes.filter(n => n.status === 'ready').length} 就绪 / 
                  {nodes.filter(n => n.status === 'planned').length} 规划
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button 
          variant={selectedAxis === 'all' ? 'default' : 'outline'} 
          onClick={() => setSelectedAxis('all')}
        >
          全部 (50)
        </Button>
        <Button 
          variant={selectedAxis === 'X' ? 'default' : 'outline'} 
          onClick={() => setSelectedAxis('X')}
          className="gap-1"
        >
          <Box className="w-4 h-4 text-red-500" /> X轴 (15)
        </Button>
        <Button 
          variant={selectedAxis === 'Y' ? 'default' : 'outline'} 
          onClick={() => setSelectedAxis('Y')}
          className="gap-1"
        >
          <Layers className="w-4 h-4 text-blue-500" /> Y轴 (15)
        </Button>
        <Button 
          variant={selectedAxis === 'Z' ? 'default' : 'outline'} 
          onClick={() => setSelectedAxis('Z')}
          className="gap-1"
        >
          <Terminal className="w-4 h-4 text-green-500" /> Z轴 (20)
        </Button>
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredNodes.map(node => (
          <Card key={node.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{node.name}</CardTitle>
                <Badge className={`${STATUS_COLORS[node.status]} text-white text-xs`}>
                  {STATUS_LABELS[node.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-bold ${AXIS_COLORS[node.axis]}`}>{node.axis}轴</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{node.category}</span>
              </div>
              <p className="text-sm text-muted-foreground">{node.description}</p>
              <div className="flex flex-wrap gap-1">
                {node.protocols?.map(p => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
