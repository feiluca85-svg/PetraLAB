const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const oldGrouping = `                  Object.entries(subjectsMemory || {}).forEach(([subjectOrId, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades) && mem.grades.length > 0) {
                        let subjectName = subjectOrId;
                        const foundTutor = tutors.find(t => t.id === subjectOrId);
                        if (foundTutor) subjectName = foundTutor.subject;
                        
                        subjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
                        if (!groupedGrades[subjectName]) groupedGrades[subjectName] = [];
                        
                        mem.grades.forEach((g: any) => groupedGrades[subjectName].push({...g, originalId: subjectOrId}));
                     }
                  });`;

const newGrouping = `                  Object.entries(subjectsMemory || {}).forEach(([subjectOrId, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades) && mem.grades.length > 0) {
                        mem.grades.forEach((g: any) => {
                           let subjectName = subjectOrId;
                           const foundTutor = tutors.find(t => t.id === subjectOrId);
                           if (foundTutor) {
                              subjectName = foundTutor.subject;
                           } else if (g.originalSubject) {
                              subjectName = g.originalSubject;
                           } else if (subjectOrId === 'generico') {
                              subjectName = "Altre Materie";
                           }
                           
                           subjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
                           if (!groupedGrades[subjectName]) groupedGrades[subjectName] = [];
                           groupedGrades[subjectName].push({...g, originalId: subjectOrId});
                        });
                     }
                  });`;

content = content.replace(oldGrouping, newGrouping);
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Voti grouping logic perfectly isolated!");
