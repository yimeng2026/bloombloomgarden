import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export const DEFAULT_DATABASE_URL = "file:./dev.db";

export function localSqlitePath(databaseUrl: string, cwd = process.cwd()): string | null {
  if (!databaseUrl.startsWith("file:")) return null;
  const filename = databaseUrl.slice(5).split(/[?#]/, 1)[0];
  if (!filename || filename === ":memory:") return null;
  return path.isAbsolute(filename) ? path.normalize(filename) : path.resolve(cwd, filename);
}

export function ensureSqliteDirectory(databaseUrl: string, cwd = process.cwd()): string | null {
  const filePath = localSqlitePath(databaseUrl, cwd);
  if (filePath) fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
  ensureSqliteDirectory(dbUrl);
  const adapter = new PrismaLibSql({
    url: dbUrl,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
