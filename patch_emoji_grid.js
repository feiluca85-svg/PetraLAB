const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

const selectRegex = /<select\s*value=\{formData\.avatar \|\| "🦉"\}[\s\S]*?<\/select>/;

const newGrid = `<div className={\`border rounded-xl p-2 h-48 overflow-y-auto \${isDarkMode ? 'bg-[#0B141A] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}\`}>
                  {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.label} className="mb-3">
                      <div className={\`text-[10px] font-bold uppercase tracking-wider mb-1 sticky top-0 py-1 z-10 \${isDarkMode ? 'bg-[#0B141A] text-gray-400' : 'bg-slate-50 text-slate-500'}\`}>
                        {cat.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cat.emojis.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormData({ ...formData, avatar: emoji })}
                            className={\`w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-transform \${
                              formData.avatar === emoji 
                                ? (isDarkMode ? 'bg-[#00A884]/40 ring-2 ring-[#00A884] scale-110 z-10' : 'bg-emerald-200 ring-2 ring-emerald-500 scale-110 z-10')
                                : (isDarkMode ? 'hover:bg-[#2A3942]' : 'hover:bg-slate-200')
                            }\`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={\`text-xs \${isDarkMode ? 'text-gray-400' : 'text-slate-500'}\`}>Oppure incollane una tu:</span>
                  <input 
                    type="text" 
                    value={formData.avatar || "🦉"}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className={\`w-12 text-center rounded border px-1 py-0.5 outline-none \${isDarkMode ? 'bg-[#111B21] border-[#2A3942] text-white' : 'bg-white border-slate-200'}\`} 
                  />
                </div>`;

content = content.replace(selectRegex, newGrid);

fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("Emoji grid patched");
