"use client";

import { useState, useRef, useEffect } from "react";
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

type UIMessage = {
  role: "user" | "model";
  text: string;
  imageUrl?: string;
  time?: string;
};

type SubjectChatData = {
  messages: UIMessage[];
  lastUpdated?: string;
};


const parseDateForSort = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione') return 0;
  
  let time = 9999999999998;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    time = new Date(d).getTime();
  } else {
    const parts = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
      time = new Date(`${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}`).getTime();
    } else {
      const t = new Date(d).getTime();
      if (!isNaN(t)) time = t;
    }
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Se il compito è nel passato, lo mandiamo IN FONDO alla lista
  if (time > 0 && time !== 9999999999998 && time < today.getTime()) {
    return time + 20000000000000;
  }
  
  return time;
};

const formatDisplayDate = (d: string) => {
  if (!d || d.toLowerCase() === 'prossima lezione') return 'Prossima lezione';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
};

export default function Chat({ tutors, isDarkMode, toggleTheme, onChatOpen }: { tutors: Tutor[], isDarkMode?: boolean, toggleTheme?: () => void, onChatOpen?: (isOpen: boolean) => void }) {
  const { stats, awardXP, dbError } = useGamification();
  const levelInfo = getLevelInfo(stats.xp);
  
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [chatsByTutor, setChatsByTutor] = useState<Record<string, SubjectChatData>>({});
  const [subjectsMemory, setSubjectsMemory] = useState<Record<string, SubjectMemory>>({});
  const [showGradesModal, setShowGradesModal] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const wasVoiceInputRef = useRef<boolean>(false);

  useEffect(() => {
    if (onChatOpen) onChatOpen(!!selectedTutor);
  }, [selectedTutor, onChatOpen]);

  // Formatta l'orario attuale stile WhatsApp (es: 19:20)
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  // Filtro Lista (Tutte, Compiti, Verifiche, Voti)
  const [listFilter, setListFilter] = useState<'tutte'|'compiti'|'verifiche'|'voti'>('tutte');
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  // Effetto Badge OS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      const urgentCount = agendaItems.filter(item => {
        if (item.isCompleted) return false;
        const d = item.dueDate || '';
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tStr = tomorrow.toISOString().split('T')[0];
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


  // Ascolta le chat e la memoria da Firestore in tempo reale
  useEffect(() => {
    const userRef = doc(db, "petralab_users", "studente_demo");
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.subjectsMemory) {
          setSubjectsMemory(data.subjectsMemory);
        }
        if (data.chatsByTutor) {
          setChatsByTutor(data.chatsByTutor);
        }
        if (data.agendaItems) {
          setAgendaItems(data.agendaItems);
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
      
      const initialMsgs: UIMessage[] = [{ role: "model", text: greeting, time: getCurrentTime() }];
      const updatedChats = {
        ...chatsByTutor,
        [tutor.id]: { messages: initialMsgs, lastUpdated: getCurrentTime() }
      };
      setChatsByTutor(updatedChats);
      
      const userRef = doc(db, "petralab_users", "studente_demo");
      setDoc(userRef, { chatsByTutor: updatedChats }, { merge: true }).catch(console.error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedTutor) {
      scrollToBottom();
    }
  }, [selectedTutor, chatsByTutor]);

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
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.text = text.replace(/[*#_`]/g, '');
    
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

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Compressione: max 1024x1024
          const MAX_SIZE = 1024;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const result = reader.result as string;
            return resolve({ base64: result.split(",")[1], mimeType: file.type, dataUrl: result });
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg', dataUrl });
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
    });
  };

  const handleSend = async () => {
    if (!selectedTutor || (!input.trim() && !selectedImage)) return;

    const userText = input.trim();
    setInput("");
    const imgFile = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setIsLoading(true);

    let imagePayload = undefined;
    let localImageUrl = undefined;

    if (imgFile) {
      try {
        const { base64, mimeType, dataUrl } = await fileToBase64(imgFile);
        imagePayload = { base64, mimeType };
        
        // Carica su Firebase Storage per mantenere la memoria permanente
        const safeName = imgFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageRef = ref(storage, `chat_images/studente_demo_${Date.now()}_${safeName}`);
        await uploadString(storageRef, dataUrl, 'data_url');
        localImageUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.warn("Firebase Storage non configurato o errore. Fallback alla memoria temporanea:", err);
        // Fallback: usiamo l'immagine locale ma non verrà salvata su Firestore in modo permanente
        const { base64, mimeType, dataUrl } = await fileToBase64(imgFile);
        imagePayload = { base64, mimeType };
        localImageUrl = dataUrl; 
      }
    }

    const tutorId = selectedTutor.id;
    const nowTime = getCurrentTime();
    const prevMsgs = currentMessages;

    const newMessages: UIMessage[] = [
      ...prevMsgs, 
      { role: "user", text: userText, imageUrl: localImageUrl, time: nowTime }
    ];

    // Aggiorna stato locale
    const updatedChats = {
      ...chatsByTutor,
      [tutorId]: { messages: newMessages, lastUpdated: nowTime }
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
      response = await sendMessage(userText, history, imagePayload, selectedTutor, currentMem);
    } catch (e: any) {
      console.error("Critical chat error:", e);
      response = { success: false, error: "Si è verificato un errore critico di connessione con l'AI." };
    }
    
    if (response.success && response.text) {
      const finalMsgs: UIMessage[] = [
        ...newMessages, 
        { role: "model", text: response.text, time: getCurrentTime() }
      ];
      
      const finalChats = {
        ...chatsByTutor,
        [tutorId]: { messages: finalMsgs, lastUpdated: getCurrentTime() }
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
        safeChats[tid].messages = safeChats[tid].messages.map((m: any) => ({
          role: m.role,
          text: m.text,
          time: m.time,
          imageUrl: (m.imageUrl && m.imageUrl.startsWith("http")) ? m.imageUrl : null
        }));
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
      const finalMsgs: UIMessage[] = [
        ...newMessages, 
        { role: "model", text: response.error || "Errore di connessione.", time: getCurrentTime() }
      ];
      setChatsByTutor({
        ...chatsByTutor,
        [tutorId]: { messages: finalMsgs, lastUpdated: getCurrentTime() }
      });
    }
    
    setIsLoading(false);
  };

  const currentTutorMemory = selectedTutor ? subjectsMemory[selectedTutor.id] : null;

  const filteredTutors = tutors.filter(t => 
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
                        <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">v1.7.0</span>
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
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full transition-all ${
              isDarkMode ? 'bg-[#202C33]' : 'bg-[#F0F2F5]'
            }`}>
              <div className="w-5 h-5 rounded-full border-[2px] border-blue-500 border-t-purple-500 border-r-pink-500 flex-shrink-0 animate-spin-slow"></div>
              <input 
                type="text" 
                placeholder="Chiedi all'IA o cerca tutor..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent w-full outline-none font-medium text-[15px] placeholder-opacity-80 ${
                  isDarkMode ? 'text-white placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Filtri Stile WhatsApp 2024 */}
          <div className={`flex gap-2 px-4 py-1 pb-3 overflow-x-auto no-scrollbar border-b ${
            isDarkMode ? 'bg-[#0B141A] border-[#202C33]' : 'bg-white border-slate-100'
          }`}>
            {[
              { id: 'tutte', label: 'Tutte' },
              { id: 'compiti', label: 'Compiti' },
              { id: 'verifiche', label: 'Verifiche' },
              { id: 'voti', label: 'Voti' }
            ].map(filter => (
              <span 
                key={filter.id}
                onClick={() => setListFilter(filter.id as any)}
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
          <div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'} ${listFilter === 'tutte' ? 'divide-y' : ''} ${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}`}>
            {listFilter === "tutte" ? (
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
                        tutorChat?.lastUpdated === getCurrentTime() 
                          ? "border-[#25D366] p-0.5" 
                          : "border-transparent"
                      } ${isDarkMode ? "bg-gradient-to-br from-[#182229] to-[#202C33] shadow-inner" : "bg-gradient-to-br from-emerald-50 to-teal-100/50 shadow-inner"}`}>
                        <span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>
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
                          {tutorChat?.lastUpdated || "Oggi"}
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
              })
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
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {listFilter === "compiti" ? "📝 Diario Compiti" : "🚨 Prossime Verifiche"}
                  </h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? "bg-[#202C33] text-[#8696A0]" : "bg-slate-200 text-slate-600"}`}>
                    {agendaItems.filter(item => item.type?.toLowerCase() === (listFilter === 'compiti' ? 'compito' : 'verifica')).length} da fare
                  </span>
                </div>
                
                {agendaItems.filter(item => item.type?.toLowerCase() === (listFilter === 'compiti' ? 'compito' : 'verifica')).length === 0 ? (
                  <div className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center mt-4 shadow-sm ${
                    isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-5xl mb-4 opacity-80">{listFilter === "compiti" ? "📚" : "🎯"}</span>
                    <p className={`font-bold text-[15px] mb-2 ${isDarkMode ? "text-gray-200" : "text-slate-700"}`}>
                      Tutto completato!
                    </p>
                    <p className={`text-[13px] leading-relaxed max-w-[250px] ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                      Non hai {listFilter === "compiti" ? "compiti" : "verifiche"} in sospeso. 
                      Mamma o papà possono inserirli con lo <strong className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}>Screenshot Magico</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-6">
                    {(() => {
                      // 1. Filter and sort
                      const tasks = agendaItems.filter(item => item.type?.toLowerCase() === (listFilter === 'compiti' ? 'compito' : 'verifica'));
                      tasks.sort((a, b) => parseDateForSort(a.dueDate || '') - parseDateForSort(b.dueDate || ''));

                      // 2. Group
                      const groups: Record<string, any[]> = {};
                      tasks.forEach(t => {
                         const d = t.dueDate || 'Senza data';
                         if (!groups[d]) groups[d] = [];
                         groups[d].push(t);
                      });

                      // 3. Helper per date e urgenze
                      const todayObj = new Date();
                      const todayStr = todayObj.toISOString().split('T')[0];
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tStr = tomorrow.toISOString().split('T')[0];

                      const formatDate = (ds: string) => {
                         if (ds === 'Prossima lezione') return 'Prossima Lezione';
                         if (ds === todayStr) return 'Oggi';
                         if (ds === tStr) return 'Domani';
                         const parts = ds.split('-');
                         if (parts.length === 3) {
                            const d = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
                            const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                            return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                         }
                         return ds;
                      };

                      // 4. Render
                      return Object.entries(groups).map(([dateStr, dayTasks], gIdx) => {
                         const isUrgentDay = dateStr === tStr || dateStr === todayStr;
                         return (
                           <div key={gIdx} className="flex flex-col gap-3">
                             <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: isDarkMode ? '#0B141A' : '#EFEAE2' }}>
                               <h3 className={`text-lg font-black inline-block px-2 py-1 rounded-lg border-b-2 shadow-sm ${
                                 isUrgentDay 
                                   ? (isDarkMode ? 'bg-red-950/40 text-red-400 border-red-500' : 'bg-red-50 text-red-600 border-red-500') 
                                   : (isDarkMode ? 'bg-[#202C33] text-emerald-400 border-emerald-400' : 'bg-white text-[#118B44] border-[#25D366]')
                               }`}>
                                 {formatDate(dateStr)} {isUrgentDay && ' 🚨'}
                               </h3>
                             </div>
                             
                             <div className="flex flex-col gap-3">
                               {dayTasks.map((item, idx) => {
                                 const isUrgent = isUrgentDay && !item.isCompleted;
                                 return (
                                   <div key={idx} className={`p-4 rounded-xl border flex gap-3 shadow-sm transition-all ${
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
                                     <div className={`flex-1 ${item.isCompleted ? 'line-through' : ''}`}>
                                       <div className="flex justify-between items-start">
                                         <div className="flex items-center gap-2">
                                           <span className="text-lg">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                                           <h4 className={`font-bold ${
                                             isUrgent && !item.isCompleted ? (isDarkMode ? 'text-red-400' : 'text-red-700') : (isDarkMode ? 'text-gray-200' : 'text-slate-800')
                                           }`}>{item.subject}</h4>
                                         </div>
                                       </div>
                                       <p className={`text-sm mt-1 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-600'}`}>{item.description}</p>
                                       {/* Bottoncino "Parla col Tutor" */}
                                       {(() => {
                                         const matchingTutor = tutors.find((t: any) => 
                                           t.id === item.subject?.toLowerCase() || 
                                           t.subject.toLowerCase().includes(item.subject?.toLowerCase())
                                         );
                                         if (matchingTutor && !item.isCompleted) {
                                           return (
                                             <button 
                                               onClick={() => handleSelectTutor(matchingTutor)}
                                               className={`mt-2 w-max text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm ${
                                                 isDarkMode 
                                                   ? 'bg-[#111B21] border border-[#2A3942] text-emerald-400 hover:bg-[#25D366] hover:text-white' 
                                                   : 'bg-white border border-slate-200 text-emerald-600 hover:bg-[#25D366] hover:text-white'
                                               }`}
                                             >
                                               <span className="text-base">{matchingTutor.avatar}</span> Parla col Tutor
                                             </button>
                                           );
                                         }
                                         return null;
                                       })()}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. SCHERMATA CHAT SINGOLA (Stile Conversazione WhatsApp)         */
        /* ============================================================== */
        <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0B141A]' : 'bg-[#EFEAE2]'}`}>
          {/* Header Singola Chat WhatsApp */}
          <div className={`${isDarkMode ? 'bg-[#202C33]' : 'bg-[#25D366]'} text-white px-3 py-2.5 flex items-center justify-between shadow-md z-20`}>
            <div className="flex items-center gap-2">
              {/* Tasto Indietro Stile WhatsApp */}
              <button 
                onClick={() => window.history.back()}
                className="p-1 -ml-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-0.5 text-white"
                title="Torna alle chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-xs">
                  {selectedTutor.avatar}
                </div>
              </button>

              <div className="min-w-0">
                <h2 className="font-bold text-[15px] leading-tight truncate">
                  {selectedTutor.name}
                </h2>
                <p className={`text-[11px] ${isDarkMode ? 'text-gray-300' : 'text-emerald-200'} flex items-center gap-1 font-medium`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDarkMode ? 'bg-[#25D366]' : 'bg-emerald-300'}`}></span>
                  online • {selectedTutor.subject.split(' ')[0]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowGradesModal(true)}
                className="bg-black/15 hover:bg-black/25 text-white text-xs px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all active:scale-95"
                title="Diario Voti e Lacune"
              >
                📝 <span className="hidden sm:inline">Voti</span> ({currentTutorMemory?.grades?.length || 0})
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowChatMenu(prev => !prev)}
                  className="p-1.5 rounded-full hover:bg-black/10 transition-colors text-white active:scale-95"
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
                        <span className="font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">v1.5.0</span>
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
                    <span className="text-3xl bg-slate-100 p-2 rounded-2xl">{selectedTutor.avatar}</span>
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
            className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative ${isDarkMode ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}
            style={{ 
              backgroundImage: isDarkMode ? "none" : "none", 
              backgroundSize: "16px 16px" 
            }}
          >
            {/* Pillola Data Centrata */}
            <div className="flex justify-center my-2">
              <span className={`text-[11px] font-semibold px-3 py-1 rounded-lg shadow-xs uppercase tracking-wider ${
                isDarkMode ? 'bg-[#182229]/90 text-[#8696A0]' : 'bg-white/90 text-slate-600'
              }`}>
                OGGI
              </span>
            </div>

            {currentMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] sm:max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[14.5px] leading-relaxed relative shadow-xs group ${
                    msg.role === "user"
                      ? (isDarkMode ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-xs" : "bg-[#D9FDD3] text-slate-900 rounded-tr-xs")
                      : (isDarkMode ? "bg-[#202C33] text-[#E9EDEF] rounded-tl-xs" : "bg-white text-slate-900 rounded-tl-xs")
                  }`}
                >
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Allegato" 
                      className="rounded-xl max-h-60 object-contain mb-2 bg-black/5" 
                    />
                  )}

                  {msg.text && (
                    <div className={msg.role === "model" ? `prose prose-sm max-w-none ${isDarkMode ? 'prose-invert prose-emerald' : 'prose-emerald'}` : ""}>
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
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5 ${
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
              <div className={`flex items-center gap-2 p-2 rounded-xl border relative w-max shadow-xs ${
                isDarkMode ? 'bg-[#2A3942] border-[#202C33]' : 'bg-white border-slate-200'
              }`}>
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Preview" 
                  className="h-14 w-14 object-cover rounded-lg" 
                />
                <span className={`text-xs truncate max-w-[140px] font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                  {selectedImage.name}
                </span>
                <button 
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 shadow"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Contenitore Input Arrotondato */}
              <div className={`flex-1 flex items-center px-2 py-1 sm:py-1.5 rounded-3xl shadow-sm border border-transparent ${
                isDarkMode ? 'bg-[#202C33] focus-within:border-[#25D366]' : 'bg-white focus-within:border-transparent'
              } ${isListening ? 'ring-2 ring-red-400' : ''}`}>
                
                {/* Input file nascosto */}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden" 
                />
                
                {/* Input di testo */}
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    wasVoiceInputRef.current = false;
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isListening ? "Parla pure..." : "Messaggio..."}
                  className={`flex-1 px-3 py-2 bg-transparent border-none focus:outline-none text-[15px] ${
                    isDarkMode ? 'text-gray-200 placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-400'
                  }`}
                  disabled={isLoading}
                />
                
                {/* Bottone Allegato (Graffetta) - ora dentro l'input */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 mx-1 ${
                    isDarkMode ? 'text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374B56]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Allega foto esercizio"
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transform -rotate-45">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </button>
              </div>

              {/* Bottone Tondo Verde: Microfono o Invio */}
              {input.trim() || selectedImage ? (
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className={`w-10 h-10 active:scale-95 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all ${
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all ${
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
    </div>
  );
}
