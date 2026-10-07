const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const oldVotiRegex = /\{listFilter === "voti" \? \([\s\S]*?\}\)\(\)\}\s*<\/div>\s*\)/;

const newVoti = `{listFilter === "voti" ? (
              <div className="flex flex-col gap-5 p-4 sm:p-6 pb-24">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={\`font-extrabold text-2xl tracking-tight \${isDarkMode ? "text-white" : "text-slate-900"}\`}>
                    Le mie Materie
                  </h3>
                  <div className={\`w-10 h-10 rounded-full flex items-center justify-center text-xl \${isDarkMode ? "bg-[#202C33]" : "bg-white shadow-sm"}\`}>
                    📈
                  </div>
                </div>
                
                {(() => {
                  const groupedGrades: Record<string, any[]> = {};
                  Object.entries(subjectsMemory || {}).forEach(([subjectOrId, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades) && mem.grades.length > 0) {
                        let subjectName = subjectOrId;
                        const foundTutor = tutors.find(t => t.id === subjectOrId);
                        if (foundTutor) subjectName = foundTutor.subject;
                        
                        subjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
                        if (!groupedGrades[subjectName]) groupedGrades[subjectName] = [];
                        
                        mem.grades.forEach((g: any) => groupedGrades[subjectName].push({...g, originalId: subjectOrId}));
                     }
                  });

                  const subjects = Object.keys(groupedGrades).sort();

                  if (subjects.length === 0) {
                     return (
                        <div className={\`p-8 rounded-3xl text-center flex flex-col items-center justify-center mt-4 shadow-sm border border-dashed \${
                          isDarkMode ? "bg-[#202C33]/50 border-[#2A3942]" : "bg-white border-slate-200"
                        }\`}>
                          <span className="text-6xl mb-4">🎈</span>
                          <h4 className={\`font-bold text-lg mb-2 \${isDarkMode ? "text-white" : "text-slate-800"}\`}>
                            Ancora nessun voto
                          </h4>
                          <p className={\`text-sm leading-relaxed max-w-[250px] \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                            I voti che prendi a scuola verranno salvati qui e raggruppati per materia.
                          </p>
                        </div>
                     );
                  }

                  return (
                     <div className="flex flex-col gap-4">
                        {subjects.map((subject, idx) => {
                           const gradesList = groupedGrades[subject];
                           const sum = gradesList.reduce((acc, g) => acc + (parseFloat(g.grade.toString().replace(',','.')) || 0), 0);
                           const avg = sum / gradesList.length;
                           const isPositiveAvg = avg >= 6;
                           // sort recent first
                           gradesList.sort((a,b) => parseDateForSort(b.date || '') - parseDateForSort(a.date || ''));

                           return (
                             <details key={idx} className={\`group rounded-3xl border shadow-sm overflow-hidden transition-all \${
                               isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-100'
                             }\`}>
                               <summary className="flex items-center justify-between p-5 cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden">
                                 <div className="flex items-center gap-4">
                                    <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner \${
                                      isPositiveAvg
                                        ? (isDarkMode ? 'bg-[#00A884]/20 text-[#00A884]' : 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700')
                                        : (isDarkMode ? 'bg-red-950/40 text-red-400' : 'bg-gradient-to-br from-red-100 to-red-50 text-red-600')
                                    }\`}>
                                      {avg.toFixed(1).replace('.0', '')}
                                    </div>
                                    <div>
                                      <h4 className={\`font-bold text-lg tracking-tight \${isDarkMode ? 'text-white' : 'text-slate-800'}\`}>
                                        {subject}
                                      </h4>
                                      <span className={\`text-xs font-medium px-2.5 py-0.5 rounded-full mt-1 inline-block \${
                                        isDarkMode ? 'bg-[#111B21] text-[#8696A0]' : 'bg-slate-100 text-slate-500'
                                      }\`}>
                                        {gradesList.length} {gradesList.length === 1 ? 'Voto' : 'Voti'}
                                      </span>
                                    </div>
                                 </div>
                                 <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-open:rotate-180 \${isDarkMode ? 'bg-[#111B21] text-white' : 'bg-slate-50 text-slate-400'}\`}>
                                    ↓
                                 </div>
                               </summary>
                               
                               <div className={\`p-4 pt-0 border-t \${isDarkMode ? 'border-[#2A3942]' : 'border-slate-50'}\`}>
                                  <div className="mt-4 flex flex-col gap-3">
                                    {gradesList.map((g, gIdx) => {
                                      const gradeNum = parseFloat(g.grade.toString().replace(',','.'));
                                      const isPos = !isNaN(gradeNum) && gradeNum >= 6;
                                      return (
                                        <div key={gIdx} className={\`p-4 rounded-2xl flex flex-col gap-2 \${
                                          isDarkMode ? 'bg-[#111B21]' : 'bg-slate-50'
                                        }\`}>
                                          <div className="flex items-center justify-between">
                                            <span className={\`font-black text-lg \${isPos ? (isDarkMode ? 'text-[#00A884]' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-red-500')}\`}>
                                              {g.grade}
                                            </span>
                                            <span className={\`text-[11px] font-bold px-2 py-1 rounded-lg \${isDarkMode ? 'bg-[#202C33] text-[#8696A0]' : 'bg-white text-slate-400 shadow-sm'}\`}>
                                              {g.date || "Recente"}
                                            </span>
                                          </div>
                                          {g.topic && (
                                            <p className={\`text-[13px] leading-relaxed \${isDarkMode ? 'text-gray-300' : 'text-slate-600'}\`}>
                                              {g.topic}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                               </div>
                             </details>
                           );
                        })}
                     </div>
                  );
                })()}
              </div>
            )`;

content = content.replace(oldVotiRegex, newVoti);
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Voti dashboard modernized and grouped!");
