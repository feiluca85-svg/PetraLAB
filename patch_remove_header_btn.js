const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const headerTarget = `<div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Pannello Genitore</h2>
            <button onClick={() => setShowManualModal(true)} className="ml-2 px-3 py-1 text-xs font-bold bg-emerald-500 text-white rounded-full flex items-center gap-1 shadow-sm">
              <span>➕</span> <span className="hidden sm:inline">Aggiungi</span>
            </button>
          </div>`;
          
const headerReplacement = `<div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Pannello Genitore</h2>
          </div>`;

content = content.replace(headerTarget, headerReplacement);
fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Header button removed");
