const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// 1. Remove ONLY the grades nav button
const gradesNavBtn = `<button
          onClick={() => setActiveSubTab("grades")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all \${
            activeSubTab === "grades"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          📊 Registro Voti & Lacune
        </button>`;
content = content.replace(gradesNavBtn, '');

// 2. Move grades list to agenda tab
const gradesListHTML = `
            {/* Registro Voti unificato nel Diario */}
            <div className={\`mt-6 rounded-2xl border overflow-hidden \${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }\`}>
              <div className={\`p-4 border-b flex items-center justify-between \${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}\`}>
                <h3 className="font-bold text-sm">📊 Registro Voti & Memoria Tutor</h3>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3 bg-slate-50 dark:bg-[#111B21]">
              {tutors.map((tutor) => {
                const mem = subjectsMemory[tutor.id];
                const grades = mem?.grades || [];
                const weaknesses = mem?.weaknesses || [];
                if (grades.length === 0 && weaknesses.length === 0) return null;

                return (
                  <div key={tutor.id} className={\`p-4 rounded-2xl border \${
                    isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
                  }\`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tutor.avatar}</span>
                        <div>
                          <h4 className="font-bold text-sm">{tutor.name}</h4>
                          <span className="text-xs text-emerald-500 font-medium">{tutor.subject}</span>
                        </div>
                      </div>
                      <span className={\`text-xs font-bold px-2.5 py-1 rounded-full \${
                        grades.length > 0 
                          ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-emerald-100 text-emerald-800")
                          : (isDarkMode ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-500")
                      }\`}>
                        {grades.length} voti
                      </span>
                    </div>

                    {grades.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {grades.map((g: any, idx: number) => (
                            <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">
                              Voto: {g.grade} <span className="text-[10px] font-normal">({g.date || "recente"})</span>
                              {g.topic && <span className="block mt-0.5 opacity-80 font-normal italic max-w-[150px] truncate">{g.topic}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}
`;

content = content.replace(
  '            </div>\n          </div>\n        )}\n\n        {/* ========================================================= */\n        {/* 1. SEZIONE CHI ACCEDE & DISPOSITIVI (SICUREZZA GENITORE)  */}',
  gradesListHTML + '\n\n        {/* ========================================================= */\n        {/* 1. SEZIONE CHI ACCEDE & DISPOSITIVI (SICUREZZA GENITORE)  */}'
);

// 3. Remove the entire activeSubTab === "grades" block SAFELY
const startIndex = content.indexOf('{/* ========================================================= */\n        {/* 2. REGISTRO VOTI & LACUNE (MEMORIA TUTOR)                 */}');
if (startIndex !== -1) {
  const endIndex = content.indexOf('{/* ========================================================= */\n        {/* 3. CHAT IN DIRETTA CON I TUTOR (LOG)                      */}');
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
  }
}

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Safe replace done");
