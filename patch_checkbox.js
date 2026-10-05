const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// 1. Add toggle function inside the component
const toggleFunction = `
  const handleToggleAgendaItem = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      const updated = agendaItems.map(item => 
        item.id === id ? { ...item, isCompleted: !currentStatus } : item
      );
      // Aggiornamento ottimistico locale
      setAgendaItems(updated);
      
      const { doc, setDoc } = require("firebase/firestore");
      const { db } = require("@/lib/firebase");
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
    } catch (err) {
      console.error("Errore durante l'aggiornamento del compito:", err);
    }
  };
`;

// Find where to insert it (after setAgendaItems state)
const stateMatch = `const [agendaItems, setAgendaItems] = useState<any[]>([]);`;
content = content.replace(stateMatch, stateMatch + '\\n' + toggleFunction);


// 2. Modify the rendering of the items
const renderMatch = `<div key={idx} className={\`p-4 rounded-xl border flex gap-3 shadow-sm \${
                        isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200"
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
                      </div>`;

const newRender = `<div key={idx} className={\`p-4 rounded-xl border flex gap-3 shadow-sm transition-all \${
                        item.isCompleted ? (isDarkMode ? 'bg-[#111B21] border-[#2A3942] opacity-50' : 'bg-slate-50 border-slate-100 opacity-60') : (isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200")
                      }\`}>
                        <div 
                          onClick={(e) => handleToggleAgendaItem(e, item.id, item.isCompleted)}
                          className={\`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 cursor-pointer border-2 transition-all \${
                            item.isCompleted 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'bg-slate-100 border-slate-300 text-transparent hover:border-emerald-400'
                          }\`}
                        >
                          {item.isCompleted ? '✓' : ''}
                        </div>
                        <div className={\`flex-1 \${item.isCompleted ? 'line-through' : ''}\`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                              <h4 className={\`font-bold \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>{item.subject}</h4>
                            </div>
                            <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${isDarkMode ? 'bg-[#111B21] text-emerald-400' : 'bg-slate-100 text-emerald-700'}\`}>{item.dueDate}</span>
                          </div>
                          <p className={\`text-sm mt-1 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}\`}>{item.description}</p>
                        </div>
                      </div>`;

content = content.replace(renderMatch, newRender);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat patched with checkbox");
