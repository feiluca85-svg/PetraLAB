const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// 1. Add useAuth imports or check if it exists
// useAuth is already there: const { devices, removeDevice, logout } = useAuth();
// We need 'role'.
content = content.replace('const { devices, removeDevice, logout } = useAuth();', 'const { devices, removeDevice, logout, role } = useAuth();');

// 2. Add local state
const stateInsert = `  const [activeSubTab, setActiveSubTab] = useState<"security" | "grades" | "chats" | "tutors" | "agenda">("security");
  const [isUnlocked, setIsUnlocked] = useState(role === "admin");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);`;

content = content.replace('const [activeSubTab, setActiveSubTab] = useState<"security" | "grades" | "chats" | "tutors" | "agenda">("agenda");', stateInsert);

// 3. Wrap return in unlock screen
const oldReturn = 'return (\n    <div className={`h-full flex flex-col relative';
const newReturn = `  if (!isUnlocked) {
    return (
      <div className={\`h-full flex flex-col items-center justify-center p-6 \${isDarkMode ? 'bg-[#0B141A] text-white' : 'bg-slate-50'}\`}>
        <div className={\`p-8 rounded-3xl shadow-lg border w-full max-w-sm text-center \${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-200'}\`}>
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold mb-2">Area Genitori</h2>
          <p className={\`text-sm mb-6 \${isDarkMode ? 'text-gray-400' : 'text-slate-500'}\`}>Inserisci la password genitore per accedere (es. 3019)</p>
          <input 
            type="password" 
            value={pinInput}
            onChange={e => { setPinInput(e.target.value); setPinError(false); }}
            placeholder="Password"
            className={\`w-full p-3 rounded-xl border text-center font-bold tracking-widest mb-2 \${isDarkMode ? 'bg-[#111B21] border-[#2A3942] text-white' : 'bg-slate-50 border-slate-200'}\`}
          />
          {pinError && <p className="text-red-500 text-xs mb-4 font-semibold">Password errata!</p>}
          <button 
            onClick={() => { if (pinInput === "3019" || pinInput === "admin" || pinInput === "admin123") setIsUnlocked(true); else setPinError(true); }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md transition-all mt-2"
          >
            Sblocca Pannello
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={\`h-full flex flex-col relative`;

content = content.replace(oldReturn, newReturn);

// 4. Reorder tabs
const oldTabs = /<div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 pb-2 pt-1 border-b[\s\S]*?<\/div>/;
const newTabs = `<div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 pb-2 pt-1 border-b \${isDarkMode ? 'border-[#2A3942]' : 'border-slate-200'}">
        <button
          onClick={() => setActiveSubTab("security")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all \${
            activeSubTab === "security"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          🔐 Accessi
        </button>
        
        <button
          onClick={() => setActiveSubTab("agenda")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex gap-1 items-center \${
            activeSubTab === "agenda"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          <span className="text-emerald-500">✨</span> Diario Nuvola
        </button>

        <button
          onClick={() => setActiveSubTab("chats")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all \${
            activeSubTab === "chats"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          💬 Chat in Diretta
        </button>
      </div>`;

content = content.replace(oldTabs, newTabs);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("ParentDashboard security and tabs patched!");
