const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

content = content.replace(
  /item\.type === 'verifica'/g,
  `item.type?.toLowerCase() === 'verifica'`
);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Parent patched");
