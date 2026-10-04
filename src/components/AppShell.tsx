"use client";

import { useState, useEffect } from "react";
import Chat from "./Chat";
import GamificationProfile from "./GamificationProfile";
import { useTutors } from "@/hooks/useTutors";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<"chat" | "profile">("chat");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { tutors, loading } = useTutors();

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("petralab_theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      localStorage.setItem("petralab_theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const [isChatOpen, setIsChatOpen] = useState(false);

  if (loading) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${isDarkMode ? 'bg-[#111B21]' : 'bg-white'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008069]"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto relative sm:border-x sm:border-slate-200 ${isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-white border-slate-200'}`}>
      
      {/* Contenuto Attivo */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" ? (
          <Chat tutors={tutors} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onChatOpen={setIsChatOpen} />
        ) : (
          <GamificationProfile isDarkMode={isDarkMode} />
        )}
      </div>

      {/* Bottom Navigation Bar (Hidden when chat is open) */}
      {!isChatOpen && (
        <div className={`flex items-center justify-around border-t pb-safe z-50 ${isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-white border-slate-200'}`}>
          <button 
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === "chat" 
                ? (isDarkMode ? "text-[#00A884]" : "text-[#008069]") 
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-300" : "text-slate-400 hover:text-slate-600")
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-semibold">Chat</span>
          </button>

          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === "profile" 
                ? (isDarkMode ? "text-[#00A884]" : "text-[#008069]") 
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-300" : "text-slate-400 hover:text-slate-600")
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-semibold">Profilo</span>
          </button>
        </div>
      )}

    </div>
  );
}
