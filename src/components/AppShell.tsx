"use client";

import { useState, useEffect } from "react";
import Chat from "./Chat";
import GamificationProfile from "./GamificationProfile";
import TutorManager from "./TutorManager";
import ParentDashboard from "./ParentDashboard";
import { useTutors } from "@/hooks/useTutors";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<"chat" | "tutors" | "profile" | "parent">("chat");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTutorManagerModalOpen, setIsTutorManagerModalOpen] = useState(false);
  
  const { tutors, loading } = useTutors();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#parent") setActiveTab("parent");
      else if (hash === "#tutors") setActiveTab("tutors");
      else if (hash === "#profile") setActiveTab("profile");
      else setActiveTab("chat");
    };
    // Sync initial state
    handleHashChange();
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeTab = (tab: "chat" | "tutors" | "profile" | "parent") => {
    if (tab === "chat") {
      window.location.hash = "";
    } else {
      window.location.hash = tab;
    }
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
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto relative sm:border-x transition-colors ${
      isDarkMode 
        ? "bg-[#0B141A] border-[#202C33] text-[#E9EDEF]" 
        : "bg-white border-slate-200 text-slate-900"
    }`}>
      
      {/* Contenuto Principale a Schede */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === "chat" && (
          <Chat 
            tutors={tutors} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            onChatOpen={setIsChatOpen} 
          />
        )}

        {activeTab === "tutors" && (
          <TutorManager 
            isDarkMode={isDarkMode} 
          />
        )}

        {activeTab === "profile" && (
          <GamificationProfile 
            isDarkMode={isDarkMode} 
          />
        )}

        {activeTab === "parent" && (
          <ParentDashboard 
            isDarkMode={isDarkMode} 
          />
        )}
      </div>

      {/* FAB Galleggiante per Nuovo Tutor (visibile solo nella scheda Chat quando non siamo dentro un messaggio) */}
      {activeTab === "chat" && !isChatOpen && (
        <button
          onClick={() => setIsTutorManagerModalOpen(true)}
          className={`absolute bottom-20 right-4 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 z-40 ${
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
      {/* BOTTOM NAVIGATION BAR MODERNA (Identica a WhatsApp 2024-2026)  */}
      {/* ============================================================== */}
      {!isChatOpen && (
        <nav className={`flex items-center justify-around border-t pb-safe z-30 transition-colors ${
          isDarkMode 
            ? "bg-[#0B141A] border-[#202C33]" 
            : "bg-white border-slate-100 shadow-xs"
        }`}>
          {/* 1. Tab Chat */}
          <button 
            onClick={() => changeTab("chat")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95"
          >
            <div className={`px-5 py-1.5 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "chat"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
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

          {/* 2. Tab Tutor */}
          <button 
            onClick={() => changeTab("tutors")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95"
          >
            <div className={`px-5 py-1.5 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "tutors"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002c-.114.06-.24.09-.367.09a.755.755 0 0 1-.367-.09l-.003-.001a49.946 49.946 0 0 0-9.902-3.913.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805Z" />
                <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.723c-2.484 1.054-5.184 1.636-8.021 1.636-2.837 0-5.537-.582-8.021-1.636a.75.75 0 0 1-.46-.723c.035-1.441.121-2.87.255-4.284a48.45 48.45 0 0 1 7.666 3.282.75.75 0 0 0 1.12 0Z" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "tutors" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Tutor
            </span>
          </button>

          {/* 3. Tab Livello / Profilo */}
          <button 
            onClick={() => changeTab("profile")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95"
          >
            <div className={`px-5 py-1.5 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "profile"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "profile" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Livello
            </span>
          </button>

          {/* 4. Tab Genitore (Sicurezza & Accessi) */}
          <button 
            onClick={() => changeTab("parent")}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95"
          >
            <div className={`px-5 py-1.5 rounded-2xl shadow-sm transition-all flex items-center justify-center ${
              activeTab === "parent"
                ? (isDarkMode ? "bg-[#0A291A] text-[#25D366]" : "bg-[#E7FCEB] text-[#118B44]")
                : (isDarkMode ? "text-[#8696A0] hover:text-gray-200" : "text-slate-500 hover:text-slate-800")
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={`text-[11px] ${
              activeTab === "parent" 
                ? (isDarkMode ? "font-bold text-[#25D366]" : "font-bold text-[#0A332C]") 
                : (isDarkMode ? "font-medium text-[#8696A0]" : "font-medium text-slate-500")
            }`}>
              Genitore
            </span>
          </button>
        </nav>
      )}

    </div>
  );
}
