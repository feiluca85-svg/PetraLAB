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
    setSelectedTutor(tutor);
    
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
    utterance.rate = 1.15;
    
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
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType: file.type, dataUrl: result });
      };
      reader.onerror = (error) => reject(error);
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
        isDragging ? "ring-4 ring-emerald-500/30" : ""
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
          {/* Header WhatsApp Top Moderno */}
          <div className={`${
            isDarkMode ? 'bg-[#111B21] border-b border-[#222E35]' : 'bg-white border-b border-slate-100'
          } px-4 pt-3.5 pb-2.5 flex justify-between items-center relative z-30 transition-colors`}>
            <div className="flex items-center gap-2.5">
              <img 
                src="/icon.png" 
                alt="PetraLAB" 
                className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover shadow-xs bg-emerald-950 shrink-0" 
              />
              <div>
                <h1 className={`text-[22px] font-black tracking-tight leading-none ${
                  isDarkMode ? 'text-[#25D366]' : 'text-[#1DA851]'
                }`}>
                  PetraLAB
                </h1>
                <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
                  {levelInfo.title} • <span className="font-semibold text-emerald-600">{stats.xp} XP</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Badge Streak Fiamma */}
              <div className={`flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                isDarkMode ? 'bg-[#202C33] text-orange-400 border border-[#2A3942]' : 'bg-orange-50 text-orange-600 border border-orange-100'
              }`}>
                <span>🔥</span>
                <span>{stats.streak}</span>
              </div>

              {/* Tasto Tema Chiaro/Scuro */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-[#202C33] text-gray-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title={isDarkMode ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              )}

              {/* Menu a 3 Puntini */}
              <div className="relative">
                <button 
                  onClick={() => setShowHomeMenu(prev => !prev)}
                  className={`p-2 rounded-full transition-colors active:scale-95 ${
                    isDarkMode ? 'hover:bg-[#202C33] text-gray-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Altre opzioni"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                  </svg>
                </button>

                {showHomeMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowHomeMenu(false)}
                    />
                    <div className={`absolute right-0 top-full mt-1.5 w-52 rounded-2xl shadow-2xl border py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDarkMode 
                        ? 'bg-[#233138] border-[#2E3C44] text-[#E9EDEF]' 
                        : 'bg-white border-slate-100 text-slate-800'
                    }`}>
                      <div className={`px-4 py-2 border-b text-xs flex justify-between items-center ${
                        isDarkMode ? 'border-[#2E3C44] text-[#8696A0]' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span>Versione App</span>
                        <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">v1.0.5</span>
                      </div>
                      <button 
                        onClick={() => { setShowHomeMenu(false); window.location.reload(); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          isDarkMode ? 'hover:bg-[#111B21]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>🔄</span>
                        <span>Ricarica / Aggiorna</span>
                      </button>
                      <Link 
                        href="/admin" 
                        onClick={() => setShowHomeMenu(false)}
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

          {/* Barra di Ricerca Stile WhatsApp Moderno (Senza bordi netti, pillola morbida) */}
          <div className={`px-4 pt-2.5 pb-2 ${isDarkMode ? 'bg-[#111B21]' : 'bg-white'}`}>
            <div className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 transition-all ${
              isDarkMode 
                ? 'bg-[#202C33] text-gray-200 focus-within:ring-1 focus-within:ring-[#00A884]' 
                : 'bg-[#F0F2F5] text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20'
            }`}>
              {/* Icona circolare sfumata Meta AI style */}
              <div className="w-4 h-4 rounded-full border-2 border-emerald-500/70 border-t-blue-500 shrink-0" />
              <input
                type="text"
                placeholder="Chiedi all'IA o cerca tutor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent border-none outline-none w-full text-[14.5px] ${
                  isDarkMode ? 'text-gray-200 placeholder-[#8696A0]' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 text-xs p-1">✕</button>
              )}
            </div>
          </div>

          {/* Filtri Orizzontali Stile WhatsApp (Pillole arrotondate morbide) */}
          <div className={`flex gap-2 px-4 py-2 text-xs overflow-x-auto no-scrollbar border-b ${
            isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-white border-slate-100'
          }`}>
            <span className={`${
              isDarkMode ? 'bg-[#00A884]/25 text-[#00A884]' : 'bg-[#D8FDD2] text-[#0A332C]'
            } font-semibold px-3.5 py-1.5 rounded-full cursor-pointer transition-all`}>
              Tutte
            </span>
            <span className={`${
              isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200'
            } font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all`}>
              Compiti
            </span>
            <span className={`${
              isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200'
            } font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all`}>
              Verifiche
            </span>
            <span className={`${
              isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:text-white' : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200'
            } font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all`}>
              Voti Recenti
            </span>
          </div>

          {/* Lista delle Chat (Tutor per Materia) */}
          <div className={`flex-1 overflow-y-auto divide-y ${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}`}>
            {filteredTutors.map((tutor) => {
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
                  className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors ${
                    isDarkMode ? 'hover:bg-[#202C33] active:bg-[#222E35]' : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  {/* Foto Profilo Circolare 52px con Anello di Stato Verde */}
                  <div className="relative shrink-0">
                    <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl shadow-xs transition-transform ${
                      lastGrade
                        ? 'p-0.5 ring-2 ring-emerald-500' 
                        : (isDarkMode ? 'p-0.5 ring-1 ring-[#2A3942]' : 'p-0.5 ring-1 ring-slate-200')
                    } ${isDarkMode ? 'bg-[#202C33]' : 'bg-slate-100'}`}>
                      <span>{tutor.avatar}</span>
                    </div>

                    {lastGrade && (
                      <span className={`absolute -bottom-1 -right-1 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-xs ${
                        isDarkMode ? 'bg-[#00A884] text-[#111B21] border-[#111B21]' : 'bg-[#25D366] text-white border-white'
                      }`} title={`Ultimo voto: ${lastGrade.grade}`}>
                        {lastGrade.grade.toString().charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Informazioni Contatto e Ultimo Messaggio */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className={`font-bold text-[16px] truncate ${
                          isDarkMode ? 'text-[#E9EDEF]' : 'text-slate-900'
                        }`}>
                          {tutor.name}
                        </h2>
                        <span className={`text-[11px] font-semibold px-2 py-0.2 rounded-full shrink-0 ${
                          isDarkMode ? 'bg-[#00A884]/20 text-[#00A884]' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {tutor.subject.split(' ')[0]}
                        </span>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ml-2 ${
                        lastMsg?.role === "user" 
                          ? (isDarkMode ? 'text-[#8696A0]' : 'text-slate-400')
                          : 'text-[#25D366] font-semibold'
                      }`}>
                        {tutorChat?.lastUpdated || "Oggi"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13.5px] truncate flex items-center gap-1.5 ${
                        isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
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
                            isDarkMode ? 'text-[#00A884]' : 'text-emerald-700'
                          }`}>
                            Tocca per iniziare i compiti 💬
                          </span>
                        )}
                      </p>
                      
                      {lastGrade && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                          isDarkMode 
                            ? 'bg-[#00A884]/15 text-[#00A884] border border-[#00A884]/30' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          Voto: {lastGrade.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. SCHERMATA CHAT SINGOLA (Stile Conversazione WhatsApp)         */
        /* ============================================================== */
        <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0B141A]' : 'bg-[#EFEAE2]'}`}>
          {/* Header Singola Chat WhatsApp */}
          <div className={`${isDarkMode ? 'bg-[#202C33]' : 'bg-[#008069]'} text-white px-3 py-2.5 flex items-center justify-between shadow-md z-20`}>
            <div className="flex items-center gap-2">
              {/* Tasto Indietro Stile WhatsApp */}
              <button 
                onClick={() => setSelectedTutor(null)}
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
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDarkMode ? 'bg-[#00A884]' : 'bg-emerald-300'}`}></span>
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
                        <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">v1.0.4</span>
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
                          <span className="font-black text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg shadow-xs">
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
                  className="w-full bg-[#008069] text-white font-bold py-2.5 rounded-2xl hover:bg-[#00705c] transition-colors text-sm shadow-md"
                >
                  Chiudi Diario
                </button>
              </div>
            </div>
          )}

          {/* Area Messaggi Chat Stile WhatsApp */}
          <div 
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative"
            style={{ 
              backgroundImage: isDarkMode ? "radial-gradient(#2A3942 0.75px, transparent 0.75px)" : "radial-gradient(#d3cbbf 0.75px, transparent 0.75px)", 
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
                        className={`ml-1 p-0.5 transition-colors ${isDarkMode ? 'text-[#8696A0] hover:text-[#00A884]' : 'text-slate-400 hover:text-emerald-700'}`}
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
            isDarkMode ? 'bg-[#202C33] border-t border-[#2A3942]' : 'bg-[#F0F2F5] border-t border-slate-200'
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
                isDarkMode ? 'bg-[#2A3942] focus-within:border-[#00A884]' : 'bg-white focus-within:border-slate-300'
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
                    isDarkMode ? 'bg-[#00A884] hover:bg-[#00A884]/90 text-[#111B21]' : 'bg-[#008069] hover:bg-[#00705c]'
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
                      : (isDarkMode ? 'bg-[#00A884] hover:bg-[#00A884]/90 text-[#111B21]' : 'bg-[#008069] hover:bg-[#00705c] text-white')
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
