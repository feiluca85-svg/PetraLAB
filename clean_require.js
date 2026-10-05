const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
content = content.replace('const { doc, setDoc } = require("firebase/firestore");\\n', '');
content = content.replace('const { db } = require("@/lib/firebase");\\n', '');
fs.writeFileSync('src/components/Chat.tsx', content);
