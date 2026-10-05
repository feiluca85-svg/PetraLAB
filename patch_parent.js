const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// 1. Imports
content = content.replace(
  `import { useState, useEffect } from "react";`,
  `import { useState, useEffect, useRef } from "react";\nimport { parseNuvolaScreenshot } from "@/app/actions/chat";`
);
content = content.replace(
  `import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from "firebase/firestore";`,
  `import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, setDoc } from "firebase/firestore";`
);

// 2. States
content = content.replace(
  `const [isTutorManagerOpen, setIsTutorManagerOpen] = useState(false);`,
  `const [isTutorManagerOpen, setIsTutorManagerOpen] = useState(false);\n  const [agendaItems, setAgendaItems] = useState<any[]>([]);\n  const [isUploadingNuvola, setIsUploadingNuvola] = useState(false);\n  const fileInputRef = useRef<HTMLInputElement>(null);`
);

// 3. Update Snapshot
content = content.replace(
  `        if (data.subjectsMemory) {\n          setSubjectsMemory(data.subjectsMemory);\n        }`,
  `        if (data.subjectsMemory) {\n          setSubjectsMemory(data.subjectsMemory);\n        }\n        if (data.agendaItems) {\n          setAgendaItems(data.agendaItems);\n        }`
);

// 4. Add fileToBase64 and handleNuvolaUpload
const uploadLogic = `
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingNuvola(true);
    try {
      const base64Str = await fileToBase64(file);
      const parts = base64Str.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      
      const res = await parseNuvolaScreenshot(base64Data, mimeType);
      
      if (res.success && res.items) {
        // Merge with existing items
        const newItems = [...agendaItems, ...res.items];
        await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: newItems }, { merge: true });
        alert("Completato! " + res.items.length + " compiti/verifiche inseriti nel Diario.");
      } else {
        alert("Errore durante la lettura: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Errore imprevisto. Riprova.");
    } finally {
      setIsUploadingNuvola(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
`;

content = content.replace(
  `  // Ascolta statistiche e chat dell'alunna`,
  uploadLogic + `\n  // Ascolta statistiche e chat dell'alunna`
);

// 5. Update UI
content = content.replace(
  `<div className={\`p-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors \${\n                isDarkMode ? 'border-[#2A3942] hover:bg-[#2A3942]/50' : 'border-slate-300 hover:bg-slate-50'\n              }\`}>`,
  `<input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleNuvolaUpload} />\n              <div onClick={() => fileInputRef.current?.click()} className={\`p-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors \${\n                isDarkMode ? 'border-[#2A3942] hover:bg-[#2A3942]/50' : 'border-slate-300 hover:bg-slate-50'\n              }\`}>`
);

content = content.replace(
  `<p className={\`font-bold text-sm \${isDarkMode ? 'text-gray-300' : 'text-slate-600'}\`}>Tocca per caricare lo screenshot</p>`,
  `<p className={\`font-bold text-sm \${isDarkMode ? 'text-gray-300' : 'text-slate-600'}\`}>{isUploadingNuvola ? 'Analisi IA in corso (attendere)...' : 'Tocca per caricare lo screenshot'}</p>`
);

content = content.replace(
  `<span className="text-xs font-semibold text-slate-400">0 Attivi</span>`,
  `<span className="text-xs font-semibold text-slate-400">{agendaItems.length} Attivi</span>`
);

content = content.replace(
  `<div className="p-8 text-center opacity-60">
                <span className="text-3xl mb-2 block">🧹</span>
                <p className="text-sm font-semibold">Tutto pulito!</p>
                <p className="text-xs">Nessun compito inserito finora.</p>
              </div>`,
  `{agendaItems.length === 0 ? (
              <div className="p-8 text-center opacity-60">
                <span className="text-3xl mb-2 block">🧹</span>
                <p className="text-sm font-semibold">Tutto pulito!</p>
                <p className="text-xs">Nessun compito inserito finora.</p>
              </div>
            ) : (
              <div className={\`divide-y \${isDarkMode ? 'divide-[#2A3942]' : 'divide-slate-100'}\`}>
                {agendaItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3">
                    <span className="text-xl shrink-0">{item.type === 'verifica' ? '🚨' : '📝'}</span>
                    <div>
                      <h4 className={\`text-sm font-bold \${isDarkMode ? 'text-gray-200' : 'text-slate-800'}\`}>{item.subject}</h4>
                      <p className={\`text-xs \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>{item.description}</p>
                      <span className={\`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded \${isDarkMode ? 'bg-[#111B21] text-emerald-400' : 'bg-slate-100 text-emerald-700'}\`}>{item.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}`
);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Done");
