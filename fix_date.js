const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
content = content.replace("});\\n                            return", "});\n                            return");
fs.writeFileSync('src/components/Chat.tsx', content);
