const fs = require('fs');
const path = require('path');

const files = [
  'backend/src/routes/agents.ts',
  'backend/src/routes/auth.ts',
  'backend/src/routes/blueprints.ts',
  'backend/src/routes/coordinator.ts',
  'backend/src/routes/dialog.ts',
  'backend/src/routes/groups.ts',
  'backend/src/routes/handoff.ts',
  'backend/src/routes/integrations.ts',
  'backend/src/routes/intervention.ts',
  'backend/src/routes/knowledge.ts',
  'backend/src/routes/monitor.ts',
  'backend/src/routes/settings.ts',
  'backend/src/routes/skills.ts',
  'backend/src/routes/unified-api.ts',
  'backend/src/routes/workspace.ts',
];

const results = [];

for (const filepath of files) {
  if (!fs.existsSync(filepath)) {
    results.push(`MISS ${filepath}: not found`);
    continue;
  }

  let content = fs.readFileSync(filepath, 'utf-8');

  if (!content.includes('function asyncHandler')) {
    results.push(`SKIP ${filepath}: no local asyncHandler`);
    continue;
  }

  // Determine import line
  const beforeDef = content.split('function asyncHandler')[0];
  const importLine = beforeDef.includes('Request, Response, NextFunction')
    ? "import { asyncHandler } from '../middleware/asyncHandler';"
    : "import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';";

  // Remove local asyncHandler definition - handle both single-line and multi-line
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  let braceCount = 0;
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function asyncHandler')) {
      startIdx = i;
      inFunc = true;
    }
    if (inFunc) {
      for (const ch of lines[i]) {
        if (ch === '{') braceCount++;
        if (ch === '}') braceCount--;
      }
      if (braceCount === 0 && lines[i].includes('}')) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1 || endIdx === -1) {
    results.push(`FAIL ${filepath}: could not find asyncHandler block`);
    continue;
  }

  // Remove the asyncHandler block (including preceding empty line if any)
  let removeStart = startIdx;
  if (startIdx > 0 && lines[startIdx - 1].trim() === '') {
    removeStart = startIdx - 1;
  }
  lines.splice(removeStart, endIdx - removeStart + 1);

  // Add import line after last import
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  results.push(`OK ${filepath}: migrated`);
}

console.log(results.join('\n'));
