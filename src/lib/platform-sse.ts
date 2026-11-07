export type PlatformEvent = Record<string, unknown>;

export interface ParsedSSEChunks {
  parsed: PlatformEvent[];
  remaining: string;
}

/** Parse complete data lines from an SSE buffer and retain an incomplete trailing line. */
export function parseSSEChunks(buffer: string): ParsedSSEChunks {
  const lines = buffer.split("\n");
  const parsed: PlatformEvent[] = [];
  let currentData = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("data: ")) {
      currentData = line.slice(6).trim();
    } else if (line === "" && currentData !== "") {
      if (currentData !== "[DONE]") {
        try {
          parsed.push(JSON.parse(currentData) as PlatformEvent);
        } catch {
          // 忽略不可解析的 JSON
        }
      }
      currentData = "";
    }
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine !== "" && lastLine.startsWith("data: ")) {
    return { parsed, remaining: lastLine };
  }
  if (currentData !== "" && lastLine === "") {
    return { parsed, remaining: "" };
  }
  return { parsed, remaining: "" };
}
