"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { sendMessage } from "@/app/actions/chat";
import { Content } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useGamification } from "@/hooks/useGamification";
import { getLevelInfo } from "@/lib/levels";
import { Tutor, SubjectMemory } from "@/lib/tutors";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import StudyPlanner from "@/components/StudyPlanner";
import InteractiveStudyTools from "@/components/InteractiveStudyTools";

type UIMessage = {
  role: "user" | "model";
  text: string;
  imageUrl?: string;
  bookPageInfo?: {
    bookPage: number;
    pdfPage: number;
    topicName?: string;
    unitTitle?: string;
  } | null;
  time?: string;
  date?: string;
  timestamp?: number;
};

type SubjectChatData = {
  messages: UIMessage[];
  lastUpdated?: string;
  lastUpdatedDate?: string;
  lastUpdatedTimestamp?: number;
};


const parseDateForSort = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione' || d === 'Senza data') return 9999999999999;
  
  let time = 9999999999998;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    time = new Date(d + 'T00:00:00').getTime();
  } else {
    const parts = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
      time = new Date(`${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}T00:00:00`).getTime();
    } else {
      const t = new Date(d).getTime();
      if (!isNaN(t)) time = t;
    }
  }
  return time;
};

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const DAY_NAMES = [
  'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'
];

const formatFullTextDate = (dStr: string) => {
  if (!dStr || dStr.toLowerCase() === 'prossima lezione') return 'Prossima Lezione';
  if (dStr === 'Senza data') return 'Senza data';
  
  let normalized = dStr;
  const itParts = dStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (itParts) {
    normalized = `${itParts[3]}-${itParts[2].padStart(2, '0')}-${itParts[1].padStart(2, '0')}`;
  }
  
  const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = ymd[1];
    const monthNum = parseInt(ymd[2], 10);
    const dayNum = parseInt(ymd[3], 10);
    const dateObj = new Date(Number(year), monthNum - 1, dayNum);
    const monthName = MONTH_NAMES[monthNum - 1] || ymd[2];
    const weekdayName = DAY_NAMES[dateObj.getDay()] || '';
    return `${year} ${monthName} ${dayNum} ${weekdayName}`.trim();
  }
  return dStr;
};

// Converte link/URL presenti nel testo dei compiti in collegamenti cliccabili evidenziati
const renderFormattedTaskText = (text: string) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-bold text-sky-500 hover:text-sky-400 underline underline-offset-4 decoration-2 hover:decoration-sky-300 break-all bg-sky-500/10 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
          title="Apri pagina web"
        >
          <span>🔗</span>
          <span>{part}</span>
        </a>
      );
    }
    return part;
  });
};

/**
 * Riconosce intelligentemente la materia e il miglior tutor per rispondere alla domanda dell'utente.
 */
export function detectBestTutorForQuery(query: string, allTutors: Tutor[], defaultTutorId?: string): Tutor {
  if (!allTutors || allTutors.length === 0) return {} as Tutor;
  const q = query.toLowerCase().trim();

  // 1. Corrispondenza diretta per nome tutor o materia esatta
  for (const t of allTutors) {
    const tName = t.name.toLowerCase();
    const tSub = t.subject.toLowerCase();
    if (q.includes(tName)) return t;
    const subWords = tSub.split(/[^a-z0-9]/).filter(w => w.length > 2);
    if (subWords.some(w => q.includes(w))) return t;
  }

  // 2. Keyword score per materia della scuola media
  const scores: Record<string, number> = {
    matematica: 0,
    geometria: 0,
    scienze: 0,
    italiano: 0,
    grammatica: 0,
    inglese: 0,
    storia: 0,
    geografia: 0,
    francese: 0,
    arte: 0,
    tecnologia: 0
  };

  const keywords: Record<string, string[]> = {
    matematica: [
      "matematica", "aritmetica", "algebra", "numero", "numeri", "calcol", "frazion", 
      "espression", "equazion", "potenz", "radice", "moltiplic", "division", "somma", 
      "sottrazion", "percentual", "proporzion", "rapport", "grafic", "mcd", "mcm", 
      "numeri relativi", "meno per meno", "più per meno", "risolvi", "quanto fa", "operazione"
    ],
    geometria: [
      "geometria", "teorema", "pitagora", "euclide", "angolo", "angoli", "triangol", 
      "quadrat", "rettangol", "cerchio", "perimetro", "area", "volume", "poligono", 
      "trapezio", "rombo", "parallelogramma", "cateto", "ipotenusa", "corda", "raggio", 
      "diametro", "circonferenza", "solidi", "prisma", "piramide", "cilindro", "cono"
    ],
    scienze: [
      "scienz", "cellul", "dna", "rna", "corpo umano", "organo", "organi", "cuore", 
      "cervello", "sangue", "polmoni", "stomaco", "scheletro", "muscoli", "nervi", 
      "vulcan", "terremot", "pianet", "sole", "luna", "sistema solare", "stelle", 
      "galassi", "universo", "atomo", "molecol", "chimic", "fisic", "element", 
      "tavola periodic", "ecosistem", "animal", "piant", "fotosintesi", "atmosfer", 
      "roccia", "mineral", "fossili", "evoluzione", "darwin", "materia", "solido", 
      "liquido", "gas", "ebollizione", "densità", "forza di gravità", "energia"
    ],
    italiano: [
      "italian", "grammatic", "verbo", "verbi", "coniugazion", "modo", "tempo", 
      "indicativo", "congiuntivo", "condizionale", "gerundio", "participio", "infinito", 
      "soggetto", "predicat", "complemento", "analisi logic", "analisi del periodo", 
      "analisi grammatic", "aggettiv", "pronome", "nome", "avverbio", "preposizion", 
      "congiunzion", "sintassi", "tema", "testo", "poesia", "parafrasi", "dante", 
      "divina commedia", "inferno", "purgatorio", "paradiso", "narrativ", "antologia", 
      "letteratur", "racconto", "ortografi", "accento", "apostrofo", "doppie", "sillabe", 
      "plurale", "singolare", "maschile", "femminile", "sinonimo", "contrario", "figura retorica", "metafora"
    ],
    inglese: [
      "ingles", "english", "traduci", "traduzion", "in inglese", "come si dice", 
      "present simple", "past simple", "continuous", "future", "verb to be", 
      "have got", "vocabulary", "listening", "reading", "grammar", "pronounc", 
      "pronuncia", "sentence", "false friends", "irregular verbs", "verbi irregolari"
    ],
    storia: [
      "stori", "guerra", "battaglia", "impero", "imperatore", "romani", "greci", 
      "medioevo", "feudalesim", "crociate", "rinascimento", "scoperta dell'america", 
      "rivoluzion", "francese", "industriale", "fascismo", "nazismo", "prima guerra", 
      "seconda guerra", "trattato", "re ", "regina", "papa", "faraon", "egizi", 
      "napoleone", "crisi", "costituzion", "alleanza", "secolo", "civiltà", "archeologi", 
      "cleopatra", "cesare", "augusto", "carlo magno"
    ],
    geografia: [
      "geograf", "capital", "stato", "stati", "nazion", "europa", "continente", 
      "fiume", "fiumi", "monte", "monti", "catena montuos", "alpi", "appennini", 
      "pianura", "lago", "laghi", "mare", "oceano", "clima", "abitanti", "popolazion", 
      "confini", "cartina", "mappa", "atlante", "spagna", "francia", "germania", 
      "regno unito", "italia", "regione", "settore primario", "secondario", "terziario", 
      "greenway", "densità di popolazione"
    ],
    francese: [
      "frances", "francais", "in francese", "parler", "bonjour", "verbes francais", "allez"
    ],
    arte: [
      "arte", "disegno", "quadro", "pittore", "scultore", "colori", "prospettiva", 
      "chiaroscuro", "giotto", "michelangelo", "leonardo", "sfidando le stelle"
    ],
    tecnologia: [
      "tecnologi", "materiali", "legno", "metallo", "plastica", "circuito", 
      "elettricità", "energia", "disegno tecnico", "proiezione ortogonale", "infinito tecnologico"
    ]
  };

  for (const [subj, kwList] of Object.entries(keywords)) {
    for (const kw of kwList) {
      if (q.includes(kw)) {
        scores[subj] += 1;
      }
    }
  }

  // Raggruppa affinità
  scores.matematica += scores.geometria;
  scores.italiano += scores.grammatica;

  let bestSubj = "";
  let highestScore = 0;
  for (const [subj, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestSubj = subj;
    }
  }

  if (bestSubj && highestScore > 0) {
    const matched = allTutors.find(t => 
      t.subject.toLowerCase().includes(bestSubj) || 
      t.id.toLowerCase().includes(bestSubj)
    );
    if (matched) return matched;
  }

  if (defaultTutorId) {
    const defTutor = allTutors.find(t => t.id === defaultTutorId);
    if (defTutor) return defTutor;
  }

  return allTutors[0];
}

export default function Chat({ 
  tutors, 
  isDarkMode, 
  toggleTheme, 
  onChatOpen,
  onSubTabChange
}: { 
  tutors: Tutor[]; 
  isDarkMode?: boolean; 
  toggleTheme?: () => void; 
  onChatOpen?: (isOpen: boolean) => void;
  onSubTabChange?: (tab: 'tutte' | 'compiti' | 'voti') => void;
}) {
  const { stats, awardXP, dbError } = useGamification();
  const levelInfo = getLevelInfo(stats.xp);
  
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [chatsByTutor, setChatsByTutor] = useState<Record<string, SubjectChatData>>({});
  const [subjectsMemory, setSubjectsMemory] = useState<Record<string, SubjectMemory>>({});
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [userHabits, setUserHabits] = useState<Record<string, { avgMinutes: number; count: number }>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showHomeMenu, setShowHomeMenu] = useState(false);

  const [showChatMenu, setShowChatMenu] = useState(false);

  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  // Interactive study tools state (Flashcard & Quiz)
  const [studyToolType, setStudyToolType] = useState<"flashcard" | "quiz" | null>(null);

    // Gestione tasto indietro infallibile tramite Hash
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== "#chat" && selectedTutor) {
        setSelectedTutor(null);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [selectedTutor]);

  // Quando selezioniamo un tutor, aggiungiamo uno stato alla history
  const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    window.location.hash = "chat";
  };


  useEffect(() => {
    const savedSpeed = localStorage.getItem("petralab_voice_speed");
    if (savedSpeed) setVoiceSpeed(parseFloat(savedSpeed));
  }, []);

  const toggleVoiceSpeed = () => {
    setVoiceSpeed(prev => {
      const next = prev === 1.0 ? 0.8 : prev === 0.8 ? 1.2 : 1.0;
      localStorage.setItem("petralab_voice_speed", next.toString());
      return next;
    });
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const lastCompitiScrollRef = useRef<number>(-1);
  const recognitionRef = useRef<any>(null);
  const wasVoiceInputRef = useRef<boolean>(false);

  useEffect(() => {
    if (onChatOpen) onChatOpen(!!selectedTutor);
  }, [selectedTutor, onChatOpen]);

  // Incolla immagine da appunti (screenshot paste)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setSelectedImage(file);
          break;
        }
      }
    }
  };

  // Formatta l'orario attuale stile WhatsApp (es: 19:20)
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  // Restituisce la data attuale formato YYYY-MM-DD (es: 2026-10-11)
  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [listFilter, setListFilter] = useState<'tutte'|'compiti'|'voti'>('tutte');
  const [agendaItems, setAgendaItems] = useState<any[]>([]);

  const tabScrollMap = useRef<Record<string, number>>({
    tutte: 0,
    compiti: -1,
    voti: 0
  });

  const handleTabChange = (newFilter: 'tutte'|'compiti'|'voti') => {
    if (listScrollRef.current) {
      tabScrollMap.current[listFilter] = listScrollRef.current.scrollTop;
    }
    setListFilter(newFilter);
    if (onSubTabChange) onSubTabChange(newFilter);
  };

  useEffect(() => {
    if (onSubTabChange) onSubTabChange(listFilter);
  }, []);

  // Memorizza la posizione esatta dello scroll per ciascuna tab separatamente
  const handleListScroll = () => {
    if (listScrollRef.current) {
      tabScrollMap.current[listFilter] = listScrollRef.current.scrollTop;
    }
  };

  // Posizionamento istantaneo per ciascuna tab SENZA scorrimento visibile
  useLayoutEffect(() => {
    const container = listScrollRef.current;
    if (!container) return;

    const restoreTabPosition = () => {
      if (!container) return;
      if (listFilter === 'tutte' || listFilter === 'voti') {
        // "Tutte" e "Voti" partono sempre dall'inizio assoluto (0) a meno che l'utente non abbia già scorso in questa sessione
        container.scrollTop = tabScrollMap.current[listFilter] || 0;
      } else if (listFilter === 'compiti') {
        const saved = tabScrollMap.current[listFilter];
        if (saved !== undefined && saved >= 0) {
          container.scrollTop = saved;
        } else {
          // Prima apertura:
          const targetEl = container.querySelector('[data-agenda-focus="true"]') as HTMLElement;
          const allDays = container.querySelectorAll('[data-agenda-day="true"]');
          const firstDay = allDays.length > 0 ? (allDays[0] as HTMLElement) : null;

          // Se il giorno obiettivo è già il primo (non ci sono giorni passati sopra), parti da 0 esatto
          if (!targetEl || (firstDay && targetEl === firstDay)) {
            container.scrollTop = 0;
            tabScrollMap.current[listFilter] = 0;
          } else {
            // Se ci sono giorni passati sopra, salta al giorno obiettivo lasciando visibile l'intestazione
            const targetTop = Math.max(0, targetEl.offsetTop - 55);
            container.scrollTop = targetTop;
            tabScrollMap.current[listFilter] = targetTop;
          }
        }
      }
    };

    restoreTabPosition();
    requestAnimationFrame(restoreTabPosition);
  }, [listFilter]);
  // Effetto Badge OS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      const urgentCount = agendaItems.filter(item => {
        if (item.isCompleted) return false;
        let d = item.dueDate || '';
        const parts = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (parts) d = `${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
        
        const dObj = new Date();
        const todayStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
        const tomObj = new Date();
        tomObj.setDate(tomObj.getDate() + 1);
        const tStr = `${tomObj.getFullYear()}-${String(tomObj.getMonth()+1).padStart(2,'0')}-${String(tomObj.getDate()).padStart(2,'0')}`;
        return d === todayStr || d === tStr;
      }).length;
      
      if (urgentCount > 0) {
        (navigator as any).setAppBadge(urgentCount).catch(console.error);
      } else {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [agendaItems]);
  const handleToggleAgendaItem = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      const updated = agendaItems.map(item => 
        item.id === id ? { ...item, isCompleted: !currentStatus } : item
      );
      // Aggiornamento ottimistico locale
      setAgendaItems(updated);
      
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
    } catch (err) {
      console.error("Errore durante l'aggiornamento del compito:", err);
    }
  };

  const handleCompleteTaskById = async (id: string) => {
    try {
      const updated = agendaItems.map(item => 
        item.id === id ? { ...item, isCompleted: true } : item
      );
      setAgendaItems(updated);
      awardXP(25);
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
    } catch (err) {
      console.error("Errore completamento compito da planner:", err);
    }
  };

  const handleSaveHabits = async (subject: string, phase: string, durationMinutes: number) => {
    try {
      const key = `${subject.toLowerCase()}_${phase.toLowerCase()}`;
      const existing = userHabits[key] || { avgMinutes: durationMinutes, count: 0 };
      const newCount = existing.count + 1;
      const newAvg = Math.round((existing.avgMinutes * existing.count + durationMinutes) / newCount);

      const updatedHabits = {
        ...userHabits,
        [key]: { avgMinutes: newAvg, count: newCount }
      };
      setUserHabits(updatedHabits);
      await setDoc(doc(db, "petralab_users", "studente_demo"), { userHabits: updatedHabits }, { merge: true });
    } catch (err) {
      console.error("Errore salvataggio abitudini studio:", err);
    }
  };

  const handleUpdateTaskDate = async (e: React.MouseEvent, id: string, newDate: string) => {
    e.stopPropagation();
    try {
      const updated = agendaItems.map(item => 
        item.id === id ? { ...item, dueDate: newDate } : item
      );
      setAgendaItems(updated);
      await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: updated }, { merge: true });
    } catch (err) {
      console.error("Errore durante la modifica della data:", err);
    }
  };


  // Ascolta le chat e la memoria da Firestore in tempo reale
  useEffect(() => {
    const userRef = doc(db, "petralab_users", "studente_demo");
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.subjectsMemory) {
          setSubjectsMemory(data.subjectsMemory);
        }
        if (data.userHabits) {
          setUserHabits(data.userHabits);
        }
        if (data.chatsByTutor) {
          setChatsByTutor(data.chatsByTutor);
        }
        if (data.agendaItems && Array.isArray(data.agendaItems)) {
          const seenIds = new Set<string>();
          let hasDuplicates = false;
          const cleaned = data.agendaItems.map((item: any, idx: number) => {
            let itemId = item.id;
            if (!itemId || itemId === 'id_random123' || itemId === 'id_1' || seenIds.has(itemId)) {
              itemId = `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
              hasDuplicates = true;
            }
            seenIds.add(itemId);
            return {
              ...item,
              id: itemId,
              isCompleted: Boolean(item.isCompleted)
            };
          });
          setAgendaItems(cleaned);
          if (hasDuplicates) {
            setDoc(userRef, { agendaItems: cleaned }, { merge: true }).catch(console.error);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // I messaggi del tutor attualmente selezionato
  const currentMessages: UIMessage[] = selectedTutor 
    ? (chatsByTutor[selectedTutor.id]?.messages || [
        { 
          role: "model", 
          text: selectedTutor.greeting,
          time: getCurrentTime()
        }
      ])
    : [];

  // Seleziona un tutor aprendo la sua chat stile WhatsApp
  const handleOpenChat = (tutor: Tutor) => {
    handleSelectTutor(tutor);
    
    // Se non ci sono ancora messaggi per questo tutor, inizializza con il saluto personalizzato
    if (!chatsByTutor[tutor.id] || chatsByTutor[tutor.id].messages.length === 0) {
      const mem = subjectsMemory[tutor.id];
      let greeting = tutor.greeting;
      if (mem?.grades && mem.grades.length > 0) {
        const lastGrade = mem.grades[mem.grades.length - 1];
        greeting = `Bentornata! Ricordo che l'ultimo voto che mi hai detto era ${lastGrade.grade}${lastGrade.topic ? ` in '${lastGrade.topic}'` : ''}. Come stanno andando le lezioni in questi giorni? Ci sono novità o verifiche? Di cosa ci occupiamo oggi?`;
      }
      
      const nowTime = getCurrentTime();
      const nowDate = getCurrentDate();
      const nowTimestamp = Date.now();
      const initialMsgs: UIMessage[] = [{ 
        role: "model", 
        text: greeting, 
        time: nowTime, 
        date: nowDate, 
        timestamp: nowTimestamp 
      }];
      const updatedChats = {
        ...chatsByTutor,
        [tutor.id]: { 
          messages: initialMsgs, 
          lastUpdated: nowTime, 
          lastUpdatedDate: nowDate, 
          lastUpdatedTimestamp: nowTimestamp 
        }
      };
      setChatsByTutor(updatedChats);
      
      const userRef = doc(db, "petralab_users", "studente_demo");
      setDoc(userRef, { chatsByTutor: updatedChats }, { merge: true }).catch(console.error);
    }
  };

  const scrollToBottomInstant = () => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  };

  const scrollToBottomSmooth = () => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({
        top: chatMessagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Posizionamento istantaneo all'apertura della chat sull'ultima risposta (NESSUNO scorrimento visibile)
  useLayoutEffect(() => {
    if (selectedTutor) {
      scrollToBottomInstant();
      requestAnimationFrame(() => {
        scrollToBottomInstant();
      });
    }
  }, [selectedTutor]);

  // Se arriva una nuova risposta mentre si sta chattando, scorri dolcemente
  const prevMsgCountRef = useRef<number>(0);
  useEffect(() => {
    if (selectedTutor) {
      const currentCount = currentMessages.length;
      if (prevMsgCountRef.current > 0 && currentCount > prevMsgCountRef.current) {
        scrollToBottomSmooth();
      }
      prevMsgCountRef.current = currentCount;
    } else {
      prevMsgCountRef.current = 0;
    }
  }, [selectedTutor, currentMessages.length]);

  // Setup Riconoscimento Vocale
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'it-IT';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + (prev ? " " : "") + transcript);
          wasVoiceInputRef.current = true;
          setIsListening(false);
        };

        recognitionRef.current.onerror = (e: any) => {
          console.error("Speech recognition error", e);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
    
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      alert("Il tuo browser non supporta il riconoscimento vocale.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        if (selectedTutor?.voiceLang) {
          recognitionRef.current.lang = selectedTutor.voiceLang;
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    
    // Pulisci e converti formule matematiche e simboli LaTeX in linguaggio parlato naturale
    let cleanText = text;
    // Rimuovi commenti nascosti come <!-- TRACK: ... -->
    cleanText = cleanText.replace(/<!--[\s\S]*?-->/g, '');
    // Converti frazioni \frac{a}{b} -> "a fratto b"
    cleanText = cleanText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 fratto $2');
    // Rimuovi tag \text{...} lasciando solo il testo
    cleanText = cleanText.replace(/\\text\{([^}]+)\}/g, '$1');
    // Converti radici quadrate \sqrt{x} -> "radice quadrata di x"
    cleanText = cleanText.replace(/\\sqrt\{([^}]+)\}/g, 'radice quadrata di $1');
    // Converti potenze semplici come x^2 -> "x alla seconda", x^3 -> "x alla terza"
    cleanText = cleanText.replace(/\^2\b/g, ' alla seconda');
    cleanText = cleanText.replace(/\^3\b/g, ' alla terza');
    cleanText = cleanText.replace(/\^([0-9]+)/g, ' alla $1');
    // Converti simboli matematici comuni in parole pronunciabili
    cleanText = cleanText.replace(/\\times|\\cdot|\s\*\s/g, ' per ');
    cleanText = cleanText.replace(/\\div|\s\/\s/g, ' diviso ');
    cleanText = cleanText.replace(/\s\+\s/g, ' più ');
    cleanText = cleanText.replace(/\s\-\s/g, ' meno ');
    cleanText = cleanText.replace(/\s=\s/g, ' uguale a ');
    cleanText = cleanText.replace(/\s\+-\s|\\pm/g, ' più o meno ');
    // Rimuovi simboli LaTeX residui (\pi, \le, \ge, backslash, ecc.)
    cleanText = cleanText.replace(/\\pi/g, 'pi greco');
    cleanText = cleanText.replace(/\\([a-zA-Z]+)/g, '');
    // Rimuovi caratteri di formattazione markdown e LaTeX ($$, $, *, #, _, `, {, })
    cleanText = cleanText.replace(/[\$\*\#\_`\{\}\\]/g, ' ');
    // Riduci spazi multipli
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.lang = selectedTutor?.voiceLang || "it-IT";
    utterance.rate = voiceSpeed;
    
    if (selectedTutor?.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const exactVoice = voices.find(v => v.voiceURI === selectedTutor.voiceURI);
      if (exactVoice) utterance.voice = exactVoice;
    }
    
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      const langVoices = voices.filter(v => v.lang.startsWith(utterance.lang.substring(0, 2)));
      let chosenVoice = null;
      
      if (selectedTutor?.gender === "female") {
        chosenVoice = langVoices.find(v => (v.name.includes("Premium") || v.name.includes("Alice") || v.name.includes("Elsa") || v.name.includes("Samantha") || v.name.includes("Google")) && !v.name.includes("Male"));
      } else if (selectedTutor?.gender === "male") {
        chosenVoice = langVoices.find(v => (v.name.includes("Luca") || v.name.includes("Giorgio") || v.name.includes("Arthur") || v.name.includes("Daniel") || v.name.includes("Male")));
      }
      
      if (!chosenVoice) {
        chosenVoice = langVoices.find(v => v.name.includes("Premium") || v.name.includes("Enhanced") || v.name.includes("Google")) || langVoices[0];
      }
      
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedImage(file);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string; dataUrl: string; thumbUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // 1. Immagine ad alta leggibilità per Gemini (max 1280px, jpeg 0.75, testo chiarissimo)
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1280;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const raw = reader.result as string;
            return resolve({ base64: raw.split(",")[1], mimeType: file.type || 'image/jpeg', dataUrl: raw, thumbUrl: raw });
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const base64 = dataUrl.split(',')[1];

          // 2. Thumbnail leggerissimo per salvataggio permanente su Firestore (max 360px, jpeg 0.5, ~15-20KB)
          const thumbCanvas = document.createElement('canvas');
          let tw = img.width;
          let th = img.height;
          const THUMB_MAX = 360;
          if (tw > th && tw > THUMB_MAX) {
            th = Math.round((th * THUMB_MAX) / tw);
            tw = THUMB_MAX;
          } else if (th > THUMB_MAX) {
            tw = Math.round((tw * THUMB_MAX) / th);
            th = THUMB_MAX;
          }
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          const tctx = thumbCanvas.getContext('2d');
          let thumbUrl = dataUrl;
          if (tctx) {
            tctx.drawImage(img, 0, 0, tw, th);
            thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.5);
          }

          resolve({ base64, mimeType: 'image/jpeg', dataUrl, thumbUrl });
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
    });
  };

  const suggestedTutor = useMemo(() => {
    return detectBestTutorForQuery(searchQuery, tutors, selectedTutor?.id);
  }, [searchQuery, tutors, selectedTutor]);

  const executeSendMessage = async (userText: string, tutorToUse: Tutor, imgFile?: File | null) => {
    if (!tutorToUse || (!userText.trim() && !imgFile)) return;

    setIsLoading(true);

    let imagePayload = undefined;
    let localImageUrl = undefined;
    let thumbForDb: string | null = null;

    if (imgFile) {
      try {
        const { base64, mimeType, dataUrl, thumbUrl } = await fileToBase64(imgFile);
        imagePayload = { base64, mimeType };
        localImageUrl = dataUrl;
        thumbForDb = thumbUrl;

        // Prova caricamento Storage asincrono in background (senza bloccare la chat!)
        try {
          const safeName = imgFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storageRef = ref(storage, `chat_images/studente_demo_${Date.now()}_${safeName}`);
          uploadString(storageRef, dataUrl, 'data_url').catch(() => {});
        } catch (_) {}
      } catch (err) {
        console.warn("Errore conversione foto:", err);
      }
    }

    const tutorId = tutorToUse.id;
    const nowTime = getCurrentTime();
    const nowDate = getCurrentDate();
    const nowTimestamp = Date.now();
    const prevMsgs = chatsByTutor[tutorId]?.messages && chatsByTutor[tutorId].messages.length > 0
      ? chatsByTutor[tutorId].messages
      : [
          {
            role: "model" as const,
            text: tutorToUse.greeting,
            time: nowTime,
            date: nowDate,
            timestamp: nowTimestamp
          }
        ];

    const newMessages: UIMessage[] = [
      ...prevMsgs, 
      { role: "user", text: userText, imageUrl: localImageUrl, time: nowTime, date: nowDate, timestamp: nowTimestamp }
    ];

    // Aggiorna stato locale
    const updatedChats = {
      ...chatsByTutor,
      [tutorId]: { messages: newMessages, lastUpdated: nowTime, lastUpdatedDate: nowDate, lastUpdatedTimestamp: nowTimestamp }
    };
    setChatsByTutor(updatedChats);

    const history: Content[] = [];
    prevMsgs.forEach(m => {
      const textToPush = m.text || (m.imageUrl ? "[Immagine inviata dall'utente]" : "");
      if (!textToPush) return;
      
      const last = history[history.length - 1];
      if (last && last.role === m.role) {
        last.parts.push({ text: "\n" + textToPush });
      } else {
        history.push({ role: m.role, parts: [{ text: textToPush }] });
      }
    });

    // Gemini API requires the first message to ALWAYS be from the 'user'.
    // Since our chats start with a 'model' greeting, we prepend a hidden user prompt.
    if (history.length > 0 && history[0].role === "model") {
      history.unshift({ role: "user", parts: [{ text: "Ciao, eccomi. Possiamo iniziare." }] });
    }

    const currentMem = subjectsMemory[tutorId];
    let response;
    try {
      response = await sendMessage(userText, history, imagePayload, tutorToUse, currentMem, agendaItems);
    } catch (e: any) {
      console.error("Critical chat error:", e);
      response = { success: false, error: "Si è verificato un errore critico di connessione con l'AI." };
    }
    
    if (response.success && response.text) {
      const replyTime = getCurrentTime();
      const replyDate = getCurrentDate();
      const replyTimestamp = Date.now();
      const finalMsgs: UIMessage[] = [
        ...newMessages, 
        { 
          role: "model", 
          text: response.text, 
          bookPageInfo: response.bookPageInfo,
          time: replyTime, 
          date: replyDate, 
          timestamp: replyTimestamp 
        }
      ];
      
      const finalChats = {
        ...chatsByTutor,
        [tutorId]: { messages: finalMsgs, lastUpdated: replyTime, lastUpdatedDate: replyDate, lastUpdatedTimestamp: replyTimestamp }
      };
      setChatsByTutor(finalChats);
      awardXP(10);
      
      // Se c'è un voto o una lacuna intercettata dall'IA, aggiorna la memoria
      let updatedMemMap = { ...subjectsMemory };
      if (response.trackData) {
        const existingMem: SubjectMemory = subjectsMemory[tutorId] || { grades: [], weaknesses: [] };
        const updatedGrades = [...(existingMem.grades || [])];
        const updatedWeaknesses = [...(existingMem.weaknesses || [])];

        if (response.trackData.grade) {
          const dateStr = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
          updatedGrades.push({
            grade: response.trackData.grade,
            topic: response.trackData.topic || "Verifica recente",
            date: dateStr
          });
        }

        if (response.trackData.weakness && !updatedWeaknesses.includes(response.trackData.weakness)) {
          updatedWeaknesses.push(response.trackData.weakness);
        }

        updatedMemMap = {
          ...subjectsMemory,
          [tutorId]: {
            ...existingMem,
            grades: updatedGrades,
            weaknesses: updatedWeaknesses,
            lastTopic: response.trackData.topic || existingMem.lastTopic || ""
          }
        };
        setSubjectsMemory(updatedMemMap);
      }

      // Salva sia le chat separate per tutor sia la memoria su Firestore
      const userRef = doc(db, "petralab_users", "studente_demo");
      
      // Crea una copia sicura senza i base64 pesanti per non bloccare Firestore
      const safeChats: any = JSON.parse(JSON.stringify(finalChats));
      Object.keys(safeChats).forEach(tid => {
        const msgs = safeChats[tid].messages;
        safeChats[tid].lastUpdatedTimestamp = finalChats[tid]?.lastUpdatedTimestamp || null;
        safeChats[tid].lastUpdatedDate = finalChats[tid]?.lastUpdatedDate || null;
        safeChats[tid].messages = msgs.map((m: any, mIdx: number) => {
          let img = m.imageUrl;
          if (mIdx === msgs.length - 2 && thumbForDb && tid === tutorId) {
            img = thumbForDb;
          }
          return {
            role: m.role,
            text: m.text,
            time: m.time || null,
            date: m.date || null,
            timestamp: m.timestamp || null,
            bookPageInfo: m.bookPageInfo || null,
            imageUrl: img && (img.startsWith("http") || (img.startsWith("data:image") && img.length < 80000)) ? img : null
          };
        });
      });

      setDoc(userRef, { 
        chatsByTutor: safeChats,
        subjectsMemory: updatedMemMap,
        chatHistory: finalMsgs.slice(-20).map(m => ({ role: m.role, text: m.text }))
      }, { merge: true }).catch(console.error);
      
      if (wasVoiceInputRef.current) {
        speakText(response.text);
        wasVoiceInputRef.current = false;
      }
    } else {
      const errTime = getCurrentTime();
      const errDate = getCurrentDate();
      const errTimestamp = Date.now();
      const finalMsgs: UIMessage[] = [
        ...newMessages, 
        { role: "model", text: response.error || "Errore di connessione.", time: errTime, date: errDate, timestamp: errTimestamp }
      ];
      setChatsByTutor({
        ...chatsByTutor,
        [tutorId]: { messages: finalMsgs, lastUpdated: errTime, lastUpdatedDate: errDate, lastUpdatedTimestamp: errTimestamp }
      });
    }
    
    setIsLoading(false);
  };

  const handleSend = () => {
    if (!selectedTutor || (!input.trim() && !selectedImage)) return;
    const userText = input.trim();
    const imgFile = selectedImage;
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    executeSendMessage(userText, selectedTutor, imgFile);
  };

  const handleAskAIFromSearch = (queryText: string, specificTutor?: Tutor) => {
    if (!queryText.trim()) return;
    const targetTutor = specificTutor || suggestedTutor;
    setSearchQuery("");
    handleOpenChat(targetTutor);
    executeSendMessage(queryText.trim(), targetTutor, null);
  };

  const currentTutorMemory = selectedTutor ? subjectsMemory[selectedTutor.id] : null;

  // Parser universale per ricavare il timestamp esatto di qualsiasi data e orario (es. "2026-10-11" + "19:21", "23:04", ISO, etc.)
  const parseTimeToEpoch = (timeStr?: string, dateStr?: string): number => {
    if (!timeStr && !dateStr) return 0;
    
    // Se abbiamo data (YYYY-MM-DD) e orario (HH:MM)
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const cleanTime = (timeStr || "12:00").trim();
      const matchHHMM = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (matchHHMM) {
        const h = matchHHMM[1].padStart(2, '0');
        const m = matchHHMM[2].padStart(2, '0');
        const s = (matchHHMM[3] || "00").padStart(2, '0');
        const t = new Date(`${dateStr.trim()}T${h}:${m}:${s}`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
    }

    const trimmed = (timeStr || "").trim();
    if (!trimmed) return 0;

    // Se è un numero puro timestamp
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num > 1000000000000) return num;
    }

    // Formato data italiana "DD/MM/YYYY [HH:MM]"
    const matchIT = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (matchIT) {
      const day = parseInt(matchIT[1], 10);
      const month = parseInt(matchIT[2], 10) - 1;
      const year = parseInt(matchIT[3], 10);
      const hour = matchIT[4] ? parseInt(matchIT[4], 10) : 12;
      const min = matchIT[5] ? parseInt(matchIT[5], 10) : 0;
      return new Date(year, month, day, hour, min).getTime();
    }

    // Formato orario "HH:MM" o "HH:MM:SS" (es: "19:21", "23:04")
    const matchHHMM = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (matchHHMM) {
      const h = parseInt(matchHHMM[1], 10);
      const m = parseInt(matchHHMM[2], 10);
      const now = new Date();
      const curH = now.getHours();
      const curM = now.getMinutes();

      const target = new Date();
      target.setHours(h, m, 0, 0);

      // Se l'orario indicato è superiore all'orario attuale odierno (es. 23:04 quando adesso sono le 19:50),
      // significa che la conversazione è avvenuta prima di oggi (ieri sera)!
      if (h > curH || (h === curH && m > curM)) {
        target.setDate(target.getDate() - 1);
      }
      return target.getTime();
    }

    // Standard Date parsing
    const parsedDate = new Date(trimmed).getTime();
    if (!isNaN(parsedDate) && parsedDate > 1000000000000) {
      return parsedDate;
    }

    return 0;
  };

  // Calcola il timestamp dell'ultima attività della chat stile WhatsApp (più recente in cima)
  const getTutorLastActivity = (tutorId: string): number => {
    const chat = chatsByTutor[tutorId];
    if (!chat || !chat.messages || chat.messages.length === 0) return 0;

    // 1. Timestamp numerico esplicito
    if (typeof chat.lastUpdatedTimestamp === 'number' && chat.lastUpdatedTimestamp > 0) {
      return chat.lastUpdatedTimestamp;
    }

    // 2. Controllo sull'ultimo messaggio della chat
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (lastMsg) {
      if (typeof lastMsg.timestamp === 'number' && lastMsg.timestamp > 0) {
        return lastMsg.timestamp;
      }
      if (lastMsg.date && lastMsg.time) {
        const parsed = parseTimeToEpoch(lastMsg.time, lastMsg.date);
        if (parsed > 0) return parsed;
      }
      if (lastMsg.time) {
        const parsed = parseTimeToEpoch(lastMsg.time, chat.lastUpdatedDate);
        if (parsed > 0) return parsed;
      }
    }

    // 3. Fallback su chat.lastUpdated / lastUpdatedDate
    if (chat.lastUpdated || chat.lastUpdatedDate) {
      const parsed = parseTimeToEpoch(chat.lastUpdated, chat.lastUpdatedDate);
      if (parsed > 0) return parsed;
    }

    // 4. Controllo a ritroso sui messaggi
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (typeof m.timestamp === 'number' && m.timestamp > 0) return m.timestamp;
      if (m.date || m.time) {
        const parsed = parseTimeToEpoch(m.time, m.date);
        if (parsed > 0) return parsed;
      }
    }

    return 0;
  };

  const formatChatDate = (chat?: SubjectChatData) => {
    if (!chat || !chat.messages || chat.messages.length === 0) return "";
    const lastMsg = chat.messages[chat.messages.length - 1];

    let timestamp = 0;
    if (typeof chat.lastUpdatedTimestamp === 'number' && chat.lastUpdatedTimestamp > 0) {
      timestamp = chat.lastUpdatedTimestamp;
    } else if (typeof lastMsg?.timestamp === 'number' && lastMsg.timestamp > 0) {
      timestamp = lastMsg.timestamp;
    } else {
      timestamp = parseTimeToEpoch(lastMsg?.time || chat.lastUpdated, lastMsg?.date || chat.lastUpdatedDate);
    }

    if (timestamp > 0) {
      const d = new Date(timestamp);
      const now = new Date();
      
      // Oggi: mostra l'ora (es. 19:21)
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      }
      
      // Ieri: mostra "Ieri"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return "Ieri";
      }

      // Questa settimana / quest'anno: giorno e mese (es. "10 ott", "7 ott")
      if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
      }

      // Anno differente: gg/mm/aa
      return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
    }

    return lastMsg?.time || chat.lastUpdated || "";
  };

  // Ordina i tutor in ordine decrescente di interazione (la più giovane in cima, la più vecchia in fondo)
  const sortedTutors = [...tutors].sort((a, b) => {
    const timeA = getTutorLastActivity(a.id);
    const timeB = getTutorLastActivity(b.id);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return tutors.findIndex(t => t.id === a.id) - tutors.findIndex(t => t.id === b.id);
  });

  const filteredTutors = sortedTutors.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className={`flex flex-col h-full w-full overflow-hidden transition-all duration-200 select-none ${
        isDragging ? "ring-4 ring-[#25D366]/30" : ""
      } ${isDarkMode ? 'bg-[#111B21] text-gray-200' : 'bg-white text-gray-900'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ============================================================== */}
      {/* 1. SCHERMATA LISTA CHAT (Stile WhatsApp Home)                    */}
      {/* ============================================================== */}
      {!selectedTutor ? (
        <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#111B21]' : 'bg-white'}`}>
          {/* Header WhatsApp 2024 Style */}
          <div className={`${
            isDarkMode ? 'bg-[#0B141A]' : 'bg-white'
          } px-4 pt-3 pb-2 flex justify-between items-center relative z-30 transition-colors`}>
            <div className="flex items-center gap-3">
              <h1 className={`text-[24px] font-bold tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#25D366]'
              }`}>
                PetraLAB
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Badge Streak Fiamma */}
              <div className={`flex items-center gap-1 font-bold text-[13px] px-2.5 py-1 rounded-full ${
                isDarkMode ? 'bg-[#182229] text-orange-400' : 'bg-orange-50 text-orange-500'
              }`}>
                <span>🔥</span>
                <span>{stats.streak}</span>
              </div>

              {/* Tasto Tema */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-full transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              )}

              {/* Menu a 3 Puntini */}
              <div className="relative">
                <button 
                  onClick={() => setShowHomeMenu(prev => !prev)}
                  className={`p-1 rounded-full transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                  </svg>
                </button>
                {/* Menu a tendina (rimane uguale ma ricolorato in CSS) */}
                {showHomeMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50 ${
                    isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-white border-slate-100'
                  }`}>
                    <div className="py-2">
                      <div className={`px-4 py-2 border-b text-[13px] flex justify-between items-center ${
                        isDarkMode ? 'border-[#222E35] text-[#8696A0]' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span>Versione App</span>
                        <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">v2.0.0</span>
                      </div>
                      <button 
                        onClick={() => { setShowHomeMenu(false); window.location.reload(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[15px] transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#202C33] text-gray-200' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-xl">🔄</span> Ricarica App
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar (Ask Meta AI style) */}
          <div className={`px-4 py-1 pb-3 ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`}>
            <div className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all border ${
              isDarkMode 
                ? 'bg-[#202C33] border-transparent focus-within:border-blue-500/60' 
                : 'bg-[#F0F2F5] border-transparent focus-within:border-blue-500/60'
            }`}>
              <div className="w-5 h-5 rounded-full border-[2px] border-blue-500 border-t-purple-500 border-r-pink-500 flex-shrink-0 animate-spin-slow"></div>
              <input 
                type="text" 
                placeholder="Chiedi all'IA o cerca tutor..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault();
                    handleAskAIFromSearch(searchQuery.trim());
                  }
                }}
                className={`bg-transparent w-full outline-none font-medium text-[15px] placeholder-opacity-80 ${
                  isDarkMode ? 'text-white placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-500'
                }`}
              />
              {searchQuery.trim() && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition-opacity ${
                      isDarkMode ? 'text-gray-300 hover:bg-[#182229]' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Cancella testo"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskAIFromSearch(searchQuery.trim())}
                    className="px-3.5 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                    title="Invia domanda all'IA"
                  >
                    <span>Chiedi</span>
                    <span>✨</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filtri Stile WhatsApp 2024 */}
          <div className={`flex gap-2 px-4 py-1 pb-3 overflow-x-auto no-scrollbar border-b ${
            isDarkMode ? 'bg-[#0B141A] border-[#202C33]' : 'bg-white border-slate-100'
          }`}>
            {[
              { id: 'tutte', label: 'Tutte' },
              { id: 'compiti', label: 'Compiti & Verifiche' },
              { id: 'voti', label: 'Voti' }
            ].map(filter => (
              <span 
                key={filter.id}
                onClick={() => handleTabChange(filter.id as any)}
                className={`font-semibold px-4 py-1.5 rounded-full cursor-pointer transition-all text-[14px] shrink-0 ${
                  listFilter === filter.id 
                    ? (isDarkMode ? 'bg-[#0A291A] text-[#25D366]' : 'bg-[#E7FCEB] text-[#118B44]') 
                    : (isDarkMode ? 'bg-[#202C33] text-[#8696A0]' : 'bg-[#F0F2F5] text-slate-600')
                }`}
              >
                {filter.label}
              </span>
            ))}
          </div>

          {/* Lista delle Chat (Tutor per Materia) */}
          <div 
            ref={listScrollRef} 
            onScroll={handleListScroll}
            className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'} ${listFilter === 'tutte' ? 'divide-y' : ''} ${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}`}
          >
            {listFilter === "tutte" ? (
              <>
                {/* Banner rapido "Chiedi all'IA" se l'utente ha scritto del testo nella casella */}
                {searchQuery.trim() && filteredTutors.length > 0 && (
                  <div
                    onClick={() => handleAskAIFromSearch(searchQuery.trim(), suggestedTutor)}
                    className={`mx-4 my-2.5 p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs hover:scale-[1.01] active:scale-[0.99] ${
                      isDarkMode
                        ? "bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border-blue-500/30 text-white"
                        : "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg shrink-0 shadow-sm">
                        ✨
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Chiedi all'IA</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            con {suggestedTutor.name}
                          </span>
                        </div>
                        <p className="text-xs opacity-75 truncate max-w-xs mt-0.5">
                          "{searchQuery}"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-xs text-blue-600 dark:text-blue-400 shrink-0">
                      <span>Invia</span>
                      <span>🚀</span>
                    </div>
                  </div>
                )}

                {/* Se nessun tutor corrisponde al nome MA l'utente ha fatto una domanda */}
                {searchQuery.trim() && filteredTutors.length === 0 ? (
                  <div className="p-6 flex flex-col items-center justify-center text-center my-auto">
                    <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-md flex flex-col items-center gap-3.5 transition-all ${
                      isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200"
                    }`}>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg animate-pulse">
                        ✨
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          Fai questa domanda all'IA
                        </h3>
                        <p className="text-sm italic opacity-80 mt-1 line-clamp-3 max-w-xs">
                          "{searchQuery}"
                        </p>
                      </div>

                      <div className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-xs ${
                        isDarkMode ? "bg-[#111B21] border border-[#222E35]" : "bg-slate-50 border border-slate-200"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{suggestedTutor.avatar?.startsWith('/') ? '🧑‍🏫' : suggestedTutor.avatar}</span>
                          <div className="text-left">
                            <div className="font-bold">{suggestedTutor.name}</div>
                            <div className="opacity-70 text-[11px]">{suggestedTutor.subject}</div>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Consigliato
                        </span>
                      </div>

                      {/* Oppure scegli un altro tutor */}
                      <div className="w-full">
                        <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-60 text-left">
                          Oppure invia a:
                        </label>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {tutors.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleAskAIFromSearch(searchQuery.trim(), t)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                                t.id === suggestedTutor.id
                                  ? "bg-blue-500/20 border-blue-500 text-blue-500 font-bold"
                                  : isDarkMode
                                  ? "bg-[#202C33] border-[#2A3942] text-gray-300 hover:border-gray-500"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                              }`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAskAIFromSearch(searchQuery.trim(), suggestedTutor)}
                        className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-98 shadow-md flex items-center justify-center gap-2 transition-all mt-1"
                      >
                        <span>Chiedi a {suggestedTutor.name}</span>
                        <span>🚀</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredTutors.map((tutor) => {
                const tutorChat = chatsByTutor[tutor.id];
                const mem = subjectsMemory[tutor.id];
                const lastMsg = tutorChat?.messages && tutorChat.messages.length > 0 
                  ? tutorChat.messages[tutorChat.messages.length - 1] 
                  : null;
                const lastGrade = mem?.grades && mem.grades.length > 0 
                  ? mem.grades[mem.grades.length - 1] 
                  : null;

                return (
                  <div
                    key={tutor.id}
                    onClick={() => handleOpenChat(tutor)}
                    className={`flex items-center gap-3.5 px-4 py-4 cursor-pointer transition-colors ${
                      isDarkMode ? "active:bg-[#202C33]" : "active:bg-[#F5F6F6]"
                    }`}
                  >
                    {/* Foto Profilo Circolare 52px con Anello di Stato Verde */}
                    <div className="relative shrink-0">
                      <div className={`w-16 h-16 rounded-3xl shadow-sm flex items-center justify-center text-3xl border-2 ${
                        tutorChat?.lastUpdatedTimestamp && (Date.now() - tutorChat.lastUpdatedTimestamp < 180000)
                          ? "border-[#25D366] p-0.5" 
                          : "border-transparent"
                      } ${isDarkMode ? "bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60 shadow-sm border border-white/10" : "bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 shadow-sm border border-white/50"}`}>
                        {tutor.avatar?.startsWith("/avatars/") ? <img src={tutor.avatar} alt="avatar" className="w-[85%] h-[85%] object-contain drop-shadow-md transform transition-transform hover:scale-110" /> : <span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>}
                      </div>

                      
                    </div>

                    {/* Informazioni Contatto e Ultimo Messaggio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className={`font-bold text-[17px] truncate ${
                            isDarkMode ? "text-[#E9EDEF]" : "text-slate-900"
                          }`}>
                            {tutor.name}
                          </h2>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg shrink-0 ${
                            isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}>
                            {tutor.subject.split(" ")[0]}
                          </span>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ml-2 ${
                          lastMsg?.role === "user" 
                            ? (isDarkMode ? "text-[#8696A0]" : "text-slate-400")
                            : "text-[#25D366] font-semibold"
                        }`}>
                          {formatChatDate(tutorChat)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[14px] truncate flex items-center gap-1.5 ${
                          isDarkMode ? "text-[#8696A0]" : "text-slate-500"
                        }`}>
                          {lastMsg ? (
                            <>
                              {lastMsg.role === "user" ? (
                                <span className="text-[#53BDEB] font-bold text-xs shrink-0">✓✓ Tu: </span>
                              ) : (
                                <span className="text-slate-400 text-xs shrink-0">✓ </span>
                              )}
                              <span className="truncate">{lastMsg.text}</span>
                            </>
                          ) : (
                            <span className={`italic font-medium ${
                              isDarkMode ? "text-[#25D366]" : "text-[#118B44]"
                            }`}>
                              Tocca per iniziare i compiti 💬
                            </span>
                          )}
                        </p>
                        
                        
                      </div>
                    </div>
                  </div>
                );
              }))}
              </>
            ) : listFilter === "voti" ? (
              <div className={`flex flex-col gap-5 p-4 sm:p-6 pb-24 ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold text-[22px] tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Bacheca Voti
                  </h3>
                </div>
                
                {(() => {
                  const groupedGrades: Record<string, any[]> = {};
                  Object.entries(subjectsMemory || {}).forEach(([subjectOrId, data]) => {
                     const mem = data as any;
                     if (mem.grades && Array.isArray(mem.grades) && mem.grades.length > 0) {
                        mem.grades.forEach((g: any) => {
                           let subjectName = subjectOrId;
                           const foundTutor = tutors.find(t => t.id === subjectOrId);
                           if (foundTutor) {
                              subjectName = foundTutor.subject;
                           } else if (g.originalSubject) {
                              subjectName = g.originalSubject;
                           } else if (subjectOrId.startsWith('tutor_')) {
                              subjectName = "Materie Archiviate";
                           } else if (subjectOrId === 'generico') {
                              subjectName = "Altre Materie";
                           }
                           
                           subjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
                           if (!groupedGrades[subjectName]) groupedGrades[subjectName] = [];
                           groupedGrades[subjectName].push({...g, originalId: subjectOrId});
                        });
                     }
                  });

                  const subjects = Object.keys(groupedGrades).sort();

                  if (subjects.length === 0) {
                     return (
                        <div className={`p-8 rounded-[24px] text-center flex flex-col items-center justify-center mt-4 ${
                          isDarkMode ? "bg-[#111B21]" : "bg-[#F0F2F5]"
                        }`}>
                          <span className="text-5xl mb-3">📝</span>
                          <h4 className={`font-semibold text-[17px] mb-1 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            Nessun voto registrato
                          </h4>
                          <p className={`text-[14px] leading-relaxed max-w-[250px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                            I voti presi a scuola verranno salvati qui e raggruppati per materia.
                          </p>
                        </div>
                     );
                  }

                  return (
                     <div className="flex flex-col gap-3">
                        {subjects.map((subject, idx) => {
                           const gradesList = groupedGrades[subject];
                           const sum = gradesList.reduce((acc, g) => acc + (parseFloat(g.grade.toString().replace(',','.')) || 0), 0);
                           const avg = sum / gradesList.length;
                           const isPositiveAvg = avg >= 6;
                           // gradesList.sort((a,b) => parseDateForSort(b.date || '') - parseDateForSort(a.date || ''));

                           return (
                             <details key={idx} className={`group rounded-[20px] overflow-hidden transition-all ${
                               isDarkMode ? 'bg-[#111B21]' : 'bg-[#F0F2F5]'
                             }`}>
                               <summary className="flex items-center justify-between p-4 cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center text-[18px] font-bold ${
                                      isPositiveAvg
                                        ? (isDarkMode ? 'bg-[#0A291A] text-[#25D366]' : 'bg-[#E7FCEB] text-[#118B44]')
                                        : (isDarkMode ? 'bg-[#3A1618] text-[#F15C6D]' : 'bg-[#FFE5E5] text-[#D82E3F]')
                                    }`}>
                                      {avg.toFixed(1).replace('.0', '')}
                                    </div>
                                    <div>
                                      <h4 className={`font-semibold text-[16px] tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {subject}
                                      </h4>
                                      <span className={`text-[13px] font-medium mt-0.5 inline-block ${
                                        isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                                      }`}>
                                        {gradesList.length} {gradesList.length === 1 ? 'Voto' : 'Voti'}
                                      </span>
                                    </div>
                                 </div>
                                 <div className={`w-8 h-8 flex items-center justify-center transition-transform group-open:rotate-180 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                 </div>
                               </summary>
                               
                               <div className={`p-4 pt-0`}>
                                  <div className="mt-2 flex flex-col gap-2">
                                    {gradesList.map((g, gIdx) => {
                                      const gradeNum = parseFloat(g.grade.toString().replace(',','.'));
                                      const isPos = !isNaN(gradeNum) && gradeNum >= 6;
                                      return (
                                        <div key={gIdx} className={`p-3 rounded-[16px] flex flex-col gap-1 ${
                                          isDarkMode ? 'bg-[#202C33]' : 'bg-white shadow-sm'
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            <span className={`font-bold text-[17px] ${isPos ? (isDarkMode ? 'text-[#25D366]' : 'text-[#118B44]') : (isDarkMode ? 'text-[#F15C6D]' : 'text-[#D82E3F]')}`}>
                                              {g.grade}
                                            </span>
                                            <span className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                                              {g.date || "Recente"}
                                            </span>
                                          </div>
                                          {g.topic && (
                                            <p className={`text-[14px] leading-snug ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                              {g.topic}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                               </div>
                             </details>
                           );
                        })}
                     </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5 pb-10">
                <div className="flex items-center justify-between mb-2 px-1 gap-2 flex-wrap">
                  <h3 className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    "📝 Diario Compiti & Verifiche"
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetEl = document.querySelector('[data-agenda-focus="true"]') as HTMLElement;
                        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs ${
                        isDarkMode ? 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30' : 'bg-emerald-100 text-[#118B44] hover:bg-emerald-200'
                      }`}
                      title="Salta a oggi o ai prossimi compiti"
                    >
                      <span>📍</span> Vai a Oggi
                    </button>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? "bg-[#202C33] text-[#8696A0]" : "bg-slate-200 text-slate-600"}`}>
                      {agendaItems.filter(item => !item.isCompleted).length} da fare
                    </span>
                  </div>
                </div>

                {/* Banner START - Studio senza Ansia */}
                {agendaItems.some(item => !item.isCompleted) && (
                  <div 
                    onClick={() => setShowPlannerModal(true)}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm ${
                      isDarkMode 
                        ? "bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-[#111B21] border-emerald-500/40" 
                        : "bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl shadow-md shrink-0">
                        ⏱️
                      </div>
                      <div>
                        <h4 className={`font-black text-sm flex items-center gap-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-800"}`}>
                          Pianifica il Pomeriggio Antistress
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            IA Guidata
                          </span>
                        </h4>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-[#8696A0]" : "text-slate-600"}`}>
                          Spezza i compiti in blocchi da 15-20 min con pause rilassanti.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shrink-0 flex items-center gap-1.5 hover:from-emerald-600 hover:to-teal-600"
                    >
                      <span>▶️</span> START
                    </button>
                  </div>
                )}
                
                {agendaItems.length === 0 ? (
                  <div className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm ${
                    isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-5xl mb-4 opacity-80">"📚"</span>
                    <p className={`font-bold text-[15px] mb-2 ${isDarkMode ? "text-gray-200" : "text-slate-700"}`}>
                      Tutto completato!
                    </p>
                    <p className={`text-[13px] leading-relaxed max-w-[250px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                      Non hai compiti o verifiche in sospeso. 
                      Mamma o papà possono inserirli con lo <strong className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}>Screenshot Magico</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-6">
                    {(() => {
                      // 1. Filtra compiti o verifiche
                      const tasks = [...agendaItems];

                      // 2. Normalizza e raggruppa per data YYYY-MM-DD
                      const normalizeDate = (d: string) => {
                         if (!d || d.toLowerCase() === 'prossima lezione') return 'Prossima lezione';
                         if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                         const parts = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                         if (parts) return `${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
                         return d;
                      };

                      const groups: Record<string, any[]> = {};
                      tasks.forEach(t => {
                         const d = normalizeDate(t.dueDate || 'Senza data');
                         if (!groups[d]) groups[d] = [];
                         groups[d].push(t);
                      });

                      // 3. Date di riferimento (Oggi, Domani, Ieri nel fuso orario locale)
                      const dObj = new Date();
                      const todayStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
                      const tomObj = new Date();
                      tomObj.setDate(tomObj.getDate() + 1);
                      const tStr = `${tomObj.getFullYear()}-${String(tomObj.getMonth()+1).padStart(2,'0')}-${String(tomObj.getDate()).padStart(2,'0')}`;
                      const yestObj = new Date();
                      yestObj.setDate(yestObj.getDate() - 1);
                      const yStr = `${yestObj.getFullYear()}-${String(yestObj.getMonth()+1).padStart(2,'0')}-${String(yestObj.getDate()).padStart(2,'0')}`;

                      // 4. Ordine cronologico rigoroso delle date
                      const sortedDates = Object.keys(groups).sort((a, b) => {
                         if (a === 'Prossima lezione' || a === 'Prossima Lezione') return 1;
                         if (b === 'Prossima lezione' || b === 'Prossima Lezione') return -1;
                         if (a === 'Senza data') return 1;
                         if (b === 'Senza data') return -1;
                         return parseDateForSort(a) - parseDateForSort(b);
                      });

                      // Identifica il giorno obiettivo di partenza (Oggi se presente, altrimenti la prima data futura)
                      const targetFocusDate = sortedDates.find(d => d !== 'Prossima lezione' && d !== 'Senza data' && d >= todayStr)
                         || sortedDates.find(d => d === todayStr)
                         || sortedDates[sortedDates.length - 1];

                      // 5. Render
                      return sortedDates.map((dateStr, gIdx) => {
                         const dayTasks = groups[dateStr];
                         // All'interno dello stesso giorno: prima da fare, poi completati
                         dayTasks.sort((a, b) => {
                           if (Boolean(a.isCompleted) !== Boolean(b.isCompleted)) {
                             return a.isCompleted ? 1 : -1;
                           }
                           return 0;
                         });

                         const isUrgentDay = dateStr === tStr || dateStr === todayStr;
                         const badgeSuffix = dateStr === todayStr ? ' (Oggi)' : dateStr === tStr ? ' (Domani)' : dateStr === yStr ? ' (Ieri)' : '';
                         const headerText = `${formatFullTextDate(dateStr)}${badgeSuffix}`;
                         const isTargetFocus = dateStr === targetFocusDate;

                         return (
                           <div 
                             key={gIdx} 
                             id={`agenda-day-${dateStr}`}
                             data-agenda-day="true"
                             data-agenda-focus={isTargetFocus ? "true" : undefined}
                             className="flex flex-col gap-3"
                           >
                             <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: isDarkMode ? '#0B141A' : '#EFEAE2' }}>
                               <h3 className={`text-sm sm:text-base font-black inline-block px-3 py-1.5 rounded-xl border-b-2 shadow-sm ${
                                 isUrgentDay 
                                   ? (isDarkMode ? 'bg-red-950/40 text-red-400 border-red-500' : 'bg-red-50 text-red-600 border-red-500') 
                                   : (isDarkMode ? 'bg-[#202C33] text-emerald-400 border-emerald-400' : 'bg-white text-[#118B44] border-[#25D366]')
                               }`}>
                                 {headerText} {isUrgentDay && ' 🚨'}
                               </h3>
                             </div>
                             
                             <div className="flex flex-col gap-3">
                               {dayTasks.map((item, idx) => {
                                 const isUrgent = isUrgentDay && !item.isCompleted;
                                 return (
                                   <div key={item.id || idx} className={`p-4 rounded-xl border flex gap-3 shadow-sm transition-all ${
                                     item.isCompleted 
                                       ? (isDarkMode ? 'bg-[#111B21] border-[#2A3942] opacity-50' : 'bg-slate-50 border-slate-100 opacity-60') 
                                       : isUrgent 
                                         ? (isDarkMode ? 'bg-red-950/20 border-red-500/50' : 'bg-red-50 border-red-300')
                                         : (isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-200')
                                   }`}>
                                     <div 
                                       onClick={(e) => handleToggleAgendaItem(e, item.id, item.isCompleted)}
                                       className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 cursor-pointer border-2 transition-all ${
                                         item.isCompleted 
                                           ? 'bg-[#25D366] border-[#25D366] text-white' 
                                           : isUrgent
                                             ? (isDarkMode ? 'bg-[#111B21] border-red-400 text-transparent hover:bg-red-500/20' : 'bg-white border-red-400 text-transparent hover:bg-red-100')
                                             : 'bg-slate-100 border-slate-300 text-transparent hover:border-emerald-400'
                                       }`}
                                     >
                                       {item.isCompleted ? '✓' : ''}
                                     </div>
                                     <div className={`flex-1 min-w-0 ${item.isCompleted ? "line-through opacity-70" : ""}`}>
                                       <div 
                                         onClick={() => setExpandedTasks(prev => ({ ...prev, [item.id || idx]: !prev[item.id || idx] }))}
                                         className="cursor-pointer select-none"
                                       >
                                         <div className="flex justify-between items-start gap-2">
                                           <div className="flex items-center gap-2 flex-wrap min-w-0">
                                             <span className="text-lg shrink-0">{item.type?.toLowerCase() === "verifica" ? "🚨" : "📝"}</span>
                                             <h4 className={`font-bold text-[15px] truncate ${
                                               item.type?.toLowerCase() === "verifica"
                                                 ? (isDarkMode ? "text-red-400" : "text-red-700")
                                                 : isUrgent && !item.isCompleted 
                                                   ? (isDarkMode ? "text-red-400" : "text-red-700") 
                                                   : (isDarkMode ? "text-gray-100" : "text-slate-800")
                                             }`}>{item.subject}</h4>
                                             {item.type?.toLowerCase() === "verifica" && (
                                               <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                                                 isDarkMode 
                                                   ? "bg-red-950/60 text-red-400 border-red-500/50" 
                                                   : "bg-red-100 text-red-700 border-red-300"
                                               }`}>
                                                 VERIFICA
                                               </span>
                                             )}
                                           </div>
                                           <div className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-semibold transition-colors ${
                                             isDarkMode ? "text-[#8696A0] bg-[#111B21] hover:text-white" : "text-slate-500 bg-slate-100 hover:text-slate-800"
                                           }`}>
                                             <span>{expandedTasks[item.id || idx] ? "Nascondi ▲" : "Espandi ▼"}</span>
                                           </div>
                                         </div>
                                         <div className={`text-sm mt-1.5 leading-relaxed transition-all ${
                                           expandedTasks[item.id || idx]
                                             ? (isDarkMode ? "text-gray-200" : "text-slate-700")
                                             : (isDarkMode ? "text-[#8696A0] line-clamp-1" : "text-slate-600 line-clamp-1")
                                         }`}>
                                           {renderFormattedTaskText(item.description)}
                                         </div>
                                       </div>
                                       {expandedTasks[item.id || idx] && (
                                         <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2 border-dashed border-slate-300/40 animate-in fade-in duration-150">
                                           {(() => {
                                             const matchingTutor = tutors.find((t: any) => 
                                               t.id === item.subject?.toLowerCase() || 
                                               t.subject.toLowerCase().includes(item.subject?.toLowerCase()) ||
                                               item.subject?.toLowerCase().includes(t.subject.split(' ')[0].toLowerCase())
                                             );
                                             if (matchingTutor) {
                                               return (
                                                 <button 
                                                   type="button"
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     handleSelectTutor(matchingTutor);
                                                     setInput(`Ciao ${matchingTutor.name}! Ho un dubbio su questo compito di ${item.subject}: "${item.description}". Mi aiuti a capirlo?`);
                                                   }}
                                                   className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all"
                                                 >
                                                   {matchingTutor.avatar?.startsWith("/avatars/") ? (
                                                     <img src={matchingTutor.avatar} alt="avatar" className="w-5 h-5 object-contain" />
                                                   ) : (
                                                     <span className="text-base">{matchingTutor.avatar}</span>
                                                   )}
                                                   <span>Hai un dubbio? Chiedi a {matchingTutor.name}</span>
                                                 </button>
                                               );
                                             }
                                             return null;
                                           })()}
                                           {(dateStr === "Prossima lezione" || dateStr === "Prossima Lezione" || dateStr === "Senza data") && !item.isCompleted && (
                                             <button 
                                               type="button"
                                               onClick={(e) => handleUpdateTaskDate(e, item.id, tStr)}
                                               className={`text-xs font-bold px-3 py-1.5 rounded-xl items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                                                 isDarkMode 
                                                   ? "bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60" 
                                                   : "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"
                                               }`}
                                               title="Imposta data per domani"
                                             >
                                               <span>🚀</span> Sposta a Domani
                                             </button>
                                           )}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         );
                      });
                    })()}

                    {/* CARD MOTIVAZIONALE DI FINE LISTA - AVVANTAGGIATI E GUADAGNA TEMPO LIBERO */}
                    <div className={`mt-4 p-5 rounded-3xl border text-center flex flex-col items-center gap-3 shadow-sm ${
                      isDarkMode 
                        ? "bg-gradient-to-br from-emerald-950/40 via-[#111B21] to-teal-950/40 border-emerald-500/30" 
                        : "bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-200"
                    }`}>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-2xl shadow-md">
                        🌟
                      </div>
                      <div className="max-w-sm">
                        <h4 className={`font-black text-[15px] ${isDarkMode ? "text-emerald-400" : "text-emerald-900"}`}>
                          Ti senti carica? Portati avanti e guadagna tempo!
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Fare anche solo <strong>un compito dei prossimi giorni</strong> significa regalarti un pomeriggio intero libero domani per le cose che ami fare!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPlannerModal(true)}
                        className="px-5 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <span>⚡</span> AVVIA SESSIONE CON START
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PULSANTE GALLEGGIANTE "START" A PORTATA DI POLLICE (Nella scheda Compiti) */}
          {listFilter === "compiti" && (
            <div className="absolute bottom-6 right-4 z-30">
              <button
                type="button"
                onClick={() => setShowPlannerModal(true)}
                className="px-5 py-3.5 rounded-full font-black text-sm text-white flex items-center gap-2 shadow-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all animate-bounce hover:animate-none border-2 border-white/30"
                style={{
                  boxShadow: "0 8px 25px -4px rgba(16, 185, 129, 0.6)"
                }}
              >
                <span className="text-xl">▶️</span>
                <span className="tracking-wide">START STUDIO</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. SCHERMATA CHAT SINGOLA (Stile Conversazione WhatsApp)         */
        /* ============================================================== */
        <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0B141A]' : 'bg-[#EFEAE2]'}`}>
          {/* Header Singola Chat WhatsApp */}
          <div className={`${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'} px-3 py-2.5 flex items-center justify-between shadow-sm border-b ${isDarkMode ? 'border-[#202C33]' : 'border-slate-100'} z-20`}>
            <div className="flex items-center gap-2">
              {/* Tasto Indietro Stile WhatsApp */}
              <button 
                onClick={() => window.history.back()}
                className={`p-1 -ml-1 rounded-full flex items-center gap-0.5 transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-[#25D366] hover:bg-slate-100'}`}
                title="Torna alle chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                {/* Avatar */}
                <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center text-[22px] shadow-sm ${isDarkMode ? 'bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60 shadow-sm border border-white/10' : 'bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 shadow-sm border border-white/50'}`}>
                  {selectedTutor.avatar?.startsWith("/avatars/") ? <img src={selectedTutor.avatar} alt="avatar" className="w-[85%] h-[85%] object-contain drop-shadow-md" /> : <span className="drop-shadow-md">{selectedTutor.avatar}</span>}
                </div>
              </button>

              <div className="min-w-0">
                <h2 className={`font-semibold text-[17px] leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedTutor.name}
                </h2>
                <p className={`text-[13px] ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'} flex items-center gap-1.5 font-medium mt-0.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDarkMode ? 'bg-[#25D366]' : 'bg-emerald-300'}`}></span>
                  online • {selectedTutor.subject.split(' ')[0]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowGradesModal(true)}
                className={`text-[13px] px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942]' : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200'}`}
                title="Diario Voti e Lacune"
              >
                📝 <span className="hidden sm:inline">Voti</span> ({currentTutorMemory?.grades?.length || 0})
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowChatMenu(prev => !prev)}
                  className={`p-1.5 rounded-full transition-colors active:scale-95 ${isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-slate-500 hover:bg-slate-100'}`}
                  title="Altre opzioni"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                  </svg>
                </button>

                {showChatMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowChatMenu(false)}
                    />
                    <div className={`absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl border py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDarkMode 
                        ? 'bg-[#233138] border-[#2E3C44] text-[#E9EDEF]' 
                        : 'bg-white border-slate-100 text-slate-800'
                    }`}>
                      <div className={`px-4 py-2 border-b text-xs flex justify-between items-center ${
                        isDarkMode ? 'border-[#2E3C44] text-[#8696A0]' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span>Versione App</span>
                        <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">v2.0.0</span>
                      </div>
                      <button 
                        onClick={() => { setShowChatMenu(false); setShowGradesModal(true); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#111B21]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>📊</span>
                        <span>Diario Voti & Lacune</span>
                      </button>
                      <button 
                        onClick={() => { setShowChatMenu(false); window.location.reload(); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#111B21]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>🔄</span>
                        <span>Ricarica Chat</span>
                      </button>
                      <button 
                        onClick={() => { toggleVoiceSpeed(); setShowChatMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#111B21]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>{voiceSpeed === 1.0 ? '🐇' : voiceSpeed === 1.2 ? '🚀' : '🐢'}</span>
                        <span>Velocità Voce: {voiceSpeed === 1.0 ? 'Normale' : voiceSpeed === 1.2 ? 'Veloce' : 'Lenta'}</span>
                      </button>
                      <Link 
                        href="/admin" 
                        onClick={() => setShowChatMenu(false)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          isDarkMode ? 'hover:bg-[#111B21]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>⚙️</span>
                        <span>Pannello Genitore</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Modal Diario Voti & Lacune per la materia */}
          {showGradesModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    {selectedTutor.avatar?.startsWith("/avatars/") ? <img src={selectedTutor.avatar} alt="avatar" className={`w-14 h-14 p-1 rounded-2xl object-contain drop-shadow-md ${isDarkMode ? "bg-[#202C33]" : "bg-[#F0F2F5]"}`} /> : <span className={`text-3xl p-2 rounded-2xl ${isDarkMode ? "bg-[#202C33]" : "bg-[#F0F2F5]"}`}>{selectedTutor.avatar}</span>}
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Memoria di {selectedTutor.name}</h3>
                      <p className="text-xs text-slate-500">{selectedTutor.subject}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowGradesModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">📊 Voti Registrati</h4>
                  {(!currentTutorMemory?.grades || currentTutorMemory.grades.length === 0) ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
                      Nessun voto registrato ancora. Scrivi a {selectedTutor.name} cosa hai preso nell&apos;ultima verifica per farlo ricordare!
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {currentTutorMemory.grades.map((g, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-emerald-50/70 border border-emerald-100 p-2 rounded-xl text-xs">
                          <div>
                            <span className="font-bold text-emerald-950">{g.topic || "Verifica"}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{g.date}</span>
                          </div>
                          <span className="font-black text-sm text-[#118B44] bg-white px-2.5 py-0.5 rounded-lg shadow-xs">
                            {g.grade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">🎯 Lacune su cui lavorare</h4>
                  {(!currentTutorMemory?.weaknesses || currentTutorMemory.weaknesses.length === 0) ? (
                    <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl text-center">
                      Nessuna difficoltà segnalata finora! Sei bravissima! ✨
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {currentTutorMemory.weaknesses.map((w, idx) => (
                        <span key={idx} className="bg-amber-100 text-amber-900 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                          ⚠️ {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowGradesModal(false)}
                  className="w-full bg-[#25D366] text-white font-bold py-2.5 rounded-2xl hover:bg-[#118B44] transition-colors text-sm shadow-md"
                >
                  Chiudi Diario
                </button>
              </div>
            </div>
          )}

          {/* Area Messaggi Chat Stile WhatsApp */}
          <div 
            ref={chatMessagesContainerRef}
            className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative ${isDarkMode ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}
            style={{ 
              backgroundImage: isDarkMode ? "none" : "none", 
              backgroundSize: "16px 16px" 
            }}
          >
            {currentMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? currentMessages[idx - 1] : null;
              const msgDateStr = msg.date || (msg.timestamp ? new Date(msg.timestamp).toISOString().split('T')[0] : null);
              const prevDateStr = prevMsg ? (prevMsg.date || (prevMsg.timestamp ? new Date(prevMsg.timestamp).toISOString().split('T')[0] : null)) : null;
              const showDateHeader = idx === 0 || (msgDateStr && msgDateStr !== prevDateStr);

              const getDayLabel = (dStr?: string | null, ts?: number) => {
                if (!dStr && !ts) return "OGGI";
                const d = dStr ? new Date(dStr + "T00:00:00") : new Date(ts!);
                const now = new Date();
                if (d.toDateString() === now.toDateString()) return "OGGI";
                const yest = new Date(now);
                yest.setDate(now.getDate() - 1);
                if (d.toDateString() === yest.toDateString()) return "IERI";
                return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
              };

              return (
                <div key={idx} className="flex flex-col">
                  {showDateHeader && (
                    <div className="flex justify-center my-2">
                      <span className={`text-[11px] font-semibold px-3 py-1 rounded-lg shadow-xs uppercase tracking-wider ${
                        isDarkMode ? 'bg-[#182229]/90 text-[#8696A0]' : 'bg-white/90 text-slate-600'
                      }`}>
                        {getDayLabel(msgDateStr, msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                <div 
                  className={`max-w-[80%] sm:max-w-[75%] px-3 py-1.5 rounded-2xl text-[15.5px] leading-relaxed relative shadow-xs group ${
                    msg.role === "user"
                      ? (isDarkMode ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-xs" : "bg-[#D9FDD3] text-slate-900 rounded-tr-xs")
                      : (isDarkMode ? "bg-[#202C33] text-[#E9EDEF] rounded-tl-[4px]" : "bg-white text-slate-900 rounded-tl-[4px]")
                  }`}
                >
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Allegato" 
                      className="rounded-xl max-h-60 object-contain mb-2 bg-black/5" 
                    />
                  )}

                  {msg.bookPageInfo && (
                    <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                      <span>📖</span>
                      <span>Libro Greenway 2: Pagina {msg.bookPageInfo.bookPage}</span>
                      {msg.bookPageInfo.topicName && (
                        <span className="opacity-80 truncate">• {msg.bookPageInfo.topicName}</span>
                      )}
                    </div>
                  )}

                  {msg.text && (
                    <div className={msg.role === "model" ? `prose prose-sm leading-snug max-w-none ${isDarkMode ? 'prose-invert prose-emerald' : 'prose-emerald'}` : ""}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Orario e spunte di lettura stile WhatsApp */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                    <span>{msg.time || "19:00"}</span>
                    {msg.role === "user" && (
                      <span className="text-[#53bdeb] font-bold text-xs">✓✓</span>
                    )}

                    {/* Tasto Lettura Vocale per i messaggi del tutor */}
                    {msg.role === "model" && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className={`ml-1 p-0.5 transition-colors ${isDarkMode ? 'text-[#8696A0] hover:text-[#25D366]' : 'text-slate-400 hover:text-[#118B44]'}`}
                        title="Ascolta audio"
                      >
                        🔊
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl rounded-tl-[4px] shadow-xs flex items-center gap-1.5 ${
                  isDarkMode ? 'bg-[#202C33] text-[#8696A0]' : 'bg-white text-slate-400'
                }`}>
                  <span className="text-xs font-medium">{selectedTutor.name} sta scrivendo</span>
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-[#8696A0]' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }}></span>
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-[#8696A0]' : 'bg-slate-400'}`} style={{ animationDelay: '150ms' }}></span>
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-[#8696A0]' : 'bg-slate-400'}`} style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra Input Stile WhatsApp */}
          <div className={`p-2 sm:p-3 pb-safe flex flex-col gap-2 z-20 ${
            isDarkMode ? 'bg-[#0B141A]' : 'bg-[#F0F2F5]'
          }`}>
            {selectedImage && (
              <div className={`flex items-center gap-3 p-2.5 rounded-2xl border relative shadow-sm ${
                isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Anteprima foto" 
                  className="h-14 w-14 object-cover rounded-xl border border-black/10 shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#25D366]">📸 Foto Pronta per il Tutor</span>
                  </div>
                  <p className={`text-[12px] truncate ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    {selectedImage.name || "Foto scattata"}
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>
                    Scrivi una domanda o premi Invio per farti aiutare!
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md shrink-0 transition-transform active:scale-95"
                  title="Rimuovi foto"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pillole Rapide Flashcard & Quiz per il tutor attivo */}
            <div className="flex items-center gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-1 select-none">
              <button
                type="button"
                onClick={() => setStudyToolType("flashcard")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 shadow-xs ${
                  isDarkMode 
                    ? 'bg-[#202C33]/90 hover:bg-[#2A3942] border-[#2A3942] text-emerald-400' 
                    : 'bg-white/90 hover:bg-slate-100 border-slate-200 text-emerald-700'
                }`}
              >
                <span>🗂️</span>
                <span>Flashcard</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyToolType("quiz")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 shadow-xs ${
                  isDarkMode 
                    ? 'bg-[#202C33]/90 hover:bg-[#2A3942] border-[#2A3942] text-teal-400' 
                    : 'bg-white/90 hover:bg-slate-100 border-slate-200 text-teal-700'
                }`}
              >
                <span>❓</span>
                <span>Quiz Rapido</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Contenitore Input Arrotondato */}
              <div className={`flex-1 min-h-[44px] flex items-center px-2 py-1 rounded-3xl shadow-sm border border-transparent ${
                isDarkMode ? 'bg-[#202C33] focus-within:border-[#25D366]' : 'bg-white focus-within:border-transparent'
              } ${isListening ? 'ring-2 ring-red-400' : ''}`}>
                
                {/* Input nativo per Scatta Foto diretta con fotocamera */}
                <input 
                  id="chat-camera-input"
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="sr-only" 
                />
                {/* Input nativo per Galleria / File */}
                <input 
                  id="chat-gallery-input"
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="sr-only" 
                />
                
                {/* Tasto 📷 Fotocamera */}
                <label 
                  htmlFor="chat-camera-input"
                  className={`p-2 rounded-full cursor-pointer transition-colors flex-shrink-0 ${
                    isDarkMode ? 'text-[#8696A0] hover:text-[#25D366] hover:bg-[#374B56]' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                  }`}
                  title="Scatta foto diretta con la fotocamera"
                >
                  <span className="text-lg">📷</span>
                </label>

                {/* Tasto 📎 Scegli da Galleria / File */}
                <label 
                  htmlFor="chat-gallery-input"
                  className={`p-2 rounded-full cursor-pointer transition-colors flex-shrink-0 -ml-1 ${
                    isDarkMode ? 'text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374B56]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Scegli foto dalla galleria o dai file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transform -rotate-45">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </label>
                
                {/* Input di testo */}
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    wasVoiceInputRef.current = false;
                  }}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isListening ? "Parla pure..." : selectedImage ? "Chiedi spiegazione sulla foto..." : "Messaggio o incolla screenshot..."}
                  className={`flex-1 px-2 py-2 bg-transparent border-none focus:outline-none text-[15px] ${
                    isDarkMode ? 'text-gray-200 placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-400'
                  }`}
                  disabled={isLoading}
                />
              </div>

              {/* Bottone Tondo Verde: Microfono o Invio */}
              {input.trim() || selectedImage ? (
                <button 
                  id="chat-send-btn"
                  onClick={handleSend}
                  disabled={isLoading}
                  className={`w-11 h-11 active:scale-95 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all ${
                    isDarkMode ? 'bg-[#25D366] hover:bg-[#25D366]/90 text-[#111B21]' : 'bg-[#25D366] hover:bg-[#118B44]'
                  }`}
                  aria-label="Invia messaggio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={toggleMicrophone}
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : (isDarkMode ? 'bg-[#25D366] hover:bg-[#25D366]/90 text-[#111B21]' : 'bg-[#25D366] hover:bg-[#118B44] text-white')
                  }`}
                  title="Messaggio vocale"
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DI STUDIO GUIDATO / TABELLA DI MARCIA */}
      <StudyPlanner
        isOpen={showPlannerModal}
        onClose={() => setShowPlannerModal(false)}
        agendaItems={agendaItems}
        tutors={tutors}
        isDarkMode={Boolean(isDarkMode)}
        onSelectTutor={handleOpenChat}
        onCompleteTask={handleCompleteTaskById}
        onSaveHabits={handleSaveHabits}
        userHabits={userHabits}
      />

      {/* MODALE FLASHCARD & QUIZ INTERATTIVI */}
      {selectedTutor && (
        <InteractiveStudyTools
          isOpen={studyToolType !== null}
          onClose={() => setStudyToolType(null)}
          toolType={studyToolType}
          tutor={selectedTutor}
          agendaItems={agendaItems}
          isDarkMode={Boolean(isDarkMode)}
          onAwardXP={awardXP}
          onSendChatMessage={(msg) => {
            setInput(msg);
            // Trigger automatic sending in next tick
            setTimeout(() => {
              const sendBtn = document.querySelector("#chat-send-btn") as HTMLButtonElement | null;
              if (sendBtn) sendBtn.click();
            }, 100);
          }}
        />
      )}
    </div>
  );
}
