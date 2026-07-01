/**
 * AxisClient — 3DACP 前端统一客户端实现
 */

import type {
  AxisMessage,
  AxisMessageReply,
  AxisStreamChunk,
  AxisCoordinate,
  AxisClientConfig,
  AxisClientError,
  ProtocolLevel,
} from './types';

let _msgIdCounter = 0;
function generateMsgId(): string {
  return `${Date.now().toString(36)}-${(++_msgIdCounter).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export class AxisClient {
  private config: Required<AxisClientConfig>;
  private ws?: WebSocket;
  private wsReady = false;
  private wsQueue: string[] = [];
  private pendingRpc = new Map<string, {
    resolve: (reply: AxisMessageReply) => void;
    reject: (err: AxisClientError) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private streamListeners = new Map<string, (chunk: AxisStreamChunk) => void>();
  private sseSources = new Map<string, EventSource>();

  constructor(config: AxisClientConfig) {
    this.config = {
      timeout: 30000,
      retryCount: 2,
      preferredProtocol: 'rest',
      wsEndpoint: config.baseUrl.replace(/^http/, 'ws') + '/axis/ws',
      sseEndpoint: config.baseUrl + '/axis/stream',
      authToken: '',
      requestInterceptor: (m) => m,
      responseInterceptor: (r) => r,
      onError: () => {},
      ...config,
    };
  }

  // ───────────────────────── 核心发送 ─────────────────────────

  /** RPC 调用 */
  async send(
    target: AxisCoordinate,
    action: AxisMessage['payload']['action'],
    entity: AxisMessage['payload']['entity'],
    data: unknown,
    opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
  ): Promise<AxisMessageReply> {
    const msg = this.buildMessage(target, action, entity, data, opts);
    const protocol = this.selectProtocol(target, action);

    switch (protocol) {
      case 'ws':
        return this.sendViaWS(msg);
      case 'sse':
        return this.sendViaSSE(msg);
      default:
        return this.sendViaREST(msg);
    }
  }

  /** 流式调用 */
  async sendStream(
    target: AxisCoordinate,
    action: AxisMessage['payload']['action'],
    entity: AxisMessage['payload']['entity'],
    data: unknown,
    onChunk: (chunk: AxisStreamChunk) => void,
    opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const msg = this.buildMessage(target, action, entity, data, opts);
    const protocol = this.selectProtocol(target, action);

    switch (protocol) {
      case 'ws':
        return this.streamViaWS(msg, onChunk);
      case 'sse':
        return this.streamViaSSE(msg, onChunk);
      default:
        return this.streamViaREST(msg, onChunk);
    }
  }

  /** 单向发送 */
  async emit(
    target: AxisCoordinate,
    action: AxisMessage['payload']['action'],
    entity: AxisMessage['payload']['entity'],
    data: unknown,
    opts?: { metadata?: Record<string, unknown> }
  ): Promise<void> {
    const msg = this.buildMessage(target, action, entity, data, { ...opts, ttl: 5000 });
    msg.header.expectsReply = false;

    try {
      await this.sendViaREST(msg);
    } catch {
      // fire-and-forget, ignore error
    }
  }

  // ───────────────────────── 协议实现 ─────────────────────────

  private async sendViaREST(msg: AxisMessage): Promise<AxisMessageReply> {
    const res = await fetch(`${this.config.baseUrl}/axis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      },
      body: JSON.stringify(msg),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const reply = (await res.json()) as AxisMessageReply;
    return this.config.responseInterceptor(reply) as AxisMessageReply;
  }

  private sendViaWS(msg: AxisMessage): Promise<AxisMessageReply> {
    this.ensureWS();
    const msgId = msg.header.msgId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRpc.delete(msgId);
        reject(new Error('WS timeout') as unknown as AxisClientError);
      }, this.config.timeout);

      this.pendingRpc.set(msgId, { resolve, reject: reject as (err: AxisClientError) => void, timeout });

      const payload = JSON.stringify(msg);
      if (this.wsReady && this.ws) {
        this.ws.send(payload);
      } else {
        this.wsQueue.push(payload);
      }
    });
  }

  private sendViaSSE(msg: AxisMessage): Promise<AxisMessageReply> {
    return new Promise((resolve, reject) => {
      const correlationId = msg.header.msgId;
      const es = new EventSource(`${this.config.sseEndpoint}/response/${correlationId}`);
      this.sseSources.set(correlationId, es);

      const timeout = setTimeout(() => {
        es.close();
        this.sseSources.delete(correlationId);
        reject(new Error('SSE timeout') as unknown as AxisClientError);
      }, this.config.timeout);

      es.onmessage = (event) => {
        try {
          const reply = JSON.parse(event.data) as AxisMessageReply;
          clearTimeout(timeout);
          es.close();
          this.sseSources.delete(correlationId);
          resolve(this.config.responseInterceptor(reply) as AxisMessageReply);
        } catch (err) {
          clearTimeout(timeout);
          es.close();
          this.sseSources.delete(correlationId);
          reject(err as AxisClientError);
        }
      };

      es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        this.sseSources.delete(correlationId);
        reject(new Error('SSE error') as unknown as AxisClientError);
      };

      // 先发送 POST 请求
      fetch(`${this.config.baseUrl}/axis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify(msg),
      }).catch((err) => {
        clearTimeout(timeout);
        es.close();
        this.sseSources.delete(correlationId);
        reject(err as AxisClientError);
      });
    });
  }

  private async streamViaREST(msg: AxisMessage, onChunk: (chunk: AxisStreamChunk) => void): Promise<void> {
    const res = await fetch(`${this.config.baseUrl}/axis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      },
      body: JSON.stringify(msg),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Stream error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          try {
            const chunk = JSON.parse(trimmed.slice(5).trim()) as AxisStreamChunk;
            onChunk(chunk);
            if (chunk.isLast) return;
          } catch { /* ignore */ }
        }
      }
    }
  }

  private streamViaWS(msg: AxisMessage, onChunk: (chunk: AxisStreamChunk) => void): Promise<void> {
    this.ensureWS();
    const streamId = msg.header.msgId;
    this.streamListeners.set(streamId, onChunk);

    const payload = JSON.stringify(msg);
    if (this.wsReady && this.ws) {
      this.ws.send(payload);
    } else {
      this.wsQueue.push(payload);
    }

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!this.streamListeners.has(streamId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        this.streamListeners.delete(streamId);
        reject(new Error('WS stream timeout'));
      }, this.config.timeout);
    });
  }

  private streamViaSSE(msg: AxisMessage, onChunk: (chunk: AxisStreamChunk) => void): Promise<void> {
    const streamId = msg.header.msgId;
    const es = new EventSource(`${this.config.sseEndpoint}/stream/${streamId}`);
    this.sseSources.set(streamId, es);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        es.close();
        this.sseSources.delete(streamId);
        reject(new Error('SSE stream timeout'));
      }, this.config.timeout);

      es.onmessage = (event) => {
        try {
          const chunk = JSON.parse(event.data) as AxisStreamChunk;
          onChunk(chunk);
          if (chunk.isLast) {
            clearTimeout(timeout);
            es.close();
            this.sseSources.delete(streamId);
            resolve();
          }
        } catch {
          clearTimeout(timeout);
          es.close();
          this.sseSources.delete(streamId);
          reject(new Error('SSE parse error'));
        }
      };

      es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        this.sseSources.delete(streamId);
        reject(new Error('SSE stream error'));
      };

      fetch(`${this.config.baseUrl}/axis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify(msg),
      }).catch((err) => {
        clearTimeout(timeout);
        es.close();
        this.sseSources.delete(streamId);
        reject(err);
      });
    });
  }

  // ───────────────────────── WebSocket 连接管理 ─────────────────────────

  private ensureWS(): void {
    if (this.ws) return;

    this.ws = new WebSocket(this.config.wsEndpoint!);

    this.ws.onopen = () => {
      this.wsReady = true;
      for (const msg of this.wsQueue) {
        this.ws?.send(msg);
      }
      this.wsQueue = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // RPC 响应
        if (data.header?.correlationId && this.pendingRpc.has(data.header.correlationId)) {
          const pending = this.pendingRpc.get(data.header.correlationId)!;
          clearTimeout(pending.timeout);
          this.pendingRpc.delete(data.header.correlationId);
          if (data.status === 'error') {
            pending.reject(new Error(data.error?.message ?? 'WS error') as unknown as AxisClientError);
          } else {
            pending.resolve(data as AxisMessageReply);
          }
        }
        // 流式 chunk
        else if (data.streamId && this.streamListeners.has(data.streamId)) {
          const listener = this.streamListeners.get(data.streamId)!;
          listener(data as AxisStreamChunk);
          if (data.isLast) {
            this.streamListeners.delete(data.streamId);
          }
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.ws = undefined;
      this.wsReady = false;
      // 清理 pending
      for (const [id, pending] of this.pendingRpc) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('WebSocket closed') as unknown as AxisClientError);
      }
      this.pendingRpc.clear();
      this.streamListeners.clear();
    };

    this.ws.onerror = (err) => {
      this.config.onError(new Error('WebSocket error') as unknown as AxisClientError);
    };
  }

  // ───────────────────────── 工具 ─────────────────────────

  private buildMessage(
    target: AxisCoordinate,
    action: AxisMessage['payload']['action'],
    entity: AxisMessage['payload']['entity'],
    data: unknown,
    opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
  ): AxisMessage {
    const now = Date.now();
    return {
      version: '3dacp/v1',
      header: {
        msgId: generateMsgId(),
        source: this.config.defaultSource,
        target: { ...target, z: target.z ?? this.config.preferredProtocol },
        timestamp: now,
        priority: opts?.priority ?? 5,
        ttl: opts?.ttl ?? this.config.timeout,
        expectsReply: true,
        retryCount: 0,
        traceChain: [],
      },
      payload: {
        action,
        entity,
        data,
        metadata: opts?.metadata ?? {},
      },
      transport: {
        protocol: target.z ?? this.config.preferredProtocol,
        encoding: 'json',
        compressed: false,
      },
    };
  }

  private selectProtocol(target: AxisCoordinate, action: AxisMessage['payload']['action']): ProtocolLevel {
    // 如果目标已指定协议，尊重选择
    if (target.z) return target.z;

    // 流式操作优先 WebSocket
    if (action === 'stream' || action === 'subscribe') return 'ws';

    // 默认优先 REST
    return this.config.preferredProtocol;
  }

  /** 主动关闭所有连接 */
  close(): void {
    this.ws?.close();
    this.ws = undefined;
    this.wsReady = false;

    for (const es of this.sseSources.values()) {
      es.close();
    }
    this.sseSources.clear();

    for (const [id, pending] of this.pendingRpc) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client closed') as unknown as AxisClientError);
    }
    this.pendingRpc.clear();
    this.streamListeners.clear();
  }
}
