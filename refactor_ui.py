import re

def process_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        if isinstance(old, re.Pattern):
            content = old.sub(new, content)
        else:
            content = content.replace(old, new)
            
    with open(filepath, 'w') as f:
        f.write(content)

# 1. Update Chat.tsx
chat_file = 'src/components/Chat.tsx'
with open(chat_file, 'r') as f:
    chat_content = f.read()

# Replace top header and filters
header_regex = re.compile(r'\{\/\* Header WhatsApp Top Moderno \*\/\}.*?\{\/\* Lista delle Chat \(Tutor per Materia\) \*\/\}.*?<div className=\{`flex-1 overflow-y-auto', re.DOTALL)

new_header = """{/* Header WhatsApp 2024 Style */}
          <div className={`${
            isDarkMode ? 'bg-[#0B141A]' : 'bg-white'
          } px-4 pt-3 pb-2 flex justify-between items-center relative z-30 transition-colors`}>
            <div className="flex items-center gap-3">
              <h1 className={`text-[24px] font-bold tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#25D366]'
              }`}>
                PetraLAB
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Badge Streak Fiamma */}
              <div className={`flex items-center gap-1 font-bold text-[13px] px-2.5 py-1 rounded-full ${
                isDarkMode ? 'bg-[#182229] text-orange-400' : 'bg-orange-50 text-orange-500'
              }`}>
                <span>🔥</span>
                <span>{stats.streak}</span>
              </div>

              {/* Tasto Tema */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-full transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              )}

              {/* Menu a 3 Puntini */}
              <div className="relative">
                <button 
                  onClick={() => setShowHomeMenu(prev => !prev)}
                  className={`p-1 rounded-full transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                  </svg>
                </button>
                {/* Menu a tendina (rimane uguale ma ricolorato in CSS) */}
                {showHomeMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50 ${
                    isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-white border-slate-100'
                  }`}>
                    <div className="py-2">
                      <div className={`px-4 py-2 border-b text-[13px] flex justify-between items-center ${
                        isDarkMode ? 'border-[#222E35] text-[#8696A0]' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span>Versione App</span>
                        <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">v1.6.0</span>
                      </div>
                      <button 
                        onClick={() => { setShowHomeMenu(false); window.location.reload(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[15px] transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#202C33] text-gray-200' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-xl">🔄</span> Ricarica App
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar (Ask Meta AI style) */}
          <div className={`px-4 py-1 pb-3 ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`}>
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full transition-all ${
              isDarkMode ? 'bg-[#202C33]' : 'bg-[#F0F2F5]'
            }`}>
              <div className="w-5 h-5 rounded-full border-[2px] border-blue-500 border-t-purple-500 border-r-pink-500 flex-shrink-0 animate-spin-slow"></div>
              <input 
                type="text" 
                placeholder="Chiedi all'IA o cerca tutor..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent w-full outline-none font-medium text-[15px] placeholder-opacity-80 ${
                  isDarkMode ? 'text-white placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Filtri Stile WhatsApp 2024 */}
          <div className={`flex gap-2 px-4 py-1 pb-3 overflow-x-auto no-scrollbar border-b ${
            isDarkMode ? 'bg-[#0B141A] border-[#202C33]' : 'bg-white border-slate-100'
          }`}>
            {[
              { id: 'tutte', label: 'Tutte' },
              { id: 'compiti', label: 'Compiti' },
              { id: 'verifiche', label: 'Verifiche' },
              { id: 'voti', label: 'Voti' }
            ].map(filter => (
              <span 
                key={filter.id}
                onClick={() => setListFilter(filter.id as any)}
                className={`font-semibold px-4 py-1.5 rounded-full cursor-pointer transition-all text-[14px] shrink-0 ${
                  listFilter === filter.id 
                    ? (isDarkMode ? 'bg-[#0A291A] text-[#25D366]' : 'bg-[#E7FCEB] text-[#118B44]') 
                    : (isDarkMode ? 'bg-[#202C33] text-[#8696A0]' : 'bg-[#F0F2F5] text-slate-600')
                }`}
              >
                {filter.label}
              </span>
            ))}
          </div>

          {/* Lista delle Chat (Tutor per Materia) */}
          <div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`"""

chat_content = header_regex.sub(new_header, chat_content)

# Fix List Item hover and style to match WhatsApp 2024
chat_content = chat_content.replace(
    'isDarkMode ? "hover:bg-[#202C33] active:bg-[#222E35]" : "hover:bg-slate-50 active:bg-slate-100"',
    'isDarkMode ? "active:bg-[#202C33]" : "active:bg-[#F5F6F6]"'
)

# Replace the specific Voti block 
voti_regex = re.compile(r'\} \:\s*listFilter === "voti" \? \([\s\S]*?\}\)\(\)\}\s*<\/div>\s*\)', re.DOTALL)

new_voti = """} : listFilter === "voti" ? (
              <div className={`flex flex-col gap-5 p-4 sm:p-6 pb-24 ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`}>
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
                           gradesList.sort((a,b) => parseDateForSort(b.date || '') - parseDateForSort(a.date || ''));

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
            )"""

chat_content = voti_regex.sub(new_voti, chat_content)

# General color fixes in Chat.tsx
chat_content = chat_content.replace('bg-[#00A884]', 'bg-[#25D366]')
chat_content = chat_content.replace('text-[#00A884]', 'text-[#25D366]')
chat_content = chat_content.replace('border-[#00A884]', 'border-[#25D366]')
chat_content = chat_content.replace('emerald-500', '[#25D366]')

with open(chat_file, 'w') as f:
    f.write(chat_content)

print("Chat.tsx successfully processed!")
