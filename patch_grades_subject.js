const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const oldGradeObj = `              const newGrade = {
                grade: gradeItem.grade,
                topic: gradeItem.topic || "Voto da registro",
                date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
              };`;

const newGradeObj = `              const newGrade = {
                grade: gradeItem.grade,
                topic: gradeItem.topic || "Voto da registro",
                date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
                originalSubject: gradeItem.subject || "Materia non specificata"
              };`;

content = content.replace(oldGradeObj, newGradeObj);
fs.writeFileSync('src/components/ParentDashboard.tsx', content);

let chatContent = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
const oldSubjectLogic = `                        let subjectName = subjectOrId;
                        const foundTutor = tutors.find(t => t.id === subjectOrId);
                        if (foundTutor) subjectName = foundTutor.subject;`;

const newSubjectLogic = `                        let subjectName = subjectOrId;
                        const foundTutor = tutors.find(t => t.id === subjectOrId);
                        if (foundTutor) subjectName = foundTutor.subject;`;
// Wait, we need to extract originalSubject for EACH GRADE individually if it's "generico".
// Because "generico" could contain grades for "Tecnologia", "Arte", "Musica" all mixed together!
// So we must group by (foundTutor.subject OR g.originalSubject)!
