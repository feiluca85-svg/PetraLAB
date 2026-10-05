const fs = require('fs');
let content = fs.readFileSync('src/lib/tutors.ts', 'utf-8');
content = content.replace(
  'voiceLang: string;',
  'voiceLang: string;\n  voiceURI?: string;'
);
fs.writeFileSync('src/lib/tutors.ts', content);
