import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { runtimeNodePath } from "./dev-node-path.mjs";

const root = path.resolve(import.meta.dirname, "..");
process.env.NODE_PATH = runtimeNodePath(root);
createRequire(import.meta.url)("module")._initPaths();
await import(pathToFileURL(path.join(root, "node_modules", "next", "dist", "bin", "next")).href);
