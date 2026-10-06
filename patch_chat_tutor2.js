const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

content = content.replace(
  'const matchingTutor = TUTORS.find(t =>',
  'const matchingTutor = tutors.find((t: any) =>'
);
content = content.replace(
  'onClick={() => setActiveTutor(matchingTutor.id)}',
  'onClick={() => setSelectedTutor(matchingTutor)}'
);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat.tsx variables fixed");
