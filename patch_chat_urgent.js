const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// Replace the date helpers
const oldDateHelpers = /const tomorrow = new Date\(\);\s*tomorrow\.setDate\(tomorrow\.getDate\(\) \+ 1\);\s*const tStr = tomorrow\.toISOString\(\)\.split\('T'\)\[0\];\s*const formatDate = \([\s\S]*?\};\s*\/\/ 4\. Render/;

const newDateHelpers = `const todayObj = new Date();
                      const todayStr = todayObj.toISOString().split('T')[0];
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tStr = tomorrow.toISOString().split('T')[0];

                      const formatDate = (ds: string) => {
                         if (ds === 'Prossima lezione') return 'Prossima Lezione';
                         if (ds === todayStr) return 'Oggi';
                         if (ds === tStr) return 'Domani';
                         const parts = ds.split('-');
                         if (parts.length === 3) {
                            const d = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
                            const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                            return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                         }
                         return ds;
                      };

                      // 4. Render`;

content = content.replace(oldDateHelpers, newDateHelpers);

// Replace isTomorrow logic
content = content.replace(/const isTomorrow = dateStr === tStr;/g, 'const isUrgentDay = dateStr === tStr || dateStr === todayStr;');
content = content.replace(/isTomorrow \?/g, 'isUrgentDay ?');
content = content.replace(/\{formatDate\(dateStr\)\} \{isTomorrow && ' 🚨'\}/g, "{formatDate(dateStr)} {isUrgentDay && ' 🚨'}");
content = content.replace(/const isUrgent = isTomorrow && !item\.isCompleted;/g, 'const isUrgent = isUrgentDay && !item.isCompleted;');

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat.tsx urgent logic patched!");
