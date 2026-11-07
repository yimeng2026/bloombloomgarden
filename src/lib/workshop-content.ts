function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function formatWorkshopStatement(input: unknown, maxLength: number): string {
  const statement = isRecord(input) ? input : {};
  const role = optionalText(statement.role, "member");
  const specialty = optionalText(statement.specialty);
  const content = optionalText(statement.content).slice(0, maxLength);
  return `[${role}${specialty ? ` / ${specialty}` : ""}]: ${content}`;
}
