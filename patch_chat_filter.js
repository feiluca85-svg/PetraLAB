const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

content = content.replace(
  /item\.type === \(listFilter === 'compiti' \? 'compito' : 'verifica'\)/g,
  `item.type?.toLowerCase() === (listFilter === 'compiti' ? 'compito' : 'verifica')`
);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat patched");
