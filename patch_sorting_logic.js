const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf-8');

  // Fix Chat.tsx grouping
  if (file.includes('Chat.tsx')) {
    content = content.replace(/const d = formatDisplayDate\(t\.dueDate \|\| 'Senza data'\);/g, "const d = t.dueDate || 'Senza data';");
  }

  // Replace parseDateForSort entirely
  const oldFuncRegex = /const parseDateForSort = \([\s\S]*?\n\};/;
  
  const newFunc = `const parseDateForSort = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione') return 0;
  
  let time = 9999999999998;
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) {
    time = new Date(d).getTime();
  } else {
    const parts = d.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
    if (parts) {
      time = new Date(\`\${parts[3]}-\${parts[2].padStart(2,'0')}-\${parts[1].padStart(2,'0')}\`).getTime();
    } else {
      const t = new Date(d).getTime();
      if (!isNaN(t)) time = t;
    }
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Se il compito è nel passato, lo mandiamo IN FONDO alla lista
  if (time > 0 && time !== 9999999999998 && time < today.getTime()) {
    return time + 20000000000000;
  }
  
  return time;
};`;

  content = content.replace(oldFuncRegex, newFunc);
  fs.writeFileSync(file, content);
};

fixFile('src/components/Chat.tsx');
fixFile('src/components/ParentDashboard.tsx');
console.log("Sorting logic and Chat grouping fixed!");
