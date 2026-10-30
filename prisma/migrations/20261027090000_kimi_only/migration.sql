-- Preserve research/orchestration records while removing legacy provider credentials.
-- No theorem, paper, task, conversation or graph data is deleted.
UPDATE "Agent"
SET "apiKey" = '',
    "llmProvider" = 'kimi',
    "agentPlatform" = 'openclaw',
    "model" = 'kimi-for-coding',
    "temperature" = 1.0;
