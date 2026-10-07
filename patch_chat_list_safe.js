const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// 1. Rename filter "Voti Recenti" to "Voti"
content = content.replace(/>\s*Voti Recenti\s*<\/span>/, '>Voti</span>');

// 2. Remove the first lastGrade block (the badge on avatar)
const avatarBadge = `{lastGrade && (
                        <span className={\`absolute -bottom-1 -right-1 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-xs \${
                          isDarkMode ? "bg-[#00A884] text-[#111B21] border-[#111B21]" : "bg-[#25D366] text-white border-white"
                        }\`} title={\`Ultimo voto: \${lastGrade.grade}\`}>
                          {lastGrade.grade.toString().charAt(0)}
                        </span>
                      )}`;
content = content.replace(avatarBadge, "");

// 3. Remove the second lastGrade block (the Voto pill)
const gradePill = `{lastGrade && (
                          <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 \${
                            isDarkMode 
                              ? "bg-[#00A884]/15 text-[#00A884] border border-[#00A884]/30" 
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }\`}>
                            Voto: {lastGrade.grade}
                          </span>
                        )}`;
content = content.replace(gradePill, "");

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat UI correctly patched");
