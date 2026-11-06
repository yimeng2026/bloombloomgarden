# Physical Intuition Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing deterministic structure registry and evaluation function through two typed research API routes with explicit validation and no persistence.

**Architecture:** A GET route returns the six structure cards; a POST route parses a research task, delegates to `evaluateIntuitionTask`, and returns candidates, issues, exploration boundaries, and a canonical input hash. Validation errors return 400 without manufacturing candidates; no model or database is used.

**Tech Stack:** Next.js 16.2.9 route handlers, `NextRequest`/`NextResponse`, TypeScript, Node.js `node:test`, existing physical-intuition core.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans`.
- Follow the repository `AGENTS.md` Next.js rule and the installed route-handler documentation.
- Follow TDD: write failing route tests first, observe the missing-module failure, then write minimal route code.
- All responses keep `evidenceUpgrade=false`; proposals never become physical facts through an HTTP call.
- `POST /evaluate` performs deterministic computation only. It does not save the task, change evidence, call a model, or write a research result.
- Invalid task JSON, missing essentials, bad URLs, unknown constraints, non-finite values, and invalid matrix shapes return 400.
- `baseline=null` remains a warning, not an invalid request. A missing or undefined baseline property returns 400.
- No new dependencies, database writes, model calls, Next.js development server, or student training.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, real keys, or user content archives.
- Generate the operation catalog after adding routes; expect 457 operations after Task 1.

---

### Task 1: Structures GET and Evaluate POST Routes

**Files:**
- Create: `src/app/api/research/physical-intuition/structures/route.ts`
- Create: `src/app/api/research/physical-intuition/evaluate/route.ts`
- Test: `tests/physical-intuition-routes.test.mjs`
- Modify: `src/lib/generated/kimi-operations.json` via the existing generator

**Interfaces:**
- Consumes: `listStructureCards()` and `evaluateIntuitionTask(task)` from the completed core.
- Produces:
  - `GET /api/research/physical-intuition/structures` returning `{ success, data: { structures }, evidenceUpgrade: false }`.
  - `POST /api/research/physical-intuition/evaluate` returning `{ success, data: Evaluation, evidenceUpgrade: false }` or `{ success: false, error, evidenceUpgrade: false }` with status 400.

- [ ] **Step 1: Write the failing route tests**

Create `tests/physical-intuition-routes.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { GET as getStructures } from "../src/app/api/research/physical-intuition/structures/route.ts";
import { POST as evaluate } from "../src/app/api/research/physical-intuition/evaluate/route.ts";

function fixture(overrides = {}) {
  return {
    taskId: "route-fixture",
    title: "Route fixture; not a research result",
    objective: "Check typed candidate generation through HTTP",
    observables: [{ name: "position", unit: "m", dimension: { L: 1 } }],
    constraints: [],
    baseline: { name: "linear_ode", description: "Conventional baseline" },
    evidence: [],
    triggers: { noncommutative: true },
    ...overrides,
  };
}

function post(body) {
  return new NextRequest("http://localhost/api/research/physical-intuition/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("structures GET returns all six typed cards without upgrading evidence", async () => {
  const response = await getStructures();
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.structures.length, 6);
  assert.ok(payload.data.structures.every((card) => card.possibleUses.some((use) => use.status === "rejected")));
  assert.equal(payload.evidenceUpgrade, false);
});

test("evaluate POST returns a matrix candidate, exploration boundary and canonical hash", async () => {
  const task = fixture();
  const before = JSON.stringify(task);
  const response = await evaluate(post(task));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.requestId, "route-fixture");
  assert.equal(payload.data.cards[0].key, "matrix_states");
  assert.equal(payload.data.cards[0].mathStatus, "proposal");
  assert.equal(payload.data.explorationOnly, true);
  assert.match(payload.data.audit.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(payload.evidenceUpgrade, false);
  assert.equal(JSON.stringify(task), before);
});

test("invalid JSON and missing essentials return 400 without fabricated cards", async () => {
  for (const request of [
    post("{not-json"),
    post(fixture({ taskId: "bad id" })),
    post(fixture({ baseline: undefined })),
    post(fixture({ evidence: [{ id: "bad", role: "lead", sourceUrl: "file:///secret", locator: "local" }] })),
  ]) {
    const response = await evaluate(request);
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(payload.evidenceUpgrade, false);
    assert.equal(Object.hasOwn(payload, "data"), false);
  }
});

test("invalid numeric values and unknown constraints return 400", async () => {
  const invalidProbability = await evaluate(post(fixture({
    constraints: [{ kind: "probabilities", values: [-0.1, 1.1], tolerance: 1e-9 }],
  })));
  assert.equal(invalidProbability.status, 400);
  const unknown = await evaluate(post(fixture({ constraints: [{ kind: "invented_check" }] })));
  assert.equal(unknown.status, 400);
  const nonFinite = await evaluate(new NextRequest("http://localhost/api/research/physical-intuition/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture({ constraints: [{ kind: "probabilities", values: [1e999], tolerance: 1e-9 }] })),
  }));
  assert.equal(nonFinite.status, 400);
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/physical-intuition-routes.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for the structures or evaluate route.

- [ ] **Step 3: Implement the structures GET route**

Create `src/app/api/research/physical-intuition/structures/route.ts`:

```ts
import { NextResponse } from "next/server.js";
import { listStructureCards } from "../../../../../lib/physical-intuition/structure-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { structures: listStructureCards() },
    evidenceUpgrade: false,
  });
}
```

- [ ] **Step 4: Implement the evaluate POST route**

Create `src/app/api/research/physical-intuition/evaluate/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server.js";
import { evaluateIntuitionTask } from "../../../../../lib/physical-intuition/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const task = await request.json();
    const data = evaluateIntuitionTask(task);
    return NextResponse.json({ success: true, data, evidenceUpgrade: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid intuition task";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
```

- [ ] **Step 5: Run route tests and verify GREEN**

Run the command from Step 2.

Expected: 4 tests pass, 0 fail.

- [ ] **Step 6: Generate the operation catalog and run complete verification**

```bash
node scripts/generate-kimi-operations.mjs
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/app/api/research/physical-intuition/structures/route.ts src/app/api/research/physical-intuition/evaluate/route.ts
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected:

- Existing 89 Node／protocol tests plus 4 new tests: 93 pass, 0 fail.
- Project unit tests: 58 pass, 0 fail.
- Operation catalog: 457 operations.
- TypeScript, ESLint, production build, and six end-to-end scenarios pass.
- `git diff --check` exits 0.

- [ ] **Step 7: Review, commit, and push**

```bash
git status --short
git diff -- src/app/api/research/physical-intuition src/lib/generated/kimi-operations.json tests/physical-intuition-routes.test.mjs
git add src/app/api/research/physical-intuition src/lib/generated/kimi-operations.json tests/physical-intuition-routes.test.mjs
git diff --cached --check
git commit -m "feat: expose physical intuition research routes"
git push origin HEAD
```

Expected: only the two routes, their tests, and the generated catalog are committed. No user-local content or secrets are staged. Push updates the research branch, not `main`.

## Follow-up Plans Explicitly Outside This One

1. **Real model proposal and review:** actual provider/model/finishReason capture, no authority over deterministic checks, and append-only audit records.
2. **Calibration and method-data preparation:** frozen forward evaluations, negative examples, license manifests, train/holdout isolation, and no personality cloning.
