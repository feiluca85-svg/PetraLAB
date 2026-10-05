const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const emptyState = `{/* Empty State per Ora */}
                <div className={\`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm \${
                  isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'
                }\`}>
                  <span className="text-5xl mb-4 opacity-80">{listFilter === 'compiti' ? '📚' : '🎯'}</span>
                  <p className={\`font-bold text-[15px] mb-2 \${isDarkMode ? 'text-gray-200' : 'text-slate-700'}\`}>
                    Tutto completato!
                  </p>
                  <p className={\`text-[13px] leading-relaxed max-w-[250px] \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                    Non hai {listFilter === 'compiti' ? 'compiti' : 'verifiche'} in sospeso. 
                    Mamma o papà possono inserirli con lo <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>Screenshot Magico</strong>, o puoi dirlo tu al Tutor in chat!
                  </p>
                </div>`;

const filteredTasks = `
                {agendaItems.filter(item => item.type === (listFilter === 'compiti' ? 'compito' : 'verifica')).length === 0 ? (
                  <div className={\`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm \${
                    isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'
                  }\`}>
                    <span className="text-5xl mb-4 opacity-80">{listFilter === 'compiti' ? '📚' : '🎯'}</span>
                    <p className={\`font-bold text-[15px] mb-2 \${isDarkMode ? 'text-gray-200' : 'text-slate-700'}\`}>
                      Tutto completato!
                    </p>
                    <p className={\`text-[13px] leading-relaxed max-w-[250px] \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                      Non hai {listFilter === 'compiti' ? 'compiti' : 'verifiche'} in sospeso. 
                      Mamma o papà possono inserirli con lo <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>Screenshot Magico</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {agendaItems.filter(item => item.type === (listFilter === 'compiti' ? 'compito' : 'verifica')).map((item, idx) => (
                      <div key={idx} className={\`p-4 rounded-xl border flex gap-3 shadow-sm \${
                        isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-200'
                      }\`}>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                          {item.type === 'verifica' ? '🚨' : '📝'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className={\`font-bold \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>{item.subject}</h4>
                            <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${isDarkMode ? 'bg-[#111B21] text-emerald-400' : 'bg-slate-100 text-emerald-700'}\`}>{item.dueDate}</span>
                          </div>
                          <p className={\`text-sm mt-1 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}\`}>{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
`;

content = content.replace(emptyState, filteredTasks.trim());
content = content.replace(
  `0 da fare`,
  `{agendaItems.filter(item => item.type === (listFilter === 'compiti' ? 'compito' : 'verifica')).length} da fare`
);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Done");
