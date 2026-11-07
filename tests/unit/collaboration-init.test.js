import { expect, test } from "bun:test";
import { EXPERT_TEMPLATES, getExpertTemplates, VALIDATION_ROLES } from "../../src/lib/collaboration-init.ts";

test("all expert templates use only declared validation roles and complete fields", () => {
  for (const [domain, experts] of Object.entries(EXPERT_TEMPLATES)) {
    expect(experts.length).toBeGreaterThan(0);
    for (const expert of experts) {
      expect(VALIDATION_ROLES).toContain(expert.role);
      expect(expert.specialty.length).toBeGreaterThan(0);
      expect(expert.systemPrompt.length).toBeGreaterThan(0);
      expect(expert.model.length).toBeGreaterThan(0);
    }
    expect(domain.length).toBeGreaterThan(0);
  }
});

test("mathematics keeps its lead validator and unknown domains use the default template", () => {
  expect(getExpertTemplates("mathematics")[0].role).toBe("lead_validator");
  expect(getExpertTemplates("not-a-domain")).toBe(EXPERT_TEMPLATES.default);
});
