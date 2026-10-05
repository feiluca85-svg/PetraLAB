const fs = require("fs");
let content = fs.readFileSync("src/components/Chat.tsx", "utf-8");

const startStr = `{filteredTutors.map((tutor) => {`;
const endStr = `            })}`;

const idx1 = content.indexOf(startStr);
const idx2 = content.indexOf(endStr, idx1) + endStr.length;

if(idx1 !== -1 && idx2 !== -1) {
  const replacement = `
            {listFilter === "tutte" ? (
              filteredTutors.map((tutor) => {
                const tutorChat = chatsByTutor[tutor.id];
                const mem = subjectsMemory[tutor.id];
                const lastMsg = tutorChat?.messages && tutorChat.messages.length > 0 
                  ? tutorChat.messages[tutorChat.messages.length - 1] 
                  : null;
                const lastGrade = mem?.grades && mem.grades.length > 0 
                  ? mem.grades[mem.grades.length - 1] 
                  : null;

                return (
                  <div
                    key={tutor.id}
                    onClick={() => handleOpenChat(tutor)}
                    className={\`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors \${
                      isDarkMode ? "hover:bg-[#202C33] active:bg-[#222E35]" : "hover:bg-slate-50 active:bg-slate-100"
                    }\`}
                  >
                    {/* Foto Profilo Circolare 52px con Anello di Stato Verde */}
                    <div className="relative shrink-0">
                      <div className={\`w-[52px] h-[52px] rounded-full flex items-center justify-center text-3xl border-2 \${
                        tutorChat?.lastUpdated === getCurrentTime() 
                          ? "border-[#25D366] p-0.5" 
                          : "border-transparent"
                      } \${isDarkMode ? "bg-[#202C33]" : "bg-slate-100"}\`}>
                        <span>{tutor.avatar}</span>
                      </div>

                      {lastGrade && (
                        <span className={\`absolute -bottom-1 -right-1 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-xs \${
                          isDarkMode ? "bg-[#00A884] text-[#111B21] border-[#111B21]" : "bg-[#25D366] text-white border-white"
                        }\`} title={\`Ultimo voto: \${lastGrade.grade}\`}>
                          {lastGrade.grade.toString().charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Informazioni Contatto e Ultimo Messaggio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className={\`font-bold text-[16px] truncate \${
                            isDarkMode ? "text-[#E9EDEF]" : "text-slate-900"
                          }\`}>
                            {tutor.name}
                          </h2>
                          <span className={\`text-[11px] font-semibold px-2 py-0.2 rounded-full shrink-0 \${
                            isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }\`}>
                            {tutor.subject.split(" ")[0]}
                          </span>
                        </div>
                        <span className={\`text-xs font-medium shrink-0 ml-2 \${
                          lastMsg?.role === "user" 
                            ? (isDarkMode ? "text-[#8696A0]" : "text-slate-400")
                            : "text-[#25D366] font-semibold"
                        }\`}>
                          {tutorChat?.lastUpdated || "Oggi"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={\`text-[13.5px] truncate flex items-center gap-1.5 \${
                          isDarkMode ? "text-[#8696A0]" : "text-slate-500"
                        }\`}>
                          {lastMsg ? (
                            <>
                              {lastMsg.role === "user" ? (
                                <span className="text-[#53BDEB] font-bold text-xs shrink-0">✓✓ Tu: </span>
                              ) : (
                                <span className="text-slate-400 text-xs shrink-0">✓ </span>
                              )}
                              <span className="truncate">{lastMsg.text}</span>
                            </>
                          ) : (
                            <span className={\`italic font-medium \${
                              isDarkMode ? "text-[#00A884]" : "text-emerald-700"
                            }\`}>
                              Tocca per iniziare i compiti 💬
                            </span>
                          )}
                        </p>
                        
                        {lastGrade && (
                          <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 \${
                            isDarkMode 
                              ? "bg-[#00A884]/15 text-[#00A884] border border-[#00A884]/30" 
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }\`}>
                            Voto: {lastGrade.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : listFilter === "voti" ? (
              <div className={\`p-5 mt-10 text-center flex flex-col items-center justify-center h-full opacity-60 \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                <span className="text-4xl mb-3">📊</span>
                <p className="font-bold">Bacheca Voti</p>
                <p className="text-sm mt-1">In arrivo con il prossimo aggiornamento.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5 pb-10">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className={\`font-bold text-lg \${isDarkMode ? "text-white" : "text-slate-800"}\`}>
                    {listFilter === "compiti" ? "📝 Diario Compiti" : "🚨 Prossime Verifiche"}
                  </h3>
                  <span className={\`text-xs font-semibold px-2.5 py-1 rounded-full \${isDarkMode ? "bg-[#202C33] text-[#8696A0]" : "bg-slate-200 text-slate-600"}\`}>
                    0 da fare
                  </span>
                </div>
                
                {/* Empty State per Ora */}
                <div className={\`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm \${
                  isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                }\`}>
                  <span className="text-5xl mb-4 opacity-80">{listFilter === "compiti" ? "📚" : "🎯"}</span>
                  <p className={\`font-bold text-[15px] mb-2 \${isDarkMode ? "text-gray-200" : "text-slate-700"}\`}>
                    Tutto completato!
                  </p>
                  <p className={\`text-[13px] leading-relaxed max-w-[250px] \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                    Non hai {listFilter === "compiti" ? "compiti" : "verifiche"} in sospeso. 
                    Mamma o papà possono inserirli con lo <strong className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}>Screenshot Magico</strong>, o puoi dirlo tu al Tutor in chat!
                  </p>
                </div>
              </div>
            )}`;
  
  content = content.slice(0, idx1) + replacement.trim() + content.slice(idx2);
  
  content = content.replace(
    `className={\`flex-1 overflow-y-auto divide-y \${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}\`}`,
    `className={\`flex-1 overflow-y-auto \${listFilter === 'tutte' ? 'divide-y' : ''} \${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}\`}`
  );
  
  fs.writeFileSync("src/components/Chat.tsx", content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find blocks");
}
