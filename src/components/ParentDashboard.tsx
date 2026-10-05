"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getLevelInfo } from "@/lib/levels";
import { useTutors } from "@/hooks/useTutors";
import { AccessLog } from "@/lib/accessLogger";
import TutorManager from "./TutorManager";

export default function ParentDashboard({
  isDarkMode = false,
  onClose,
}: {
  isDarkMode?: boolean;
  onClose?: () => void;
}) {
  const { devices, removeDevice, logout } = useAuth();
  const { tutors } = useTutors();

  const [activeSubTab, setActiveSubTab] = useState<"security" | "grades" | "chats" | "tutors" | "agenda">("agenda");
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [childStats, setChildStats] = useState({ xp: 0, streak: 1 });
  const [childChat, setChildChat] = useState<Array<{ role: string; text: string }>>([]);
  const [subjectsMemory, setSubjectsMemory] = useState<Record<string, any>>({});
  const [isTutorManagerOpen, setIsTutorManagerOpen] = useState(false);

  // Ascolta statistiche e chat dell'alunna
  useEffect(() => {
    const userRef = doc(db, "petralab_users", "studente_demo");
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChildStats({
          xp: data.xp || 0,
          streak: data.streak || 1,
        });
        if (data.chatHistory) {
          setChildChat(data.chatHistory);
        }
        if (data.subjectsMemory) {
          setSubjectsMemory(data.subjectsMemory);
        }
      }
    });

    return () => unsub();
  }, []);

  // Ascolta log degli accessi in tempo reale da Firestore
  useEffect(() => {
    try {
      const logsRef = collection(db, "petralab_access_logs");
      const q = query(logsRef, orderBy("rawTime", "desc"), limit(20));
      const unsub = onSnapshot(q, (snapshot) => {
        const logs: AccessLog[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AccessLog, "id">),
        }));
        setAccessLogs(logs);
      }, (err) => {
        console.error("Errore snapshot log accessi:", err);
      });

      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const level = getLevelInfo(childStats.xp);

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      isDarkMode ? "bg-[#111B21] text-[#E9EDEF]" : "bg-[#F0F2F5] text-slate-900"
    }`}>
      {/* Header WhatsApp Top */}
      <div className={`${
        isDarkMode ? "bg-[#202C33] border-[#222E35]" : "bg-[#008069]"
      } text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 -ml-1 rounded-full hover:bg-black/15 transition-colors text-white"
              title="Indietro"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <span>🛡️</span>
              <span>Pannello Genitore</span>
            </h1>
            <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-emerald-100"}`}>
              Sicurezza, accessi e andamento studio
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isDarkMode 
              ? "bg-[#111B21] hover:bg-[#2A3942] text-red-400" 
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
          title="Esci dall'account"
        >
          Disconnetti
        </button>
      </div>

      {/* Pillole Sotto-Navigazione WhatsApp */}
      <div className={`flex gap-2 p-3 border-b text-xs overflow-x-auto no-scrollbar ${
        isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-white border-slate-100"
      }`}>
        <button
          onClick={() => setActiveSubTab("agenda")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex gap-1 items-center ${
            activeSubTab === "agenda"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          <span className="text-emerald-500">✨</span> Diario Nuvola
        </button>

        <button
          onClick={() => setActiveSubTab("security")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "security"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          🔐 Chi Accede & Dispositivi
        </button>

        <button
          onClick={() => setActiveSubTab("grades")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "grades"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          📊 Registro Voti & Lacune
        </button>

        <button
          onClick={() => setActiveSubTab("chats")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "chats"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          💬 Chat in Diretta
        </button>

        <button
          onClick={() => setActiveSubTab("tutors")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "tutors"
              ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#202C33] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          👨‍🏫 Gestisci Tutor
        </button>
      </div>

      {/* Contenuto principale a schede */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        
        {/* ========================================================= */}
        {/* 0. SEZIONE DIARIO E NUVOLA (SCREENSHOT MAGICO)            */}
        {/* ========================================================= */}
        {activeSubTab === "agenda" && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                  📸
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Lo Screenshot Magico
                    <span className="text-[9px] uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">New</span>
                  </h3>
                  <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    Carica i compiti da Nuvola in 3 secondi netti.
                  </p>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDarkMode ? 'border-[#2A3942] hover:bg-[#2A3942]/50' : 'border-slate-300 hover:bg-slate-50'
              }`}>
                <span className="text-3xl mb-2 opacity-50">📱</span>
                <p className={`font-bold text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Tocca per caricare lo screenshot</p>
                <p className={`text-xs mt-1 max-w-[250px] ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                  L'IA leggerà l'immagine e aggiungerà automaticamente compiti e verifiche al Diario di Petra.
                </p>
              </div>
            </div>

            {/* List of current agenda items (Mock) */}
            <div className={`rounded-2xl border overflow-hidden ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}`}>
                <h3 className="font-bold text-sm">Compiti in Sospeso</h3>
                <span className="text-xs font-semibold text-slate-400">0 Attivi</span>
              </div>
              <div className="p-8 text-center opacity-60">
                <span className="text-3xl mb-2 block">🧹</span>
                <p className="text-sm font-semibold">Tutto pulito!</p>
                <p className="text-xs">Nessun compito inserito finora.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. SEZIONE CHI ACCEDE & DISPOSITIVI (SICUREZZA GENITORE)  */}
        {/* ========================================================= */}
        {activeSubTab === "security" && (
          <div className="space-y-4">
            {/* Riepilogo Stato */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  Stato Sicurezza
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Protetto da PIN
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                L'app è protetta da PIN. Per far accedere tua figlia da un nuovo dispositivo (come il suo tablet), visita il sito e inserisci il PIN Studente: <strong className="text-emerald-500">1430</strong>.
              </p>
            </div>

            {/* Sessioni Attive (Dispositivi Autorizzati) */}
            <div className={`rounded-2xl border overflow-hidden ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b ${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}`}>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>🟢</span>
                  <span>Dispositivi Attualmente Connessi</span>
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                  Questi sono i telefoni o computer che non hanno bisogno del PIN perché hanno già fatto l'accesso.
                </p>
              </div>
              <div className={`divide-y ${isDarkMode ? "divide-[#2A3942]" : "divide-slate-100"}`}>
                {devices.map((dev) => (
                  <div key={dev.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                        dev.isCurrent ? (isDarkMode ? "bg-emerald-950/60 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (isDarkMode ? "bg-[#111B21] text-gray-400" : "bg-slate-100 text-slate-500")
                      }`}>
                        {dev.name.includes("iPhone") || dev.name.includes("Android") ? "📱" : "💻"}
                      </div>
                      <div>
                        <span className="font-bold text-sm block">
                          {dev.name} {dev.isCurrent && "(Questo Dispositivo)"}
                        </span>
                        <span className={`text-[11px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                          {dev.isCurrent ? "In uso proprio ora" : `Visto l'ultima volta il ${dev.lastActive}`}
                        </span>
                      </div>
                    </div>
                    {!dev.isCurrent && (
                      <button
                        onClick={() => removeDevice(dev.id)}
                        className="text-red-500 hover:text-white hover:bg-red-500 font-bold px-3 py-1.5 rounded-full text-xs transition-colors border border-red-500/30"
                      >
                        Scollega
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cronologia Accessi */}
            <div className={`rounded-2xl border overflow-hidden ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                isDarkMode ? "border-[#2A3942]" : "border-slate-100"
              }`}>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>🕒</span>
                    <span>Storico Accessi</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                    Chi ha inserito il PIN recentemente
                  </p>
                </div>
              </div>

              <div className={`divide-y ${isDarkMode ? "divide-[#2A3942]" : "divide-slate-100"}`}>
                {accessLogs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    Nessun accesso recente registrato.
                  </div>
                ) : (
                  accessLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-black/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                          log.role === "student"
                            ? (isDarkMode ? "bg-purple-950/60 text-purple-300" : "bg-purple-100 text-purple-700")
                            : (isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-100 text-blue-700")
                        }`}>
                          {log.role === "student" ? "👧" : "🛡️"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm block truncate">
                            {log.role === "student" ? "Alunna (1430)" : "Genitore (admin)"}
                          </span>
                          <p className={`text-xs truncate ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                            da {log.device}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-semibold block ${
                          isDarkMode ? "text-gray-300" : "text-slate-700"
                        }`}>
                          {log.timestamp}
                        </span>
                        <span className="text-[10px] text-green-500 font-medium">
                          Riuscito ✓
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. REGISTRO VOTI & LACUNE (MEMORIA TUTOR)                 */}
        {/* ========================================================= */}
        {activeSubTab === "grades" && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className="font-bold text-base mb-1">
                📊 Registro Memoria Tutor
              </h3>
              <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                I voti comunicati dall&apos;alunna e le lacune individuate spontaneamente dai tutor durante lo svolgimento dei compiti.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tutors.map((tutor) => {
                const mem = subjectsMemory[tutor.id];
                const grades = mem?.grades || [];
                const weaknesses = mem?.weaknesses || [];

                return (
                  <div key={tutor.id} className={`p-4 rounded-2xl border ${
                    isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tutor.avatar}</span>
                        <div>
                          <h4 className="font-bold text-sm">{tutor.name}</h4>
                          <span className="text-xs text-emerald-500 font-medium">{tutor.subject}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        grades.length > 0 
                          ? (isDarkMode ? "bg-[#00A884]/20 text-[#00A884]" : "bg-emerald-100 text-emerald-800")
                          : (isDarkMode ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-500")
                      }`}>
                        {grades.length} voti registrati
                      </span>
                    </div>

                    {/* Voti */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Voti registrati
                      </span>
                      {grades.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun voto comunicato a questo tutor.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {grades.map((g: any, idx: number) => (
                            <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">
                              Voto: {g.grade} <span className="text-[10px] font-normal">({g.date || "recente"})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lacune */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Difficoltà o Lacune segnalate
                      </span>
                      {weaknesses.length === 0 ? (
                        <span className="text-xs text-green-500 font-medium">✓ Nessuna difficoltà particolare segnalata</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {weaknesses.map((w: string, idx: number) => (
                            <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              ⚠️ {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. CRONOLOGIA CONVERSAZIONI IN DIRETTA                    */}
        {/* ========================================================= */}
        {activeSubTab === "chats" && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>💬</span>
                <span>Cosa chiede all&apos;IA tua figlia</span>
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Leggi le domande recenti per verificare l&apos;autonomia nello studio e capire dove ha bisogno di aiuto.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border max-h-[60vh] overflow-y-auto space-y-3 ${
              isDarkMode ? "bg-[#111B21] border-[#2A3942]" : "bg-slate-100 border-slate-200"
            }`}>
              {childChat.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  Nessuna conversazione recente registrata.
                </div>
              ) : (
                childChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 mb-0.5 px-1">
                      {msg.role === "user" ? "👧 Tua Figlia" : "🤖 Tutor AI"}
                    </span>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-xs ${
                      msg.role === "user"
                        ? (isDarkMode ? "bg-[#005C4B] text-white rounded-tr-xs" : "bg-[#DCF8C6] text-slate-900 rounded-tr-xs")
                        : (isDarkMode ? "bg-[#202C33] text-gray-200 rounded-tl-xs" : "bg-white text-slate-900 rounded-tl-xs border border-slate-200")
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. GESTIONE TUTOR AI                                      */}
        {/* ========================================================= */}
        {activeSubTab === "tutors" && (
          <div className="space-y-4">
            <TutorManager isDarkMode={isDarkMode} />
          </div>
        )}

      </div>
    </div>
  );
}
