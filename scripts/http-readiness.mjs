export async function waitForHttpReady({
  origin,
  fetchImpl = fetch,
  attempts = 6,
  delayMs = 250,
  timeoutMs = 2000,
}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(`${origin}/`, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return;
      lastError = new Error(`Readiness probe returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const detail = lastError?.cause?.code || lastError?.cause?.message || lastError?.message || String(lastError);
  throw new Error(`Research service did not become ready: ${detail}`, { cause: lastError });
}
