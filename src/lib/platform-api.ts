// ================================================================
// BloomBloomGarden 平台 API 客户端层
// Dify / Coze 真实 API 调用，流式 SSE 解析
// ================================================================

import type { AdapterStreamEvent } from "./platform-adapter";

// ===================== 类型定义 =====================

/** Dify 客户端配置 */
export interface DifyClientConfig {
  /** Dify API Key (Bearer Token) */
  apiKey: string;
  /** Dify 实例 Base URL，如 https://api.dify.ai/v1 */
  baseUrl: string;
}

/** Coze 客户端配置 */
export interface CozeClientConfig {
  /** Coze API Key (Bearer Token) */
  apiKey: string;
  /** Coze Bot ID */
  botId: string;
  /** Coze API Base URL，如 https://api.coze.com 或 https://api.coze.cn */
  baseUrl: string;
}

/** Dify 文件上传响应 */
export interface DifyUploadResponse {
  id: string;
  name: string;
  size: number;
  extension: string;
  mime_type: string;
  created_at: number;
}

// ===================== SSE 解析工具 =====================

/**
 * 逐行解析 SSE 数据块，提取 JSON 对象。
 * 返回当前已解析的完整 data 行数组，以及未完成的缓冲区。
 */
function parseSSEChunks(buffer: string): {
  parsed: unknown[];
  remaining: string;
} {
  const lines = buffer.split("\n");
  const parsed: unknown[] = [];
  let currentData = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("data: ")) {
      currentData = line.slice(6).trim();
    } else if (line === "" && currentData !== "") {
      // 空行表示一个 SSE 事件结束
      if (currentData !== "[DONE]") {
        try {
          parsed.push(JSON.parse(currentData));
        } catch {
          // 忽略不可解析的 JSON
        }
      }
      currentData = "";
    }
  }

  // 如果最后一行不是空行，保留未完成的 data 作为 remaining
  const lastLine = lines[lines.length - 1];
  if (lastLine !== "" && lastLine.startsWith("data: ")) {
    return { parsed, remaining: lastLine };
  }
  if (currentData !== "" && lastLine === "") {
    // 上一个 data 已结束（空行已处理），remaining 为空
    return { parsed, remaining: "" };
  }
  return { parsed, remaining: "" };
}

// ===================== Dify API Client =====================

/**
 * Dify 原生 API 客户端
 *
 * 端点：POST /chat-messages
 * 文档：https://docs.dify.ai/guides/application-publishing/chat-application
 */
export class DifyApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly platformId = "dify";
  private readonly platformName = "Dify";
  private readonly platformLogo = "🎨";

  constructor(config: DifyClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  /**
   * Dify 流式对话
   *
   * @param message - 用户输入消息
   * @param conversationId - 可选的会话 ID，用于保持上下文
   * @returns AsyncGenerator，yield 兼容 AdapterStreamEvent 的 SSE 事件
   *
   * 事件类型：
   * - `platform_status`：连接开始
   * - `token`：文本片段
   * - `done`：流结束，附带完整内容
   * - `error`：API 错误或网络异常
   */
  async *chatStream(
    message: string,
    conversationId?: string,
  ): AsyncGenerator<AdapterStreamEvent> {
    if (!this.apiKey) {
      yield {
        type: "error",
        error: "Dify API Key 未配置，请在设置中填写",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    yield {
      type: "platform_status",
      content: "🎨 Dify 连接中...",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/chat-messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {},
          query: message,
          response_mode: "streaming",
          conversation_id: conversationId,
          user: "bloombloomgarden-user",
        }),
      });
    } catch (e) {
      yield {
        type: "error",
        error: e instanceof Error ? e.message : "Dify 网络请求失败",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      yield {
        type: "error",
        error: `Dify API 错误 (${resp.status}): ${errText.slice(0, 200)}`,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      yield {
        type: "error",
        error: "无法获取 Dify 响应流",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let ended = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { parsed, remaining } = parseSSEChunks(buffer);
        buffer = remaining;

        for (const data of parsed) {
          const event = data as Record<string, any>;

          if (event.event === "message") {
            const msgObj = event.message as Record<string, unknown> | undefined;
            const answer =
              (event.answer as string) ||
              (msgObj?.answer as string) ||
              "";
            if (answer) {
              fullContent += answer;
              yield {
                type: "token",
                content: answer,
                platformId: this.platformId,
                platformName: this.platformName,
                platformLogo: this.platformLogo,
              };
            }
          } else if (event.event === "message_end") {
            ended = true;
            yield {
              type: "done",
              fullContent,
              platformId: this.platformId,
              platformName: this.platformName,
              platformLogo: this.platformLogo,
            };
            return;
          } else if (event.event === "error") {
            const errMsg =
              (event.message as string) ||
              (event.code as string) ||
              "Dify 流式响应错误";
            yield {
              type: "error",
              error: errMsg,
              platformId: this.platformId,
              platformName: this.platformName,
              platformLogo: this.platformLogo,
            };
            return;
          }
        }
      }

      if (!ended) {
        yield {
          type: "done",
          fullContent,
          platformId: this.platformId,
          platformName: this.platformName,
          platformLogo: this.platformLogo,
        };
      }
    } catch (e) {
      yield {
        type: "error",
        error: e instanceof Error ? e.message : "Dify 流式调用失败",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 上传文件到 Dify 知识库（文件上传接口）
   *
   * @param file - 浏览器 File 对象
   * @returns 上传结果，包含 file id
   *
   * 端点：POST /files/upload
   * 文档：https://docs.dify.ai/guides/knowledge-base/knowledge-request-upload
   */
  async uploadKnowledge(file: File): Promise<DifyUploadResponse> {
    if (!this.apiKey) {
      throw new Error("Dify API Key 未配置，请在设置中填写");
    }

    const formData = new FormData();
    formData.append("file", file);

    const resp = await fetch(`${this.baseUrl}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(
        `Dify 文件上传失败 (${resp.status}): ${errText.slice(0, 200)}`,
      );
    }

    return (await resp.json()) as DifyUploadResponse;
  }
}

// ===================== Coze API Client =====================

/**
 * Coze 原生 API 客户端
 *
 * 端点：POST /v3/chat
 * 文档：https://www.coze.com/docs/developer_guides/chat_v3
 */
export class CozeApiClient {
  private readonly apiKey: string;
  private readonly botId: string;
  private readonly baseUrl: string;
  private readonly platformId = "coze";
  private readonly platformName = "Coze";
  private readonly platformLogo = "🤖";

  constructor(config: CozeClientConfig) {
    this.apiKey = config.apiKey;
    this.botId = config.botId;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  /**
   * Coze 流式对话
   *
   * @param message - 用户输入消息
   * @param conversationId - 可选的会话 ID，用于保持上下文
   * @returns AsyncGenerator，yield 兼容 AdapterStreamEvent 的 SSE 事件
   *
   * 事件类型：
   * - `platform_status`：连接开始
   * - `token`：文本片段
   * - `done`：流结束，附带完整内容
   * - `error`：API 错误或网络异常
   */
  async *chatStream(
    message: string,
    conversationId?: string,
  ): AsyncGenerator<AdapterStreamEvent> {
    if (!this.apiKey) {
      yield {
        type: "error",
        error: "Coze API Key 未配置，请在设置中填写",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    yield {
      type: "platform_status",
      content: "🤖 Coze 连接中...",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/v3/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bot_id: this.botId,
          user_id: "bloombloomgarden-user",
          additional_messages: [
            { role: "user", content_type: "text", content: message },
          ],
          conversation_id: conversationId,
          stream: true,
        }),
      });
    } catch (e) {
      yield {
        type: "error",
        error: e instanceof Error ? e.message : "Coze 网络请求失败",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      yield {
        type: "error",
        error: `Coze API 错误 (${resp.status}): ${errText.slice(0, 200)}`,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      yield {
        type: "error",
        error: "无法获取 Coze 响应流",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let ended = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { parsed, remaining } = parseSSEChunks(buffer);
        buffer = remaining;

        for (const data of parsed) {
          const event = data as Record<string, any>;
          const eventName = (event.event as string) || "";
          const payload = (event.data as Record<string, any>) || event;

          if (eventName === "conversation.message.delta") {
            const nestedData = payload.data as Record<string, unknown> | undefined;
            const content =
              (payload.content as string) ||
              (nestedData?.content as string) ||
              "";
            if (content) {
              fullContent += content;
              yield {
                type: "token",
                content,
                platformId: this.platformId,
                platformName: this.platformName,
                platformLogo: this.platformLogo,
              };
            }
          } else if (eventName === "conversation.message.completed") {
            // 如果 assistant 消息完整返回，同步 fullContent
            if (
              payload.role === "assistant" &&
              (payload.content as string)
            ) {
              fullContent = payload.content as string;
            }
          } else if (eventName === "conversation.chat.completed") {
            ended = true;
            yield {
              type: "done",
              fullContent,
              platformId: this.platformId,
              platformName: this.platformName,
              platformLogo: this.platformLogo,
            };
            return;
          } else if (eventName === "conversation.chat.failed") {
            const lastError = payload.last_error as
              | { message?: string; code?: string }
              | undefined;
            yield {
              type: "error",
              error:
                lastError?.message ||
                lastError?.code ||
                "Coze 聊天失败",
              platformId: this.platformId,
              platformName: this.platformName,
              platformLogo: this.platformLogo,
            };
            return;
          }
        }
      }

      if (!ended) {
        yield {
          type: "done",
          fullContent,
          platformId: this.platformId,
          platformName: this.platformName,
          platformLogo: this.platformLogo,
        };
      }
    } catch (e) {
      yield {
        type: "error",
        error: e instanceof Error ? e.message : "Coze 流式调用失败",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
    } finally {
      reader.releaseLock();
    }
  }
}

// ===================== 工厂函数 =====================

/**
 * 创建 Dify API 客户端实例
 *
 * @param config - Dify 配置，包含 apiKey 和 baseUrl
 * @returns DifyApiClient 实例
 */
export function createDifyClient(config: DifyClientConfig): DifyApiClient {
  return new DifyApiClient(config);
}

/**
 * 创建 Coze API 客户端实例
 *
 * @param config - Coze 配置，包含 apiKey、botId 和 baseUrl
 * @returns CozeApiClient 实例
 */
export function createCozeClient(config: CozeClientConfig): CozeApiClient {
  return new CozeApiClient(config);
}
