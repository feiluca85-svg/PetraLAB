const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// 1. Rename the filter button
content = content.replace("Voti Recenti", "Voti");
content = content.replace("Voti Recenti", "Voti"); // In case it's there twice

// 2. Remove the 7 badge from the avatar
// We look for the badge that renders grades length:
// {subjectsMemory[tutor.id]?.grades?.length > 0 && (
//   <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-[#111B21]">
//     {subjectsMemory[tutor.id].grades.length}
//   </div>
// )}
const badgeRegex = /\{subjectsMemory\[tutor\.id\]\?\.grades\?\.length > 0 && \([\s\S]*?<\/div>\s*\)\}/g;
content = content.replace(badgeRegex, "");

// 3. Remove the grade pill on the right side
// We look for:
// {recentGrade && (
//   <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 shrink-0 ${isDarkMode ? 'bg-[#00A884]/20 text-[#00A884]' : 'bg-emerald-100 text-emerald-800'}`}>
//     Voto: {recentGrade}
//   </div>
// )}
const gradePillRegex = /\{recentGrade && \([\s\S]*?<\/div>\s*\)\}/g;
content = content.replace(gradePillRegex, "");

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat list UI patched!");
