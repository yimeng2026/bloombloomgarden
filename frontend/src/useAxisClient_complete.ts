// @ts-nocheck
/**
 * useAxisClient.ts — 3DACP React Hook（完整版）
 * DEPRECATED: 使用 axis-migration.ts 替代
 * 保留此文件以避免import错误，实际功能已迁移
 */

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';

export interface AxisClientConfig { endpoint?: string; token?: string; }
export interface AxisMessageReply { success: boolean; data?: unknown; error?: string; }
export interface AxisStreamChunk { type: 'data' | 'error' | 'done'; payload?: unknown; }
export interface AxisCoordinate { x: string; y: string; z: string; }
export interface AxisMessage { payload: { action: string; entity: string; data?: unknown; }; }

class AxisClient {
  constructor(_config: AxisClientConfig) {}
  close() {}
  async send(_t: AxisCoordinate, _a: string, _e: string, _d: unknown, _o?: unknown): Promise<AxisMessageReply> { return { success: true }; }
  async sendStream(_t: AxisCoordinate, _a: string, _e: string, _d: unknown, _c: (chunk: AxisStreamChunk) => void, _o?: unknown): Promise<void> {}
  async emit(_t: AxisCoordinate, _a: string, _e: string, _d: unknown, _o?: unknown): Promise<void> {}
}

/** @deprecated 请使用 axis-migration.ts 中的 fetch API */
export function useAxisClient(config: AxisClientConfig) {
  const clientRef = useRef<AxisClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  if (!clientRef.current) {
    clientRef.current = new AxisClient(config);
  }

  const client = clientRef.current;

  useEffect(() => {
    // 初始连接检测
    const check = async () => {
      try {
        await client.send(
          { x: 'backend-api', y: 'monitor', z: 'rest' },
          'read',
          'monitor',
          { ping: true }
        );
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };
    check();

    // 定期心跳
    const interval = setInterval(check, 30000);
    return () => {
      clearInterval(interval);
      client.close();
      clientRef.current = null;
    };
  }, [client]);

  const wrapLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const r = await fn();
        setIsConnected(true);
        return r;
      } catch (e) {
        setError(e as Error);
        setIsConnected(false);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const send = useCallback(
    async (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
    ): Promise<AxisMessageReply> => {
      return wrapLoading(() => client.send(target, action, entity, data, opts));
    },
    [client, wrapLoading]
  );

  const sendStream = useCallback(
    async (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      onChunk: (chunk: AxisStreamChunk) => void,
      opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
    ): Promise<void> => {
      return wrapLoading(() => client.sendStream(target, action, entity, data, onChunk, opts));
    },
    [client, wrapLoading]
  );

  const emit = useCallback(
    async (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      opts?: { metadata?: Record<string, unknown> }
    ): Promise<void> => {
      return wrapLoading(() => client.emit(target, action, entity, data, opts));
    },
    [client, wrapLoading]
  );

  const reconnect = useCallback(() => {
    client.close();
    clientRef.current = new AxisClient(config);
    setIsConnected(false);
    setError(null);
  }, [config, client]);

  // ── 模块快捷调用 ──

  const dialog = useMemo(
    () => ({
      create: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'create', 'dialog', data, opts),
      sendMessage: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: any) =>
        sendStream({ x: 'backend-api', y: 'dialog', z: 'ws' }, 'invoke', 'dialog', data, onChunk, opts),
      getHistory: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', data, opts),
      attachFile: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'invoke', 'dialog', data, opts),
      clearContext: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'delete', 'dialog', data, opts),
    }),
    [send, sendStream]
  );

  const agent = useMemo(
    () => ({
      create: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'create', 'agent', data, opts),
      get: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', data, opts),
      list: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', data, opts),
      update: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'update', 'agent', data, opts),
      delete: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'delete', 'agent', data, opts),
      pause: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { ...data, action: 'pause' }, opts),
      resume: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { ...data, action: 'resume' }, opts),
      isolate: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { ...data, action: 'isolate' }, opts),
      inject: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { ...data, action: 'inject' }, opts),
    }),
    [send]
  );

  const group = useMemo(
    () => ({
      create: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'create', 'group', data, opts),
      get: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', data, opts),
      list: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', data, opts),
      update: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', data, opts),
      delete: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'delete', 'group', data, opts),
      addAgent: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', { ...data, subAction: 'addAgent' }, opts),
      removeAgent: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', { ...data, subAction: 'removeAgent' }, opts),
      setCoordinator: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { ...data, action: 'setCoordinator' }, opts),
      nest: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { ...data, action: 'nest' }, opts),
      orchestrate: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: any) =>
        sendStream({ x: 'backend-api', y: 'group', z: 'ws' }, 'invoke', 'group', { ...data, action: 'orchestrate' }, onChunk, opts),
    }),
    [send, sendStream]
  );

  const knowledge = useMemo(
    () => ({
      list: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', data, opts),
      create: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'create', 'knowledge', data, opts),
      get: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', data, opts),
      update: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'update', 'knowledge', data, opts),
      delete: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'delete', 'knowledge', data, opts),
      addDocument: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { ...data, action: 'addDocument' }, opts),
      search: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { ...data, action: 'search' }, opts),
    }),
    [send]
  );

  const skill = useMemo(
    () => ({
      list: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'read', 'skill', data, opts),
      create: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'create', 'skill', data, opts),
      get: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'read', 'skill', data, opts),
      update: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'update', 'skill', data, opts),
      delete: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'delete', 'skill', data, opts),
    }),
    [send]
  );

  const monitor = useMemo(
    () => ({
      getMetrics: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', data, opts),
      getLogs: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', data, opts),
      subscribeMetrics: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: any) =>
        sendStream({ x: 'backend-api', y: 'monitor', z: 'sse' }, 'subscribe', 'monitor', data, onChunk, opts),
    }),
    [send, sendStream]
  );

  const platform = useMemo(
    () => ({
      list: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', data, opts),
      get: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', data, opts),
      health: (data: unknown, opts?: any) =>
        send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'invoke', 'platform', { ...data, action: 'health' }, opts),
    }),
    [send]
  );

  return {
    client,
    send,
    sendStream,
    emit,
    isConnected,
    isLoading,
    error,
    reconnect,
    dialog,
    agent,
    group,
    knowledge,
    skill,
    monitor,
    platform,
  };
}
