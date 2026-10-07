/**
 * kb.ts — 前沿知识库（Frontier KB）检索层
 *
 * KB 卡落盘于 data/frontier/kb/<topic>/<baseId>.md（由 arxiv-ingest 写入）。
 * 本模块负责扫描、解析 front-matter、按 topic/tag/关键词检索。
 */

import fs from "fs";
import path from "path";
import { FRONTIER_KB_DIR } from "./frontier.config";

export interface KbCard {
  id: string;
  baseId: string;
  title: string;
  authors: string;
  link: string;
  published: string;
  topic: string;
  tags: string[];
  categories: string[];
  ingestedAt: string;
  oneLiner: string;
  file: string;
}

function parseCard(filePath: string): KbCard | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fm) return null;
    const get = (key: string): string => {
      const m = fm[1].match(new RegExp(`^${key}: "(.*)"$`, "m"));
      return m ? m[1].replace(/\\"/g, '"') : "";
    };
    const oneLinerMatch = fm[2].match(/\*\*一句话\*\*：([^\n]+)/);
    return {
      id: get("id"),
      baseId: get("base_id"),
      title: get("title"),
      authors: get("authors"),
      link: get("link"),
      published: get("published"),
      topic: get("topic"),
      tags: get("tags") ? get("tags").split(",").map((s) => s.trim()).filter(Boolean) : [],
      categories: get("categories") ? get("categories").split(",").map((s) => s.trim()).filter(Boolean) : [],
      ingestedAt: get("ingested_at"),
      oneLiner: oneLinerMatch ? oneLinerMatch[1].trim() : "",
      file: path.relative(process.cwd(), filePath),
    };
  } catch {
    return null;
  }
}

export function searchKb(filter: { topic?: string; tag?: string; q?: string; limit?: number }): { count: number; cards: KbCard[] } {
  const root = path.join(process.cwd(), FRONTIER_KB_DIR);
  const cards: KbCard[] = [];
  let topics: string[] = [];
  try {
    topics = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory());
  } catch {
    return { count: 0, cards: [] };
  }
  for (const t of topics) {
    if (filter.topic && t !== filter.topic) continue;
    const dir = path.join(root, t);
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const card = parseCard(path.join(dir, f));
      if (!card) continue;
      if (filter.tag && !card.tags.includes(filter.tag)) continue;
      if (filter.q) {
        const hay = `${card.title} ${card.authors} ${card.oneLiner}`.toLowerCase();
        if (!hay.includes(filter.q.toLowerCase())) continue;
      }
      cards.push(card);
    }
  }
  cards.sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt));
  const limited = filter.limit ? cards.slice(0, filter.limit) : cards;
  return { count: limited.length, cards: limited };
}
