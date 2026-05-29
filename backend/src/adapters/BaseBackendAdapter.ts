import { EventEmitter } from 'events';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finishReason?: string;
}

export interface ChatChunk {
  id: string;
  content: string;
  finishReason?: string;
}

export interface BackendConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  timeout?: number;
}

export abstract class BaseBackendAdapter extends EventEmitter {
  protected config: BackendConfig;

  constructor(config: BackendConfig) {
    super();
    this.config = config;
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    return { status: 'healthy', latency: 0 };
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}
