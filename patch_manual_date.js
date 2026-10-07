const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const oldFallback = "dueDate: manualFormData.dueDate || new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),";
const newFallback = "dueDate: manualFormData.dueDate || new Date().toISOString().split('T')[0],";

content = content.replace(oldFallback, newFallback);
fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Manual date fallback patched!");
