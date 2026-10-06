const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

content = content.replace(
  'const handleOpenChat = (tutor: Tutor) => {\\n    setSelectedTutor(tutor);',
  'const handleOpenChat = (tutor: Tutor) => {\\n    setSelectedTutor(tutor);\\n    window.history.pushState({ page: "chat" }, "");'
);

fs.writeFileSync('src/components/Chat.tsx', content);
