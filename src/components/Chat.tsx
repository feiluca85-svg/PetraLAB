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
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

type UIMessage = {
  role: "user" | "model";
  text: string;
  imageUrl?: string;
};

export default function Chat() {
  const { stats, awardXP, dbError } = useGamification();
  const levelInfo = getLevelInfo(stats.xp);
  
  const [messages, setMessages] = useState<UIMessage[]>([
    { role: "model", text: "Ciao! Sono il tuo tutor. Su quale materia o argomento ti stai bloccando oggi?" }
  ]);
  
  // Sincronizza messaggi su Firestore (max ultimi 20)
  useEffect(() => {
    if (messages.length > 1) {
      const userRef = doc(db, "petralab_users", "studente_demo");
      const recent = messages.slice(-20).map(m => ({ role: m.role, text: m.text }));
      updateDoc(userRef, { chatHistory: recent }).catch(console.error);
    }
  }, [messages]);
  const [input, setInput] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const wasVoiceInputRef = useRef<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  // Setup Speech Recognition
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
    
    // Cleanup speech synthesis on unmount
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      alert("Il tuo browser non supporta il riconoscimento vocale. Usa Chrome o Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
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
    utterance.text = text.replace(/[*#_]/g, '');
    
    utterance.lang = selectedTutor?.voiceLang || "it-IT";
    utterance.rate = 1.15;
    
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      const langVoices = voices.filter(v => v.lang.startsWith(utterance.lang.substring(0,2)));
      let chosenVoice = null;
      
      if (selectedTutor?.gender === "female") {
        chosenVoice = langVoices.find(v => (v.name.includes("Premium") || v.name.includes("Alice") || v.name.includes("Elsa") || v.name.includes("Samantha")) && !v.name.includes("Male"));
      } else if (selectedTutor?.gender === "male") {
        chosenVoice = langVoices.find(v => v.name.includes("Luca") || v.name.includes("Giorgio") || v.name.includes("Arthur") || v.name.includes("Daniel") || v.name.includes("Male"));
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

  // Gestione Drag & Drop
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
    if (!input.trim() && !selectedImage) return;

    const userText = input.trim();
    setInput("");
    const imgFile = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    let imagePayload = undefined;
    let localImageUrl = undefined;

    if (imgFile) {
      const { base64, mimeType, dataUrl } = await fileToBase64(imgFile);
      imagePayload = { base64, mimeType };
      localImageUrl = dataUrl;
    }

    const newMessages: UIMessage[] = [
      ...messages, 
      { role: "user", text: userText, imageUrl: localImageUrl }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    const history: Content[] = messages.slice(1).map(m => {
      const parts: any[] = [];
      if (m.text) parts.push({ text: m.text });
      return { role: m.role, parts: parts };
    });

    const response = await sendMessage(userText, history, imagePayload);
    
    if (response.success && response.text) {
      setMessages([...newMessages, { role: "model", text: response.text }]);
      // Premia l'utente con 10 XP per ogni interazione!
      awardXP(10);
      
      // Auto-lettura se l'ultimo input era vocale
      if (wasVoiceInputRef.current) {
        speakText(response.text);
        wasVoiceInputRef.current = false;
      }
    } else {
      setMessages([...newMessages, { role: "model", text: response.error || "Errore di connessione." }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div 
      className={`flex flex-col h-[75vh] w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border overflow-hidden transition-all duration-200 ${
        isDragging ? "border-blue-500 ring-4 ring-blue-500/20" : "border-gray-100"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header Gamification */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦉</span>
          <div>
            <h2 className="font-bold text-lg leading-tight">Athena</h2>
            <p className="text-xs text-blue-100 opacity-90">Tutor Socratico</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-1 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 min-w-[140px]">
            <div className="flex justify-between items-center text-xs font-bold w-full">
              <span>{levelInfo.title}</span>
              <span className="text-yellow-300">{stats.xp} XP</span>
            </div>
            {levelInfo.nextLevelXP && (
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-0.5">
                <div 
                  className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${levelInfo.progress}%` }}
                ></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 font-bold text-sm bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
            <span className="text-orange-400 text-lg">🔥</span>
            <span>{stats.streak}</span>
          </div>

          {/* Bottone Ricarica */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
            title="Ricarica applicazione"
          >
            🔄
          </button>

          {/* Icona Gestione / Esci */}
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Pannello Amministratore"
          >
            🛡️
          </Link>
        </div>
      </div>
      {dbError && (
        <div className="bg-red-50 text-red-600 text-xs text-center py-1">
          {dbError}
        </div>
      )}

      {/* Area Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50 relative">
        
        {isDragging && (
          <div className="absolute inset-0 bg-blue-50/90 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-blue-600 font-bold text-xl flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 animate-bounce">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
              </svg>
              Rilascia l'immagine qui!
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-[15px] sm:text-base flex flex-col gap-2 relative group ${
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-tr-sm shadow-sm" 
                : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
            }`}>
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="Caricata dall'utente" className="rounded-lg max-h-64 object-contain self-start bg-white/10" />
              )}
              {msg.text && (
                <div className={msg.role === "model" ? "prose prose-sm max-w-none prose-blue" : ""}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              
              {/* Bottone Lettura Vocale (solo per il tutor) */}
              {msg.role === "model" && (
                <button 
                  onClick={() => speakText(msg.text)}
                  className="absolute -right-3 -top-3 bg-white border border-gray-200 text-gray-500 rounded-full p-2 shadow hover:text-blue-600 hover:border-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                  title="Leggi ad alta voce"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-400 border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm animate-pulse flex space-x-2 items-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Area Input & Preview Immagine */}
      <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 z-20">
        {selectedImage && (
          <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 relative w-max shadow-sm">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="Preview" 
              className="h-16 w-16 object-cover rounded-md" 
            />
            <span className="text-sm text-blue-800 font-medium truncate max-w-[150px]">
              {selectedImage.name}
            </span>
            <button 
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          
          <input 
            type="file" 
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
            title="Allega una foto o trascinala qui"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </button>

          {/* Bottone Microfono */}
          <button 
            onClick={toggleMicrophone}
            className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Detta a voce"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>

          <input 
            type="text" 
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              wasVoiceInputRef.current = false;
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isListening ? "In ascolto..." : selectedImage ? "Aggiungi un commento..." : "Fai una domanda..."}
            className={`flex-1 px-4 py-3 rounded-full border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[15px] text-gray-700 min-w-0 ${isListening ? 'border-red-300' : 'border-gray-200'}`}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full flex-shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center"
            aria-label="Invia"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
