import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 3000).unref();
}

function launch(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
    shell: process.platform === "win32",
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`Failed to start ${command}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`Service exited (${signal || code}); stopping the other service`);
      stop(code || 1);
    }
  });
  return child;
}

launch(process.execPath, [nextCli, "dev", ...process.argv.slice(2)]);
launch(npm, ["--prefix", "backend", "run", "dev"], {
  BACKEND_PORT: process.env.BACKEND_PORT || "3001",
  HOST: process.env.HOST || "127.0.0.1",
});
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
