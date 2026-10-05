const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
content = content.replace('useState<any[]>([]);\\n', 'useState<any[]>([]);');
fs.writeFileSync('src/components/Chat.tsx', content);
