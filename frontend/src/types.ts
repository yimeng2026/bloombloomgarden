/**
 * 前端 AxisClient — 3DACP 统一客户端
 * 支持 REST / SSE / WebSocket 自适应选择
 */

export type PlatformId = string;
export type ModuleId = 'dialog' | 'agent' | 'group' | 'knowledge' | 'skill' | 'monitor' | 'platform' | string;
export type ProtocolLevel = 'rest' | 'sse' | 'ws' | 'internal' | 'bridge';
export type ActionVerb = 'create' | 'read' | 'update' | 'delete' | 'invoke' | 'stream' | 'subscribe' | 'unsubscribe';

export interface AxisCoordinate {
  x: PlatformId;
  y: ModuleId;
  z?: ProtocolLevel;
}

export interface AxisMessageHeader {
  msgId: string;
  correlationId?: string;
  source: AxisCoordinate;
  target: AxisCoordinate;
  timestamp: number;
  priority: number;
  ttl: number;
  expectsReply: boolean;
  retryCount: number;
  traceChain: string[];
}

export interface AxisMessagePayload {
  action: ActionVerb;
  entity: ModuleId;
  data: unknown;
  metadata: Record<string, unknown>;
}

export interface AxisMessageTransport {
  protocol: ProtocolLevel;
  encoding: 'json' | 'msgpack';
  compressed: boolean;
}

export interface AxisMessage {
  version: '3dacp/v1';
  header: AxisMessageHeader;
  payload: AxisMessagePayload;
  transport: AxisMessageTransport;
}

export interface AxisMessageReply {
  version: '3dacp/v1';
  header: AxisMessageHeader;
  status: 'ok' | 'error' | 'partial' | 'stream';
  data: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface AxisStreamChunk {
  streamId: string;
  sequence: number;
  isLast: boolean;
  chunk: unknown;
  metadata?: Record<string, unknown>;
}

export interface AxisClientConfig {
  /** 后端 API 基础 URL */
  baseUrl: string;
  /** 默认源坐标 */
  defaultSource: AxisCoordinate;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 自动重试次数 */
  retryCount?: number;
  /** 默认协议偏好 */
  preferredProtocol?: ProtocolLevel;
  /** WebSocket 端点 */
  wsEndpoint?: string;
  /** SSE 端点 */
  sseEndpoint?: string;
  /** 认证 token */
  authToken?: string;
  /** 请求拦截器 */
  requestInterceptor?: (msg: AxisMessage) => AxisMessage | Promise<AxisMessage>;
  /** 响应拦截器 */
  responseInterceptor?: (reply: AxisMessageReply) => AxisMessageReply | Promise<AxisMessageReply>;
  /** 全局错误处理 */
  onError?: (err: AxisClientError) => void;
}

export class AxisClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public target?: AxisCoordinate,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AxisClientError';
  }
}
