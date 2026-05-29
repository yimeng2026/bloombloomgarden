import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export interface Skill {
  id: string;
  name: string;
  description?: string;
  type: 'builtin' | 'custom' | 'external';
  config: Record<string, unknown>;
  enabled: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SkillService extends EventEmitter {
  private skills = new Map<string, Skill>();

  constructor(private prisma?: PrismaClient) {
    super();
    if (!prisma) this.initDefaults();
  }

  private initDefaults(): void {
    const builtins: Skill[] = [
      { id: 'skill-web-search', name: 'Web Search', type: 'builtin', config: {}, enabled: true, version: '1.0', createdAt: new Date(), updatedAt: new Date() },
      { id: 'skill-code-execution', name: 'Code Execution', type: 'builtin', config: {}, enabled: true, version: '1.0', createdAt: new Date(), updatedAt: new Date() },
      { id: 'skill-file-read', name: 'File Read', type: 'builtin', config: {}, enabled: true, version: '1.0', createdAt: new Date(), updatedAt: new Date() },
      { id: 'skill-image-gen', name: 'Image Generation', type: 'builtin', config: {}, enabled: false, version: '1.0', createdAt: new Date(), updatedAt: new Date() },
    ];
    for (const s of builtins) this.skills.set(s.id, s);
  }

  async create(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    if (this.prisma) {
      const raw = await this.prisma.skill.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description,
          type: data.type,
          config: JSON.stringify(data.config || {}),
          enabled: data.enabled,
          version: data.version || '1.0',
        },
      });
      const skill: Skill = { ...raw, config: JSON.parse(raw.config || '{}'), type: raw.type as Skill['type'] };
      this.emit('skill:created', skill);
      return skill;
    }
    const skill: Skill = { ...data, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    this.skills.set(skill.id, skill);
    this.emit('skill:created', skill);
    return skill;
  }

  async getById(id: string): Promise<Skill | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.skill.findUnique({ where: { id } });
      return raw ? { ...raw, config: JSON.parse(raw.config || '{}'), type: raw.type as Skill['type'] } : undefined;
    }
    return this.skills.get(id);
  }

  async list(): Promise<Skill[]> {
    if (this.prisma) {
      const raws = await this.prisma.skill.findMany({ orderBy: { createdAt: 'desc' } });
      return raws.map(r => ({ ...r, config: JSON.parse(r.config || '{}'), type: r.type as Skill['type'] }));
    }
    return Array.from(this.skills.values());
  }

  async updateConfig(id: string, config: Record<string, unknown>): Promise<Skill | undefined> {
    if (this.prisma) {
      try {
        const raw = await this.prisma.skill.update({
          where: { id },
          data: { config: JSON.stringify(config), updatedAt: new Date() },
        });
        return { ...raw, config, type: raw.type as Skill['type'] };
      } catch {
        return undefined;
      }
    }
    const skill = this.skills.get(id);
    if (!skill) return undefined;
    skill.config = { ...skill.config, ...config };
    skill.updatedAt = new Date();
    return skill;
  }

  async delete(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.skill.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }
    return this.skills.delete(id);
  }

  async getStatus(id: string): Promise<{ status: string; lastUsed?: Date } | undefined> {
    const skill = await this.getById(id);
    if (!skill) return undefined;
    return { status: skill.enabled ? 'active' : 'disabled' };
  }
}
