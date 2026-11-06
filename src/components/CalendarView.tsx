"use client";

import { useState, useMemo, useEffect } from "react";
import { Tutor } from "@/lib/tutors";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  getHolidayInfo,
  getProgressiveTraining,
  normalizeDateStr,
  formatISO,
  TrainingStage,
} from "@/lib/calendarUtils";

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

type CalendarViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const DEFAULT_SUBJECTS = [
  "Matematica",
  "Scienze",
  "Italiano",
  "Inglese",
  "Francese",
  "Storia",
  "Geografia",
  "Arte",
  "Tecnologia",
  "Musica",
  "Educazione Civica",
];

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
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, [today]);

  // Data per la navigazione (mese, settimana, o giorno)
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based
  const currentDay = currentDate.getDate();
  const currentDateISO = useMemo(() => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
  }, [currentYear, currentMonth, currentDay]);

  // Modal per i dettagli del giorno selezionato (dalla vista mensile)
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  // Modal "Aggiungi Compito / Verifica"
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState(todayISO);
  const [newTaskType, setNewTaskType] = useState<"compito" | "verifica">("compito");
  const [newTaskSubject, setNewTaskSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

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

  // Creazione manuale nuovo compito o verifica
  const handleOpenAddTask = (dateToUse?: string, forceType?: "compito" | "verifica") => {
    setNewTaskDate(dateToUse || selectedDayISO || currentDateISO);
    if (forceType) setNewTaskType(forceType);
    setNewTaskDesc("");
    setIsAddTaskModalOpen(true);
  };

  const handleSaveNewTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskDesc.trim()) return;

    setIsSavingTask(true);
    try {
      const newTask = {
        id: "task_" + Date.now(),
        subject: newTaskSubject,
        description: newTaskDesc.trim(),
        task: newTaskDesc.trim(),
        dueDate: newTaskDate,
        isCompleted: false,
        type: newTaskType,
        source: "manual",
        createdAt: new Date().toISOString(),
      };

      const updated = [newTask, ...items];
      setItems(updated);
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
      setIsAddTaskModalOpen(false);
      setNewTaskDesc("");
    } catch (err) {
      console.error("Errore salvataggio nuovo compito:", err);
      alert("Impossibile salvare il compito. Riprova.");
    } finally {
      setIsSavingTask(false);
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

  // Tutte le verifiche con i rispettivi piani di allenamento progressivo
  const upcomingTrainings = useMemo(() => {
    const list: Array<{ task: any; training: TrainingStage }> = [];
    items.forEach((task) => {
      if (!task.isCompleted) {
        const tr = getProgressiveTraining(task, todayISO);
        if (tr) {
          list.push({ task, training: tr });
        }
      }
    });
    // Ordina per scadenza più imminente (D-0, D-1, ecc.)
    return list.sort((a, b) => a.training.daysRemaining - b.training.daysRemaining);
  }, [items, todayISO]);

  // Navigazione mese/settimana/giorno
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentYear, currentMonth, currentDay - 7));
    } else {
      setCurrentDate(new Date(currentYear, currentMonth, currentDay - 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentYear, currentMonth, currentDay + 7));
    } else {
      setCurrentDate(new Date(currentYear, currentMonth, currentDay + 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setSelectedDayISO(todayISO);
  };

  // 1. Griglia Mese (stile classico iCalendario)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 = Lun, 6 = Dom

    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateISO: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSaturday: boolean;
      isSunday: boolean;
      holiday: { isHoliday: boolean; name?: string };
      tasks: any[];
    }> = [];

    // Giorni mese precedente
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const iso = formatISO(prevDate.getFullYear(), prevDate.getMonth() + 1, dayNum);
      const dayOfWeek = prevDate.getDay();
      cells.push({
        dayNumber: dayNum,
        dateISO: iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        holiday: getHolidayInfo(iso),
        tasks: tasksByDate[iso] || [],
      });
    }

    // Giorni mese corrente
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = formatISO(currentYear, currentMonth + 1, d);
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay();
      cells.push({
        dayNumber: d,
        dateISO: iso,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        holiday: getHolidayInfo(iso),
        tasks: tasksByDate[iso] || [],
      });
    }

    // Giorni mese successivo per completare
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const iso = formatISO(nextDate.getFullYear(), nextDate.getMonth() + 1, d);
      const dayOfWeek = nextDate.getDay();
      cells.push({
        dayNumber: d,
        dateISO: iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        holiday: getHolidayInfo(iso),
        tasks: tasksByDate[iso] || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, tasksByDate, todayISO]);

  // 2. Griglia Settimanale (I 7 giorni della settimana corrente)
  const weekDays = useMemo(() => {
    // Calcola il lunedì della settimana contenente currentDate
    const dateCopy = new Date(currentDate);
    const dayOfWeek = dateCopy.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dateCopy);
    monday.setDate(dateCopy.getDate() + diffToMonday);

    const days: Array<{
      date: Date;
      dateISO: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      isSaturday: boolean;
      isSunday: boolean;
      holiday: { isHoliday: boolean; name?: string };
      tasks: any[];
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const dow = d.getDay();
      days.push({
        date: d,
        dateISO: iso,
        dayNumber: d.getDate(),
        dayName: WEEKDAYS[i],
        isToday: iso === todayISO,
        isSaturday: dow === 6,
        isSunday: dow === 0,
        holiday: getHolidayInfo(iso),
        tasks: tasksByDate[iso] || [],
      });
    }

    return days;
  }, [currentDate, tasksByDate, todayISO]);

  // 3. Vista Giornaliera: compiti e info per il giorno selezionato
  const activeDayTasks = useMemo(() => {
    const iso = viewMode === "day" ? currentDateISO : selectedDayISO || currentDateISO;
    return tasksByDate[iso] || [];
  }, [viewMode, currentDateISO, selectedDayISO, tasksByDate]);

  const activeDayHoliday = useMemo(() => {
    const iso = viewMode === "day" ? currentDateISO : selectedDayISO || currentDateISO;
    return getHolidayInfo(iso);
  }, [viewMode, currentDateISO, selectedDayISO]);

  const activeDayLabel = useMemo(() => {
    const iso = viewMode === "day" ? currentDateISO : selectedDayISO || currentDateISO;
    const [y, m, d] = iso.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    return `${dayOfWeek} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  }, [viewMode, currentDateISO, selectedDayISO]);

  // Trova il tutor associato a una materia
  const findTutorForSubject = (subjectName: string) => {
    const s = (subjectName || "").toLowerCase();
    return tutors.find(
      (t) =>
        t.id === s ||
        t.subject.toLowerCase().includes(s) ||
        s.includes(t.subject.split(" ")[0].toLowerCase())
    );
  };

  // Titolo della barra temporale
  const headerTimeLabel = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    }
    if (viewMode === "week") {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.date.getMonth() === last.date.getMonth()) {
        return `${first.dayNumber} - ${last.dayNumber} ${MONTH_NAMES[first.date.getMonth()]} ${first.date.getFullYear()}`;
      }
      return `${first.dayNumber} ${MONTH_NAMES[first.date.getMonth()]} - ${last.dayNumber} ${MONTH_NAMES[last.date.getMonth()]} ${last.date.getFullYear()}`;
    }
    return activeDayLabel;
  }, [viewMode, currentMonth, currentYear, weekDays, activeDayLabel]);

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
                      <span>PetraLAB Calendario</span>
                      <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">
                        v2.1
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
      <div className={`flex-shrink-0 px-4 py-1 pb-2 ${isDarkMode ? "bg-[#0B141A]" : "bg-white"}`}>
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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

      {/* 3. Selettore Viste: Mese / Settimana / Giorno & Tasto Nuovo Compito */}
      <div
        className={`flex-shrink-0 px-3 py-1.5 flex items-center justify-between border-t border-b gap-2 ${
          isDarkMode ? "bg-[#111B21] border-[#202C33]" : "bg-slate-50 border-slate-200"
        }`}
      >
        {/* Toggle 3 Viste */}
        <div
          className={`flex items-center p-0.5 rounded-xl border ${
            isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-slate-200/80 border-slate-300"
          }`}
        >
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "month"
                ? isDarkMode
                  ? "bg-[#25D366] text-[#111B21] shadow-xs"
                  : "bg-white text-emerald-800 shadow-xs"
                : isDarkMode
                ? "text-gray-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mese
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "week"
                ? isDarkMode
                  ? "bg-[#25D366] text-[#111B21] shadow-xs"
                  : "bg-white text-emerald-800 shadow-xs"
                : isDarkMode
                ? "text-gray-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Settimana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "day"
                ? isDarkMode
                  ? "bg-[#25D366] text-[#111B21] shadow-xs"
                  : "bg-white text-emerald-800 shadow-xs"
                : isDarkMode
                ? "text-gray-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Giorno
          </button>
        </div>

        {/* Tasto Aggiungi Compito / Verifica rapido */}
        <button
          type="button"
          onClick={() => handleOpenAddTask()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-[#111B21] shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Aggiungi compito o verifica"
        >
          <span className="text-sm font-black leading-none">+</span>
          <span className="hidden xs:inline">Aggiungi</span>
        </button>
      </div>

      {/* 4. Barra di navigazione temporale (Titolo + Frecce + Tasto Oggi) */}
      <div
        className={`flex-shrink-0 px-3 sm:px-4 py-2 flex items-center justify-between border-b ${
          isDarkMode ? "bg-[#111B21]/90 border-[#202C33]" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
            {headerTimeLabel}
          </h2>
          {currentDateISO === todayISO && (
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Oggi
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToday}
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
            onClick={handlePrev}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "bg-[#202C33] text-gray-200 hover:bg-[#2A3942]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
            }`}
            title="Precedente"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "bg-[#202C33] text-gray-200 hover:bg-[#2A3942]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
            }`}
            title="Successivo"
          >
            ▶
          </button>
        </div>
      </div>

      {/* 5. Banner Allenamento Progressivo Proattivo (se presente nei prossimi 7 giorni) */}
      {upcomingTrainings.length > 0 && (
        <div
          className={`flex-shrink-0 px-3 py-1.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${
            isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-amber-50/80 border-amber-200"
          }`}
        >
          {upcomingTrainings.slice(0, 1).map(({ task, training }) => {
            const tutor = findTutorForSubject(task.subject);
            return (
              <div key={task.id} className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base animate-bounce">🎯</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wider">
                        {training.badge}
                      </span>
                      <span className="text-xs font-bold truncate">
                        Verifica di {task.subject}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                      {training.actionTitle}
                    </p>
                  </div>
                </div>

                {tutor && (
                  <button
                    type="button"
                    onClick={() => onOpenTutorChat?.(tutor, training.tutorPrompt)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-extrabold text-[11px] shrink-0 shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>Allénati con {tutor.name}</span>
                    <span>⚡</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* CORPO VISTE: MESE, SETTIMANA, GIORNO                            */}
      {/* ============================================================== */}

      {/* ---------------- A) VISTA MESE ---------------- */}
      {viewMode === "month" && (
        <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
          {/* Intestazione Colonne con evidenza Sabato (ambra) e Domenica (rosso festivo) */}
          <div className="grid grid-cols-7 gap-px rounded-t-xl overflow-hidden shadow-2xs bg-[#4A5560] text-white">
            {WEEKDAYS.map((day, idx) => {
              const isSat = idx === 5;
              const isSun = idx === 6;
              return (
                <div
                  key={day}
                  className={`py-1.5 px-1 text-center font-bold text-[11px] sm:text-xs truncate ${
                    isSun
                      ? "bg-red-700/90 text-red-100"
                      : isSat
                      ? "bg-amber-700/80 text-amber-100"
                      : ""
                  }`}
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
                </div>
              );
            })}
          </div>

          {/* Griglia giorni mensile */}
          <div
            style={{
              gridTemplateRows: `repeat(${Math.max(5, Math.ceil(calendarCells.length / 7))}, minmax(0, 1fr))`,
            }}
            className={`flex-1 min-h-0 grid grid-cols-7 gap-px border rounded-b-xl overflow-hidden ${
              isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-slate-300 border-slate-300 shadow-xs"
            }`}
          >
            {calendarCells.map((cell, idx) => {
              const hasTasks = cell.tasks.length > 0;
              const hasVerifica = cell.tasks.some(
                (t) => (t.type || "").toLowerCase() === "verifica" || (t.type || "").toLowerCase() === "interrogazione"
              );
              const pendingCount = cell.tasks.filter((t) => !t.isCompleted).length;
              const isFestivo = cell.isSunday || cell.holiday.isHoliday;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayISO(cell.dateISO)}
                  className={`relative flex flex-col p-1 sm:p-1.5 transition-all cursor-pointer overflow-hidden ${
                    !cell.isCurrentMonth
                      ? isDarkMode
                        ? "bg-[#0E161B] text-[#55636C] opacity-50"
                        : "bg-[#F3F4F6] text-slate-400 opacity-60"
                      : isFestivo
                      ? isDarkMode
                        ? "bg-[#181a20] hover:bg-[#20242c]"
                        : "bg-red-50/40 hover:bg-red-50"
                      : cell.isSaturday
                      ? isDarkMode
                        ? "bg-[#141d24] hover:bg-[#1b2730]"
                        : "bg-amber-50/30 hover:bg-amber-50/60"
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
                  {/* Numero del giorno + Badge Festività o Weekend */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-[11px] sm:text-xs font-semibold leading-none ${
                        cell.isToday
                          ? "bg-[#25D366] text-white px-1.5 py-0.5 rounded-full font-bold shadow-2xs"
                          : isFestivo
                          ? "text-red-500 font-bold"
                          : cell.isSaturday
                          ? isDarkMode
                            ? "text-amber-400 font-semibold"
                            : "text-amber-700 font-semibold"
                          : ""
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Indicatori compiti / verifica */}
                    <div className="flex items-center gap-0.5">
                      {cell.holiday.isHoliday && (
                        <span className="text-[9px]" title={cell.holiday.name}>
                          🎉
                        </span>
                      )}
                      {hasVerifica && (
                        <span className="text-[10px] leading-none" title="Verifica in programma!">
                          🚨
                        </span>
                      )}
                      {pendingCount > 0 && !hasVerifica && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      )}
                    </div>
                  </div>

                  {/* Nome Festività Nazionale se presente */}
                  {cell.holiday.isHoliday && (
                    <div
                      className={`px-1 py-0.5 rounded text-[8px] font-bold truncate mb-0.5 border ${
                        isDarkMode
                          ? "bg-red-950/80 text-red-300 border-red-800/60"
                          : "bg-red-100 text-red-800 border-red-300"
                      }`}
                    >
                      🎉 {cell.holiday.name}
                    </div>
                  )}

                  {/* Lista compiti nel riquadro */}
                  <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
                    {cell.tasks.slice(0, 2).map((task, tIdx) => {
                      const isVer =
                        (task.type || "").toLowerCase() === "verifica" ||
                        (task.type || "").toLowerCase() === "interrogazione";
                      return (
                        <div
                          key={task.id || tIdx}
                          className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate border ${
                            task.isCompleted ? "opacity-40 line-through" : ""
                          } ${
                            isVer
                              ? isDarkMode
                                ? "bg-red-950/80 border-red-500/60 text-red-300 font-bold"
                                : "bg-red-100 border-red-300 text-red-800 font-bold"
                              : getSubjectColor(task.subject, isDarkMode)
                          }`}
                          title={`${task.subject}: ${task.description || task.task || ""}`}
                        >
                          <span className="truncate">
                            {isVer ? "🚨 " : "• "}
                            {task.subject}
                          </span>
                        </div>
                      );
                    })}
                    {cell.tasks.length > 2 && (
                      <span
                        className={`text-[8px] sm:text-[9px] font-bold px-0.5 ${
                          isDarkMode ? "text-emerald-400" : "text-emerald-700"
                        }`}
                      >
                        +{cell.tasks.length - 2} altri
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- B) VISTA SETTIMANA ---------------- */}
      {viewMode === "week" && (
        <div className="flex-1 min-h-0 p-2 sm:p-3 overflow-y-auto flex flex-col gap-2">
          {weekDays.map((wDay) => {
            const isFestivo = wDay.isSunday || wDay.holiday.isHoliday;
            return (
              <div
                key={wDay.dateISO}
                className={`p-3 rounded-2xl border transition-all ${
                  wDay.isToday
                    ? isDarkMode
                      ? "bg-[#182229] border-[#25D366] ring-1 ring-[#25D366]"
                      : "bg-emerald-50/50 border-[#25D366] ring-1 ring-[#25D366]"
                    : isFestivo
                    ? isDarkMode
                      ? "bg-[#151920] border-red-900/50"
                      : "bg-red-50/30 border-red-200"
                    : isDarkMode
                    ? "bg-[#111B21] border-[#222E35]"
                    : "bg-white border-slate-200 shadow-2xs"
                }`}
              >
                {/* Header Giorno Settimana */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        wDay.isToday
                          ? "bg-[#25D366] text-white px-2 py-0.5 rounded-full"
                          : isFestivo
                          ? "text-red-500 font-bold"
                          : wDay.isSaturday
                          ? "text-amber-500 font-bold"
                          : ""
                      }`}
                    >
                      {wDay.dayName} {wDay.dayNumber}
                    </span>
                    {wDay.holiday.isHoliday && (
                      <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        🎉 {wDay.holiday.name}
                      </span>
                    )}
                    {wDay.isSunday && !wDay.holiday.isHoliday && (
                      <span className="text-[10px] font-bold text-red-400 uppercase">
                        Domenica
                      </span>
                    )}
                    {wDay.isSaturday && (
                      <span className="text-[10px] font-bold text-amber-500 uppercase">
                        Sabato
                      </span>
                    )}
                  </div>

                  {/* Bottone Aggiungi Compito su questa data specifica */}
                  <button
                    type="button"
                    onClick={() => handleOpenAddTask(wDay.dateISO)}
                    className="text-xs font-bold px-2 py-1 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>+</span>
                    <span>Compito</span>
                  </button>
                </div>

                {/* Lista compiti del giorno */}
                {wDay.tasks.length === 0 ? (
                  <p className={`text-xs italic pl-1 ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
                    Nessun compito o verifica per oggi.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {wDay.tasks.map((task, tIdx) => {
                      const isVer =
                        (task.type || "").toLowerCase() === "verifica" ||
                        (task.type || "").toLowerCase() === "interrogazione";
                      const tutor = findTutorForSubject(task.subject);

                      return (
                        <div
                          key={task.id || tIdx}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                            task.isCompleted
                              ? "opacity-50 line-through bg-transparent border-inherit"
                              : isVer
                              ? isDarkMode
                                ? "bg-red-950/40 border-red-500/50"
                                : "bg-red-50 border-red-200"
                              : isDarkMode
                              ? "bg-[#182229] border-[#2A3942]"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggle(task.id, task.isCompleted)}
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border shrink-0 ${
                                task.isCompleted
                                  ? "bg-[#25D366] border-[#25D366] text-white"
                                  : "border-slate-400 text-transparent"
                              }`}
                            >
                              ✓
                            </button>
                            <span className="text-sm shrink-0">{isVer ? "🚨" : "📝"}</span>
                            <span className="font-bold text-xs truncate">{task.subject}</span>
                            <span className={`text-xs truncate ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                              - {task.description || task.task}
                            </span>
                          </div>

                          {tutor && !task.isCompleted && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenTutorChat?.(
                                  tutor,
                                  `Ciao ${tutor.name}! Ho questo compito di ${task.subject}: "${
                                    task.description || task.task || ""
                                  }". Mi aiuti a svolgerlo?`
                                )
                              }
                              className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 shrink-0 flex items-center gap-1"
                            >
                              <span>Studia</span>
                              <span>💬</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- C) VISTA GIORNO ---------------- */}
      {viewMode === "day" && (
        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto flex flex-col gap-4">
          {/* Festività Banner se presente */}
          {activeDayHoliday.isHoliday && (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 ${
                isDarkMode ? "bg-red-950/50 border-red-800 text-red-200" : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-bold text-sm">Giorno Festivo: {activeDayHoliday.name}</h4>
                <p className="text-xs opacity-80">Festività nazionale in Italia.</p>
              </div>
            </div>
          )}

          {/* Sezione Allenamento Progressivo per il giorno corrente se vi sono verifiche imminenti */}
          {upcomingTrainings.length > 0 && (
            <div
              className={`p-4 rounded-3xl border flex flex-col gap-3 shadow-sm ${
                isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">
                      Piano di Allenamento Progressivo
                    </h3>
                    <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                      Preparazione guidata passo dopo passo verso la verifica
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {upcomingTrainings.map(({ task, training }) => {
                  const tutor = findTutorForSubject(task.subject);
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                        isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-white border-amber-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/40">
                            {training.badge}
                          </span>
                          <span className="font-bold text-sm">{task.subject}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-500">
                          {training.progressPercent}% completato
                        </span>
                      </div>

                      {/* Barra di avanzamento */}
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-[#25D366] rounded-full transition-all duration-500"
                          style={{ width: `${training.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold">{training.phaseTitle}</p>
                        <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                          {training.description}
                        </p>
                      </div>

                      {tutor && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onOpenTutorChat?.(tutor, training.tutorPrompt)}
                            className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-[#111B21] font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            <span>🚀</span>
                            <span>{training.actionTitle} con {tutor.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Elenco compiti del giorno */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">Attività e Compiti del Giorno</h3>
            <button
              type="button"
              onClick={() => handleOpenAddTask(currentDateISO)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#25D366] text-[#111B21] hover:bg-[#20ba59] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>+</span>
              <span>Aggiungi per oggi</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeDayTasks.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center flex flex-col items-center justify-center ${
                  isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-4xl mb-2">🎉</span>
                <p className="font-bold text-sm">Nessuna attività programmata</p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
                  Non ci sono compiti né verifiche per questa data.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddTask(currentDateISO)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#25D366] text-[#111B21] font-bold text-xs cursor-pointer active:scale-95"
                >
                  + Aggiungi il primo compito
                </button>
              </div>
            ) : (
              activeDayTasks.map((item, idx) => {
                const isVer =
                  (item.type || "").toLowerCase() === "verifica" ||
                  (item.type || "").toLowerCase() === "interrogazione";
                const tutor = findTutorForSubject(item.subject);

                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                      item.isCompleted
                        ? "opacity-50 line-through bg-transparent border-inherit"
                        : isVer
                        ? isDarkMode
                          ? "bg-red-950/40 border-red-500/60"
                          : "bg-red-50/80 border-red-200"
                        : isDarkMode
                        ? "bg-[#111B21] border-[#222E35]"
                        : "bg-white border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(item.id, item.isCompleted)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 shrink-0 ${
                            item.isCompleted
                              ? "bg-[#25D366] border-[#25D366] text-white"
                              : "border-slate-400 text-transparent"
                          }`}
                        >
                          ✓
                        </button>
                        <span className="text-lg">{isVer ? "🚨" : "📝"}</span>
                        <span className="font-bold text-sm">{item.subject}</span>
                        {isVer && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 shrink-0">
                            VERIFICA
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={`text-xs pl-8 leading-relaxed ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                      {item.description || item.task}
                    </p>

                    {tutor && !item.isCompleted && (
                      <div className="pl-8 pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenTutorChat?.(
                              tutor,
                              `Ciao ${tutor.name}! Ho questo compito di ${item.subject}: "${
                                item.description || item.task || ""
                              }". Mi aiuti a svolgerlo?`
                            )
                          }
                          className="text-xs font-bold text-[#25D366] hover:underline flex items-center gap-1.5"
                        >
                          <span>Studia con {tutor.name}</span>
                          <span>💬</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODALE DETTAGLI GIORNO (Dalla vista Mensile)                */}
      {/* ============================================================== */}
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
                  <h3 className="font-bold text-base capitalize">{activeDayLabel}</h3>
                  <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    {activeDayHoliday.isHoliday
                      ? `🎉 ${activeDayHoliday.name}`
                      : `${activeDayTasks.length} ${
                          activeDayTasks.length === 1 ? "impegno segnato" : "impegni segnati"
                        }`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayISO(null)}
                className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tasto rapido "+ Aggiungi per questo giorno" */}
            <button
              type="button"
              onClick={() => {
                handleOpenAddTask(selectedDayISO);
              }}
              className="w-full py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#25D366]/30 transition-all active:scale-98 cursor-pointer"
            >
              <span className="text-base font-black">+</span>
              <span>Aggiungi Compito o Verifica per questo giorno</span>
            </button>

            {/* Lista compiti del giorno */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {activeDayTasks.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center my-3 ${
                    isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className="text-4xl mb-2">🎉</span>
                  <p className="font-bold text-sm">Giorno libero!</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    Nessun compito o verifica assegnati per questa data.
                  </p>
                </div>
              ) : (
                activeDayTasks.map((item, idx) => {
                  const isVerifica =
                    (item.type || "").toLowerCase() === "verifica" ||
                    (item.type || "").toLowerCase() === "interrogazione";
                  const matchingTutor = findTutorForSubject(item.subject);

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
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 shrink-0 transition-all cursor-pointer ${
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
                                `Ciao ${matchingTutor.name}! Ho questo compito di ${item.subject} per il ${activeDayLabel}: "${
                                  item.description || item.task || ""
                                }". Mi aiuti a svolgerlo?`
                              );
                            }}
                            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer"
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

      {/* ============================================================== */}
      {/* 7. MODALE AGGIUNGI COMPITO / VERIFICA                          */}
      {/* ============================================================== */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveNewTask}
            className={`w-full max-w-md rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-in zoom-in-95 duration-150 ${
              isDarkMode ? "bg-[#111B21] border-[#222E35] text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{newTaskType === "verifica" ? "🚨" : "📝"}</span>
                <div>
                  <h3 className="font-bold text-base">
                    {newTaskType === "verifica" ? "Aggiungi Verifica / Interrogazione" : "Aggiungi Nuovo Compito"}
                  </h3>
                  <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    Inserimento manuale nel calendario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selettore Tipo: Compito o Verifica */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-80">Tipo di Attività:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewTaskType("compito")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    newTaskType === "compito"
                      ? "bg-[#25D366] text-[#111B21] border-[#25D366] shadow-xs"
                      : isDarkMode
                      ? "bg-[#182229] border-[#2A3942] text-gray-300"
                      : "bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <span>📝</span>
                  <span>Compito a casa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewTaskType("verifica")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    newTaskType === "verifica"
                      ? "bg-red-500 text-white border-red-500 shadow-xs"
                      : isDarkMode
                      ? "bg-[#182229] border-[#2A3942] text-gray-300"
                      : "bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <span>🚨</span>
                  <span>Verifica / Interrogazione</span>
                </button>
              </div>
            </div>

            {/* Selezione Materia */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-80">Materia:</label>
              <select
                value={newTaskSubject}
                onChange={(e) => setNewTaskSubject(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold outline-none cursor-pointer ${
                  isDarkMode
                    ? "bg-[#182229] border-[#2A3942] text-white"
                    : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              >
                {DEFAULT_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Selezione Data */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-80">Data di Scadenza / Evento:</label>
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                required
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                  isDarkMode
                    ? "bg-[#182229] border-[#2A3942] text-white"
                    : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              />
            </div>

            {/* Descrizione / Dettagli compito */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-80">
                {newTaskType === "verifica" ? "Argomenti della verifica / capitoli:" : "Descrizione del compito:"}
              </label>
              <textarea
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder={
                  newTaskType === "verifica"
                    ? "Es. Verifica capitolo 3 sul Rinascimento, date e artisti principali"
                    : "Es. Esercizi pag. 142 n. 3, 4, 5 e lettura"
                }
                rows={3}
                required
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-normal outline-none resize-none ${
                  isDarkMode
                    ? "bg-[#182229] border-[#2A3942] text-white placeholder-gray-500"
                    : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Bottoni Salva / Annulla */}
            <div className="pt-2 border-t border-inherit flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDarkMode ? "hover:bg-[#182229] text-gray-300" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSavingTask || !newTaskDesc.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-[#111B21] font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
              >
                {isSavingTask ? "Salvataggio..." : "Salva in Agenda"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
