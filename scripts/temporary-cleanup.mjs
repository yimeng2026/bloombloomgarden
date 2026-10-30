import fs from "node:fs";
import path from "node:path";

export async function removeTemporaryDirectory({
  directory,
  root,
  attempts = 6,
  delayMs = 250,
  rmImpl = fs.rmSync,
  existsImpl = fs.existsSync,
}) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(directory);
  if (resolved === resolvedRoot || !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Temporary cleanup path escapes its allowed root");
  }
  if (!path.basename(resolved).startsWith("self-check-")) {
    throw new Error("Temporary cleanup only accepts self-check directories");
  }
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      rmImpl(resolved, { recursive: true, force: true });
      if (!existsImpl(resolved)) return;
      lastError = new Error("Temporary directory still exists after removal");
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
