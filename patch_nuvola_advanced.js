const fs = require('fs');

// 1. UPDATE SERVER ACTION (chat.ts)
let chatTs = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');
chatTs = chatTs.replace(
  'export async function parseNuvolaScreenshot(base64Image: string, mimeType: string) {',
  'export async function parseNuvolaScreenshot(base64Image: string, mimeType: string, fallbackDate?: string) {'
);

const oldPromptPart = `Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura.`;
const newPromptPart = `Data di default (se non si vede nell'immagine): \${fallbackDate || "Prossima lezione"}
Se l'immagine taglia l'intestazione, usa la data di default come dueDate per tutti i compiti.
Attenzione ai duplicati: ignora cose non pertinenti.
Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura.`;

chatTs = chatTs.replace(oldPromptPart, newPromptPart);
fs.writeFileSync('src/app/actions/chat.ts', chatTs);


// 2. UPDATE PARENT DASHBOARD (ParentDashboard.tsx)
let parentTs = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// Add state for date
parentTs = parentTs.replace(
  'const [isUploadingNuvola, setIsUploadingNuvola] = useState(false);',
  'const [isUploadingNuvola, setIsUploadingNuvola] = useState(false);\n  const [nuvolaDate, setNuvolaDate] = useState("");'
);

// Update handleNuvolaUpload to pass the date and deduplicate
const oldHandle = `const res = await parseNuvolaScreenshot(base64Data, mimeType);
      
      if (res.success && res.items) {
        // Merge with existing items
        const newItems = [...agendaItems, ...res.items];
        await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: newItems }, { merge: true });
        alert("Completato! " + res.items.length + " compiti/verifiche inseriti nel Diario.");
      }`;

const newHandle = `const res = await parseNuvolaScreenshot(base64Data, mimeType, nuvolaDate);
      
      if (res.success && res.items) {
        // Logica Anti-Duplicati
        let addedCount = 0;
        const itemsToAdd = res.items.filter((newItem: any) => {
          const normNew = (newItem.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
          // Controlla se c'è già un compito con la stessa materia e descrizione molto simile
          const isDuplicate = agendaItems.some(ex => {
            const normEx = (ex.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normEx === normNew) return true;
            // Se le descrizioni sono lunghe e si sovrappongono per più di 20 caratteri, è un duplicato
            if (normEx.length > 20 && normNew.length > 20 && (normEx.includes(normNew.substring(0,20)) || normNew.includes(normEx.substring(0,20)))) return true;
            return false;
          });
          if (!isDuplicate) addedCount++;
          return !isDuplicate;
        });

        const newItems = [...agendaItems, ...itemsToAdd];
        await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: newItems }, { merge: true });
        
        if (addedCount === 0) {
           alert("Nessun compito nuovo trovato. Erano già tutti nel Diario!");
        } else {
           alert("Completato! " + addedCount + " nuovi compiti inseriti (ignorati eventuali duplicati).");
        }
      }`;

parentTs = parentTs.replace(oldHandle, newHandle);

// Add the Date Input UI
const uiUploadTarget = `<div onClick={() => fileInputRef.current?.click()} className={\`p-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors \${`;

const uiUploadReplacement = `
              {/* Selettore Data Opzionale */}
              <div className="mb-3">
                <label className={\`block text-xs font-bold mb-1 \${isDarkMode ? 'text-gray-300' : 'text-slate-700'}\`}>Data di scadenza (opzionale se l'immagine è tagliata):</label>
                <input 
                  type="date" 
                  value={nuvolaDate}
                  onChange={(e) => setNuvolaDate(e.target.value)}
                  className={\`w-full text-sm px-3 py-2 rounded-lg border \${
                    isDarkMode ? 'bg-[#111B21] border-[#2A3942] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }\`}
                />
              </div>
              
              <div onClick={() => fileInputRef.current?.click()} className={\`p-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors \${`;

parentTs = parentTs.replace(uiUploadTarget, uiUploadReplacement);

fs.writeFileSync('src/components/ParentDashboard.tsx', parentTs);
console.log("Patched Nuvola Anti-Duplicate & Date Picker");
