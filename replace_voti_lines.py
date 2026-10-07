with open('src/components/Chat.tsx', 'r') as f:
    lines = f.readlines()

new_voti = """              <div className={`flex flex-col gap-5 p-4 sm:p-6 pb-24 ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold text-[22px] tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Bacheca Voti
                  </h3>
                </div>
                
                {(() => {
                  const groupedGrades: Record<string, any[]> = {};
                  Object.entries(subjectsMemory || {}).forEach(([subjectOrId, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades) && mem.grades.length > 0) {
                        mem.grades.forEach((g: any) => {
                           let subjectName = subjectOrId;
                           const foundTutor = tutors.find(t => t.id === subjectOrId);
                           if (foundTutor) {
                              subjectName = foundTutor.subject;
                           } else if (g.originalSubject) {
                              subjectName = g.originalSubject;
                           } else if (subjectOrId.startsWith('tutor_')) {
                              subjectName = "Materie Archiviate";
                           } else if (subjectOrId === 'generico') {
                              subjectName = "Altre Materie";
                           }
                           
                           subjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
                           if (!groupedGrades[subjectName]) groupedGrades[subjectName] = [];
                           groupedGrades[subjectName].push({...g, originalId: subjectOrId});
                        });
                     }
                  });

                  const subjects = Object.keys(groupedGrades).sort();

                  if (subjects.length === 0) {
                     return (
                        <div className={`p-8 rounded-[24px] text-center flex flex-col items-center justify-center mt-4 ${
                          isDarkMode ? "bg-[#111B21]" : "bg-[#F0F2F5]"
                        }`}>
                          <span className="text-5xl mb-3">📝</span>
                          <h4 className={`font-semibold text-[17px] mb-1 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            Nessun voto registrato
                          </h4>
                          <p className={`text-[14px] leading-relaxed max-w-[250px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                            I voti presi a scuola verranno salvati qui e raggruppati per materia.
                          </p>
                        </div>
                     );
                  }

                  return (
                     <div className="flex flex-col gap-3">
                        {subjects.map((subject, idx) => {
                           const gradesList = groupedGrades[subject];
                           const sum = gradesList.reduce((acc, g) => acc + (parseFloat(g.grade.toString().replace(',','.')) || 0), 0);
                           const avg = sum / gradesList.length;
                           const isPositiveAvg = avg >= 6;
                           // gradesList.sort((a,b) => parseDateForSort(b.date || '') - parseDateForSort(a.date || ''));

                           return (
                             <details key={idx} className={`group rounded-[20px] overflow-hidden transition-all ${
                               isDarkMode ? 'bg-[#111B21]' : 'bg-[#F0F2F5]'
                             }`}>
                               <summary className="flex items-center justify-between p-4 cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center text-[18px] font-bold ${
                                      isPositiveAvg
                                        ? (isDarkMode ? 'bg-[#0A291A] text-[#25D366]' : 'bg-[#E7FCEB] text-[#118B44]')
                                        : (isDarkMode ? 'bg-[#3A1618] text-[#F15C6D]' : 'bg-[#FFE5E5] text-[#D82E3F]')
                                    }`}>
                                      {avg.toFixed(1).replace('.0', '')}
                                    </div>
                                    <div>
                                      <h4 className={`font-semibold text-[16px] tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {subject}
                                      </h4>
                                      <span className={`text-[13px] font-medium mt-0.5 inline-block ${
                                        isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                                      }`}>
                                        {gradesList.length} {gradesList.length === 1 ? 'Voto' : 'Voti'}
                                      </span>
                                    </div>
                                 </div>
                                 <div className={`w-8 h-8 flex items-center justify-center transition-transform group-open:rotate-180 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                 </div>
                               </summary>
                               
                               <div className={`p-4 pt-0`}>
                                  <div className="mt-2 flex flex-col gap-2">
                                    {gradesList.map((g, gIdx) => {
                                      const gradeNum = parseFloat(g.grade.toString().replace(',','.'));
                                      const isPos = !isNaN(gradeNum) && gradeNum >= 6;
                                      return (
                                        <div key={gIdx} className={`p-3 rounded-[16px] flex flex-col gap-1 ${
                                          isDarkMode ? 'bg-[#202C33]' : 'bg-white shadow-sm'
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            <span className={`font-bold text-[17px] ${isPos ? (isDarkMode ? 'text-[#25D366]' : 'text-[#118B44]') : (isDarkMode ? 'text-[#F15C6D]' : 'text-[#D82E3F]')}`}>
                                              {g.grade}
                                            </span>
                                            <span className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                                              {g.date || "Recente"}
                                            </span>
                                          </div>
                                          {g.topic && (
                                            <p className={`text-[14px] leading-snug ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
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
"""

# Find the indices programmatically just to be safe
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'listFilter === "voti" ? (' in line:
        start_idx = i + 1
    if '            ) : (' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    lines = lines[:start_idx] + [new_voti] + lines[end_idx:]
    with open('src/components/Chat.tsx', 'w') as f:
        f.writelines(lines)
    print("Successfully replaced lines!")
else:
    print(f"Could not find indices: start={start_idx}, end={end_idx}")
