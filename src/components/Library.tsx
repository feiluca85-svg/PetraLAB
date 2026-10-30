"use client";

import { useState, useMemo } from "react";
import staticManifest from "@/data/books_manifest.json";
import booksPageIndexRaw from "@/data/books_page_index.json";
import BookViewerModal from "@/components/BookViewerModal";

const booksPageIndex = booksPageIndexRaw as unknown as Record<
  string,
  { totalPages: number; defaultOffset: number; sections?: Record<string, number> }
>;

export interface BookManifestItem {
  fileName: string;
  relativePath: string;
  subjectFolder: string;
  driveFileId: string;
  driveUrl: string;
}

export function getBookCleanTitle(fileName: string): string {
  const clean = fileName.replace(/\.pdf$/i, "");
  if (clean === "Matematica_Aritmetica_1") return "Aritmetica 1";
  if (clean === "Matematica_Aritmetica_2") return "Aritmetica 2";
  if (clean === "Matematica_Geometria_1") return "Geometria 1";
  if (clean === "Matematica_Geometria_2") return "Geometria 2";
  if (clean === "Matematica_Laboratorio delle Competenze 1") return "Laboratorio delle Competenze 1";
  if (clean === "Matematica_Laboratorio delle Competenze 2") return "Laboratorio delle Competenze 2";
  if (clean === "Scienze A") return "Scienze A • Terra, Aria, Acqua";
  if (clean === "Scienze B") return "Scienze B • Materia ed Energia";
  if (clean === "Scienze C") return "Scienze C • I Viventi e la Cellula";
  if (clean === "Scienze D") return "Scienze D • Il Corpo Umano";
  if (clean === "Parole attive - Quaderno") return "Parole Attive • Quaderno";
  if (clean === "Parole Attive") return "Parole Attive • Grammatica & Teoria";
  if (clean === "Greenway 2") return "Greenway 2 • Testo";
  if (clean === "Greenway Atlante 2") return "Greenway 2 • Atlante";
  if (clean === "Salto nel Tempo 2") return "Salto nel Tempo 2";
  if (clean === "Twenty-One Global") return "Twenty-One Global";
  if (clean === "Think Culture Compact") return "Think Culture Compact";
  if (clean === "Think Educazione Civica") return "Think Educazione Civica";
  if (clean === "Infinito Tecnologico") return "Infinito Tecnologico";
  if (clean === "Sfidando le Stelle") return "Sfidando le Stelle";
  if (clean === "Allez! 1") return "Allez! 1";
  if (clean === "Parler culture en poche") return "Parler • Culture en poche";
  if (clean === "Parler èducation civique") return "Parler • Éducation Civique";
  return clean.replace(/_/g, " ");
}

export function getSubjectBadge(folder: string) {
  switch (folder.toLowerCase()) {
    case "matematica":
    case "geometria":
      return { label: "Matematica", emoji: "🧮", bgLight: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50" };
    case "scienze":
      return { label: "Scienze", emoji: "🔬", bgLight: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700/50" };
    case "grammatica":
    case "italiano":
      return { label: "Italiano", emoji: "📚", bgLight: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50" };
    case "inglese":
      return { label: "Inglese", emoji: "🇬🇧", bgLight: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/50" };
    case "storia":
      return { label: "Storia", emoji: "🏛️", bgLight: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/50" };
    case "geografia":
      return { label: "Geografia", emoji: "🌍", bgLight: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700/50" };
    case "tecnologia":
      return { label: "Tecnologia", emoji: "⚙️", bgLight: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50" };
    case "arte e immagine":
    case "arte":
      return { label: "Arte", emoji: "🎨", bgLight: "bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-700/50" };
    case "francese":
      return { label: "Francese", emoji: "🥐", bgLight: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/50" };
    default:
      return { label: folder, emoji: "📖", bgLight: "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" };
  }
}

export default function Library({ isDarkMode }: { isDarkMode?: boolean }) {
  const [selectedBookForViewer, setSelectedBookForViewer] = useState<BookManifestItem | null>(null);
  const [initialBookPage, setInitialBookPage] = useState<string>("");
  const [cardPageInputs, setCardPageInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("tutti");

  const filteredBooks = useMemo(() => {
    return (staticManifest as BookManifestItem[]).filter((book) => {
      const q = searchQuery.trim().toLowerCase();
      const cleanTitle = getBookCleanTitle(book.fileName).toLowerCase();
      const fileName = book.fileName.toLowerCase();
      const subject = book.subjectFolder.toLowerCase();
      const badge = getSubjectBadge(book.subjectFolder);

      const matchesSearch = !q || fileName.includes(q) || cleanTitle.includes(q) || subject.includes(q);

      let matchesSubject = true;
      if (selectedSubject !== "tutti") {
        const filterVal = selectedSubject.toLowerCase();
        matchesSubject = subject.includes(filterVal) || badge.label.toLowerCase().includes(filterVal);
      }

      return matchesSearch && matchesSubject;
    });
  }, [searchQuery, selectedSubject]);

  return (
    <div className={`flex flex-col h-full w-full min-h-0 overflow-hidden select-none ${
      isDarkMode ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-white text-slate-900"
    }`}>
      {/* Header Libreria */}
      <div className={`flex-shrink-0 px-4 pt-3 pb-2 flex justify-between items-center border-b z-20 ${
        isDarkMode ? "bg-[#0B141A] border-[#202C33]" : "bg-white border-slate-100"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg shadow-sm">
            📚
          </div>
          <div>
            <h1 className={`text-[19px] font-bold tracking-tight leading-tight ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}>
              Libreria Scolastica
            </h1>
            <p className={`text-[11px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
              {staticManifest.length} libri di testo in streaming
            </p>
          </div>
        </div>

        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
          isDarkMode 
            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" 
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {filteredBooks.length} {filteredBooks.length === 1 ? "libro" : "libri"}
        </span>
      </div>

      {/* Barra di ricerca */}
      <div className={`flex-shrink-0 px-4 py-2 border-b ${
        isDarkMode ? "bg-[#0B141A] border-[#202C33]" : "bg-white border-slate-100"
      }`}>
        <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all ${
          isDarkMode 
            ? "bg-[#111B21] border-[#222E35] focus-within:border-emerald-500" 
            : "bg-[#F0F2F5] border-transparent focus-within:border-emerald-500 shadow-xs"
        }`}>
          <span className="text-sm text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca libro per titolo o materia..."
            className={`w-full bg-transparent outline-none text-sm font-medium ${
              isDarkMode ? "text-white placeholder-[#8696A0]" : "text-slate-800 placeholder-slate-400"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-60 hover:opacity-100 ${
                isDarkMode ? "text-gray-300" : "text-slate-600"
              }`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chips filtri per materia */}
      <div className={`flex-shrink-0 flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar border-b ${
        isDarkMode ? "bg-[#0B141A] border-[#202C33]" : "bg-white border-slate-100"
      }`}>
        {[
          { id: "tutti", label: "Tutti (23)", emoji: "📚" },
          { id: "matematica", label: "Matematica & Geom.", emoji: "🧮" },
          { id: "scienze", label: "Scienze", emoji: "🔬" },
          { id: "grammatica", label: "Italiano", emoji: "📖" },
          { id: "inglese", label: "Inglese", emoji: "🇬🇧" },
          { id: "storia", label: "Storia", emoji: "🏛️" },
          { id: "geografia", label: "Geografia", emoji: "🌍" },
          { id: "francese", label: "Francese", emoji: "🥐" },
          { id: "tecnologia", label: "Tecnologia", emoji: "⚙️" },
          { id: "arte", label: "Arte", emoji: "🎨" }
        ].map((tab) => {
          const isSelected = selectedSubject === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedSubject(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                isSelected
                  ? (isDarkMode 
                      ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm" 
                      : "bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm")
                  : (isDarkMode
                      ? "bg-[#202C33] text-[#8696A0] border-[#2E3C44] hover:bg-[#2A3942]"
                      : "bg-[#F0F2F5] text-slate-600 border-slate-200 hover:bg-slate-200")
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista scrollabile dei libri */}
      <div className={`flex-1 min-h-0 overflow-y-auto p-4 space-y-3 ${
        isDarkMode ? "bg-[#0B141A]" : "bg-slate-50/50"
      }`}>
        {/* Banner streaming leggero */}
        <div className={`p-3 rounded-2xl border flex items-center gap-3 text-xs ${
          isDarkMode
            ? "bg-blue-950/20 border-blue-800/30 text-blue-200"
            : "bg-blue-50/80 border-blue-200 text-blue-800"
        }`}>
          <span className="text-xl shrink-0">🤏</span>
          <p className="leading-tight">
            <strong>Lettore Galleria Foto</strong>: apri qualsiasi libro, vai direttamente alla <strong>pagina scritta sul libro</strong> e ingrandisci con <strong>2 dita</strong> o <strong>doppio tocco</strong>.
          </p>
        </div>

        {filteredBooks.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${
            isDarkMode ? "bg-[#111B21] border-[#222E35] text-slate-400" : "bg-white border-slate-200 text-slate-500"
          }`}>
            <span className="text-3xl block mb-2">🔍</span>
            <p className="font-semibold text-sm">Nessun libro trovato</p>
            <p className="text-xs mt-1 opacity-75">Prova con un'altra parola chiave o seleziona "Tutti"</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedSubject("tutti"); }}
              className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-all cursor-pointer"
            >
              Mostra tutti i 23 libri
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-6">
            {filteredBooks.map((book) => {
              const badge = getSubjectBadge(book.subjectFolder);
              const cleanTitle = getBookCleanTitle(book.fileName);
              const meta = booksPageIndex[book.driveFileId];
              const totalPages = meta?.totalPages;
              const secList = meta?.sections ? Object.keys(meta.sections) : [];
              const pageJumpVal = cardPageInputs[book.driveFileId] || "";

              return (
                <div
                  key={book.driveFileId}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                    isDarkMode
                      ? "bg-[#111B21] border-[#202C33] hover:border-emerald-500/40"
                      : "bg-white border-slate-200 hover:border-emerald-500/40 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${badge.bgLight}`}>
                        {badge.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bgLight}`}>
                            {badge.label}
                          </span>
                          {totalPages && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              isDarkMode ? "bg-[#202C33] text-[#8696A0]" : "bg-slate-100 text-slate-600"
                            }`}>
                              {totalPages} pag.{secList.length > 1 ? ` • Sez. ${secList.join("/")}` : ""}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-bold text-sm leading-snug truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {cleanTitle}
                        </h4>
                        <p className={`text-[11px] truncate mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {book.fileName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                    {/* Casella rapida: Vai a pagina del libro */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setInitialBookPage(pageJumpVal.trim());
                        setSelectedBookForViewer(book);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border w-[135px] shrink-0 ${
                        isDarkMode
                          ? "bg-[#0B141A] border-[#222E35] focus-within:border-emerald-500"
                          : "bg-slate-50 border-slate-200 focus-within:border-emerald-500"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-emerald-500 shrink-0">Pag.</span>
                      <input
                        type="text"
                        value={pageJumpVal}
                        onChange={(e) =>
                          setCardPageInputs((prev) => ({
                            ...prev,
                            [book.driveFileId]: e.target.value,
                          }))
                        }
                        placeholder={secList.length > 1 ? `es. ${secList[0]}10` : "es. 45"}
                        className={`w-full min-w-0 bg-transparent text-xs font-bold outline-none ${
                          isDarkMode ? "text-white placeholder-[#8696A0]/60" : "text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </form>

                    <button
                      type="button"
                      onClick={() => {
                        setInitialBookPage(pageJumpVal.trim());
                        setSelectedBookForViewer(book);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-[#111B21] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <span>📖</span>
                      <span>{pageJumpVal.trim() ? `Vai a pag. ${pageJumpVal.trim()}` : "Apri e Sfoglia"}</span>
                    </button>

                    <a
                      href={book.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2 px-2.5 rounded-xl font-semibold text-xs border flex items-center justify-center gap-1 transition-all active:scale-[0.98] shrink-0 ${
                        isDarkMode 
                          ? "bg-[#202C33] text-[#8696A0] border-[#2A3942] hover:text-white" 
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                      title="Apri su Google Drive"
                    >
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE VISUALIZZATORE LIBRO CON PINCH-TO-ZOOM E SALTO PAGINA LIBRO */}
      {selectedBookForViewer && (
        <BookViewerModal
          book={selectedBookForViewer}
          isDarkMode={isDarkMode}
          initialBookPage={initialBookPage}
          onClose={() => {
            setSelectedBookForViewer(null);
            setInitialBookPage("");
          }}
        />
      )}
    </div>
  );
}
