import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import { invokeBridge } from "../src/lib/garden-ecosystem.ts";
import { handleBridgeRequest } from "../src/app/api/garden-ecosystem/route.ts";

function fakeSpawn(responseFactory, captured) {
  return (command, args, options) => {
    captured.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      write(payload) { captured.request = JSON.parse(payload); },
      end() {},
    };
    child.killed = false;
    child.kill = () => {
      child.killed = true;
      queueMicrotask(() => child.emit("close", 0));
      return true;
    };
    queueMicrotask(() => responseFactory(child));
    return child;
  };
}

function optionsFor(responseFactory, captured = [], extra = {}) {
  return {
    id: "fixed-id",
    root: path.resolve("fixture-garden"),
    spawnImplementation: fakeSpawn(responseFactory, captured),
    ...extra,
  };
}

const respondWithRequest = (child) => {
  child.stdout.emit("data", JSON.stringify({
    id: "fixed-id", ok: true, result: { status: "unavailable" },
  }));
  child.emit("close", 0);
};

test("unknown action never starts a process", async () => {
  let spawned = false;
  await assert.rejects(invokeBridge("shell", {}, {
    spawnImplementation: () => { spawned = true; },
  }), /unsupported bridge action/);
  assert.equal(spawned, false);
});

test("oversized request never starts a process", async () => {
  let spawned = false;
  await assert.rejects(invokeBridge("health", { text: "x".repeat(17_000) }, {
    spawnImplementation: () => { spawned = true; },
  }), /too large/);
  assert.equal(spawned, false);
});

test("bridge uses whitelist env and module-only arguments", async () => {
  const captured = [];
  const root = path.resolve("fixture-garden");
  const result = await invokeBridge("capabilities", {}, optionsFor(respondWithRequest, captured, {
    env: { PATH: "safe-path", SECRET_TOKEN: "must-not-leak", API_KEY: "must-not-leak" },
  }));
  assert.equal(result.ok, true);
  assert.equal(captured.length, 1);
  const call = captured[0];
  assert.equal(call.args.join(" "), "-m garden_ecosystem.service");
  assert.equal(call.options.cwd, root);
  assert.equal(call.options.shell, false);
  assert.equal(call.options.env.PATH, "safe-path");
  assert.equal(call.options.env.PYTHONPATH, path.join(root, "src"));
  assert.equal(call.options.env.SECRET_TOKEN, undefined);
  assert.equal(call.options.env.API_KEY, undefined);
  assert.equal(captured.request.action, "capabilities");
  assert.equal(captured.request.id, "fixed-id");
});

test("default root ends at the sibling ecosystem directory", async () => {
  const captured = [];
  await invokeBridge("health", {}, optionsFor(respondWithRequest, captured, { root: undefined }));
  assert.equal(path.basename(captured[0].options.cwd), "garden-ecosystem");
});

test("process errors are rejected", async () => {
  await assert.rejects(invokeBridge("health", {}, optionsFor((child) => {
    child.emit("error", new Error("cannot spawn"));
  })), /unable to start bridge process/);
});

test("timeout kills the child and rejects", async () => {
  const captured = [];
  await assert.rejects(invokeBridge("health", {}, optionsFor(() => {}, captured, { timeoutMs: 5 })),
    /timed out/);
  assert.equal(captured.length, 1);
});

test("oversized stdout is rejected", async () => {
  await assert.rejects(invokeBridge("health", {}, optionsFor((child) => {
    child.stdout.emit("data", "x".repeat(65_537));
  })), /output too large/);
});

test("invalid JSON and mismatched id are rejected", async () => {
  await assert.rejects(invokeBridge("health", {}, optionsFor((child) => {
    child.stdout.emit("data", "not-json");
    child.emit("close", 0);
  })), /invalid JSON/);
  await assert.rejects(invokeBridge("health", {}, optionsFor((child) => {
    child.stdout.emit("data", JSON.stringify({ id: "other", ok: true, result: {} }));
    child.emit("close", 0);
  })), /mismatched response id/);
});

test("nonzero exit is rejected without exposing stderr", async () => {
  await assert.rejects(invokeBridge("health", {}, optionsFor((child) => {
    child.stderr.emit("data", "private internal details");
    child.emit("close", 1);
  })), (error) => {
    assert.match(error.message, /code 1/);
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
});

test("lean_check forwards only the declaration and relative path", async () => {
  const captured = [];
  const result = await invokeBridge("lean_check", {
    path: "Smoke.lean", declaration: "one_add_one_eq_two",
  }, optionsFor((child) => {
    child.stdout.emit("data", JSON.stringify({
      id: "fixed-id", ok: true, result: { receipt: { level: "machine_checked" } },
    }));
    child.emit("close", 0);
  }, captured));
  assert.equal(result.result.receipt.level, "machine_checked");
  assert.equal(captured.request.action, "lean_check");
  assert.equal(captured.request.params.path, "Smoke.lean");
  assert.equal(captured.request.params.declaration, "one_add_one_eq_two");
  assert.equal(Object.keys(captured.request.params).length, 2);
});

test("route maps valid, invalid and unavailable responses", async () => {
  const valid = await handleBridgeRequest(new Request("http://localhost/api/garden-ecosystem", {
    method: "POST", body: JSON.stringify({ action: "lean_health", params: {} }),
  }), async () => ({ id: "one", ok: true, result: { status: "unavailable" } }));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { id: "one", ok: true, result: { status: "unavailable" } });

  const invalid = await handleBridgeRequest(new Request("http://localhost/api/garden-ecosystem", {
    method: "POST", body: "{bad",
  }), async () => { throw new Error("must not run"); });
  assert.equal(invalid.status, 400);

  const unavailable = await handleBridgeRequest(new Request("http://localhost/api/garden-ecosystem", {
    method: "POST", body: JSON.stringify({ action: "lean_receipt", params: {} }),
  }), async () => ({ id: "one", ok: false, error: { type: "ExternalToolUnavailable", message: "not found" } }));
  assert.equal(unavailable.status, 503);
});
