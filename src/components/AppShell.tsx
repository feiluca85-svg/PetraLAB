"use client";

import { useState, useEffect } from "react";
import Chat from "./Chat";
import TutorManager from "./TutorManager";
import ParentDashboard from "./ParentDashboard";
import Library from "./Library";
import { useTutors } from "@/hooks/useTutors";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<"chat" | "compiti" | "voti" | "library">("chat");
  const [isParentOpen, setIsParentOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTutorManagerModalOpen, setIsTutorManagerModalOpen] = useState(false);
  
  const { tutors, loading } = useTutors();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#parent") {
        setIsParentOpen(true);
      } else if (hash === "#compiti") {
        setActiveTab("compiti");
        setIsParentOpen(false);
      } else if (hash === "#voti") {
        setActiveTab("voti");
        setIsParentOpen(false);
      } else if (hash === "#library") {
        setActiveTab("library");
        setIsParentOpen(false);
      } else if (hash === "#tutors") {
        setIsTutorManagerModalOpen(true);
        setIsParentOpen(false);
      } else {
        setActiveTab("chat");
        setIsParentOpen(false);
      }
    };
    handleHashChange();
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeTab = (tab: "chat" | "compiti" | "voti" | "library") => {
    setActiveTab(tab);
    setIsParentOpen(false);
    if (tab === "chat") {
      window.location.hash = "";
    } else {
      window.location.hash = tab;
    }
  };

  const openParent = () => {
    setIsParentOpen(true);
    window.location.hash = "parent";
  };

  const closeParent = () => {
    setIsParentOpen(false);
    window.location.hash = activeTab === "chat" ? "" : activeTab;
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("petralab_theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      setIsDarkMode(false);
    } else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      localStorage.setItem("petralab_theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  if (loading) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${
        isDarkMode ? "bg-[#0B141A]" : "bg-white"
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#25D366]">Caricamento PetraLAB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full w-full max-w-md mx-auto relative sm:border-x transition-colors overflow-hidden ${
      isDarkMode 
        ? "bg-[#0B141A] border-[#202C33] text-[#E9EDEF]" 
        : "bg-white border-slate-200 text-slate-900"
    }`}>
      
      {/* Contenuto Principale a Schede */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        {(activeTab === "chat" || activeTab === "compiti" || activeTab === "voti") && (
          <Chat 
            tutors={tutors} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            onChatOpen={setIsChatOpen} 
            activeSubTab={activeTab === "compiti" ? "compiti" : activeTab === "voti" ? "voti" : "tutte"}
            onSubTabChange={(sub) => {
              if (sub === "compiti") {
                setActiveTab("compiti");
              } else if (sub === "voti") {
                setActiveTab("voti");
              } else if (sub === "tutte") {
                setActiveTab("chat");
              }
            }}
            onOpenParent={openParent}
          />
        )}

        {activeTab === "library" && (
          <Library 
            isDarkMode={isDarkMode} 
          />
        )}
      </div>

      {/* Sezione Genitori aperta a tutto schermo dai 3 pallini in alto a destra */}
      {isParentOpen && (
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-150">
          <ParentDashboard 
            isDarkMode={isDarkMode} 
            onClose={closeParent}
          />
        </div>
      )}

      {/* FAB Galleggiante per Nuovo Tutor (visibile solo nella scheda Chat quando non siamo dentro un messaggio) */}
      {activeTab === "chat" && !isChatOpen && !isParentOpen && (
        <button
          onClick={() => setIsTutorManagerModalOpen(true)}
          className={`absolute bottom-20 right-4 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 z-40 cursor-pointer ${
            isDarkMode 
              ? "bg-[#25D366] text-[#111B21] shadow-emerald-950/50" 
              : "bg-[#25D366] text-white shadow-emerald-700/30"
          }`}
          aria-label="Aggiungi Tutor"
          title="Aggiungi o modifica tutor"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* Modal rapido Gestione Tutor quando si preme il tasto + */}
      {isTutorManagerModalOpen && (
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-150">
          <TutorManager 
            isDarkMode={isDarkMode} 
            onClose={() => setIsTutorManagerModalOpen(false)} 
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM NAVIGATION BAR (Chat, Compiti, Voti, Libreria)          */}
      {/* ============================================================== */}
      {!isChatOpen && !isParentOpen && (
        <nav className={`flex-shrink-0 flex items-center justify-around border-t pb-safe z-30 transition-colors ${
          isDarkMode 
            ? "bg-[#0B141A] border-[#202C33]" 
            : "bg-white border-slate-100 shadow-xs"
        }`}>
          {/* 1. Tab Chat */}
          <button 
            type="button"
            onClick={() => changeTab("chat")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95 cursor-pointer"
          >
            <div className={`px-4 py-1 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "chat"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "chat" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Chat
            </span>
          </button>

          {/* 2. Tab Compiti */}
          <button 
            type="button"
            onClick={() => changeTab("compiti")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95 cursor-pointer"
          >
            <div className={`px-4 py-1 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "compiti"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10.5 3A2.25 2.25 0 0 0 8.25 5.25 2.25 2.25 0 0 0 6 7.5v12a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 19.5v-12a2.25 2.25 0 0 0-2.25-2.25 2.25 2.25 0 0 0-2.25-2.25h-3Zm-1.5 2.25c0-.414.336-.75.75-.75h3c.414 0 .75.336.75.75v.75h-4.5v-.75ZM15.53 11.03a.75.75 0 0 0-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "compiti" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Compiti
            </span>
          </button>

          {/* 3. Tab Voti */}
          <button 
            type="button"
            onClick={() => changeTab("voti")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95 cursor-pointer"
          >
            <div className={`px-4 py-1 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "voti"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A4.494 4.494 0 0 1 8.25 15v.75a.75.75 0 0 0 .75.75h6a.75.75 0 0 0 .75-.75V15a4.494 4.494 0 0 1-2.142-3.832 6.73 6.73 0 0 0 2.743-1.346 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c1.664-.228 3.379-.35 5.127-.376.104.992.42 1.942.923 2.784a5.258 5.258 0 0 1-5.882-2.124 32.8 32.8 0 0 1-.168-.284ZM17.828 7.658a5.258 5.258 0 0 1-5.882 2.124c.502-.842.82-1.792.923-2.784 1.748.026 3.463.148 5.127.376-.051.096-.108.19-.168.284Z" clipRule="evenodd" />
                <path d="M7.5 18a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h9a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75h-9Z" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "voti" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Voti
            </span>
          </button>

          {/* 4. Tab Libreria */}
          <button 
            type="button"
            onClick={() => changeTab("library")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95 cursor-pointer"
          >
            <div className={`px-4 py-1 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "library"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "library" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Libreria
            </span>
          </button>
        </nav>
      )}

    </div>
  );
}
