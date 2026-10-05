const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const modalJSX = `
      {/* Modale Inserimento Manuale */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={\`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] \${isDarkMode ? "bg-[#111B21] border border-[#2A3942]" : "bg-white"}\`}>
            
            <div className={\`p-4 border-b flex items-center justify-between \${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}\`}>
              <h3 className="font-bold text-lg">Inserimento Manuale</h3>
              <button onClick={() => setShowManualModal(false)} className={\`w-8 h-8 flex items-center justify-center rounded-full \${isDarkMode ? "bg-[#202C33] text-gray-400" : "bg-slate-100 text-slate-500"}\`}>✕</button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex bg-slate-100 dark:bg-[#202C33] p-1 rounded-xl">
                <button 
                  onClick={() => setManualType("task")}
                  className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${manualType === 'task' ? 'bg-white dark:bg-[#111B21] shadow-sm text-emerald-600' : 'text-gray-500'}\`}
                >
                  📝 Compito/Verifica
                </button>
                <button 
                  onClick={() => setManualType("grade")}
                  className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${manualType === 'grade' ? 'bg-white dark:bg-[#111B21] shadow-sm text-blue-500' : 'text-gray-500'}\`}
                >
                  📊 Voto Preso
                </button>
              </div>

              {manualType === "task" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Tipo</label>
                    <select value={manualFormData.type} onChange={(e) => setManualFormData({...manualFormData, type: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`}>
                      <option value="Compito">Compito per casa</option>
                      <option value="Verifica">Verifica / Interrogazione</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Materia</label>
                    <input type="text" placeholder="Es. Matematica" value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Descrizione</label>
                    <textarea placeholder="Es. Esercizi pag 45 n. 1-2-3" value={manualFormData.description} onChange={(e) => setManualFormData({...manualFormData, description: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none min-h-[80px] \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Data Scadenza</label>
                    <input type="text" placeholder="Es. Giovedì 10 Ottobre" value={manualFormData.dueDate} onChange={(e) => setManualFormData({...manualFormData, dueDate: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Materia (Tutor associato)</label>
                    <select value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`}>
                      <option value="">Seleziona il tutor/materia...</option>
                      {tutors.map(t => <option key={t.id} value={t.id}>{t.subject} ({t.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Voto</label>
                    <input type="text" placeholder="Es. 8, 7.5, Ottimo" value={manualFormData.grade} onChange={(e) => setManualFormData({...manualFormData, grade: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70">Argomento Verifica (Opzionale)</label>
                    <input type="text" placeholder="Es. Frazioni, Poesia..." value={manualFormData.topic} onChange={(e) => setManualFormData({...manualFormData, topic: e.target.value})} className={\`w-full p-2.5 rounded-xl border outline-none \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} />
                  </div>
                </>
              )}

              <button 
                onClick={handleManualSubmit}
                className="w-full py-3 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all"
              >
                Salva {manualType === 'task' ? 'Compito' : 'Voto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace(/<\/div>\s*<\/div>\s*\);\s*}\s*$/, modalJSX);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Modal successfully added.");
