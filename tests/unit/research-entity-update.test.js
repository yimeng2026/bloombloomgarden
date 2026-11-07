import { expect, test } from "bun:test";
import {
  buildPanelUpdate,
  buildReviewBoardFilter,
  buildReviewBoardUpdate,
} from "../../src/lib/research-entity-update.ts";

test("panel updates preserve editable fields and serialize object strategies", () => {
  expect(buildPanelUpdate({
    name: "  专家组  ",
    description: "研究边界",
    domain: "physics",
    status: "active",
    strategy: { mode: "sequential" },
  })).toEqual({
    name: "专家组",
    description: "研究边界",
    domain: "physics",
    status: "active",
    strategy: '{"mode":"sequential"}',
  });
});

test("panel updates omit fields that were not provided", () => {
  expect(buildPanelUpdate({})).toEqual({});
});

test("review board filters preserve all optional constraints", () => {
  expect(buildReviewBoardFilter("physics", "active", "open")).toEqual({
    domain: "physics",
    status: "active",
    reviewMode: "open",
  });
  expect(buildReviewBoardFilter(null, null, null)).toEqual({});
});

test("review board updates retain only allowed status and review mode", () => {
  expect(buildReviewBoardUpdate({
    name: "  评审团  ",
    description: "双盲评审",
    status: "invalid",
    reviewMode: "double_blind",
    strategy: '{"rounds":2}',
  })).toEqual({
    name: "评审团",
    description: "双盲评审",
    reviewMode: "double_blind",
    strategy: '{"rounds":2}',
  });
});

test("review board updates serialize null strategies without inventing fields", () => {
  expect(buildReviewBoardUpdate({ status: "closed", strategy: null })).toEqual({
    status: "closed",
    strategy: "null",
  });
  expect(buildReviewBoardUpdate({ reviewMode: "invalid" })).toEqual({});
});
