import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  maxConcurrentAgents: number;
  defaultTimeout: number;
  autoSave: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: Record<string, boolean>;
}

export class SettingsService extends EventEmitter {
  private cache: Settings = {
    theme: 'system',
    language: 'zh-CN',
    maxConcurrentAgents: 10,
    defaultTimeout: 300000,
    autoSave: true,
    logLevel: 'info',
    features: {
      experimentalBlueprints: false,
      advancedIntervention: true,
      multiBackend: true,
      sseRealtime: true,
    },
  };

  constructor(private prisma?: PrismaClient) {
    super();
    if (prisma) this.loadFromDb();
  }

  private async loadFromDb(): Promise<void> {
    if (!this.prisma) return;
    const raw = await this.prisma.settings.findUnique({ where: { id: 'default' } });
    if (raw) {
      this.cache = {
        theme: raw.theme as any,
        language: raw.language,
        maxConcurrentAgents: raw.maxConcurrentAgents,
        defaultTimeout: raw.defaultTimeout,
        autoSave: raw.autoSave,
        logLevel: raw.logLevel as any,
        features: JSON.parse(raw.features || '{}'),
      };
    }
  }

  async get(): Promise<Settings> {
    return { ...this.cache };
  }

  async update(partial: Partial<Settings>): Promise<Settings> {
    Object.assign(this.cache, partial);
    if (this.prisma) {
      await this.prisma.settings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          ...this.toDb(this.cache),
        },
        update: this.toDb(this.cache),
      });
    }
    this.emit('settings:updated', this.cache);
    return { ...this.cache };
  }

  private toDb(settings: Settings): any {
    return {
      theme: settings.theme,
      language: settings.language,
      maxConcurrentAgents: settings.maxConcurrentAgents,
      defaultTimeout: settings.defaultTimeout,
      autoSave: settings.autoSave,
      logLevel: settings.logLevel,
      features: JSON.stringify(settings.features),
    };
  }

  async updateFeature(key: string, enabled: boolean): Promise<Settings> {
    this.cache.features[key] = enabled;
    return this.update({ features: this.cache.features });
  }

  getThemes(): string[] {
    return ['light', 'dark', 'system'];
  }

  getLanguages(): string[] {
    return ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
  }
}
