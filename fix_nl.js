const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\\nexport default function/g, '\nexport default function');
  fs.writeFileSync(file, content);
}

fixFile('src/components/Chat.tsx');
fixFile('src/components/ParentDashboard.tsx');
console.log("Fixed!");
