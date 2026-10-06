const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

content = content.replace(
  'const handleSelectTutor = (tutor: Tutor) => {\\n    handleSelectTutor(tutor);',
  'const handleSelectTutor = (tutor: Tutor) => {\\n    setSelectedTutor(tutor);'
);

// Ah, wait. The replace string in JS matches exactly. 
// Let's use string replace with the exact snippet
content = content.replace(
\`  const handleSelectTutor = (tutor: Tutor) => {
    handleSelectTutor(tutor);
    window.history.pushState({ page: "chat" }, "");
  };\`,
\`  const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    window.history.pushState({ page: "chat" }, "");
  };\`
);

fs.writeFileSync('src/components/Chat.tsx', content);
