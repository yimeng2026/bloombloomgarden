import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const BRIDGE_ACTIONS = new Set(["capabilities", "health", "lean_health", "lean_receipt", "lean_check"]);
const MAX_INPUT = 16_384;
const MAX_OUTPUT = 65_536;
const MAX_STDERR = 16_384;
const ENV_ALLOWLIST = [
  "PATH", "HOME", "USERPROFILE", "SystemRoot", "WINDIR", "PATHEXT",
  "GARDEN_ECOSYSTEM_PYTHON", "LEAN_EXECUTABLE",
] as const;

export interface BridgeResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: { type: string; message: string };
}

export interface BridgeOptions {
  root?: string;
  python?: string;
  timeoutMs?: number;
  id?: string;
  env?: NodeJS.ProcessEnv;
  spawnImplementation?: typeof spawn;
}

function rootDirectory(env: NodeJS.ProcessEnv): string {
  // External Python source is never part of this Next.js deployment package.
  if (env.GARDEN_ECOSYSTEM_ROOT) return env.GARDEN_ECOSYSTEM_ROOT;
  const cwd = process.cwd();
  const parent = cwd.split(/[\\/]/).includes(".worktrees") ? "../.." : "..";
  return `${cwd}/${parent}/garden-ecosystem`;
}

function childEnvironment(options: BridgeOptions, root: string): NodeJS.ProcessEnv {
  const source = options.env ?? process.env;
  const env: NodeJS.ProcessEnv = { NODE_ENV: source.NODE_ENV ?? process.env.NODE_ENV ?? "production" };
  for (const name of ENV_ALLOWLIST) {
    const value = source[name];
    if (typeof value === "string") env[name] = value;
  }
  env.PYTHONPATH = `${root}${path.sep}src`;
  env.GARDEN_ECOSYSTEM_ROOT = root;
  env.NO_COLOR = "1";
  return env;
}

function runProcess(payload: string, id: string, options: BridgeOptions): Promise<BridgeResponse> {
  const root = options.root ?? rootDirectory(options.env ?? process.env);
  const python = options.python ?? (options.env ?? process.env).GARDEN_ECOSYSTEM_PYTHON ?? "python";
  const spawnImplementation = options.spawnImplementation ?? spawn;
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawnImplementation(python, ["-m", "garden_ecosystem.service"], {
        cwd: /*turbopackIgnore: true*/ root,
        env: childEnvironment(options, root),
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      reject(new Error("unable to start bridge process"));
      return;
    }

    let stdout = "";
    let stderrBytes = 0;
    let timedOut = false;
    let tooLarge = false;
    let settled = false;
    const timeoutMs = options.timeoutMs ?? 10_000;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    timer.unref();

    const finish = (error?: Error, response?: BridgeResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else if (response) resolve(response);
    };

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) {
        tooLarge = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > MAX_STDERR) {
        tooLarge = true;
        child.kill("SIGTERM");
      }
    });
    child.on("error", () => finish(new Error("unable to start bridge process")));
    child.on("close", (code) => {
      if (timedOut) return finish(new Error("bridge process timed out"));
      if (tooLarge) return finish(new Error("bridge output too large"));
      if (code !== 0) return finish(new Error(`bridge process exited with code ${code}`));
      try {
        const response = JSON.parse(stdout) as BridgeResponse;
        if (!response || typeof response !== "object" || Array.isArray(response) || typeof response.ok !== "boolean") {
          return finish(new Error("invalid bridge response"));
        }
        if (response.id !== id) return finish(new Error("mismatched response id"));
        finish(undefined, response);
      } catch {
        finish(new Error("invalid JSON from bridge process"));
      }
    });
    try {
      if (!child.stdin) throw new Error("stdin unavailable");
      child.stdin.write(payload);
      child.stdin.end();
    } catch {
      child.kill("SIGTERM");
      finish(new Error("unable to write bridge request"));
    }
  });
}

export async function invokeBridge(
  action: string,
  params: Record<string, unknown> = {},
  options: BridgeOptions = {},
): Promise<BridgeResponse> {
  if (!BRIDGE_ACTIONS.has(action)) throw new TypeError("unsupported bridge action");
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new TypeError("bridge params must be an object");
  }
  if (options.timeoutMs !== undefined && options.timeoutMs <= 0) {
    throw new TypeError("timeout must be positive");
  }
  const id = options.id ?? randomUUID();
  const payload = JSON.stringify({ id, action, params });
  if (Buffer.byteLength(payload) > MAX_INPUT) throw new TypeError("bridge request too large");
  return runProcess(payload, id, options);
}
