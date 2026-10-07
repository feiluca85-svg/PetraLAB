const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const oldGrouping2 = `                           if (foundTutor) {
                              subjectName = foundTutor.subject;
                           } else if (g.originalSubject) {
                              subjectName = g.originalSubject;
                           } else if (subjectOrId === 'generico') {
                              subjectName = "Altre Materie";
                           }`;

const newGrouping2 = `                           if (foundTutor) {
                              subjectName = foundTutor.subject;
                           } else if (g.originalSubject) {
                              subjectName = g.originalSubject;
                           } else if (subjectOrId.startsWith('tutor_')) {
                              subjectName = "Materie Archiviate";
                           } else if (subjectOrId === 'generico') {
                              subjectName = "Altre Materie";
                           }`;

content = content.replace(oldGrouping2, newGrouping2);
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Archived tutor fallback added!");
