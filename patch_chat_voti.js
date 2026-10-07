const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const oldVoti = `              <div className={\`p-5 mt-10 text-center flex flex-col items-center justify-center h-full opacity-60 \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                <span className="text-4xl mb-3">📊</span>
                <p className="font-bold">Bacheca Voti</p>
                <p className="text-sm mt-1">In arrivo con il prossimo aggiornamento.</p>
              </div>`;

const newVoti = `              <div className="flex flex-col gap-4 p-5 pb-10">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className={\`font-bold text-lg \${isDarkMode ? "text-white" : "text-slate-800"}\`}>
                    📊 Bacheca Voti
                  </h3>
                </div>
                
                {(() => {
                  const allGrades: Array<{subject: string, grade: string, date: string, topic: string}> = [];
                  Object.entries(subjectsMemory || {}).forEach(([subject, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades)) {
                        mem.grades.forEach((g: any) => allGrades.push({ subject, ...g }));
                     }
                  });
                  // Ordinare dal più recente al meno recente. Purtroppo 'date' è una stringa tipo "10 Ott".
                  // Facciamo un sort basico o li lasciamo nell'ordine in cui sono stati trovati.
                  allGrades.reverse();

                  if (allGrades.length === 0) {
                     return (
                        <div className={\`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm \${
                          isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                        }\`}>
                          <span className="text-5xl mb-4 opacity-80">📊</span>
                          <p className={\`font-bold text-[15px] mb-2 \${isDarkMode ? "text-gray-200" : "text-slate-700"}\`}>
                            Nessun voto registrato
                          </p>
                          <p className={\`text-[13px] leading-relaxed max-w-[250px] \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                            I voti presi a scuola appariranno qui.
                          </p>
                        </div>
                     );
                  }

                  return (
                     <div className="flex flex-col gap-3">
                        {allGrades.map((g, idx) => {
                           const gradeNum = parseFloat(g.grade.replace(',', '.'));
                           const isPositive = !isNaN(gradeNum) && gradeNum >= 6;
                           return (
                             <div key={idx} className={\`p-4 rounded-xl border flex gap-3 shadow-sm transition-all \${
                               isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-200'
                             }\`}>
                               <div className={\`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-inner shrink-0 \${
                                 isPositive
                                   ? (isDarkMode ? 'bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                   : (isDarkMode ? 'bg-red-950/40 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-600 border border-red-200')
                               }\`}>
                                 {g.grade}
                               </div>
                               <div className="flex flex-col justify-center min-w-0 flex-1">
                                 <div className="flex justify-between items-center gap-2">
                                   <h4 className={\`font-bold text-sm truncate \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>
                                     {g.subject}
                                   </h4>
                                   <span className={\`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 \${
                                     isDarkMode ? 'bg-[#111B21] text-[#8696A0]' : 'bg-slate-100 text-slate-500'
                                   }\`}>{g.date || "Recente"}</span>
                                 </div>
                                 <p className={\`text-xs truncate mt-0.5 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                                   {g.topic || "Nessun argomento"}
                                 </p>
                               </div>
                             </div>
                           );
                        })}
                     </div>
                  );
                })()}
              </div>`;

content = content.replace(oldVoti, newVoti);
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Voti tab patched!");
