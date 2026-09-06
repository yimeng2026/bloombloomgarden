/**
 * Kimi 网关接入层（救援通道 / 首选 Provider）
 *
 * 背景：.env 中的 GLM51_API_KEY_1..10 已全部失效（401），
 * KIMI_CODE_API_KEY_1 为占位符。运行环境变量中提供了可用的 Kimi 网关：
 *   - KIMI_API_KEY   （sk-kimi- 开头）
 *   - KIMI_BASE_URL  （如 https://agent-gw.kimi.com/coding）
 *
 * 约束（实测）：
 *   - OpenAI 兼容格式：POST {base}/v1/chat/completions，Bearer 认证
 *   - model 固定为 "kimi-for-coding"
 *   - 该网关仅允许 temperature=1，传其他值会 400
 *   - 响应 message 中含 reasoning_content 字段（思考过程）
 *
 * 安全约定：绝不硬编码密钥、绝不在日志中打印密钥。
 */

export interface KimiGatewayConfig {
  apiKey: string;
  /** 去除尾部斜杠的 base URL */
  baseUrl: string;
  /** {base}/v1/chat/completions */
  chatUrl: string;
  /** 固定模型 */
  model: string;
  /** 网关唯一允许的温度 */
  temperature: 1;
}

export const KIMI_GATEWAY_MODEL = "kimi-for-coding";

/**
 * 读取运行环境变量，返回 Kimi 网关配置；未配置时返回 null。
 * 仅读取 process.env.KIMI_API_KEY / KIMI_BASE_URL，不做任何日志输出。
 */
export function getKimiGateway(): KimiGatewayConfig | null {
  const apiKey = process.env.KIMI_API_KEY?.trim();
  const rawBase = process.env.KIMI_BASE_URL?.trim();
  if (!apiKey || !rawBase) return null;
  const baseUrl = rawBase.replace(/\/+$/, "");
  // 防双重 /v1：base 可能已带 /v1（如 https://agent-gw.kimi.com/coding/v1），
  // 实测 `${base}/v1/chat/completions` 在已带 /v1 时返回 404。
  const v1Base = /\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
  return {
    apiKey,
    baseUrl,
    chatUrl: `${v1Base}/chat/completions`,
    model: KIMI_GATEWAY_MODEL,
    temperature: 1,
  };
}

/** Kimi 网关是否可用（已配置环境变量） */
export function kimiGatewayAvailable(): boolean {
  return getKimiGateway() !== null;
}
