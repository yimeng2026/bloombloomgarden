import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  createLawPackage,
  getLawPackage,
  lawPerspectives,
  listLawPackages,
  validateLawPackage,
} from "../../src/lib/law-packages.ts";
import { GET, POST } from "../../src/app/api/research/law-packages/route.ts";
import { GET as GET_BY_ID } from "../../src/app/api/research/law-packages/[id]/route.ts";

let directory;
let previousDirectory;

beforeEach(() => {
  previousDirectory = process.env.LAW_PACKAGE_STORE_DIR;
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "law-packages-test-"));
  process.env.LAW_PACKAGE_STORE_DIR = directory;
});

afterEach(() => {
  if (previousDirectory === undefined) delete process.env.LAW_PACKAGE_STORE_DIR;
  else process.env.LAW_PACKAGE_STORE_DIR = previousDirectory;
  fs.rmSync(directory, { recursive: true, force: true });
});

function candidate() {
  const item = structuredClone(listLawPackages(directory)[0]);
  item.id = "TEST-LAW-001";
  item.version = 1;
  return item;
}

test("all built-in packages satisfy the evidence schema and span four kinds", () => {
  const packages = listLawPackages(directory);
  expect(packages).toHaveLength(4);
  expect(new Set(packages.map((item) => item.kind))).toEqual(new Set(["empirical", "effective_mapping", "formal_constraint", "protocol"]));
  for (const item of packages) expect(validateLawPackage(item)).toEqual([]);
  expect(lawPerspectives).toHaveLength(5);
});

test("empirical domain validation cannot be claimed without independent replication", () => {
  const item = candidate();
  item.status = "DOMAIN_VALIDATED";
  expect(validateLawPackage(item)).toContain("empirical DOMAIN_VALIDATED requires independent_replication=PASS");
  item.validations.push({ level: "independent_replication", label: "独立复核", status: "PASS", evidence: "冻结后复核" });
  expect(validateLawPackage(item)).toEqual([]);
});

test("invalid identifiers, sources and empty validation evidence are rejected", () => {
  const item = candidate();
  item.id = "../escape";
  item.parameters[0].sourceType = "IMAGINED";
  item.validations = [];
  const issues = validateLawPackage(item);
  expect(issues.some((issue) => issue.startsWith("id must"))).toBe(true);
  expect(issues).toContain("parameters[0].sourceType is invalid");
  expect(issues).toContain("validations must be a non-empty array");
});

test("creation persists a package, rejects duplicates and never overwrites built-ins", () => {
  const item = candidate();
  expect(createLawPackage(item, directory).ok).toBe(true);
  expect(getLawPackage(item.id, directory).title).toBe(item.title);
  expect(listLawPackages(directory)).toHaveLength(5);
  expect(createLawPackage(item, directory).reason).toBe("conflict");
  const builtIn = candidate();
  builtIn.id = "CA2-PAIR-DIRECTION-001";
  expect(createLawPackage(builtIn, directory).reason).toBe("conflict");
});

test("collection API filters kinds and rejects unknown filters", async () => {
  const response = await GET(new NextRequest("http://service.test/api/research/law-packages?kind=empirical"));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.data).toHaveLength(1);
  expect(body.data[0].id).toBe("CA2-PAIR-DIRECTION-001");
  expect(body.meta.perspectives).toHaveLength(5);
  const invalid = await GET(new NextRequest("http://service.test/api/research/law-packages?kind=unknown"));
  expect(invalid.status).toBe(400);
});

test("creation and item APIs persist evidence without changing discovery data", async () => {
  const item = candidate();
  const created = await POST(new NextRequest("http://service.test/api/research/law-packages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  }));
  expect(created.status).toBe(201);
  const fetched = await GET_BY_ID(new NextRequest("http://service.test/api/research/law-packages/TEST-LAW-001"), {
    params: Promise.resolve({ id: item.id }),
  });
  const body = await fetched.json();
  expect(fetched.status).toBe(200);
  expect(body.data.status).toBe("LIMITED_SUPPORT");
  const duplicate = await POST(new NextRequest("http://service.test/api/research/law-packages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  }));
  expect(duplicate.status).toBe(409);
});
