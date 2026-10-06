const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const targetUI = `<p className={\`text-sm mt-1 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}\`}>{item.description}</p>
                                     </div>
                                   </div>`;

const replacementUI = `<p className={\`text-sm mt-1 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}\`}>{item.description}</p>
                                       {/* Bottoncino "Parla col Tutor" */}
                                       {(() => {
                                         const matchingTutor = TUTORS.find(t => 
                                           t.id === item.subject?.toLowerCase() || 
                                           t.subject.toLowerCase().includes(item.subject?.toLowerCase())
                                         );
                                         if (matchingTutor && !item.isCompleted) {
                                           return (
                                             <button 
                                               onClick={() => setActiveTutor(matchingTutor.id)}
                                               className={\`mt-2 w-max text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm \${
                                                 isDarkMode 
                                                   ? 'bg-[#111B21] border border-[#2A3942] text-emerald-400 hover:bg-[#00A884] hover:text-white' 
                                                   : 'bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                                               }\`}
                                             >
                                               <span className="text-base">{matchingTutor.avatar}</span> Parla col Tutor
                                             </button>
                                           );
                                         }
                                         return null;
                                       })()}
                                     </div>
                                   </div>`;

content = content.replace(targetUI, replacementUI);
fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat.tsx patched with 'Parla col Tutor' button");
