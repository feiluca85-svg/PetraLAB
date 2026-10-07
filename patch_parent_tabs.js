const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const oldTabs = `      {/* Pillole Sotto-Navigazione WhatsApp */}
      <div className={\`flex gap-2 p-3 border-b text-xs overflow-x-auto no-scrollbar \${
        isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-white border-slate-100"
      }\`}>
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
          onClick={() => setActiveSubTab("chats")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all \${
            activeSubTab === "chats"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          💬 Chat in Diretta
        </button>

        <button
          onClick={() => setActiveSubTab("tutors")}
          className={\`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all \${
            activeSubTab === "tutors"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }\`}
        >
          👨‍🏫 Gestisci Tutor
        </button>
      </div>`;

const newTabs = `      {/* Pillole Sotto-Navigazione WhatsApp */}
      <div className={\`flex gap-2 p-3 border-b text-xs overflow-x-auto no-scrollbar \${
        isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-white border-slate-100"
      }\`}>
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

if (content.includes("👨‍🏫 Gestisci Tutor")) {
  content = content.replace(oldTabs, newTabs);
  fs.writeFileSync('src/components/ParentDashboard.tsx', content);
  console.log("ParentDashboard tabs replaced correctly!");
} else {
  console.log("Could not find the old tabs to replace!");
}
