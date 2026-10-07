const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// 1. Modernize Header
const oldHeader = `            <div className="flex items-center gap-2.5">
              <img 
                src="/icon.png" 
                alt="PetraLAB" 
                className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover shadow-xs bg-emerald-950 shrink-0" 
              />
              <div>
                <h1 className={\`text-[22px] font-black tracking-tight leading-none \${
                  isDarkMode ? 'text-[#25D366]' : 'text-[#1DA851]'
                }\`}>
                  PetraLAB
                </h1>
                <p className={\`text-[11px] font-medium mt-0.5 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}\`}>
                  {levelInfo.title} • <span className="font-semibold text-emerald-600">{stats.xp} XP</span>
                </p>
              </div>
            </div>`;

const newHeader = `            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="PetraLAB" 
                className="w-10 h-10 rounded-2xl shadow-sm object-cover bg-emerald-950 shrink-0" 
              />
              <div className="flex flex-col justify-center">
                <h1 className={\`text-2xl font-black tracking-tight leading-none \${
                  isDarkMode ? 'text-[#25D366]' : 'text-[#1DA851]'
                }\`}>
                  PetraLAB
                </h1>
                <p className={\`text-[12px] font-bold mt-1 tracking-wide \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                  {levelInfo.title} <span className="opacity-50 mx-1">•</span> <span className="text-emerald-500">{stats.xp} XP</span>
                </p>
              </div>
            </div>`;
content = content.replace(oldHeader, newHeader);

// 2. Modernize Filters
const oldFilters = /\{\/\* Search Bar \*\/\}[\s\S]*?\{\/\* Filtro Lista \(Tutte, Compiti, Verifiche, Voti\) \*\/\}[\s\S]*?<\/div>/;

const newFilters = `{/* Search Bar */}
          <div className="px-4 py-2">
            <div className={\`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all \${
              isDarkMode ? 'bg-[#202C33] border border-[#2A3942]' : 'bg-slate-100 border border-slate-200'
            }\`}>
              <span className={\`text-lg \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}\`}>◯</span>
              <input 
                type="text" 
                placeholder="Cerca chat o tutor..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={\`bg-transparent w-full outline-none font-medium text-[15px] placeholder-opacity-70 \${
                  isDarkMode ? 'text-white placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-400'
                }\`}
              />
            </div>
          </div>

          {/* Filtro Lista (Tutte, Compiti, Verifiche, Voti) */}
          <div className="flex gap-2.5 px-4 py-2 overflow-x-auto no-scrollbar border-b border-transparent">
            <span 
              onClick={() => setListFilter('tutte')}
              className={\`\${
                listFilter === 'tutte' 
                  ? (isDarkMode ? 'bg-[#00A884]/25 text-[#00A884]' : 'bg-emerald-100 text-emerald-800') 
                  : (isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              } font-bold px-4 py-2 rounded-2xl cursor-pointer transition-all shadow-sm text-sm shrink-0\`}
            >
              Tutte
            </span>
            <span 
              onClick={() => setListFilter('compiti')}
              className={\`\${
                listFilter === 'compiti' 
                  ? (isDarkMode ? 'bg-[#00A884]/25 text-[#00A884]' : 'bg-emerald-100 text-emerald-800') 
                  : (isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              } font-bold px-4 py-2 rounded-2xl cursor-pointer transition-all shadow-sm text-sm shrink-0\`}
            >
              Compiti
            </span>
            <span 
              onClick={() => setListFilter('verifiche')}
              className={\`\${
                listFilter === 'verifiche' 
                  ? (isDarkMode ? 'bg-[#00A884]/25 text-[#00A884]' : 'bg-emerald-100 text-emerald-800') 
                  : (isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              } font-bold px-4 py-2 rounded-2xl cursor-pointer transition-all shadow-sm text-sm shrink-0\`}
            >
              Verifiche
            </span>
            <span 
              onClick={() => setListFilter('voti')}
              className={\`\${
                listFilter === 'voti'
                  ? (isDarkMode ? 'bg-[#00A884]/25 text-[#00A884]' : 'bg-emerald-100 text-emerald-800')
                  : (isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              } font-bold px-4 py-2 rounded-2xl cursor-pointer transition-all shadow-sm text-sm shrink-0\`}
            >Voti</span>
          </div>`;
content = content.replace(oldFilters, newFilters);

// 3. Modernize Tutor List Layout
// Change w-[52px] h-[52px] to w-14 h-14 and improve sizes
content = content.replace(/w-\[52px\] h-\[52px\] rounded-full/g, "w-16 h-16 rounded-3xl shadow-sm");
content = content.replace(/text-\[16px\]/g, "text-[17px]");
content = content.replace(/<span className=\{\`text-\[11px\] font-semibold px-2 py-0.2 rounded-full/g, "<span className={\`text-[11px] font-bold px-2.5 py-0.5 rounded-lg");
content = content.replace(/px-4 py-3.5/g, "px-4 py-4");
content = content.replace(/text-\[13.5px\]/g, "text-[14px]");

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Chat UI layout modernized!");
