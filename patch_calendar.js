const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const regex = /<div className="mt-4 flex flex-col gap-3">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/;

const groupedLogic = `
                  <div className="mt-6 flex flex-col gap-6">
                    {(() => {
                      // 1. Filter and sort
                      const tasks = agendaItems.filter(item => item.type?.toLowerCase() === (listFilter === 'compiti' ? 'compito' : 'verifica'));
                      tasks.sort((a, b) => {
                         if (a.dueDate === 'Prossima lezione') return -1;
                         if (b.dueDate === 'Prossima lezione') return 1;
                         return (a.dueDate || '').localeCompare(b.dueDate || '');
                      });

                      // 2. Group
                      const groups = {};
                      tasks.forEach(t => {
                         const d = t.dueDate || 'Senza data';
                         if (!groups[d]) groups[d] = [];
                         groups[d].push(t);
                      });

                      // 3. Helper per date e urgenze
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tStr = tomorrow.toISOString().split('T')[0];

                      const formatDate = (ds) => {
                         if (ds === 'Prossima lezione') return 'Prossima Lezione';
                         if (ds === tStr) return 'Domani';
                         const parts = ds.split('-');
                         if (parts.length === 3) {
                            const d = new Date(parts[0], parts[1]-1, parts[2]);
                            return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
                         }
                         return ds;
                      };

                      // 4. Render
                      return Object.entries(groups).map(([dateStr, dayTasks], gIdx) => {
                         const isTomorrow = dateStr === tStr;
                         return (
                           <div key={gIdx} className="flex flex-col gap-3">
                             <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: isDarkMode ? '#0B141A' : '#EFEAE2' }}>
                               <h3 className={\`text-lg font-black inline-block px-2 py-1 rounded-lg border-b-2 shadow-sm \${
                                 isTomorrow 
                                   ? (isDarkMode ? 'bg-red-950/40 text-red-400 border-red-500' : 'bg-red-50 text-red-600 border-red-500') 
                                   : (isDarkMode ? 'bg-[#202C33] text-emerald-400 border-emerald-400' : 'bg-white text-emerald-700 border-emerald-500')
                               }\`}>
                                 {formatDate(dateStr)} {isTomorrow && ' 🚨'}
                               </h3>
                             </div>
                             
                             <div className="flex flex-col gap-3">
                               {dayTasks.map((item, idx) => {
                                 const isUrgent = isTomorrow && !item.isCompleted;
                                 return (
                                   <div key={idx} className={\`p-4 rounded-xl border flex gap-3 shadow-sm transition-all \${
                                     item.isCompleted 
                                       ? (isDarkMode ? 'bg-[#111B21] border-[#2A3942] opacity-50' : 'bg-slate-50 border-slate-100 opacity-60') 
                                       : isUrgent 
                                         ? (isDarkMode ? 'bg-red-950/20 border-red-500/50' : 'bg-red-50 border-red-300')
                                         : (isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-200')
                                   }\`}>
                                     <div 
                                       onClick={(e) => handleToggleAgendaItem(e, item.id, item.isCompleted)}
                                       className={\`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 cursor-pointer border-2 transition-all \${
                                         item.isCompleted 
                                           ? 'bg-emerald-500 border-emerald-500 text-white' 
                                           : isUrgent
                                             ? (isDarkMode ? 'bg-[#111B21] border-red-400 text-transparent hover:bg-red-500/20' : 'bg-white border-red-400 text-transparent hover:bg-red-100')
                                             : 'bg-slate-100 border-slate-300 text-transparent hover:border-emerald-400'
                                       }\`}
                                     >
                                       {item.isCompleted ? '✓' : ''}
                                     </div>
                                     <div className={\`flex-1 \${item.isCompleted ? 'line-through' : ''}\`}>
                                       <div className="flex justify-between items-start">
                                         <div className="flex items-center gap-2">
                                           <span className="text-lg">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                                           <h4 className={\`font-bold \${
                                             isUrgent && !item.isCompleted ? (isDarkMode ? 'text-red-400' : 'text-red-700') : (isDarkMode ? 'text-gray-200' : 'text-slate-800')
                                           }\`}>{item.subject}</h4>
                                         </div>
                                       </div>
                                       <p className={\`text-sm mt-1 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}\`}>{item.description}</p>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         );
                      });
                    })()}
                  </div>
                )}
`;

content = content.replace(regex, groupedLogic.trim());
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Calendar layout patched");
