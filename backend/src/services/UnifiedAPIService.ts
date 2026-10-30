import { EventEmitter } from 'events';
import { getBackendRouter } from './BackendRouter';

export interface BackendConfig {
  id: 'kimi-code';
  provider: 'kimi';
  name: 'Kimi';
  baseUrl: string;
  model: 'kimi-for-coding';
  enabled: boolean;
}

/** Kimi-only registry. Client-supplied provider credentials are never stored. */
export class UnifiedAPIService extends EventEmitter {
  private backend: BackendConfig;

  constructor() {
    super();
    const baseUrl = process.env.KIMI_BASE_URL || process.env.KIMI_CODE_BASE_URL || 'https://api.kimi.com/coding/v1';
    this.backend = {
      id: 'kimi-code',
      provider: 'kimi',
      name: 'Kimi',
      baseUrl,
      model: 'kimi-for-coding',
      enabled: Boolean(process.env.KIMI_API_KEY || process.env.KIMI_CODE_API_KEY),
    };
  }

  async detectProvider(url: string): Promise<{ provider: string; confidence: number }> {
    return /(?:kimi\.com|moonshot\.(?:cn|ai))/i.test(url)
      ? { provider: 'kimi', confidence: 1 }
      : { provider: 'unknown', confidence: 0 };
  }

  async addBackend(config: { provider: string }): Promise<BackendConfig> {
    if (!['kimi', 'kimi-code'].includes(config.provider)) {
      throw new Error('Kimi-only mode: other providers cannot be registered');
    }
    return this.backend;
  }

  async listBackends(): Promise<BackendConfig[]> {
    return [this.backend];
  }

  async validateBackend(id: string): Promise<{ valid: boolean; error?: string; latency?: number }> {
    if (id !== 'kimi-code') return { valid: false, error: 'Only kimi-code is supported' };
    const details = await getBackendRouter().listBackendsDetailed();
    if (details.length === 0) return { valid: false, error: 'KIMI_API_KEY is not configured' };
    return {
      valid: details[0].healthy,
      latency: details[0].latency,
      ...(details[0].healthy ? {} : { error: 'Kimi health probe failed' }),
    };
  }
}
