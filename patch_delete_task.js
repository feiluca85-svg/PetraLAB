const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const targetFn = '  const handleManualSubmit = async () => {';
const replacementFn = `  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo compito? L'operazione non può essere annullata.")) return;
    try {
      const updatedAgenda = agendaItems.filter((item: any) => item.id !== taskId);
      setAgendaItems(updatedAgenda);
      const userRef = doc(db, "petralab_users", "studente_demo");
      await setDoc(userRef, { agendaItems: updatedAgenda }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Errore durante l'eliminazione del compito.");
    }
  };

  const handleManualSubmit = async () => {`;
content = content.replace(targetFn, replacementFn);

const targetUI = `<div key={idx} className="p-3 flex items-start gap-3">
                    <span className="text-xl shrink-0">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                    <div>
                      <h4 className={\`text-sm font-bold \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>{item.subject}</h4>
                      <p className={\`text-xs \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>{item.description}</p>
                      <span className={\`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded \${isDarkMode ? 'bg-[#111B21] text-emerald-400' : 'bg-slate-100 text-emerald-700'}\`}>{item.dueDate}</span>
                    </div>
                  </div>`;
                  
const replacementUI = `<div key={idx} className="p-3 flex items-start gap-3 justify-between group">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                      <div>
                        <h4 className={\`text-sm font-bold \${item.isCompleted ? 'line-through opacity-50' : ''} \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>{item.subject}</h4>
                        <p className={\`text-xs \${item.isCompleted ? 'line-through opacity-50' : ''} \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>{item.description}</p>
                        <span className={\`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded \${isDarkMode ? 'bg-[#111B21] text-emerald-400' : 'bg-slate-100 text-emerald-700'}\`}>{item.dueDate}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(item.id)}
                      className="text-red-500 opacity-60 hover:opacity-100 hover:bg-red-500/10 p-2 rounded-full transition-all"
                      title="Elimina compito"
                    >
                      🗑️
                    </button>
                  </div>`;
content = content.replace(targetUI, replacementUI);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("ParentDashboard patched");
