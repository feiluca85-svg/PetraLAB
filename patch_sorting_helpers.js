const fs = require('fs');

const sorterCode = `
const parseDateForSort = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione') return 9999999999999;
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) return new Date(d).getTime();
  const parts = d.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
  if (parts) return new Date(\`\${parts[3]}-\${parts[2].padStart(2,'0')}-\${parts[1].padStart(2,'0')}\`).getTime();
  const t = new Date(d).getTime();
  return isNaN(t) ? 9999999999998 : t;
};

const formatDisplayDate = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione') return 'Prossima lezione';
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) {
    const parts = d.split('-');
    return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
  }
  return d;
};
`;

// Inject into Chat.tsx
let chatContent = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
if (!chatContent.includes('parseDateForSort')) {
  chatContent = chatContent.replace('export default function Chat(', sorterCode + '\\nexport default function Chat(');
}
// Fix sorting logic in Chat.tsx
const oldSort = /tasks\.sort\(\(a, b\) => \{[\s\S]*?\}\);/;
const newSort = `tasks.sort((a, b) => parseDateForSort(a.dueDate || '') - parseDateForSort(b.dueDate || ''));`;
chatContent = chatContent.replace(oldSort, newSort);

// Fix grouping display in Chat.tsx
// old: const d = t.dueDate || 'Senza data';
// new: const d = formatDisplayDate(t.dueDate || 'Senza data');
chatContent = chatContent.replace(/const d = t\.dueDate \|\| 'Senza data';/g, "const d = formatDisplayDate(t.dueDate || 'Senza data');");

fs.writeFileSync('src/components/Chat.tsx', chatContent);
console.log("Chat.tsx patched!");

// Inject into ParentDashboard.tsx
let pdContent = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');
if (!pdContent.includes('parseDateForSort')) {
  pdContent = pdContent.replace('export default function ParentDashboard(', sorterCode + '\\nexport default function ParentDashboard(');
}

// Fix displaying in ParentDashboard.tsx
// old: {item.dueDate}
// new: {formatDisplayDate(item.dueDate)}
pdContent = pdContent.replace(/\{item\.dueDate\}/g, "{formatDisplayDate(item.dueDate)}");

// We should also sort agendaItems in ParentDashboard before rendering
// Old: {agendaItems.map((item, idx) => (
// New: {[...agendaItems].sort((a, b) => parseDateForSort(a.dueDate || '') - parseDateForSort(b.dueDate || '')).map((item, idx) => (
pdContent = pdContent.replace(/\{agendaItems\.map\(\(item, idx\) => \(/g, "{[...agendaItems].sort((a, b) => parseDateForSort(a.dueDate || '') - parseDateForSort(b.dueDate || '')).map((item, idx) => (");

fs.writeFileSync('src/components/ParentDashboard.tsx', pdContent);
console.log("ParentDashboard.tsx patched!");

