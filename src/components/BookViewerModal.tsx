"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import booksPageIndexRaw from "@/data/books_page_index.json";
import geoIndexData from "@/data/geografia_libro_index.json";
import { BookManifestItem, getBookCleanTitle, getSubjectBadge } from "@/components/Library";

interface BookPageIndexEntry {
  fileName: string;
  relativePath: string;
  subjectFolder: string;
  totalPages: number;
  defaultOffset: number;
  sections?: Record<string, number>;
  ranges: [number, number][];
}

const booksPageIndex = booksPageIndexRaw as unknown as Record<string, BookPageIndexEntry>;

interface BookViewerModalProps {
  book: BookManifestItem;
  isDarkMode?: boolean;
  onClose: () => void;
  initialBookPage?: string | number;
}

export default function BookViewerModal({
  book,
  isDarkMode = true,
  onClose,
  initialBookPage,
}: BookViewerModalProps) {
  const indexEntry = booksPageIndex[book.driveFileId];
  const totalPages = indexEntry?.totalPages || 300;
  const sections = indexEntry?.sections || null;
  const sectionKeys = useMemo(() => (sections ? Object.keys(sections) : []), [sections]);

  // Sezione attiva (es. "A" o "B" per Sfidando le Stelle, "M" o "S" per Parole Attive)
  const [activeSection, setActiveSection] = useState<string>(
    sectionKeys.length > 0 ? sectionKeys[0] : ""
  );

  // Offset personalizzati salvati dall'utente (per libro + eventuale sezione)
  const [customOffsets, setCustomOffsets] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("petralab_book_offsets_v1");
      if (saved) {
        setCustomOffsets(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const getOffsetKey = useCallback(
    (sec?: string) => {
      const s = sec !== undefined ? sec : activeSection;
      return s ? `${book.driveFileId}_${s}` : book.driveFileId;
    },
    [book.driveFileId, activeSection]
  );

  // Calcola l'offset attivo per convertire Pagina Libro <-> Pagina PDF
  const getEffectiveOffset = useCallback(
    (bookPageNum?: number, sec?: string): number => {
      const s = sec !== undefined ? sec : activeSection;
      const customKey = s ? `${book.driveFileId}_${s}` : book.driveFileId;
      if (customOffsets[customKey] !== undefined) {
        return customOffsets[customKey];
      }
      if (s && sections && sections[s] !== undefined) {
        return sections[s];
      }
      // Caso speciale Greenway 2: da pag. 112 l'offset passa da 13 a 14
      if (
        book.fileName.toLowerCase().includes("greenway 2") &&
        bookPageNum !== undefined &&
        bookPageNum >= 112
      ) {
        return 14;
      }
      return indexEntry?.defaultOffset ?? 0;
    },
    [activeSection, book.driveFileId, book.fileName, customOffsets, indexEntry, sections]
  );

  // Pagina PDF corrente (1-based)
  const [pdfPage, setPdfPage] = useState<number>(() => {
    const defOff =
      sectionKeys.length > 0 && sections
        ? sections[sectionKeys[0]]
        : indexEntry?.defaultOffset ?? 0;
    // Partiamo dalla pagina 1 del libro (o dalla copertina se offset == 0)
    return Math.min(totalPages, Math.max(1, 1 + defOff));
  });

  const [bookPageInput, setBookPageInput] = useState<string>("");
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showCalibrateModal, setShowCalibrateModal] = useState<boolean>(false);
  const [calibrateInput, setCalibrateInput] = useState<string>("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Stato Zoom & Pan (stile Galleria Foto)
  const [scale, setScale] = useState<number>(1);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Riferimenti per i gesti touch (pinch, pan, double-tap, swipe)
  const gestureRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
    initialMidpoint: { x: number; y: number };
    initialTranslate: { x: number; y: number };
    isPanning: boolean;
    panStart: { x: number; y: number };
    lastTapTime: number;
    lastTapPos: { x: number; y: number };
    swipeStartX: number;
    swipeStartY: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1,
    initialMidpoint: { x: 0, y: 0 },
    initialTranslate: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    lastTapTime: 0,
    lastTapPos: { x: 0, y: 0 },
    swipeStartX: 0,
    swipeStartY: 0,
  });

  // Calcola l'etichetta della pagina stampata sul libro a partire da pdfPage
  const currentBookPageDisplay = useMemo(() => {
    // Se il libro ha più sezioni (es. Sfidando le Stelle A/B o Parole Attive M/S),
    // individua automaticamente in quale sezione ci troviamo se non c'è override manuale
    let detectedSection = activeSection;
    if (sectionKeys.length > 1 && sections) {
      let bestSec = sectionKeys[0];
      for (const sk of sectionKeys) {
        const secOff = customOffsets[`${book.driveFileId}_${sk}`] ?? sections[sk];
        if (pdfPage > secOff) {
          bestSec = sk;
        }
      }
      detectedSection = bestSec;
    }

    const off = getEffectiveOffset(pdfPage - (indexEntry?.defaultOffset ?? 0), detectedSection);
    const num = pdfPage - off;

    if (num <= 0) {
      // Frontespizio / Indice iniziale in numeri romani
      return {
        label: `Indice / Copertina (Scan ${pdfPage})`,
        shortLabel: `Scan ${pdfPage}`,
        pageNumber: null as number | null,
        section: detectedSection,
      };
    }

    const prefix = sectionKeys.length > 0 ? detectedSection : "";
    return {
      label: `${prefix}${num}`,
      shortLabel: `${prefix}${num}`,
      pageNumber: num,
      section: detectedSection,
    };
  }, [
    activeSection,
    book.driveFileId,
    customOffsets,
    getEffectiveOffset,
    indexEntry,
    pdfPage,
    sectionKeys,
    sections,
  ]);

  // Sincronizza la casella di testo e la sezione attiva quando cambia pdfPage
  useEffect(() => {
    if (currentBookPageDisplay.pageNumber !== null) {
      setBookPageInput(currentBookPageDisplay.shortLabel);
      if (currentBookPageDisplay.section && currentBookPageDisplay.section !== activeSection) {
        setActiveSection(currentBookPageDisplay.section);
      }
    } else {
      setBookPageInput("");
    }
  }, [pdfPage, currentBookPageDisplay.pageNumber, currentBookPageDisplay.shortLabel, currentBookPageDisplay.section]);

  // Reset zoom quando si cambia pagina
  const goToPdfPage = useCallback(
    (targetPdf: number) => {
      const clamped = Math.max(1, Math.min(totalPages, targetPdf));
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      if (clamped !== pdfPage) {
        setIsImageLoading(true);
        setImageError(null);
        setPdfPage(clamped);
      }
    },
    [pdfPage, totalPages]
  );

  // Vai direttamente alla pagina scritta sul libro (es. "45", "B108", "M32", "A10")
  const handleJumpToBookPage = useCallback(
    (rawInput?: string, forcedSection?: string) => {
      const val = (rawInput !== undefined ? rawInput : bookPageInput).trim().toUpperCase();
      if (!val) return;

      // Estrai eventuale lettera di sezione (es. "B108" -> sec="B", num=108)
      const match = val.match(/^([A-Z])?\s*(\d+)$/);
      if (!match) {
        setFeedbackToast("Inserisci un numero di pagina valido (es. 45 o B108)");
        setTimeout(() => setFeedbackToast(null), 2500);
        return;
      }

      const letter = match[1] || forcedSection || activeSection;
      const bookNum = parseInt(match[2], 10);

      let chosenSec = activeSection;
      if (letter && sections && sections[letter] !== undefined) {
        chosenSec = letter;
        setActiveSection(letter);
      }

      const off = getEffectiveOffset(bookNum, chosenSec);
      const targetPdf = Math.max(1, Math.min(totalPages, bookNum + off));
      goToPdfPage(targetPdf);

      const prefix = sectionKeys.length > 0 ? chosenSec : "";
      setFeedbackToast(`📖 Pagina libro ${prefix}${bookNum}`);
      setTimeout(() => setFeedbackToast(null), 1800);
    },
    [activeSection, bookPageInput, getEffectiveOffset, goToPdfPage, sectionKeys.length, sections, totalPages]
  );

  // Se viene passato initialBookPage all'apertura
  useEffect(() => {
    if (initialBookPage !== undefined && initialBookPage !== "") {
      handleJumpToBookPage(String(initialBookPage));
    }
  }, [initialBookPage]);

  // Precarica in background la pagina successiva e precedente per sfogliamento istantaneo
  useEffect(() => {
    const preloadPages = [pdfPage + 1, pdfPage - 1, pdfPage + 2].filter(
      (p) => p >= 1 && p <= totalPages
    );
    preloadPages.forEach((p) => {
      const img = new window.Image();
      img.src = `/api/book-page?driveFileId=${encodeURIComponent(book.driveFileId)}&page=${p}`;
    });
  }, [book.driveFileId, pdfPage, totalPages]);

  // Supporto frecce tastiera e tasto Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCalibrateModal) setShowCalibrateModal(false);
        else onClose();
      } else if (
        e.key === "ArrowRight" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        goToPdfPage(pdfPage + 1);
      } else if (
        e.key === "ArrowLeft" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        goToPdfPage(pdfPage - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPdfPage, onClose, pdfPage, showCalibrateModal]);

  // Calibrazione 1-tap: "Su questa pagina che vedo c'è scritto il numero X"
  const handleSaveCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = calibrateInput.trim().toUpperCase();
    const match = clean.match(/^([A-Z])?\s*(\d+)$/);
    if (!match) return;

    const letter = match[1] || activeSection;
    const printedNum = parseInt(match[2], 10);
    if (printedNum <= 0) return;

    let targetSec = activeSection;
    if (letter && sections && sections[letter] !== undefined) {
      targetSec = letter;
      setActiveSection(letter);
    }

    const newOffset = pdfPage - printedNum;
    const key = targetSec ? `${book.driveFileId}_${targetSec}` : book.driveFileId;

    const updated = { ...customOffsets, [key]: newOffset };
    setCustomOffsets(updated);
    try {
      localStorage.setItem("petralab_book_offsets_v1", JSON.stringify(updated));
    } catch {}

    setShowCalibrateModal(false);
    setCalibrateInput("");
    setFeedbackToast(`✅ Numerazione calibrata! Questa è pag. ${targetSec}${printedNum}`);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // --- GESTIONE TOUCH: PINCH-TO-ZOOM (2 dita), PAN (1 dito), DOUBLE-TAP, SWIPE ---
  const clampTranslate = (tx: number, ty: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const rect = containerRef.current?.getBoundingClientRect();
    const maxW = rect ? (rect.width * (currentScale - 1)) / 2 + 40 : 300;
    const maxH = rect ? (rect.height * (currentScale - 1)) / 2 + 60 : 450;
    return {
      x: Math.max(-maxW, Math.min(maxW, tx)),
      y: Math.max(-maxH, Math.min(maxH, ty)),
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current;

    if (e.touches.length === 2) {
      // Inizio Pinch-to-Zoom con 2 dita
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      g.isPinching = true;
      g.isPanning = false;
      g.initialDistance = dist;
      g.initialScale = scale;
      g.initialMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      g.initialTranslate = { ...translate };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      const dt = now - g.lastTapTime;
      const tapDist = Math.hypot(t.clientX - g.lastTapPos.x, t.clientY - g.lastTapPos.y);

      // Rilevamento Doppio Tocco (Double-Tap Zoom stile Galleria Foto)
      if (dt > 40 && dt < 300 && tapDist < 36) {
        e.preventDefault();
        if (scale > 1.15) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          const rect = containerRef.current?.getBoundingClientRect();
          const targetScale = 2.5;
          if (rect) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = (centerX - t.clientX) * 1.1;
            const dy = (centerY - t.clientY) * 1.1;
            setScale(targetScale);
            setTranslate(clampTranslate(dx, dy, targetScale));
          } else {
            setScale(targetScale);
          }
        }
        g.lastTapTime = 0;
        return;
      }

      g.lastTapTime = now;
      g.lastTapPos = { x: t.clientX, y: t.clientY };

      if (scale > 1.02) {
        // Pan con 1 dito quando l'immagine è ingrandita
        g.isPanning = true;
        g.panStart = { x: t.clientX - translate.x, y: t.clientY - translate.y };
      } else {
        // Swipe orizzontale con 1 dito quando zoom = 1x per sfogliare pagina
        g.isPanning = false;
        g.swipeStartX = t.clientX;
        g.swipeStartY = t.clientY;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current;

    if (e.touches.length === 2 && g.isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (g.initialDistance > 0) {
        const ratio = dist / g.initialDistance;
        const nextScale = Math.max(1, Math.min(4.2, g.initialScale * ratio));

        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dx = midX - g.initialMidpoint.x;
        const dy = midY - g.initialMidpoint.y;

        setScale(nextScale);
        setTranslate(
          clampTranslate(
            g.initialTranslate.x + dx,
            g.initialTranslate.y + dy,
            nextScale
          )
        );
      }
    } else if (e.touches.length === 1 && g.isPanning && scale > 1.02) {
      e.preventDefault();
      const t = e.touches[0];
      const nextX = t.clientX - g.panStart.x;
      const nextY = t.clientY - g.panStart.y;
      setTranslate(clampTranslate(nextX, nextY, scale));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current;

    if (g.isPinching && e.touches.length < 2) {
      g.isPinching = false;
      if (scale < 1.05) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
      // Se rimane 1 dito appoggiato dopo il pinch, aggiorna panStart per evitare salti
      if (e.touches.length === 1 && scale > 1.05) {
        g.isPanning = true;
        g.panStart = {
          x: e.touches[0].clientX - translate.x,
          y: e.touches[0].clientY - translate.y,
        };
      }
      return;
    }

    if (g.isPanning && e.touches.length === 0) {
      g.isPanning = false;
      return;
    }

    // Se era a zoom 1x, controlla se l'utente ha fatto uno swipe sinistra/destra per cambiare pagina
    if (scale <= 1.02 && e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - g.swipeStartX;
      const diffY = endY - g.swipeStartY;

      if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
        if (diffX < 0 && pdfPage < totalPages) {
          goToPdfPage(pdfPage + 1);
        } else if (diffX > 0 && pdfPage > 1) {
          goToPdfPage(pdfPage - 1);
        }
      }
    }
  };

  // Gestione trascinamento con mouse su desktop/Mac quando ingrandito
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1.02) return;
    e.preventDefault();
    const g = gestureRef.current;
    g.isPanning = true;
    g.panStart = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.isPanning || scale <= 1.02) return;
    const nextX = e.clientX - g.panStart.x;
    const nextY = e.clientY - g.panStart.y;
    setTranslate(clampTranslate(nextX, nextY, scale));
  };

  const handleMouseUp = () => {
    gestureRef.current.isPanning = false;
  };

  const badge = getSubjectBadge(book.subjectFolder);
  const cleanTitle = getBookCleanTitle(book.fileName);
  const imageUrl = `/api/book-page?driveFileId=${encodeURIComponent(
    book.driveFileId
  )}&page=${pdfPage}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080E12] text-white select-none overflow-hidden animate-in fade-in duration-150">
      {/* BARRA SUPERIORE: Titolo + Vai alla Pagina del Libro */}
      <div className="flex-shrink-0 bg-[#111B21] border-b border-[#222E35] px-3 py-2 flex flex-col gap-2 z-20 shadow-md">
        {/* Riga 1: Indietro, Titolo Libro, Calibra, Chiudi */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#202C33] hover:bg-[#2A3942] text-gray-200 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Torna alla Libreria"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm shrink-0">{badge.emoji}</span>
                <h3 className="font-bold text-sm truncate text-white leading-tight">
                  {cleanTitle}
                </h3>
              </div>
              <p className="text-[11px] text-[#8696A0] truncate">
                {currentBookPageDisplay.pageNumber !== null ? (
                  <>
                    <span className="text-emerald-400 font-bold">
                      📖 Pag. Libro {currentBookPageDisplay.label}
                    </span>{" "}
                    • Scan {pdfPage}/{totalPages}
                  </>
                ) : (
                  <>
                    {currentBookPageDisplay.label} di {totalPages}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCalibrateInput(
                  currentBookPageDisplay.pageNumber !== null
                    ? String(currentBookPageDisplay.pageNumber)
                    : ""
                );
                setShowCalibrateModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#202C33] hover:bg-[#2A3942] text-amber-300 border border-amber-500/30 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Allinea il numero di pagina se noti uno scarto"
            >
              <span>🎯</span>
              <span className="hidden xs:inline">Calibra</span>
            </button>

            <a
              href={book.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl font-semibold text-[11px] bg-[#202C33] text-[#8696A0] border border-[#2E3C44] hover:text-white flex items-center gap-1 active:scale-95 transition-all"
              title="Apri PDF intero su Google Drive"
            >
              <span>Drive</span>
              <span>↗</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 px-2.5 rounded-xl text-xs font-bold bg-red-950/50 text-red-400 border border-red-800/40 hover:bg-red-900/60 active:scale-95 transition-all cursor-pointer"
              title="Chiudi"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Riga 2: Barra "Vai alla Pagina scritta nel libro" + Selettore Sezione (se presente) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Se il libro ha sezioni (es. Arte A/B o Italiano M/S), mostra i pulsanti di sezione */}
          {sectionKeys.length > 1 && (
            <div className="flex items-center gap-1 bg-[#0B141A] p-1 rounded-xl border border-[#222E35] shrink-0">
              {sectionKeys.map((secKey) => {
                const isActive = activeSection === secKey;
                return (
                  <button
                    key={secKey}
                    type="button"
                    onClick={() => {
                      setActiveSection(secKey);
                      const off = getEffectiveOffset(1, secKey);
                      goToPdfPage(Math.min(totalPages, Math.max(1, 1 + off)));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 shadow-xs"
                        : "text-[#8696A0] hover:text-white"
                    }`}
                  >
                    Sez. {secKey}
                  </button>
                );
              })}
            </div>
          )}

          {/* Form "Vai a Pagina del Libro" */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJumpToBookPage();
            }}
            className="flex-1 flex items-center gap-1.5 bg-[#0B141A] px-2.5 py-1 rounded-xl border border-[#222E35] focus-within:border-emerald-500"
          >
            <span className="text-[11px] font-bold text-emerald-400 shrink-0">
              📖 Pag. libro:
            </span>
            <input
              type="text"
              inputMode="text"
              value={bookPageInput}
              onChange={(e) => setBookPageInput(e.target.value)}
              placeholder={
                sectionKeys.length > 1
                  ? `Es. ${activeSection}25`
                  : "Es. 45"
              }
              className="w-full min-w-[50px] bg-transparent text-white font-bold text-xs outline-none placeholder-[#8696A0]/60"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              Vai ↵
            </button>
          </form>

          {/* Controlli rapidi Zoom (- / 100% / +) */}
          <div className="flex items-center gap-1 bg-[#0B141A] p-1 rounded-xl border border-[#222E35] shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, Number((scale - 0.5).toFixed(2)));
                setScale(next);
                if (next <= 1) setTranslate({ x: 0, y: 0 });
              }}
              disabled={scale <= 1}
              className="w-6 h-6 rounded-lg bg-[#202C33] text-white font-bold text-xs flex items-center justify-center disabled:opacity-40 cursor-pointer"
              title="Riduci zoom"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                if (scale > 1) {
                  setScale(1);
                  setTranslate({ x: 0, y: 0 });
                } else {
                  setScale(2.2);
                }
              }}
              className="px-1.5 text-[11px] font-bold text-emerald-400 min-w-[38px] text-center cursor-pointer"
              title="Tocca per resettare o ingrandire"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(4, Number((scale + 0.6).toFixed(2)));
                setScale(next);
              }}
              disabled={scale >= 4}
              className="w-6 h-6 rounded-lg bg-[#202C33] text-white font-bold text-xs flex items-center justify-center disabled:opacity-40 cursor-pointer"
              title="Ingrandisci pagina"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* AREA CENTRALE: PAGINA DEL LIBRO CON PINCH-TO-ZOOM E PAN (STILE GALLERIA FOTO) */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: "none" }}
        className={`flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden bg-[#080E12] ${
          scale > 1.02 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {/* Toast feedback al centro in alto */}
        {feedbackToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {feedbackToast}
          </div>
        )}

        {/* Loader durante il caricamento della singola pagina */}
        {isImageLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#080E12]/80 z-20 pointer-events-none">
            <div className="w-9 h-9 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-emerald-400">
              Apertura pagina {currentBookPageDisplay.shortLabel}...
            </p>
          </div>
        )}

        {/* Eventuale errore di rete */}
        {imageError ? (
          <div className="p-6 rounded-2xl bg-[#111B21] border border-red-800/40 text-center max-w-xs mx-4 z-20">
            <span className="text-3xl block mb-2">⚠️</span>
            <p className="text-sm font-bold text-white mb-1">{imageError}</p>
            <p className="text-xs text-[#8696A0] mb-4">
              Verifica la connessione e riprova.
            </p>
            <button
              type="button"
              onClick={() => {
                setImageError(null);
                setIsImageLoading(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              🔄 Riprova
            </button>
          </div>
        ) : (
          <img
            key={`${book.driveFileId}_p${pdfPage}`}
            src={imageUrl}
            alt={`${cleanTitle} - Pagina ${currentBookPageDisplay.label}`}
            draggable={false}
            onLoad={() => {
              setIsImageLoading(false);
              setImageError(null);
            }}
            onError={() => {
              setIsImageLoading(false);
              setImageError("Impossibile caricare l'immagine di questa pagina.");
            }}
            style={{
              transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
              transformOrigin: "center center",
              transition:
                gestureRef.current.isPinching || gestureRef.current.isPanning
                  ? "none"
                  : "transform 160ms cubic-bezier(0.2, 0, 0, 1)",
            }}
            className="max-h-full max-w-full object-contain select-none shadow-2xl"
          />
        )}

        {/* Suggerimento discreto per lo zoom in basso */}
        {scale === 1 && !isImageLoading && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-gray-300 font-medium border border-white/10">
            🤏 Usa 2 dita o doppio tocco per ingrandire • Scorri per sfogliare
          </div>
        )}
      </div>

      {/* BARRA INFERIORE: Navigazione rapida pagine + Slider */}
      <div className="flex-shrink-0 bg-[#111B21] border-t border-[#222E35] px-3 py-2.5 flex items-center justify-between gap-2 z-20">
        <button
          type="button"
          onClick={() => goToPdfPage(pdfPage - 1)}
          disabled={pdfPage <= 1}
          className="px-3.5 py-2 rounded-xl bg-[#202C33] hover:bg-[#2A3942] disabled:opacity-35 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <span>◀</span>
          <span>Prec.</span>
        </button>

        <div className="flex-1 flex flex-col items-center px-2 min-w-0">
          <input
            type="range"
            min={1}
            max={totalPages}
            value={pdfPage}
            onChange={(e) => goToPdfPage(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-[#202C33] rounded-lg cursor-pointer"
          />
          <div className="flex items-center justify-between w-full text-[10px] text-[#8696A0] mt-1 font-medium">
            <span>
              {currentBookPageDisplay.pageNumber !== null
                ? `📖 Pag. Libro: ${currentBookPageDisplay.label}`
                : `Copertina / Indice`}
            </span>
            <span>
              Scan {pdfPage} / {totalPages}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => goToPdfPage(pdfPage + 1)}
          disabled={pdfPage >= totalPages}
          className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-35 text-[#111B21] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <span>Succ.</span>
          <span>▶</span>
        </button>
      </div>

      {/* MODALE CALIBRAZIONE RAPIDA NUMERO DI PAGINA */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#111B21] border border-[#2A3942] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <span>🎯</span>
                <span>Allinea Numero Pagina</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowCalibrateModal(false)}
                className="text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8696A0] leading-relaxed mb-4">
              Guarda il numero stampato nell&apos;angolo della pagina che hai davanti in questo momento e scrivilo qui sotto. Da ora in poi il salto pagina sarà perfetto al 100%!
            </p>

            <form onSubmit={handleSaveCalibration} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                  Che numero è stampato su questa pagina?
                </label>
                <input
                  type="text"
                  autoFocus
                  value={calibrateInput}
                  onChange={(e) => setCalibrateInput(e.target.value)}
                  placeholder={
                    sectionKeys.length > 1
                      ? `Es. ${activeSection}42`
                      : "Es. 42"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B141A] border border-[#2A3942] focus:border-emerald-500 text-white font-bold text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCalibrateModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#202C33] text-gray-300 font-semibold text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  Salva allineamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
