import { EventEmitter } from 'events';

export interface BackendConfig {
  id: string;
  provider: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export class UnifiedAPIService extends EventEmitter {
  private backends = new Map<string, BackendConfig>();

  constructor() {
    super();
    this.initDefaults();
  }

  private initDefaults(): void {
    const defaults: BackendConfig[] = [
      { id: 'openai-default', provider: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o', enabled: true },
      { id: 'kimi-default', provider: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k', enabled: true },
      { id: 'claude-default', provider: 'claude', name: 'Claude', baseUrl: 'https://api.anthropic.com', model: 'claude-3-opus', enabled: true },
      { id: 'deepseek-default', provider: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', enabled: true },
      { id: 'ollama-default', provider: 'ollama', name: 'Ollama', baseUrl: 'http://localhost:11434', model: 'llama3', enabled: false },
    ];
    for (const b of defaults) this.backends.set(b.id, b);
  }

  async detectProvider(url: string): Promise<{ provider: string; confidence: number }> {
    const patterns: Record<string, RegExp> = {
      openai: /openai\.com/,
      kimi: /moonshot/,
      claude: /anthropic/,
      deepseek: /deepseek/,
      ollama: /11434|ollama/,
      azure: /azure/,
      gemini: /googleapis/,
    };
    for (const [provider, regex] of Object.entries(patterns)) {
      if (regex.test(url)) return { provider, confidence: 0.9 };
    }
    return { provider: 'unknown', confidence: 0 };
  }

  async addBackend(config: Omit<BackendConfig, 'id'>): Promise<BackendConfig> {
    const full: BackendConfig = { ...config, id: crypto.randomUUID() };
    this.backends.set(full.id, full);
    this.emit('backend:added', full);
    return full;
  }

  async listBackends(): Promise<BackendConfig[]> {
    return Array.from(this.backends.values());
  }

  async validateBackend(id: string): Promise<{ valid: boolean; error?: string }> {
    const backend = this.backends.get(id);
    if (!backend) return { valid: false, error: 'Backend not found' };
    // 简化验证，实际应发起健康检查请求
    return { valid: backend.enabled };
  }
}
