"use client";

import { useState, useMemo, useEffect } from "react";
import { Tutor } from "@/lib/tutors";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface CalendarViewProps {
  agendaItems?: any[];
  tutors: Tutor[];
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenParent?: () => void;
  onAskAI?: (query: string) => void;
  onOpenTutorChat?: (tutor: Tutor, initialMessage?: string) => void;
  onToggleTaskComplete?: (taskId: string, currentStatus: boolean) => void;
}

const WEEKDAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

function normalizeDateStr(d?: string): string {
  if (!d) return "";
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return "";
}

function getSubjectColor(subject: string, isDarkMode: boolean) {
  const s = (subject || "").toLowerCase();
  if (s.includes("matematica") || s.includes("geometria") || s.includes("aritmetica")) {
    return isDarkMode
      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
      : "bg-emerald-100 border-emerald-300 text-emerald-800";
  }
  if (s.includes("scienze")) {
    return isDarkMode
      ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300"
      : "bg-cyan-100 border-cyan-300 text-cyan-800";
  }
  if (s.includes("italiano") || s.includes("grammatica") || s.includes("antologia") || s.includes("letteratura")) {
    return isDarkMode
      ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
      : "bg-amber-100 border-amber-300 text-amber-800";
  }
  if (s.includes("inglese")) {
    return isDarkMode
      ? "bg-rose-950/70 border-rose-500/50 text-rose-300"
      : "bg-rose-100 border-rose-300 text-rose-800";
  }
  if (s.includes("francese")) {
    return isDarkMode
      ? "bg-indigo-950/70 border-indigo-500/50 text-indigo-300"
      : "bg-indigo-100 border-indigo-300 text-indigo-800";
  }
  if (s.includes("storia")) {
    return isDarkMode
      ? "bg-orange-950/70 border-orange-500/50 text-orange-300"
      : "bg-orange-100 border-orange-300 text-orange-800";
  }
  if (s.includes("geografia")) {
    return isDarkMode
      ? "bg-teal-950/70 border-teal-500/50 text-teal-300"
      : "bg-teal-100 border-teal-300 text-teal-800";
  }
  if (s.includes("arte")) {
    return isDarkMode
      ? "bg-purple-950/70 border-purple-500/50 text-purple-300"
      : "bg-purple-100 border-purple-300 text-purple-800";
  }
  if (s.includes("tecnologia")) {
    return isDarkMode
      ? "bg-blue-950/70 border-blue-500/50 text-blue-300"
      : "bg-blue-100 border-blue-300 text-blue-800";
  }
  if (s.includes("musica")) {
    return isDarkMode
      ? "bg-pink-950/70 border-pink-500/50 text-pink-300"
      : "bg-pink-100 border-pink-300 text-pink-800";
  }
  return isDarkMode
    ? "bg-slate-800/80 border-slate-600 text-slate-200"
    : "bg-slate-100 border-slate-300 text-slate-700";
}

export default function CalendarView({
  agendaItems,
  tutors,
  isDarkMode = false,
  toggleTheme,
  onOpenParent,
  onAskAI,
  onOpenTutorChat,
  onToggleTaskComplete,
}: CalendarViewProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, [today]);

  // Anno e mese visualizzati (default mese corrente)
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-based

  // Modal per i dettagli del giorno selezionato
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  // Stato compiti (con fallback e ascolto in tempo reale da Firestore)
  const [items, setItems] = useState<any[]>(agendaItems || []);

  useEffect(() => {
    if (agendaItems && agendaItems.length > 0) {
      setItems(agendaItems);
    }
  }, [agendaItems]);

  useEffect(() => {
    try {
      const userRef = doc(db, "petralab_users", "studente_demo");
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.agendaItems)) {
            setItems(data.agendaItems);
          }
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not listen to agendaItems in CalendarView:", e);
    }
  }, []);

  const handleToggle = async (taskId: string, currentStatus: boolean) => {
    if (onToggleTaskComplete) {
      onToggleTaskComplete(taskId, currentStatus);
    }
    const updated = items.map((item) =>
      item.id === taskId ? { ...item, isCompleted: !currentStatus } : item
    );
    setItems(updated);
    try {
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
    } catch (e) {
      console.error("Errore aggiornamento compito da CalendarView:", e);
    }
  };

  // Mappa compiti per data YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    items.forEach((item) => {
      const d = normalizeDateStr(item.dueDate);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(item);
      }
    });
    return map;
  }, [items]);

  // Navigazione mese
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const handleTodayMonth = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayISO(todayISO);
  };

  // Costruzione della griglia del calendario mensile (stile classico iCalendario)
  const calendarCells = useMemo(() => {
    // Primo giorno del mese
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Giorno della settimana per lunedì-based (0 = Lun, 6 = Dom)
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Giorni nel mese corrente
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Giorni nel mese precedente
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateISO: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      tasks: any[];
    }> = [];

    // 1. Giorni del mese precedente per riempire la prima settimana
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dayNumber: dayNum,
        dateISO: iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        tasks: tasksByDate[iso] || [],
      });
    }

    // 2. Giorni del mese corrente
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateISO: iso,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        tasks: tasksByDate[iso] || [],
      });
    }

    // 3. Giorni del mese successivo per completare la griglia (35 o 42 celle)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateISO: iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        tasks: tasksByDate[iso] || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, tasksByDate, todayISO]);

  // Compiti per il giorno selezionato nel popup/dettaglio
  const selectedDayTasks = useMemo(() => {
    if (!selectedDayISO) return [];
    return tasksByDate[selectedDayISO] || [];
  }, [selectedDayISO, tasksByDate]);

  // Format header per il giorno selezionato (es. Lunedì 10 Novembre)
  const selectedDayLabel = useMemo(() => {
    if (!selectedDayISO) return "";
    const [y, m, d] = selectedDayISO.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    return `${dayOfWeek} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  }, [selectedDayISO]);

  return (
    <div
      className={`flex flex-col h-full w-full min-h-0 overflow-hidden select-none ${
        isDarkMode ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-white text-slate-900"
      }`}
    >
      {/* 1. Header superiore unificato PetraLAB */}
      <div
        className={`flex-shrink-0 px-4 pt-3 pb-2 flex justify-between items-center relative z-30 transition-colors ${
          isDarkMode ? "bg-[#0B141A]" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <h1
            className={`text-[24px] font-bold tracking-tight ${
              isDarkMode ? "text-white" : "text-[#25D366]"
            }`}
          >
            PetraLAB
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu a 3 Puntini */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isDarkMode ? "text-gray-300 hover:bg-[#202C33]" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Menu opzioni"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div
                  className={`absolute right-0 top-full mt-2 w-60 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
                    isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-white border-slate-100"
                  }`}
                >
                  <div className="py-2">
                    <div
                      className={`px-4 py-2 border-b text-[12px] flex justify-between items-center ${
                        isDarkMode ? "border-[#222E35] text-[#8696A0]" : "border-slate-100 text-slate-400"
                      }`}
                    >
                      <span>PetraLAB App</span>
                      <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">
                        v2.0.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onOpenParent?.();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold transition-colors text-left cursor-pointer ${
                        isDarkMode ? "hover:bg-[#202C33] text-gray-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-xl">🛡️</span>
                      <div className="flex flex-col">
                        <span>Area Genitori</span>
                        <span className={`text-[10px] font-normal ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                          Sicurezza, PIN e compiti
                        </span>
                      </div>
                    </button>

                    {toggleTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          toggleTheme();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold transition-colors text-left cursor-pointer ${
                          isDarkMode ? "hover:bg-[#202C33] text-gray-200" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="text-xl">{isDarkMode ? "☀️" : "🌙"}</span>
                        <div className="flex flex-col">
                          <span>{isDarkMode ? "Tema Chiaro" : "Tema Scuro"}</span>
                          <span className={`text-[10px] font-normal ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                            {isDarkMode ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
                          </span>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        window.location.reload();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors text-left border-t cursor-pointer ${
                        isDarkMode
                          ? "border-[#222E35] hover:bg-[#202C33] text-[#8696A0]"
                          : "border-slate-100 hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className="text-base">🔄</span>
                      <span>Ricarica App</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Barra di ricerca / Chiedi all'IA unificata */}
      <div className={`flex-shrink-0 px-4 py-1 pb-2.5 ${isDarkMode ? "bg-[#0B141A]" : "bg-white"}`}>
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all border ${
            isDarkMode
              ? "bg-[#202C33] border-transparent focus-within:border-blue-500/60"
              : "bg-[#F0F2F5] border-transparent focus-within:border-blue-500/60"
          }`}
        >
          <div className="w-5 h-5 rounded-full border-[2px] border-blue-500 border-t-purple-500 border-r-pink-500 flex-shrink-0 animate-spin-slow"></div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim() && onAskAI) {
                e.preventDefault();
                onAskAI(searchQuery.trim());
              }
            }}
            placeholder="Chiedi all'IA o cerca nel calendario..."
            className={`w-full bg-transparent outline-none font-medium text-[15px] placeholder-opacity-80 ${
              isDarkMode ? "text-white placeholder-[#8696A0]" : "text-slate-800 placeholder-slate-500"
            }`}
          />
          {searchQuery.trim() && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition-opacity ${
                  isDarkMode ? "text-gray-300 hover:bg-[#182229]" : "text-slate-600 hover:bg-slate-200"
                }`}
                title="Cancella testo"
              >
                ✕
              </button>
              {onAskAI && (
                <button
                  type="button"
                  onClick={() => onAskAI(searchQuery.trim())}
                  className="px-3.5 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                  title="Invia domanda all'IA"
                >
                  <span>Chiedi</span>
                  <span>✨</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Barra del Mese (Titolo "Novembre 2026" + bottoni freccia e "Oggi") */}
      <div
        className={`flex-shrink-0 px-4 py-2 flex items-center justify-between border-b ${
          isDarkMode ? "bg-[#111B21] border-[#202C33]" : "bg-slate-50/80 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          {currentYear === today.getFullYear() && currentMonth === today.getMonth() && (
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Mese Corrente
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTodayMonth}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "bg-[#202C33] text-emerald-400 hover:bg-[#2A3942]"
                : "bg-white text-emerald-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
            }`}
            title="Torna a oggi"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "bg-[#202C33] text-gray-200 hover:bg-[#2A3942]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
            }`}
            title="Mese precedente"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "bg-[#202C33] text-gray-200 hover:bg-[#2A3942]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
            }`}
            title="Mese successivo"
          >
            ▶
          </button>
        </div>
      </div>

      {/* 4. Griglia Calendario Mensile */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
        {/* Intestazione Colonne: Lunedì .. Domenica (stile scuro in contrasto come nel file allegato) */}
        <div className="grid grid-cols-7 gap-px rounded-t-xl overflow-hidden shadow-2xs bg-[#6E777D] text-white">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className="py-1.5 px-1 text-center font-bold text-[11px] sm:text-xs truncate"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
            </div>
          ))}
        </div>

        {/* Tabella con le caselle dei giorni */}
        <div
          style={{ gridTemplateRows: `repeat(${Math.max(5, Math.ceil(calendarCells.length / 7))}, minmax(0, 1fr))` }}
          className={`flex-1 min-h-0 grid grid-cols-7 gap-px border rounded-b-xl overflow-hidden ${
            isDarkMode
              ? "bg-[#202C33] border-[#2A3942]"
              : "bg-slate-300 border-slate-300 shadow-xs"
          }`}
        >
          {calendarCells.map((cell, idx) => {
            const hasTasks = cell.tasks.length > 0;
            const hasVerifica = cell.tasks.some(
              (t) => (t.type || "").toLowerCase() === "verifica"
            );
            const pendingCount = cell.tasks.filter((t) => !t.isCompleted).length;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDayISO(cell.dateISO)}
                className={`relative flex flex-col p-1 sm:p-1.5 transition-all cursor-pointer overflow-hidden ${
                  !cell.isCurrentMonth
                    ? isDarkMode
                      ? "bg-[#0E161B] text-[#55636C] opacity-60"
                      : "bg-[#F3F4F6] text-slate-400 opacity-70"
                    : isDarkMode
                    ? "bg-[#111B21] text-gray-200 hover:bg-[#182229]"
                    : "bg-white text-slate-800 hover:bg-emerald-50/40"
                } ${
                  cell.isToday
                    ? isDarkMode
                      ? "ring-2 ring-[#25D366] ring-inset"
                      : "ring-2 ring-[#25D366] ring-inset bg-emerald-50/30"
                    : ""
                }`}
              >
                {/* Numero del giorno in alto a sinistra (esattamente come nel modello iCalendario) */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-[12px] sm:text-sm font-semibold leading-none ${
                      cell.isToday
                        ? "bg-[#25D366] text-white px-1.5 py-0.5 rounded-full font-bold shadow-2xs"
                        : ""
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Indicatori sintetici per mobile */}
                  {hasTasks && (
                    <div className="flex items-center gap-0.5">
                      {hasVerifica && (
                        <span className="text-[10px] leading-none" title="Verifica in programma!">
                          🚨
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasVerifica ? "bg-red-500 animate-pulse" : "bg-[#25D366]"
                          }`}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Lista compiti del giorno nel box */}
                <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
                  {cell.tasks.slice(0, 3).map((task, tIdx) => {
                    const isVerifica = (task.type || "").toLowerCase() === "verifica";
                    return (
                      <div
                        key={task.id || tIdx}
                        className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate border ${
                          task.isCompleted ? "opacity-40 line-through" : ""
                        } ${
                          isVerifica
                            ? isDarkMode
                              ? "bg-red-950/80 border-red-500/60 text-red-300 font-bold"
                              : "bg-red-100 border-red-300 text-red-800 font-bold"
                            : getSubjectColor(task.subject, isDarkMode)
                        }`}
                        title={`${task.subject}: ${task.description || task.task || ""}`}
                      >
                        <span className="truncate">
                          {isVerifica ? "🚨 " : "• "}
                          {task.subject}
                        </span>
                      </div>
                    );
                  })}
                  {cell.tasks.length > 3 && (
                    <span
                      className={`text-[9px] font-bold px-1 ${
                        isDarkMode ? "text-emerald-400" : "text-emerald-700"
                      }`}
                    >
                      +{cell.tasks.length - 3} altri
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Modale Dettagli Compiti del Giorno Selezionato */}
      {selectedDayISO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 max-h-[85vh] overflow-hidden ${
              isDarkMode ? "bg-[#111B21] border-[#222E35] text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {/* Header del giorno */}
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="font-bold text-base capitalize">{selectedDayLabel}</h3>
                  <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    {selectedDayTasks.length === 0
                      ? "Nessun compito o verifica assegnati per questo giorno"
                      : `${selectedDayTasks.length} ${
                          selectedDayTasks.length === 1 ? "impegno segnato" : "impegni segnati"
                        }`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayISO(null)}
                className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>

            {/* Lista compiti del giorno */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {selectedDayTasks.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center my-3 ${
                    isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className="text-4xl mb-2">🎉</span>
                  <p className="font-bold text-sm">Giorno libero!</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    Non hai compiti né verifiche per questa data.
                  </p>
                </div>
              ) : (
                selectedDayTasks.map((item, idx) => {
                  const isVerifica = (item.type || "").toLowerCase() === "verifica";
                  const matchingTutor = tutors.find(
                    (t) =>
                      t.id === item.subject?.toLowerCase() ||
                      t.subject.toLowerCase().includes(item.subject?.toLowerCase()) ||
                      item.subject?.toLowerCase().includes(t.subject.split(" ")[0].toLowerCase())
                  );

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2 transition-all ${
                        item.isCompleted
                          ? isDarkMode
                            ? "bg-[#182229]/60 border-[#2A3942] opacity-60"
                            : "bg-slate-50 border-slate-200 opacity-60"
                          : isVerifica
                          ? isDarkMode
                            ? "bg-red-950/30 border-red-500/50"
                            : "bg-red-50/80 border-red-200"
                          : isDarkMode
                          ? "bg-[#182229] border-[#2A3942]"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.id, item.isCompleted)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 shrink-0 transition-all ${
                              item.isCompleted
                                ? "bg-[#25D366] border-[#25D366] text-white"
                                : "border-slate-400 text-transparent hover:border-[#25D366]"
                            }`}
                            title={item.isCompleted ? "Segna da fare" : "Segna completato"}
                          >
                            ✓
                          </button>
                          <span className="text-base">{isVerifica ? "🚨" : "📝"}</span>
                          <span
                            className={`font-bold text-sm truncate ${
                              item.isCompleted ? "line-through opacity-75" : ""
                            }`}
                          >
                            {item.subject}
                          </span>
                          {isVerifica && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 shrink-0">
                              VERIFICA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descrizione compito */}
                      <p
                        className={`text-xs pl-8 leading-relaxed ${
                          item.isCompleted ? "line-through opacity-60" : ""
                        } ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}
                      >
                        {item.description || item.task || "Compito da svolgere"}
                      </p>

                      {/* Azione rapida: chiedi al tutor di questa materia */}
                      {matchingTutor && !item.isCompleted && (
                        <div className="pl-8 pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayISO(null);
                              onOpenTutorChat?.(
                                matchingTutor,
                                `Ciao ${matchingTutor.name}! Ho questo compito di ${item.subject} per il ${selectedDayLabel}: "${
                                  item.description || item.task || ""
                                }". Mi aiuti a svolgerlo?`
                              );
                            }}
                            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 transition-all"
                          >
                            {matchingTutor.avatar?.startsWith("/avatars/") ? (
                              <img
                                src={matchingTutor.avatar}
                                alt="avatar"
                                className="w-4 h-4 object-contain"
                              />
                            ) : (
                              <span>{matchingTutor.avatar}</span>
                            )}
                            <span>Studia con {matchingTutor.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Chiudi */}
            <div className="pt-2 border-t border-inherit flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayISO(null)}
                className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-[#111B21] font-bold text-xs transition-all active:scale-98 cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
