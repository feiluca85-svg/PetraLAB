"use client";

import React, { useState, useEffect, useRef } from "react";
import { generateStudyPlan } from "@/app/actions/chat";
import { Tutor } from "@/lib/tutors";

export interface StudyPlanStep {
  id: string;
  taskId: string | null;
  subject: string;
  phase: "teoria" | "esercizi" | "lettura" | "pausa" | "generale";
  title: string;
  description: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  completed?: boolean;
  tutorId?: string | null;
}

export interface StudyPlan {
  totalEstimatedMinutes: number;
  motivationalMessage: string;
  steps: StudyPlanStep[];
}

interface StudyPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  agendaItems: any[];
  tutors: Tutor[];
  isDarkMode: boolean;
  onSelectTutor?: (tutor: Tutor) => void;
  onCompleteTask?: (taskId: string) => void;
  onSaveHabits?: (subject: string, phase: string, minutes: number) => void;
  userHabits?: Record<string, { avgMinutes: number; count: number }>;
}

export default function StudyPlanner({
  isOpen,
  onClose,
  agendaItems,
  tutors,
  isDarkMode,
  onSelectTutor,
  onCompleteTask,
  onSaveHabits,
  userHabits = {}
}: StudyPlannerProps) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [stepStartTime, setStepStartTime] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filtra compiti non completati
  const pendingTasks = agendaItems.filter(item => !item.isCompleted);

  // Calcola data di domani e oggi
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const tomorrowISO = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;

  // Priorità ai compiti per oggi e domani
  const relevantTasks = pendingTasks.filter(item => {
    const due = item.dueDate;
    return due === todayISO || due === tomorrowISO || due === "Prossima lezione";
  });

  const [includeFutureTasks, setIncludeFutureTasks] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Compiti futuri (oltre oggi e domani)
  const futureTasks = pendingTasks.filter(item => {
    const due = item.dueDate;
    return due !== todayISO && due !== tomorrowISO && due !== "Prossima lezione";
  });

  const tasksToPlan = includeFutureTasks 
    ? (relevantTasks.length > 0 ? [...relevantTasks, ...futureTasks.slice(0, 4)] : pendingTasks.slice(0, 8))
    : (relevantTasks.length > 0 ? relevantTasks : pendingTasks.slice(0, 6));

  // Genera il piano con l'AI
  const handleGenerate = async (forceFuture?: boolean) => {
    const useFuture = forceFuture !== undefined ? forceFuture : includeFutureTasks;
    const tasks = useFuture 
      ? (relevantTasks.length > 0 ? [...relevantTasks, ...futureTasks.slice(0, 4)] : pendingTasks.slice(0, 8))
      : (relevantTasks.length > 0 ? relevantTasks : pendingTasks.slice(0, 6));

    if (tasks.length === 0) return;
    setLoading(true);
    setSessionCompleted(false);
    try {
      const promptNote = useFuture 
        ? `${customNote} - ATTENZIONE: Lo studente ha completato i compiti urgenti e vuole AVVANTAGGIARSI sui compiti dei prossimi giorni! Sottolinea con grande entusiasmo che portandosi avanti guadagnerà tantissimo tempo libero per se stessa nei prossimi giorni!`
        : customNote;

      const res = await generateStudyPlan(tasks, userHabits, promptNote);
      if (res.success && res.plan) {
        setPlan(res.plan);
        setActiveStepIndex(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Se aperto e non c'è un piano, genera automaticamente
  useEffect(() => {
    if (isOpen && !plan && !loading && tasksToPlan.length > 0) {
      handleGenerate();
    }
  }, [isOpen]);

  // Gestione timer
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining]);

  // Avvio di un blocco di studio
  const handleStartStep = (index: number) => {
    if (!plan) return;
    const step = plan.steps[index];
    setActiveStepIndex(index);
    setSecondsRemaining(step.estimatedMinutes * 60);
    setIsTimerRunning(true);
    setStepStartTime(Date.now());
  };

  // Completamento di un blocco
  const handleCompleteStep = (index: number) => {
    if (!plan) return;
    const currentStep = plan.steps[index];
    const durationMin = stepStartTime 
      ? Math.max(1, Math.round((Date.now() - stepStartTime) / 60000))
      : currentStep.estimatedMinutes;

    // Registra abitudine per l'IA
    if (onSaveHabits && currentStep.subject && currentStep.phase !== "pausa") {
      onSaveHabits(currentStep.subject, currentStep.phase, durationMin);
    }

    // Se associato a un compito, spunta completato
    if (currentStep.taskId && onCompleteTask) {
      // Controlla se ci sono altri step ancora da fare per lo stesso compito
      const remainingStepsForSameTask = plan.steps.filter((s, i) => i !== index && s.taskId === currentStep.taskId && !s.completed);
      if (remainingStepsForSameTask.length === 0) {
        onCompleteTask(currentStep.taskId);
      }
    }

    const updatedSteps = [...plan.steps];
    updatedSteps[index] = { ...currentStep, completed: true, actualMinutes: durationMin };
    setPlan({ ...plan, steps: updatedSteps });

    // Passa al prossimo se esiste
    const nextIdx = index + 1;
    if (nextIdx < plan.steps.length) {
      handleStartStep(nextIdx);
    } else {
      setActiveStepIndex(null);
      setIsTimerRunning(false);
      setSessionCompleted(true);
    }
  };

  // Tempo formattato MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcola orario di fine previsto se parte adesso
  const getEstimatedEndTime = (totalMinutes: number) => {
    const target = new Date(Date.now() + totalMinutes * 60000);
    return `${target.getHours().toString().padStart(2, '0')}:${target.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const currentStep = activeStepIndex !== null && plan ? plan.steps[activeStepIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border ${
        isDarkMode ? "bg-[#111B21] border-[#222E35] text-white" : "bg-white border-slate-200 text-slate-800"
      }`}>
        
        {/* HEADER MODALE */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-emerald-50 border-emerald-100"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl shadow-md">
              ⏱️
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                Pianifica il Pomeriggio
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Antistress
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Un passo alla volta, con pause rilassanti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-lg font-bold ${
              isDarkMode ? "hover:bg-white/10 text-[#8696A0]" : "hover:bg-slate-200 text-slate-400"
            }`}
          >
            ✕
          </button>
        </div>

        {/* CONTENUTO SCORREVOLE */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
              <h3 className="font-bold text-base mb-1">Sto organizzando il tuo pomeriggio...</h3>
              <p className={`text-xs max-w-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Separo la teoria dagli esercizi e programmo le pause giuste per farti finire presto e senza fatica!
              </p>
            </div>
          ) : sessionCompleted ? (
            /* --- SCHERMATA TRAGUARDO & INVITAZIONE AD AVVANTAGGIARSI --- */
            <div className="py-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-emerald-400 to-teal-500 flex items-center justify-center text-4xl shadow-xl animate-bounce">
                🌟
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Missione Compiuta! +50 XP
                </span>
                <h3 className="text-2xl font-black mt-2 mb-1">
                  Hai finito tutti i compiti di oggi! 🚀
                </h3>
                <p className={`text-sm max-w-md mx-auto leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Vedi che questo metodo a piccoli passi funziona davvero? Ci hai messo molto meno di quanto pensavi e senza alcuno stress!
                </p>
              </div>

              {/* CARD: Ti senti ispirata? Avvantaggiati! */}
              {futureTasks.length > 0 ? (
                <div className={`w-full max-w-md p-4 rounded-3xl border text-left flex flex-col gap-3 shadow-lg ${
                  isDarkMode ? "bg-gradient-to-br from-emerald-950/40 via-[#111B21] to-teal-950/40 border-emerald-500/40" : "bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">💡</span>
                    <div>
                      <h4 className={`font-black text-sm ${isDarkMode ? "text-emerald-400" : "text-emerald-800"}`}>
                        Ti senti ispirata per un super potere in più?
                      </h4>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? "text-[#8696A0]" : "text-slate-600"}`}>
                        Se ti porti avanti adesso con <strong>{futureTasks.length} {futureTasks.length === 1 ? 'compito dei prossimi giorni' : 'compiti dei prossimi giorni'}</strong>, domani e nel weekend avrai <strong>ore di tempo libero al 100% per te</strong>: per disegnare, uscire o rilassarti senza pensieri!
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    {futureTasks.slice(0, 3).map((ft, i) => (
                      <div key={i} className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                        isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200"
                      }`}>
                        <span className="font-bold truncate max-w-[200px]">{ft.subject}: {ft.description?.slice(0, 35)}...</span>
                        <span className="text-[10px] font-semibold text-emerald-500 shrink-0">Scad: {ft.dueDate}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => handleGenerate(true)}
                      className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>⚡</span> SÌ! AVVANTAGGIAMI E REGALAMI TEMPO LIBERO
                    </button>
                    <button
                      onClick={onClose}
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs transition-colors ${
                        isDarkMode ? "hover:bg-white/5 text-[#8696A0]" : "hover:bg-slate-100 text-slate-500"
                      }`}
                    >
                      No, per oggi mi fermo qui e mi godo il mio meritato relax! ☕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md active:scale-95"
                  >
                    🎉 Fantastico! Chiudi e goditi il pomeriggio libero
                  </button>
                </div>
              )}
            </div>
          ) : tasksToPlan.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <span className="text-5xl mb-3">🎉</span>
              <h3 className="font-bold text-lg mb-1">Nessun compito in programma!</h3>
              <p className={`text-sm ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Tutti i compiti per oggi e domani risultano già completati. Goditi il tuo tempo libero!
              </p>
            </div>
          ) : currentStep ? (
            /* --- MODALITÀ FOCUS ATTIVA (UN PASSO ALLA VOLTA) --- */
            <div className="flex flex-col items-center text-center py-4 gap-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Step {activeStepIndex! + 1} di {plan!.steps.length}
                </span>
                <span className={`text-xs font-semibold ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                  • {currentStep.phase === "pausa" ? "Ricarica" : currentStep.subject}
                </span>
              </div>

              {/* Titolo e Descrizione del Blocco Corrente */}
              <div className="max-w-md">
                <h3 className="text-2xl font-black mb-2 flex items-center justify-center gap-2">
                  {currentStep.phase === "pausa" ? "☕" : currentStep.phase === "teoria" ? "📖" : "✏️"}
                  {currentStep.title}
                </h3>
                <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {currentStep.description}
                </p>
              </div>

              {/* TIMER CIRCOLARE / VISIVO */}
              <div className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center shadow-xl my-2 relative transition-all ${
                currentStep.phase === "pausa"
                  ? "border-amber-400 bg-amber-500/10"
                  : isTimerRunning
                    ? "border-emerald-500 bg-emerald-500/10 shadow-emerald-500/20"
                    : "border-slate-500 bg-slate-500/10"
              }`}>
                <span className="text-4xl font-black tracking-tight font-mono">
                  {formatTime(secondsRemaining)}
                </span>
                <span className={`text-xs mt-1 font-semibold ${
                  currentStep.phase === "pausa" ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {currentStep.phase === "pausa" ? "Pausa Merenda/Relax" : "Tempo consigliato"}
                </span>
                {secondsRemaining === 0 && (
                  <span className="text-[11px] font-bold text-amber-400 animate-pulse mt-1">
                    Tempo terminato! Finisci con calma.
                  </span>
                )}
              </div>

              {/* CONTROLLI TIMER & AZIONI */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm mt-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isTimerRunning
                      ? isDarkMode ? "bg-[#202C33] text-slate-300 hover:bg-[#2A3942]" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {isTimerRunning ? "⏸ Pausa Timer" : "▶ Riprendi"}
                </button>

                <button
                  onClick={() => handleCompleteStep(activeStepIndex!)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md flex items-center gap-2 transform active:scale-95 transition-all"
                >
                  <span>✓</span> Ho finito questo blocco!
                </button>
              </div>

              {/* PULSANTE CHIAMA TUTOR SE SI BLOCCA */}
              {currentStep.tutorId && onSelectTutor && (
                <div className="pt-2">
                  {(() => {
                    const tutor = tutors.find(t => t.id === currentStep.tutorId || t.subject.toLowerCase().includes(currentStep.subject.toLowerCase()));
                    if (!tutor) return null;
                    return (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectTutor(tutor);
                        }}
                        className={`text-xs font-semibold px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
                          isDarkMode
                            ? "bg-[#202C33] border-[#2A3942] text-emerald-400 hover:bg-[#2A3942]"
                            : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        <span>💬</span> Sei bloccata? Chiedi aiuto a {tutor.name}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : plan ? (
            /* --- ANTEPRIMA DELLA TABELLA DI MARCIA --- */
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              {/* Box motivazionale e stima totale */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isDarkMode ? "bg-emerald-950/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-200"
              }`}>
                <div>
                  <h4 className="font-bold text-sm text-emerald-500 flex items-center gap-1.5 mb-1">
                    <span>✨</span> Il tuo piano per oggi
                  </h4>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {plan.motivationalMessage}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs uppercase font-bold text-emerald-500 block">Fine prevista</span>
                  <span className="text-xl font-black">
                    ~{getEstimatedEndTime(plan.totalEstimatedMinutes)}
                  </span>
                  <span className={`text-[11px] block ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                    ({plan.totalEstimatedMinutes} min tot)
                  </span>
                </div>
              </div>

              {/* LISTA DEI BLOCCHI PROGRAMMATI */}
              <div className="flex flex-col gap-2.5">
                {plan.steps.map((step, idx) => {
                  const isBreak = step.phase === "pausa";
                  const isExpanded = expandedSteps[step.id || idx];
                  const matchingTutor = tutors.find(t => 
                    (step.tutorId && t.id === step.tutorId) || 
                    t.subject.toLowerCase().includes(step.subject.toLowerCase())
                  );

                  return (
                    <div
                      key={step.id || idx}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                        step.completed
                          ? isDarkMode ? "bg-[#111B21] border-[#222E35] opacity-50" : "bg-slate-50 border-slate-200 opacity-60"
                          : isBreak
                            ? isDarkMode ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50 border-amber-200"
                            : isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div 
                        onClick={() => setExpandedSteps(prev => ({ ...prev, [step.id || idx]: !prev[step.id || idx] }))}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            step.completed
                              ? "bg-emerald-500 text-white"
                              : isBreak
                                ? "bg-amber-400/20 text-amber-500"
                                : isDarkMode ? "bg-[#111B21] text-emerald-400" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {step.completed ? "✓" : isBreak ? "☕" : step.phase === "teoria" ? "📖" : "✏️"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className={`font-bold text-sm truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {step.title}
                              </h5>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                isBreak 
                                  ? "bg-amber-500/20 text-amber-400" 
                                  : isDarkMode ? "bg-[#111B21] text-[#8696A0]" : "bg-slate-100 text-slate-600"
                              }`}>
                                {step.subject}
                              </span>
                            </div>
                            <p className={`text-xs ${isExpanded ? '' : 'truncate'} ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-semibold ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                            ⏱️ {step.estimatedMinutes}m
                          </span>
                          <span className="text-xs opacity-60">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* DETTAGLI ESPANSI CON PULSANTE TUTOR E AVVIO */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-dashed border-slate-300/30 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2">
                            {matchingTutor && onSelectTutor && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onSelectTutor(matchingTutor);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm active:scale-95"
                              >
                                {matchingTutor.avatar?.startsWith("/avatars/") ? (
                                  <img src={matchingTutor.avatar} alt="avatar" className="w-4 h-4 object-contain" />
                                ) : (
                                  <span>{matchingTutor.avatar}</span>
                                )}
                                <span>Chiedi a {matchingTutor.name}</span>
                              </button>
                            )}
                          </div>

                          {!step.completed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartStep(idx);
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-xs flex items-center gap-1"
                            >
                              <span>Avvia questo blocco</span> ▶
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* PULSANTE DI AVVIO GLOBALE */}
              <div className="pt-2">
                <button
                  onClick={() => handleStartStep(0)}
                  className="w-full py-3.5 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>▶️</span> INIZIA IL PRIMO BLOCCO (15 MIN)
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 text-xs ${
          isDarkMode ? "bg-[#202C33] border-[#2A3942] text-[#8696A0]" : "bg-slate-50 border-slate-200 text-slate-500"
        }`}>
          <span>🌱 L'IA impara ogni giorno i tuoi ritmi naturali.</span>
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="hover:underline font-bold text-emerald-500"
          >
            🔄 Ricalcola piano
          </button>
        </div>

      </div>
    </div>
  );
}
