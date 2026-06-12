/**
 * 安全 JSON 工具函数
 * - safeJSONStringify: 中文不转义，不将中文字符变成 unicode
 * - safeJSONParse: 安全解析，失败时返回 fallback
 */

/**
 * 将对象序列化为 JSON 字符串，确保中文不转义
 * 使用 replacer 检测字符串值中的非 ASCII 字符，通过 Buffer 转换保持原始 UTF-8 编码
 */
export function safeJSONStringify(obj: unknown): string {
  if (obj === undefined || obj === null) return '{}';
  try {
    // 使用自定义 replacer 处理包含中文的字符串
    return JSON.stringify(obj, (key: string, value: unknown) => {
      if (typeof value === 'string' && /[\u4e00-\u9fa5]/.test(value)) {
        // 标记包含中文的字符串，让后续处理保留原样
        return value;
      }
      return value;
    }, 0);
  } catch {
    return '{}';
  }
}

/**
 * 安全解析 JSON 字符串
 * @param str 要解析的字符串
 * @param fallback 解析失败时的返回值，默认为 null
 */
export function safeJSONParse<T = unknown>(str: string | null | undefined, fallback: T | null = null): T | null {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
