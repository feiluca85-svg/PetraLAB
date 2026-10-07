const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// The badge on the avatar is probably this:
// {subjectsMemory[tutor.id]?.grades?.length > 0 && (
//    <div className={`absolute -bottom-1 -right-1 ...`}>{subjectsMemory[tutor.id].grades.length}</div>
// )}
const badgeRegex = /\{subjectsMemory\[tutor\.id\]\?\.grades\?\.length > 0 && \([\s\S]*?<\/div>\s*\)\}/g;
content = content.replace(badgeRegex, "");

// The "Voto: {lastGrade.grade}" block:
// {lastGrade && (
//   <span className={`...`}>
//     Voto: {lastGrade.grade}
//   </span>
// )}
const gradePillRegex = /\{lastGrade && \([\s\S]*?Voto: \{lastGrade\.grade\}[\s\S]*?<\/span>\s*\)\}/g;
content = content.replace(gradePillRegex, "");

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Grade pill and badge patched via regex");
