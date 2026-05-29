const fs = require('fs');

const file = 'frontend/src/axis-migration.ts';
let content = fs.readFileSync(file, 'utf-8');

const targets = ['fetchGroups', 'createGroup', 'deleteGroup', 'fetchRegistry'];

for (const name of targets) {
  const regex = new RegExp(`(// ── [^─]+ ──\r?\n)?export const ${name} = [\\s\\S]*?\.then\\(\\(r\\) => r\\.data\\);`, 'g');
  const matches = [...content.matchAll(regex)];
  if (matches.length > 1) {
    // 删除所有匹配，只保留第一个
    for (let i = matches.length - 1; i >= 1; i--) {
      const m = matches[i];
      content = content.slice(0, m.index) + content.slice(m.index + m[0].length);
    }
    console.log(`Removed ${matches.length - 1} duplicate(s) of ${name}`);
  } else {
    console.log(`${name}: OK (${matches.length} occurrence)`);
  }
}

fs.writeFileSync(file, content, 'utf-8');

// Verify
for (const name of targets) {
  const count = (content.match(new RegExp(`export const ${name}\\b`, 'g')) || []).length;
  console.log(`  ${name}: ${count} occurrence(s)${count === 1 ? ' ✅' : ' ❌ FAIL'}`);
}
