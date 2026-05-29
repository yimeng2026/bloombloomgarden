import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  embeddingModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  kbId: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
}

export class KnowledgeService extends EventEmitter {
  private kbs = new Map<string, KnowledgeBase>();
  private documents = new Map<string, KnowledgeDocument>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async createKB(data: { name: string; description?: string; embeddingModel?: string }): Promise<KnowledgeBase> {
    if (this.prisma) {
      const raw = await this.prisma.knowledgeBase.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description,
          embeddingModel: data.embeddingModel,
        },
      });
      const kb = { ...raw, documentIds: [] };
      this.emit('kb:created', kb);
      return kb;
    }
    const kb: KnowledgeBase = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      documentIds: [],
      embeddingModel: data.embeddingModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.kbs.set(kb.id, kb);
    this.emit('kb:created', kb);
    return kb;
  }

  async getKB(id: string): Promise<KnowledgeBase | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.knowledgeBase.findUnique({ where: { id } });
      if (!raw) return undefined;
      const docs = await this.prisma.document.findMany({ where: { kbId: id } });
      return { ...raw, documentIds: docs.map(d => d.id) };
    }
    return this.kbs.get(id);
  }

  async listKBs(): Promise<KnowledgeBase[]> {
    if (this.prisma) {
      const raws = await this.prisma.knowledgeBase.findMany({ orderBy: { createdAt: 'desc' } });
      return raws.map(raw => ({ ...raw, documentIds: [] }));
    }
    return Array.from(this.kbs.values());
  }

  async updateKB(id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    if (this.prisma) {
      try {
        const { documentIds, ...prismaData } = data;
        const raw = await this.prisma.knowledgeBase.update({ where: { id }, data: prismaData as any });
        return { ...raw, documentIds: [] };
      } catch {
        return undefined;
      }
    }
    const kb = this.kbs.get(id);
    if (!kb) return undefined;
    Object.assign(kb, data, { updatedAt: new Date() });
    return kb;
  }

  async deleteKB(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.document.deleteMany({ where: { kbId: id } });
        await this.prisma.knowledgeBase.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }
    const kb = this.kbs.get(id);
    if (!kb) return false;
    for (const docId of kb.documentIds) {
      this.documents.delete(docId);
    }
    return this.kbs.delete(id);
  }

  async addDocument(kbId: string, data: { title: string; content: string; contentType?: string; source?: string; metadata?: Record<string, unknown> }): Promise<KnowledgeDocument> {
    if (this.prisma) {
      const raw = await this.prisma.document.create({
        data: {
          id: crypto.randomUUID(),
          kbId,
          title: data.title,
          content: data.content,
          metadata: JSON.stringify(data.metadata || {}),
        },
      });
      const doc: KnowledgeDocument = { ...raw, metadata: JSON.parse(raw.metadata || '{}') };
      this.emit('document:added', doc);
      return doc;
    }
    const doc: KnowledgeDocument = {
      id: crypto.randomUUID(),
      kbId,
      title: data.title,
      content: data.content,
      metadata: data.metadata || {},
      createdAt: new Date(),
    };
    this.documents.set(doc.id, doc);
    const kb = this.kbs.get(kbId);
    if (kb) {
      kb.documentIds.push(doc.id);
      kb.updatedAt = new Date();
    }
    this.emit('document:added', doc);
    return doc;
  }

  async deleteDocument(kbId: string, docId: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.document.delete({ where: { id: docId } });
        return true;
      } catch {
        return false;
      }
    }
    const kb = this.kbs.get(kbId);
    if (kb) {
      kb.documentIds = kb.documentIds.filter(id => id !== docId);
      kb.updatedAt = new Date();
    }
    return this.documents.delete(docId);
  }

  async search(kbId: string, query: string): Promise<KnowledgeDocument[]> {
    if (this.prisma) {
      const docs = await this.prisma.document.findMany({
        where: {
          kbId,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
      });
      return docs.map(d => ({ ...d, metadata: JSON.parse(d.metadata || '{}') }));
    }
    const kb = this.kbs.get(kbId);
    if (!kb) return [];
    const docs = kb.documentIds.map(id => this.documents.get(id)).filter(Boolean) as KnowledgeDocument[];
    const q = query.toLowerCase();
    return docs.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
  }
}
