const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

content = content.replace(
  'setSelectedTutor(null);\\n        // Ripristiniamo uno stato fittizio per intercettare il prossimo back\\n        window.history.pushState({ page: "home" }, "");',
  'setSelectedTutor(null);'
);

fs.writeFileSync('src/components/Chat.tsx', content);
