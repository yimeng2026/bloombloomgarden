export const VALIDATION_ROLES = ["lead_validator", "validator", "witness", "checker"] as const;

export type ValidationRole = (typeof VALIDATION_ROLES)[number];

export interface ExpertTemplate {
  role: ValidationRole;
  specialty: string;
  systemPrompt: string;
  model: string;
}

export const EXPERT_TEMPLATES: Record<string, ExpertTemplate[]> = {
  mathematics: [
    {
      role: "lead_validator",
      specialty: "formal_verification",
      systemPrompt: "You are a senior mathematician specializing in formal verification and rigorous proof checking.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "number_theory",
      systemPrompt: "You are a number theorist with deep expertise in analytical methods and abstract algebra.",
      model: "glm-5.1",
    },
    {
      role: "checker",
      specialty: "lean4",
      systemPrompt: "You are a Lean 4 proof assistant expert, capable of formalizing and verifying mathematical proofs in Lean 4.",
      model: "glm-5.1",
    },
  ],
  physics: [
    {
      role: "lead_validator",
      specialty: "experimental_physics",
      systemPrompt: "You are a senior experimental physicist with expertise in designing and validating physical experiments.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "theoretical_physics",
      systemPrompt: "You are a theoretical physicist specializing in mathematical modeling and theoretical derivation.",
      model: "glm-5.1",
    },
    {
      role: "witness",
      specialty: "data_analysis",
      systemPrompt: "You are a physics data analyst skilled in statistical methods and experimental data interpretation.",
      model: "glm-5.1",
    },
  ],
  ai: [
    {
      role: "lead_validator",
      specialty: "machine_learning",
      systemPrompt: "You are an ML research lead with expertise in algorithm validation, reproducibility, and benchmarking.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "deep_learning",
      systemPrompt: "You are a deep learning researcher focused on neural network verification and adversarial robustness.",
      model: "glm-5.1",
    },
    {
      role: "checker",
      specialty: "experiment_design",
      systemPrompt: "You are an AI experiment designer who ensures rigorous experimental protocols and controls.",
      model: "glm-5.1",
    },
  ],
  default: [
    {
      role: "lead_validator",
      specialty: "interdisciplinary",
      systemPrompt: "You are a senior interdisciplinary researcher capable of validating findings across multiple domains.",
      model: "glm-5.1",
    },
    {
      role: "validator",
      specialty: "general",
      systemPrompt: "You are a research generalist with broad knowledge across sciences and humanities.",
      model: "glm-5.1",
    },
    {
      role: "witness",
      specialty: "review",
      systemPrompt: "You are an experienced peer reviewer who provides critical and constructive assessment of research.",
      model: "glm-5.1",
    },
  ],
};

export function getExpertTemplates(domain: string): ExpertTemplate[] {
  return EXPERT_TEMPLATES[domain] ?? EXPERT_TEMPLATES.default;
}
