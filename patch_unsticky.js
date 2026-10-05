const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const target = `className="sticky top-0 z-10 py-2" style={{ backgroundColor: isDarkMode ? '#0B141A' : '#EFEAE2' }}`;
const replacement = `className="py-2"`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Removed sticky header");
