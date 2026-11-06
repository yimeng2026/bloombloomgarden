import fs from "node:fs";
import path from "node:path";

/** Resolve dependency roots without exposing credentials or changing project scripts. */
export function runtimeNodePath(rootDir, environment = process.env) {
  const roots = ["node_modules", path.join("backend", "node_modules")]
    .map((directory) => path.join(rootDir, directory))
    .filter((directory) => fs.existsSync(directory))
    .map((directory) => fs.realpathSync(directory));
  if (environment.NODE_PATH) roots.push(environment.NODE_PATH);
  return [...new Set(roots)].join(path.delimiter);
}
