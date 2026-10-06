const fs = require('fs');
let content = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

content = content.replace(
  'return { success: true, items: data.agendaItems || [] };',
  'return { success: true, items: data.agendaItems || [], gradesItems: data.gradesItems || [] };'
);

fs.writeFileSync('src/app/actions/chat.ts', content);
console.log("chat.ts return updated!");
