/** Extract only explicit answer text; reasoning fields are never a fallback. */
export function requireLlmText(content: unknown, provider: string): string {
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (!text.trim()) {
    throw new Error(`LLM 响应正文为空或缺少文本片段（provider=${provider}）`);
  }
  return text;
}
