const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'HierarchicalDashboard.tsx');

if (!fs.existsSync(filePath)) {
  console.error('❌ 找不到 HierarchicalDashboard.tsx');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 替换损坏的箭头函数符号
const originalLen = content.length;
content = content.replace(/=㸾/g, '=>');
content = content.replace(/=씢/g, '=>');
content = content.replace(/=撌/g, '=>');

// 也替换可能的其他乱码变体
content = content.replace(/=[\u4e00-\u9fff]/g, '=>');

const fixedCount = originalLen - content.length;
if (fixedCount === 0) {
  console.log('ℹ️ 没有找到乱码箭头函数');
} else {
  console.log(`✅ 已修复 ${fixedCount} 处乱码`);
}

fs.writeFileSync(filePath, content);
console.log('✅ HierarchicalDashboard.tsx 已修复');
console.log('🚀 现在可以执行：npm run build');
