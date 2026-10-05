const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// 1. Add states
const stateTarget = `const [activeSubTab, setActiveSubTab] = useState("agenda");`;
const stateReplacement = `const [activeSubTab, setActiveSubTab] = useState("agenda");
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<"task" | "grade">("task");
  const [manualFormData, setManualFormData] = useState({
    subject: "",
    type: "Compito",
    description: "",
    dueDate: "",
    grade: "",
    topic: ""
  });`;
content = content.replace(stateTarget, stateReplacement);

// 2. Add handleManualSubmit
const fnTarget = `const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`;
const fnReplacement = `const handleManualSubmit = async () => {
    try {
      const userRef = doc(db, "petralab_users", "studente_demo");
      if (manualType === "task") {
        if (!manualFormData.subject || !manualFormData.description) return alert("Inserisci materia e descrizione.");
        const newTask = {
          id: \`manual_\${Date.now()}\`,
          subject: manualFormData.subject,
          type: manualFormData.type,
          description: manualFormData.description,
          dueDate: manualFormData.dueDate || new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          isCompleted: false
        };
        const updatedAgenda = [...agendaItems, newTask];
        setAgendaItems(updatedAgenda);
        await setDoc(userRef, { agendaItems: updatedAgenda }, { merge: true });
      } else {
        if (!manualFormData.subject || !manualFormData.grade) return alert("Inserisci materia (Tutor) e voto.");
        const dateStr = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
        const mem = subjectsMemory[manualFormData.subject] || { grades: [], weaknesses: [] };
        const updatedGrades = [...(mem.grades || []), {
          grade: manualFormData.grade,
          topic: manualFormData.topic || "Inserito manualmente",
          date: dateStr
        }];
        const updatedMemMap = { ...subjectsMemory, [manualFormData.subject]: { ...mem, grades: updatedGrades } };
        setSubjectsMemory(updatedMemMap);
        await setDoc(userRef, { subjectsMemory: updatedMemMap }, { merge: true });
      }
      setShowManualModal(false);
      setManualFormData({ subject: "", type: "Compito", description: "", dueDate: "", grade: "", topic: "" });
    } catch (err) {
      alert("Errore salvataggio manuale.");
    }
  };

  const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`;
content = content.replace(fnTarget, fnReplacement);

// 3. Add Header Button
const headerTarget = `<h2 className="text-xl font-black">Pannello Genitore</h2>`;
const headerReplacement = `<div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Pannello Genitore</h2>
            <button onClick={() => setShowManualModal(true)} className="ml-2 px-3 py-1 text-xs font-bold bg-emerald-500 text-white rounded-full flex items-center gap-1 shadow-sm">
              <span>➕</span> <span className="hidden sm:inline">Aggiungi</span>
            </button>
          </div>`;
content = content.replace(headerTarget, headerReplacement);

// 4. Inject Modal right before the final closing div
const modalJSX = `
      {/* Modale Inserimento Manuale */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={\`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] \${isDarkMode ? "bg-[#111B21] border border-[#2A3942]" : "bg-white"}\`}>
            <div className={\`p-4 border-b flex items-center justify-between \${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}\`}>
              <h3 className="font-bold text-lg">Inserimento Manuale</h3>
              <button onClick={() => setShowManualModal(false)} className={\`w-8 h-8 rounded-full \${isDarkMode ? "bg-[#202C33] text-gray-400" : "bg-slate-100 text-slate-500"}\`}>✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex bg-slate-100 dark:bg-[#202C33] p-1 rounded-xl">
                <button onClick={() => setManualType("task")} className={\`flex-1 py-2 text-sm font-bold rounded-lg \${manualType === 'task' ? 'bg-white dark:bg-[#111B21] shadow-sm text-emerald-600' : 'text-gray-500'}\`}>📝 Compito/Verifica</button>
                <button onClick={() => setManualType("grade")} className={\`flex-1 py-2 text-sm font-bold rounded-lg \${manualType === 'grade' ? 'bg-white dark:bg-[#111B21] shadow-sm text-blue-500' : 'text-gray-500'}\`}>📊 Voto Preso</button>
              </div>
              {manualType === "task" ? (
                <>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Tipo</label><select value={manualFormData.type} onChange={(e) => setManualFormData({...manualFormData, type: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`}><option>Compito</option><option>Verifica</option></select></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Materia</label><input type="text" value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Descrizione</label><textarea value={manualFormData.description} onChange={(e) => setManualFormData({...manualFormData, description: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Data (es. Giovedì 10 Ottobre)</label><input type="text" value={manualFormData.dueDate} onChange={(e) => setManualFormData({...manualFormData, dueDate: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} /></div>
                </>
              ) : (
                <>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Tutor/Materia</label><select value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`}><option value="">Seleziona...</option>{tutors.map(t => <option key={t.id} value={t.id}>{t.subject}</option>)}</select></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Voto</label><input type="text" value={manualFormData.grade} onChange={(e) => setManualFormData({...manualFormData, grade: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Argomento</label><input type="text" value={manualFormData.topic} onChange={(e) => setManualFormData({...manualFormData, topic: e.target.value})} className={\`w-full p-2.5 rounded-xl border \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`} /></div>
                </>
              )}
              <button onClick={handleManualSubmit} className="w-full py-3 mt-2 rounded-xl bg-emerald-500 text-white font-bold text-sm">Salva</button>
            </div>
          </div>
        </div>
      )}
`;
const insertionPoint = '      </div>\n    </div>\n  );\n}';
content = content.replace(insertionPoint, modalJSX + insertionPoint);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Modal patched cleanly");
