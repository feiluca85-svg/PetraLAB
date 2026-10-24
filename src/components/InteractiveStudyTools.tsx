"use client";

import React, { useState } from "react";
import { Tutor } from "@/lib/tutors";
import { FlashcardItem, QuizQuestion, generateFlashcards, generateQuiz } from "@/app/actions/studyTools";

interface InteractiveStudyToolsProps {
  isOpen: boolean;
  onClose: () => void;
  toolType: "flashcard" | "quiz" | null;
  tutor: Tutor;
  agendaItems: any[];
  isDarkMode: boolean;
  onAwardXP: (xp: number) => void;
}

export default function InteractiveStudyTools({
  isOpen,
  onClose,
  toolType,
  tutor,
  agendaItems,
  isDarkMode,
  onAwardXP
}: InteractiveStudyToolsProps) {
  // Config state
  const [pagesQuery, setPagesQuery] = useState("");
  const [cardCount, setCardCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active session data
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Flashcard player state
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [reviewCards, setReviewCards] = useState<string[]>([]);

  // Quiz player state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Completion state
  const [isFinished, setIsFinished] = useState(false);

  // Pre-fill prompt from relevant agenda task if available
  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setIsFinished(false);
      setErrorMessage(null);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setQuizScore(0);
      setKnownCards([]);
      setReviewCards([]);

      const relevant = agendaItems.find((item) =>
        !item.isCompleted &&
        (item.subject.toLowerCase().includes(tutor.subject.split(" ")[0].toLowerCase()) ||
         tutor.subject.toLowerCase().includes(item.subject.toLowerCase()))
      );

      if (relevant && relevant.description) {
        setPagesQuery(relevant.description);
      } else {
        setPagesQuery(tutor.subject.toLowerCase().includes("geograf") ? "Spagna pag. 44-48" : "");
      }
    }
  }, [isOpen, tutor, agendaItems]);

  if (!isOpen || !toolType) return null;

  // Start generation handler
  const handleStartGeneration = async () => {
    if (!pagesQuery.trim()) {
      setErrorMessage("Inserisci le pagine o l'argomento da studiare!");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (toolType === "flashcard") {
        const res = await generateFlashcards({
          subject: tutor.subject,
          pagesQuery,
          count: cardCount
        });

        if (res.success && res.flashcards && res.flashcards.length > 0) {
          setFlashcards(res.flashcards);
          setCurrentIndex(0);
        } else {
          setErrorMessage(res.error || "Non siamo riusciti a creare le flashcard. Riprova!");
        }
      } else {
        const res = await generateQuiz({
          subject: tutor.subject,
          pagesQuery,
          count: cardCount
        });

        if (res.success && res.questions && res.questions.length > 0) {
          setQuestions(res.questions);
          setCurrentIndex(0);
        } else {
          setErrorMessage(res.error || "Non siamo riusciti a creare il quiz. Riprova!");
        }
      }
    } catch (e: any) {
      setErrorMessage("Errore di connessione. Riprova tra poco.");
    } finally {
      setIsLoading(false);
    }
  };

  // Flashcard answer handler
  const handleFlashcardAnswer = (known: boolean) => {
    const cur = flashcards[currentIndex];
    if (known) {
      setKnownCards((prev) => [...prev, cur.id]);
    } else {
      setReviewCards((prev) => [...prev, cur.id]);
    }

    setIsFlipped(false);
    setShowHint(false);

    if (currentIndex + 1 < flashcards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      const earnedXp = (knownCards.length + (known ? 1 : 0)) * 5 + 10;
      onAwardXP(earnedXp);
    }
  };

  // Quiz answer handler
  const handleSelectQuizOption = (optIdx: number) => {
    if (isAnswerChecked) return;
    setSelectedOption(optIdx);
    setIsAnswerChecked(true);

    const cur = questions[currentIndex];
    if (optIdx === cur.correctIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedOption(null);
    setIsAnswerChecked(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      const earnedXp = quizScore * 8 + 15;
      onAwardXP(earnedXp);
    }
  };

  // Restart / Close handlers
  const handleResetSession = () => {
    setFlashcards([]);
    setQuestions([]);
    setIsFinished(false);
    setCurrentIndex(0);
  };

  const hasActiveSession = flashcards.length > 0 || questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
          isDarkMode
            ? "bg-[#1F2C34] border-[#2A3942] text-[#E9EDEF]"
            : "bg-white border-slate-200 text-slate-800"
        }`}
        style={{ maxHeight: "92vh" }}
      >
        {/* MODAL HEADER */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b shrink-0 ${
            isDarkMode ? "border-[#2A3942] bg-[#111B21]/50" : "border-slate-100 bg-slate-50/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-2xl bg-emerald-500/10">
              {toolType === "flashcard" ? "🗂️" : "❓"}
            </span>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {toolType === "flashcard" ? "Mazzo Flashcard" : "Quiz Rapido"}
              </h3>
              <p className="text-xs opacity-70">
                Con {tutor.name} • {tutor.subject}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              isDarkMode
                ? "bg-[#202C33] text-gray-300 hover:bg-[#2A3942]"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col">
          {/* STATE 1: SETUP FORM */}
          {!hasActiveSession && !isLoading && (
            <div className="flex flex-col gap-5 my-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  📖 Pagine o Argomento del Libro
                </label>
                <input
                  type="text"
                  value={pagesQuery}
                  onChange={(e) => setPagesQuery(e.target.value)}
                  placeholder="Es: Spagna pag. 44-48, Regno Unito, pag. 72..."
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    isDarkMode
                      ? "bg-[#111B21] border-[#2A3942] text-white placeholder-gray-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />

                {/* Quick chip from agenda if available */}
                {agendaItems.some((item) => !item.isCompleted && item.description) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[11px] opacity-70 self-center">Compiti trovati:</span>
                    {agendaItems
                      .filter((item) => !item.isCompleted && item.description)
                      .slice(0, 2)
                      .map((task, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPagesQuery(task.description)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all hover:scale-102 ${
                            isDarkMode
                              ? "bg-[#202C33] border-[#2A3942] text-emerald-400"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          📌 {task.subject}: {task.description.slice(0, 30)}...
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  🎯 Quante {toolType === "flashcard" ? "carte" : "domande"} vuoi fare?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCardCount(5)}
                    className={`py-3 px-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                      cardCount === 5
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                        : isDarkMode
                        ? "border-[#2A3942] bg-[#111B21] text-gray-300"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-lg">⚡ 5 {toolType === "flashcard" ? "Carte" : "Quiz"}</span>
                    <span className="text-[11px] opacity-70 font-normal">Veloce (Consigliato)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardCount(10)}
                    className={`py-3 px-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                      cardCount === 10
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                        : isDarkMode
                        ? "border-[#2A3942] bg-[#111B21] text-gray-300"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-lg">🏆 10 {toolType === "flashcard" ? "Carte" : "Quiz"}</span>
                    <span className="text-[11px] opacity-70 font-normal">Super Allenamento</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartGeneration}
                className="w-full mt-2 py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>Partiamo! 🚀</span>
              </button>
            </div>
          )}

          {/* STATE 2: LOADING */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center my-auto">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-xl">
                  📖
                </span>
              </div>
              <div>
                <h4 className="font-bold text-base mb-1">
                  {tutor.name} sta sfogliando il libro...
                </h4>
                <p className="text-xs opacity-70 max-w-xs">
                  {tutor.subject.toLowerCase().includes("geograf")
                    ? "Consultando Greenway 2 per preparare contenuti perfetti per te!"
                    : "Generando le domande più importanti per la tua verifica!"}
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: FLASHCARD PLAYER */}
          {toolType === "flashcard" && flashcards.length > 0 && !isFinished && (
            <div className="flex flex-col flex-1">
              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-4 text-xs font-bold">
                <span className="opacity-70">
                  Carta {currentIndex + 1} di {flashcards.length}
                </span>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500">
                    ✓ {knownCards.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500">
                    ↻ {reviewCards.length}
                  </span>
                </div>
              </div>

              {/* 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] flex-1 cursor-pointer perspective-1000 select-none my-auto"
              >
                <div
                  className={`w-full h-full min-h-[260px] p-6 rounded-3xl border shadow-md flex flex-col justify-between transition-transform duration-300 relative ${
                    isFlipped
                      ? "bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-teal-500/40"
                      : isDarkMode
                      ? "bg-[#111B21] border-[#2A3942]"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                        isFlipped
                          ? "bg-teal-500/20 text-teal-400"
                          : "bg-emerald-500/20 text-emerald-500"
                      }`}
                    >
                      {isFlipped ? "💡 Risposta" : "❓ Domanda"}
                    </span>
                    {flashcards[currentIndex].bookReference && (
                      <span className="text-[11px] opacity-70 flex items-center gap-1 font-semibold">
                        📖 {flashcards[currentIndex].bookReference}
                      </span>
                    )}
                  </div>

                  <div className="py-4 my-auto text-center">
                    <p
                      className={`font-bold leading-relaxed ${
                        isFlipped ? "text-base sm:text-lg text-emerald-400" : "text-lg sm:text-xl"
                      }`}
                    >
                      {isFlipped
                        ? flashcards[currentIndex].answer
                        : flashcards[currentIndex].question}
                    </p>

                    {!isFlipped && showHint && flashcards[currentIndex].hint && (
                      <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs text-left animate-in fade-in">
                        💡 <strong>Indizio:</strong> {flashcards[currentIndex].hint}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px] opacity-60">
                    {!isFlipped && flashcards[currentIndex].hint && !showHint ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(true);
                        }}
                        className="font-bold underline text-amber-400 hover:text-amber-300"
                      >
                        Mostra indizio 💡
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className="ml-auto font-medium">Tocca per girare 🔄</span>
                  </div>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => handleFlashcardAnswer(false)}
                  className={`py-3 px-4 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isDarkMode
                      ? "bg-amber-950/30 border-amber-500/40 text-amber-400 hover:bg-amber-900/40"
                      : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <span>↻ Da ripassare</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlashcardAnswer(true)}
                  className="py-3 px-4 rounded-2xl font-bold text-sm text-white bg-[#25D366] hover:bg-[#118B44] shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span>✓ La sapevo!</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: QUIZ PLAYER */}
          {toolType === "quiz" && questions.length > 0 && !isFinished && (
            <div className="flex flex-col flex-1">
              {/* Quiz Header */}
              <div className="flex items-center justify-between mb-3 text-xs font-bold">
                <span className="opacity-70">
                  Domanda {currentIndex + 1} di {questions.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-500">
                  Punti: {quizScore}
                </span>
              </div>

              {/* Question Text */}
              <div
                className={`p-4 rounded-2xl border mb-4 font-bold text-base leading-relaxed ${
                  isDarkMode ? "bg-[#111B21] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                }`}
              >
                {questions[currentIndex].question}
                {questions[currentIndex].bookReference && (
                  <span className="block mt-2 text-[11px] font-semibold opacity-60">
                    📖 Riferimento: {questions[currentIndex].bookReference}
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5 my-auto">
                {questions[currentIndex].options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrect = optIdx === questions[currentIndex].correctIndex;

                  let optClass = isDarkMode
                    ? "bg-[#111B21] border-[#2A3942] hover:bg-[#202C33] text-gray-200"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800";

                  if (isAnswerChecked) {
                    if (isCorrect) {
                      optClass =
                        "bg-emerald-500/20 border-emerald-500 text-emerald-500 font-bold ring-2 ring-emerald-500/30";
                    } else if (isSelected) {
                      optClass =
                        "bg-red-500/20 border-red-500 text-red-500 line-through opacity-80";
                    } else {
                      optClass = "opacity-40 border-transparent";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isAnswerChecked}
                      onClick={() => handleSelectQuizOption(optIdx)}
                      className={`w-full p-3.5 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-all ${optClass}`}
                    >
                      <span>{opt}</span>
                      {isAnswerChecked && isCorrect && <span>✓</span>}
                      {isAnswerChecked && isSelected && !isCorrect && <span>✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation box after answer */}
              {isAnswerChecked && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs animate-in fade-in">
                  <p className="font-bold text-emerald-500 mb-1">
                    {selectedOption === questions[currentIndex].correctIndex
                      ? "🎉 Esatto!"
                      : "💡 Spiegazione corretta:"}
                  </p>
                  <p className="opacity-90 leading-relaxed">
                    {questions[currentIndex].explanation}
                  </p>
                </div>
              )}

              {/* Next Button */}
              {isAnswerChecked && (
                <button
                  type="button"
                  onClick={handleNextQuizQuestion}
                  className="w-full mt-4 py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>
                    {currentIndex + 1 < questions.length
                      ? "Prossima domanda ➔"
                      : "Vedi risultato finale 🏆"}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* STATE 5: COMPLETION / CELEBRATION */}
          {isFinished && (
            <div className="flex flex-col items-center justify-center py-6 text-center my-auto animate-in zoom-in-95 duration-200">
              <span className="text-5xl mb-3">🎉</span>
              <h4 className="text-2xl font-black mb-1">Sessione Completata!</h4>
              <p className="text-xs opacity-75 max-w-xs mb-5">
                Ottimo ripasso! Ogni volta che ti alleni così la tua memoria diventa di ferro.
              </p>

              <div
                className={`w-full p-5 rounded-3xl border mb-6 flex flex-col items-center gap-3 ${
                  isDarkMode ? "bg-[#111B21] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                }`}
              >
                {toolType === "flashcard" ? (
                  <>
                    <div className="text-3xl font-black text-emerald-500">
                      {knownCards.length} / {flashcards.length}
                    </div>
                    <p className="text-xs opacity-80">Concetti che sapevi già benissimo!</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-black text-emerald-500">
                      {quizScore} / {questions.length}
                    </div>
                    <p className="text-xs opacity-80">
                      {quizScore === questions.length
                        ? "Punteggio perfetto! Sei un fenomeno! 🌟"
                        : quizScore >= questions.length / 2
                        ? "Ottimo risultato! Continua così! 👍"
                        : "Buon allenamento! Ripassa i dettagli del libro 📖"}
                    </p>
                  </>
                )}

                <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-black">
                  ⭐ +{toolType === "flashcard" ? knownCards.length * 5 + 10 : quizScore * 8 + 15} XP Guadagnati!
                </div>
              </div>

              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={handleResetSession}
                  className={`flex-1 py-3 px-4 rounded-2xl border font-bold text-xs transition-all ${
                    isDarkMode
                      ? "border-[#2A3942] bg-[#111B21] text-gray-300"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  Altro argomento 🔄
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md"
                >
                  Torna alla Chat ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
