import { expect, test } from "bun:test";
import { buildStageUpdateData } from "../../src/lib/pipeline-stage-update.ts";

test("a high score completes the stage and preserves content and feedback", () => {
  const { updateData, statusOverride } = buildStageUpdateData({
    finalContent: "final",
    feedback: "good",
    finalScore: 8,
  });
  expect(updateData.content).toBe("final");
  expect(updateData.feedback).toBe("good");
  expect(updateData.score).toBe(8);
  expect(updateData.status).toBe("completed");
  expect(updateData.completedAt).toBeInstanceOf(Date);
  expect(statusOverride).toBe("completed");
});

test("a low score rejects the stage and clears completedAt", () => {
  const { updateData, statusOverride } = buildStageUpdateData({ finalScore: 2 });
  expect(updateData.status).toBe("rejected");
  expect(updateData.completedAt).toBeNull();
  expect(statusOverride).toBe("rejected");
});

test("an explicit body status is used only when there is no score override", () => {
  const completed = buildStageUpdateData({ finalScore: 6, bodyStatus: "completed" });
  expect(completed.updateData.status).toBe("completed");
  expect(completed.updateData.completedAt).toBeInstanceOf(Date);

  const active = buildStageUpdateData({ finalScore: 6, bodyStatus: "active" });
  expect(active.updateData.status).toBe("active");
  expect(active.updateData.completedAt).toBeNull();

  const noStatus = buildStageUpdateData({ finalScore: 6 });
  expect("status" in noStatus.updateData).toBe(false);
  expect("completedAt" in noStatus.updateData).toBe(false);
});
