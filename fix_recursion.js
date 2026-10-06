const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const oldFunc = 'const handleSelectTutor = (tutor: Tutor) => {\\n    handleSelectTutor(tutor);\\n    window.location.hash = "chat";\\n  };';
const newFunc = 'const handleSelectTutor = (tutor: Tutor) => {\\n    setSelectedTutor(tutor);\\n    window.location.hash = "chat";\\n  };';

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/Chat.tsx', content);
