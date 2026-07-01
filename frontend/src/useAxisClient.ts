// DEPRECATED: 使用 axis-migration.ts 替代
// 保留此文件以避免import错误，实际功能已迁移
import { useRef, useCallback, useEffect, useMemo } from 'react';

export interface AxisClientConfig {
  endpoint?: string;
  token?: string;
}

export interface AxisMessageReply {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AxisStreamChunk {
  type: 'data' | 'error' | 'done';
  payload?: unknown;
}

export interface AxisCoordinate {
  x: string;
  y: string;
  z: string;
}

export interface AxisMessage {
  payload: {
    action: string;
    entity: string;
    data?: unknown;
  };
}

// 简化stub实现，避免编译错误
class AxisClient {
  constructor(_config: AxisClientConfig) {}
  close() {}
  async send(_target: AxisCoordinate, _action: string, _entity: string, _data: unknown, _opts?: unknown): Promise<AxisMessageReply> {
    return { success: true };
  }
  async sendStream(_target: AxisCoordinate, _action: string, _entity: string, _data: unknown, _onChunk: (chunk: AxisStreamChunk) => void, _opts?: unknown): Promise<void> {}
  async emit(_target: AxisCoordinate, _action: string, _entity: string, _data: unknown, _opts?: unknown): Promise<void> {}
}

/** @deprecated 请使用 axis-migration.ts 中的 fetch API */
export function useAxisClient(config: AxisClientConfig) {
  const clientRef = useRef<AxisClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new AxisClient(config);
  }

  const client = clientRef.current;

  useEffect(() => {
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [client]);

  /** RPC call */
  const send = useCallback(
    (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
    ): Promise<AxisMessageReply> => {
      return client.send(target, action, entity, data, opts);
    },
    [client]
  );

  /** Stream call */
  const sendStream = useCallback(
    (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      onChunk: (chunk: AxisStreamChunk) => void,
      opts?: { priority?: number; ttl?: number; metadata?: Record<string, unknown> }
    ): Promise<void> => {
      return client.sendStream(target, action, entity, data, onChunk, opts);
    },
    [client]
  );

  /** One-way emit */
  const emit = useCallback(
    (
      target: AxisCoordinate,
      action: AxisMessage['payload']['action'],
      entity: AxisMessage['payload']['entity'],
      data: unknown,
      opts?: { metadata?: Record<string, unknown> }
    ): Promise<void> => {
      return client.emit(target, action, entity, data, opts);
    },
    [client]
  );

  /** Module-specific helpers */
  const dialog = useMemo(
    () => ({
      create: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'dialog', z: 'ws' }, 'create', 'dialog', data, opts),
      sendMessage: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: Parameters<typeof send>[4]) =>
        sendStream({ x: 'backend-api', y: 'dialog', z: 'ws' }, 'invoke', 'dialog', data, onChunk, opts),
      getHistory: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', data, opts),
      attachFile: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'invoke', 'dialog', data, opts),
    }),
    [send, sendStream]
  );

  const agent = useMemo(
    () => ({
      create: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'create', 'agent', data, opts),
      get: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', data, opts),
      list: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', data, opts),
      update: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'update', 'agent', data, opts),
      delete: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'delete', 'agent', data, opts),
    }),
    [send]
  );

  const group = useMemo(
    () => ({
      create: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'create', 'group', data, opts),
      get: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', data, opts),
      list: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', data, opts),
      addAgent: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', data, opts),
      orchestrate: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: Parameters<typeof send>[4]) =>
        sendStream({ x: 'backend-api', y: 'group', z: 'ws' }, 'invoke', 'group', data, onChunk, opts),
    }),
    [send, sendStream]
  );

  const monitor = useMemo(
    () => ({
      getMetrics: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', data, opts),
      getLogs: (data: unknown, opts?: Parameters<typeof send>[4]) =>
        send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', data, opts),
      subscribeMetrics: (data: unknown, onChunk: (chunk: AxisStreamChunk) => void, opts?: Parameters<typeof send>[4]) =>
        sendStream({ x: 'backend-api', y: 'monitor', z: 'sse' }, 'subscribe', 'monitor', data, onChunk, opts),
    }),
    [send, sendStream]
  );

  return {
    client,
    send,
    sendStream,
    emit,
    dialog,
    agent,
    group,
    monitor,
  };
}
