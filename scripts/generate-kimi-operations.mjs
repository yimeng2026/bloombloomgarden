import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "src", "lib", "generated", "kimi-operations.json");
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const operations = [];
const seen = new Set();

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function riskFor(method, routePath) {
  const sensitive = /(auth|apikeys?|security|settings|backups|processes|external|chat-accounts|unified-api\/config|\/init\b|sync|execute)/i.test(routePath);
  if (method === "GET") return sensitive ? "sensitive-read" : "read";
  return method === "DELETE" || sensitive ? "dangerous" : "write";
}

function add(service, method, routePath, source) {
  const normalized = `/${routePath.split("/").filter(Boolean).join("/")}`;
  if (normalized.startsWith("/api/kimi-control") || normalized.startsWith("/api/kimi-agent")) return;
  const id = `${service}:${method}:${normalized}`;
  if (seen.has(id)) return;
  seen.add(id);
  operations.push({
    id,
    service,
    method,
    path: normalized,
    risk: riskFor(method, normalized),
    source,
  });
}

const appApiRoot = path.join(root, "src", "app", "api");
for (const file of walk(appApiRoot)) {
  if (file.endsWith("route.ts") === false) continue;
  const relative = path.relative(path.join(root, "src", "app"), file).replaceAll("\\", "/");
  const segments = relative.split("/").filter((part) => !/^\(.*\)$/.test(part));
  segments.pop();
  const routePath = `/${segments.join("/")}`;
  const source = fs.readFileSync(file, "utf-8");
  let count = 0;
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) {
    add("research", match[1], routePath, path.relative(root, file).replaceAll("\\", "/"));
    count += 1;
  }
  if (count === 0) throw new Error(`No HTTP exports found in ${file}`);
}

const backendRoot = path.join(root, "backend", "src");
const backendAppPath = path.join(backendRoot, "app.ts");
const backendApp = fs.readFileSync(backendAppPath, "utf-8");
const imports = new Map();
for (const match of backendApp.matchAll(/import\s+(\w+Router)\s+from\s+['"]\.\/routes\/([^'"]+)['"]/g)) {
  imports.set(match[1], match[2]);
}
for (const match of backendApp.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi)) {
  add("backend", match[1].toUpperCase(), match[2], "backend/src/app.ts");
}
let mountedRouters = 0;
for (const match of backendApp.matchAll(/app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+Router)\s*\)/g)) {
  const mount = match[1];
  const routerName = match[2];
  const routeName = imports.get(routerName);
  if (!routeName) throw new Error(`Missing import for mounted ${routerName}`);
  const routeFile = path.join(backendRoot, "routes", `${routeName}.ts`);
  const source = fs.readFileSync(routeFile, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  let count = 0;
  for (const route of source.matchAll(/\brouter\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi)) {
    const suffix = route[2] === "/" ? "" : route[2];
    add("backend", route[1].toUpperCase(), `${mount}${suffix}`, `backend/src/routes/${routeName}.ts`);
    count += 1;
  }
  if (count === 0) {
    throw new Error(`No router.<method> routes found in ${routeFile}; extend the generator explicitly`);
  }
  mountedRouters += 1;
}

operations.sort((a, b) => a.id.localeCompare(b.id));
const document = {
  schemaVersion: 1,
  services: {
    research: "same-origin Next.js route handlers",
    backend: "GARDEN_BACKEND_URL (default http://127.0.0.1:3001)",
  },
  operations,
};
const serialized = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf-8") : "";
  if (existing !== serialized) {
    console.error("Kimi operation catalog is stale; run node scripts/generate-kimi-operations.mjs");
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized, "utf-8");
}
console.log(`Kimi catalog: ${operations.length} operations (${mountedRouters} backend routers)`);
