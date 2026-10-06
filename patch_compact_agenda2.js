const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const startIndex = content.indexOf('<div className={`p-5 rounded-2xl border ${');
const endIndex = content.indexOf('{/* List of current agenda items (Mock) */}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const elegantToolbar = `<div className="flex gap-3">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleNuvolaUpload} />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingNuvola}
                className={\`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 \${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 text-emerald-400 hover:from-emerald-900/60' 
                    : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 hover:from-emerald-100'
                }\`}
              >
                <span className="text-2xl">{isUploadingNuvola ? '⏳' : '📸'}</span>
                <span className="text-xs font-bold text-center leading-tight">{isUploadingNuvola ? 'Analisi IA...' : 'Foto Registro'}</span>
                <span className="text-[9px] opacity-70 text-center leading-tight">Auto-rileva Compiti & Voti</span>
              </button>

              <button 
                onClick={() => setShowManualModal(true)}
                className={\`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 \${
                  isDarkMode 
                    ? 'bg-[#202C33] border border-[#2A3942] text-gray-300 hover:bg-[#2A3942]' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <span className="text-2xl">✍️</span>
                <span className="text-xs font-bold text-center leading-tight">Scrivi a Mano</span>
                <span className="text-[9px] opacity-70 text-center leading-tight">Aggiungi senza foto</span>
              </button>
            </div>

            `;
  
  content = content.substring(0, startIndex) + elegantToolbar + content.substring(endIndex);
  fs.writeFileSync('src/components/ParentDashboard.tsx', content);
  console.log("Compact agenda layout patched via index!");
} else {
  console.log("Could not find boundaries");
}
