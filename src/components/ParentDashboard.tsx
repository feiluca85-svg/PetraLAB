"use client";

import { useState, useEffect, useRef } from "react";
import { parseNuvolaScreenshot } from "@/app/actions/chat";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, setDoc } from "firebase/firestore";
import { getLevelInfo } from "@/lib/levels";
import { useTutors } from "@/hooks/useTutors";
import { AccessLog } from "@/lib/accessLogger";
import TutorManager from "./TutorManager";


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

export default function ParentDashboard({
  isDarkMode = false,
  onClose,
}: {
  isDarkMode?: boolean;
  onClose?: () => void;
}) {
  const { devices, removeDevice, logout, role } = useAuth();
  const { tutors } = useTutors();

    const [activeSubTab, setActiveSubTab] = useState<"security" | "grades" | "chats" | "tutors" | "agenda">("security");
  const [isUnlocked, setIsUnlocked] = useState(role === "admin");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<"task" | "grade">("task");
  const [manualFormData, setManualFormData] = useState({
    subject: "",
    type: "Compito",
    description: "",
    dueDate: "",
    grade: "",
    topic: ""
  });
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [childStats, setChildStats] = useState({ xp: 0, streak: 1 });
  const [childChat, setChildChat] = useState<Array<{ role: string; text: string }>>([]);
  const [subjectsMemory, setSubjectsMemory] = useState<Record<string, any>>({});
  const [isTutorManagerOpen, setIsTutorManagerOpen] = useState(false);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [isUploadingNuvola, setIsUploadingNuvola] = useState(false);
  const [nuvolaDate, setNuvolaDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gradesFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingGrades, setIsUploadingGrades] = useState(false);


  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max = 1024;
          if (width > max || height > max) {
            if (width > height) { height = Math.round((height * max) / width); width = max; }
            else { width = Math.round((width * max) / height); height = max; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo compito? L'operazione non può essere annullata.")) return;
    try {
      const updatedAgenda = agendaItems.filter((item: any) => item.id !== taskId);
      setAgendaItems(updatedAgenda);
      const userRef = doc(db, "petralab_users", "studente_demo");
      await setDoc(userRef, { agendaItems: updatedAgenda }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Errore durante l'eliminazione del compito.");
    }
  };

  const handleManualSubmit = async () => {
    try {
      const userRef = doc(db, "petralab_users", "studente_demo");
      if (manualType === "task") {
        if (!manualFormData.subject || !manualFormData.description) return alert("Inserisci materia e descrizione.");
        const newTask = {
          id: `manual_${Date.now()}`,
          subject: manualFormData.subject,
          type: manualFormData.type,
          description: manualFormData.description,
          dueDate: manualFormData.dueDate || new Date().toISOString().split('T')[0],
          isCompleted: false
        };
        const updatedAgenda = [...agendaItems, newTask];
        setAgendaItems(updatedAgenda);
        await setDoc(userRef, { agendaItems: updatedAgenda }, { merge: true });
      } else {
        if (!manualFormData.subject || !manualFormData.grade) return alert("Inserisci materia (Tutor) e voto.");
        const dateStr = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
        const mem = subjectsMemory[manualFormData.subject] || { grades: [], weaknesses: [] };
        const updatedGrades = [...(mem.grades || []), {
          grade: manualFormData.grade,
          topic: manualFormData.topic || "Inserito manualmente",
          date: dateStr
        }];
        const updatedMemMap = { ...subjectsMemory, [manualFormData.subject]: { ...mem, grades: updatedGrades } };
        setSubjectsMemory(updatedMemMap);
        await setDoc(userRef, { subjectsMemory: updatedMemMap }, { merge: true });
      }
      setShowManualModal(false);
      setManualFormData({ subject: "", type: "Compito", description: "", dueDate: "", grade: "", topic: "" });
    } catch (err) {
      alert("Errore salvataggio manuale.");
    }
  };

  const handleGradesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingGrades(true);
    try {
      const base64Str = await fileToBase64(file);
      const parts = base64Str.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      
      const res = await parseNuvolaScreenshot(base64Data, mimeType); // usa lo stesso parser
      
      let gradesAdded = 0;
      let updatedMemMap = { ...subjectsMemory };
      if (res.gradesItems && res.gradesItems.length > 0) {
        res.gradesItems.forEach((gradeItem: any) => {
          const matchingTutor = tutors.find((t: any) => 
            t.id === gradeItem.subject?.toLowerCase() || 
            t.subject.toLowerCase().includes(gradeItem.subject?.toLowerCase())
          );
          const tutorId = matchingTutor ? matchingTutor.id : "generico";
          const mem = updatedMemMap[tutorId] || { grades: [], weaknesses: [] };
          
          const isDup = mem.grades?.some((g: any) => g.grade === gradeItem.grade && g.topic === gradeItem.topic);
          if (!isDup) {
            const newGrade = {
              grade: gradeItem.grade,
              topic: gradeItem.topic || "Voto importato da Nuvola",
              date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
            };
            updatedMemMap[tutorId] = { ...mem, grades: [...(mem.grades || []), newGrade] };
            gradesAdded++;
          }
        });
        
        if (gradesAdded > 0) {
          const userRef = doc(db, "petralab_users", "studente_demo");
          await setDoc(userRef, { subjectsMemory: updatedMemMap }, { merge: true });
          setSubjectsMemory(updatedMemMap);
          alert(`${gradesAdded} voti estratti e salvati con successo!`);
        } else {
          alert("Nessun voto nuovo trovato nello screenshot.");
        }
      } else {
        alert("L'IA non ha trovato voti in questa immagine.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante la lettura dei voti.");
    } finally {
      setIsUploadingGrades(false);
      if (gradesFileInputRef.current) gradesFileInputRef.current.value = "";
    }
  };

  const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingNuvola(true);
    try {
      const base64Str = await fileToBase64(file);
      const parts = base64Str.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      
      const res = await parseNuvolaScreenshot(base64Data, mimeType);
      
      if (res.success) {
        let tasksAdded = 0;
        let gradesAdded = 0;
        const updatePayload: any = {};
        
        // Process Agenda Items
        if (res.items && res.items.length > 0) {
          const itemsToAdd = res.items.filter((newItem: any) => {
            const normNew = (newItem.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const isDuplicate = agendaItems.some((ex: any) => {
              const normEx = (ex.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normEx === normNew) return true;
              if (normEx.length > 20 && normNew.length > 20 && (normEx.includes(normNew.substring(0,20)) || normNew.includes(normEx.substring(0,20)))) return true;
              return false;
            });
            return !isDuplicate;
          });
          
          if (itemsToAdd.length > 0) {
            updatePayload.agendaItems = [...agendaItems, ...itemsToAdd];
            tasksAdded = itemsToAdd.length;
          }
        }
        
        // Process Grades Items
        let updatedMemMap = { ...subjectsMemory };
        if (res.gradesItems && res.gradesItems.length > 0) {
          res.gradesItems.forEach((gradeItem: any) => {
            const matchingTutor = tutors.find((t: any) => 
              t.id === gradeItem.subject?.toLowerCase() || 
              t.subject.toLowerCase().includes(gradeItem.subject?.toLowerCase())
            );
            const tutorId = matchingTutor ? matchingTutor.id : "generico";
            const mem = updatedMemMap[tutorId] || { grades: [], weaknesses: [] };
            
            const isDup = mem.grades?.some((g: any) => g.grade === gradeItem.grade && g.topic === gradeItem.topic);
            if (!isDup) {
              const newGrade = {
                grade: gradeItem.grade,
                topic: gradeItem.topic || "Voto da registro",
                date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
                originalSubject: gradeItem.subject || "Materia non specificata"
              };
              updatedMemMap[tutorId] = { ...mem, grades: [...(mem.grades || []), newGrade] };
              gradesAdded++;
            }
          });
          if (gradesAdded > 0) {
            updatePayload.subjectsMemory = updatedMemMap;
          }
        }
        
        if (tasksAdded > 0 || gradesAdded > 0) {
          await setDoc(doc(db, "petralab_users", "studente_demo"), updatePayload, { merge: true });
          if (tasksAdded > 0) setAgendaItems(updatePayload.agendaItems);
          if (gradesAdded > 0) setSubjectsMemory(updatedMemMap);
          
          let msg = "Completato!\n";
          if (tasksAdded > 0) msg += `- ${tasksAdded} compiti inseriti\n`;
          if (gradesAdded > 0) msg += `- ${gradesAdded} voti estratti e salvati`;
          alert(msg);
        } else {
          alert("Nessun compito o voto nuovo trovato (o erano già stati salvati).");
        }
        
      } else {
        alert("Errore durante la lettura: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Errore imprevisto. Riprova.");
    } finally {
      setIsUploadingNuvola(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Ascolta statistiche e chat dell'alunna
  useEffect(() => {
    const userRef = doc(db, "petralab_users", "studente_demo");
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChildStats({
          xp: data.xp || 0,
          streak: data.streak || 1,
        });
        if (data.chatHistory) {
          setChildChat(data.chatHistory);
        }
        if (data.subjectsMemory) {
          setSubjectsMemory(data.subjectsMemory);
        }
        if (data.agendaItems) {
          setAgendaItems(data.agendaItems);
        }
      }
    });

    return () => unsub();
  }, []);

  // Ascolta log degli accessi in tempo reale da Firestore
  useEffect(() => {
    try {
      const logsRef = collection(db, "petralab_access_logs");
      const q = query(logsRef, orderBy("rawTime", "desc"), limit(20));
      const unsub = onSnapshot(q, (snapshot) => {
        const logs: AccessLog[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AccessLog, "id">),
        }));
        setAccessLogs(logs);
      }, (err) => {
        console.error("Errore snapshot log accessi:", err);
      });

      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const level = getLevelInfo(childStats.xp);

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      isDarkMode ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-[#F0F2F5] text-slate-900"
    }`}>
      {/* Header WhatsApp Top */}
      <div className={`${
        isDarkMode ? "bg-[#182229] border-[#202C33]" : "bg-[#25D366]"
      } text-white px-4 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 -ml-1 rounded-full hover:bg-black/15 transition-colors text-white"
              title="Indietro"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <span>🛡️</span>
              <span>Pannello Genitore</span>
            </h1>
            <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-emerald-100"}`}>
              Sicurezza, accessi e andamento studio
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isDarkMode 
              ? "bg-[#0B141A] hover:bg-[#2A3942] text-red-400" 
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
          title="Esci dall'account"
        >
          Disconnetti
        </button>
      </div>

      {/* Pillole Sotto-Navigazione WhatsApp */}
      <div className={`flex gap-2 p-3 border-b text-xs overflow-x-auto no-scrollbar ${
        isDarkMode ? "bg-[#0B141A] border-[#202C33]" : "bg-white border-slate-100"
      }`}>
        <button
          onClick={() => setActiveSubTab("security")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "security"
              ? (isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#182229] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          🔐 Accessi
        </button>
        
        <button
          onClick={() => setActiveSubTab("agenda")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex gap-1 items-center ${
            activeSubTab === "agenda"
              ? (isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#182229] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          <span className="text-[#25D366]">✨</span> Diario Nuvola
        </button>

        <button
          onClick={() => setActiveSubTab("chats")}
          className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
            activeSubTab === "chats"
              ? (isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-[#D8FDD2] text-[#0B6E4F]")
              : (isDarkMode ? "bg-[#182229] text-gray-300" : "bg-[#F0F2F5] text-slate-600")
          }`}
        >
          💬 Chat in Diretta
        </button>
      </div>

      {/* Contenuto principale a schede */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        
        {/* ========================================================= */}
        {/* 0. SEZIONE DIARIO E NUVOLA (SCREENSHOT MAGICO)            */}
        {/* ========================================================= */}
        {activeSubTab === "agenda" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleNuvolaUpload} />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingNuvola}
                className={`flex-1 p-3 rounded-[24px] flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-[#25D366]/30 text-emerald-400 hover:from-emerald-900/60' 
                    : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-[#118B44] hover:from-emerald-100'
                }`}
              >
                <span className="text-2xl">{isUploadingNuvola ? '⏳' : '📸'}</span>
                <span className="text-xs font-bold text-center leading-tight">{isUploadingNuvola ? 'Analisi IA...' : 'Foto Registro'}</span>
                <span className="text-[9px] opacity-70 text-center leading-tight">Auto-rileva Compiti & Voti</span>
              </button>

              <button 
                onClick={() => setShowManualModal(true)}
                className={`flex-1 p-3 rounded-[24px] flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  isDarkMode 
                    ? 'bg-[#182229] border border-[#2A3942] text-gray-300 hover:bg-[#2A3942]' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl">✍️</span>
                <span className="text-xs font-bold text-center leading-tight">Scrivi a Mano</span>
                <span className="text-[9px] opacity-70 text-center leading-tight">Aggiungi senza foto</span>
              </button>
            </div>

            {/* List of current agenda items (Mock) */}
            <div className={`rounded-[24px] border overflow-hidden ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}`}>
                <h3 className="font-bold text-sm">Compiti in Sospeso</h3>
                <span className="text-xs font-semibold text-slate-400">{agendaItems.length} Attivi</span>
              </div>
              {agendaItems.length === 0 ? (
              <div className="p-8 text-center opacity-60">
                <span className="text-3xl mb-2 block">🧹</span>
                <p className="text-sm font-semibold">Tutto pulito!</p>
                <p className="text-xs">Nessun compito inserito finora.</p>
              </div>
            ) : (
              <div className={`divide-y ${isDarkMode ? 'divide-[#2A3942]' : 'divide-slate-100'}`}>
                {[...agendaItems].sort((a, b) => parseDateForSort(a.dueDate || '') - parseDateForSort(b.dueDate || '')).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3 justify-between group">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{item.type?.toLowerCase() === 'verifica' ? '🚨' : '📝'}</span>
                      <div>
                        <h4 className={`text-sm font-bold ${item.isCompleted ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>{item.subject}</h4>
                        <p className={`text-xs ${item.isCompleted ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>{item.description}</p>
                        <span className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-[#0B141A] text-emerald-400' : 'bg-slate-100 text-[#118B44]'}`}>{formatDisplayDate(item.dueDate)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(item.id)}
                      className="text-red-500 opacity-60 hover:opacity-100 hover:bg-red-500/10 p-2 rounded-full transition-all"
                      title="Elimina compito"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Registro Voti unificato nel Diario */}
            <div className={`mt-6 rounded-[24px] border overflow-hidden ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}`}>
                <h3 className="font-bold text-sm">📊 Registro Voti & Memoria Tutor</h3>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3 bg-slate-50 dark:bg-[#0B141A]">
              {tutors.map((tutor) => {
                const mem = subjectsMemory[tutor.id];
                const grades = mem?.grades || [];
                const weaknesses = mem?.weaknesses || [];
                if (grades.length === 0 && weaknesses.length === 0) return null;

                return (
                  <div key={tutor.id} className={`p-4 rounded-[24px] border ${
                    isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-md">{tutor.avatar}</span>
                        <div>
                          <h4 className="font-bold text-sm">{tutor.name}</h4>
                          <span className="text-xs text-[#25D366] font-medium">{tutor.subject}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        grades.length > 0 
                          ? (isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-emerald-100 text-[#118B44]")
                          : (isDarkMode ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-500")
                      }`}>
                        {grades.length} voti
                      </span>
                    </div>

                    {grades.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {grades.map((g: any, idx: number) => (
                            <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">
                              Voto: {g.grade} <span className="text-[10px] font-normal">({g.date || "recente"})</span>
                              {g.topic && <span className="block mt-0.5 opacity-80 font-normal italic max-w-[150px] truncate">{g.topic}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* 1. SEZIONE CHI ACCEDE & DISPOSITIVI (SICUREZZA GENITORE)  */}
        {/* ========================================================= */}
        {activeSubTab === "security" && (
          <div className="space-y-4">
            {/* Riepilogo Stato */}
            <div className={`p-4 rounded-[24px] border ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#25D366]">
                  Stato Sicurezza
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Protetto da PIN
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                L'app è protetta da PIN. Per far accedere tua figlia da un nuovo dispositivo (come il suo tablet), visita il sito e inserisci il PIN Studente: <strong className="text-[#25D366]">1430</strong>.
              </p>
            </div>

            <div className={`rounded-[24px] border overflow-hidden ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                isDarkMode ? "border-[#2A3942]" : "border-slate-100"
              }`}>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>🕒</span>
                    <span>Storico Accessi</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-[#8696A0]" : "text-slate-400"}`}>
                    Chi ha inserito il PIN recentemente
                  </p>
                </div>
              </div>

              <div className={`divide-y ${isDarkMode ? "divide-[#2A3942]" : "divide-slate-100"}`}>
                {accessLogs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    Nessun accesso recente registrato.
                  </div>
                ) : (
                  accessLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-black/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                          log.role === "student"
                            ? (isDarkMode ? "bg-purple-950/60 text-purple-300" : "bg-purple-100 text-purple-700")
                            : (isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-100 text-blue-700")
                        }`}>
                          {log.role === "student" ? "👧" : "🛡️"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm block truncate">
                            {log.role === "student" ? "Alunna (1430)" : "Genitore (admin)"}
                          </span>
                          <p className={`text-xs truncate ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                            da {log.device}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-semibold block ${
                          isDarkMode ? "text-gray-300" : "text-slate-700"
                        }`}>
                          {log.timestamp}
                        </span>
                        <span className="text-[10px] text-green-500 font-medium">
                          Riuscito ✓
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. REGISTRO VOTI & LACUNE (MEMORIA TUTOR)                 */}
        {/* ========================================================= */}
        {activeSubTab === "grades" && (
          <div className="space-y-4">
            <div className={`p-4 rounded-[24px] border ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className="font-bold text-base mb-1">
                📊 Registro Memoria Tutor
              </h3>
              <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                I voti comunicati dall'alunna e le lacune individuate dai tutor. Puoi anche importare i voti caricando uno screenshot del registro!
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#2A3942]">
                <input type="file" accept="image/*" className="hidden" ref={gradesFileInputRef} onChange={handleGradesUpload} />
                <button 
                  onClick={() => gradesFileInputRef.current?.click()}
                  disabled={isUploadingGrades}
                  className={`w-full py-3 rounded-[20px] flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm ${
                    isDarkMode 
                      ? 'bg-[#0B141A] border border-[#2A3942] text-blue-400 hover:bg-blue-950/30' 
                      : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <span className="text-xl">{isUploadingGrades ? '⏳' : '📸'}</span> 
                  {isUploadingGrades ? 'Analisi dei voti in corso...' : 'Importa Voti da Screenshot'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tutors.map((tutor) => {
                const mem = subjectsMemory[tutor.id];
                const grades = mem?.grades || [];
                const weaknesses = mem?.weaknesses || [];

                return (
                  <div key={tutor.id} className={`p-4 rounded-[24px] border ${
                    isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-md">{tutor.avatar}</span>
                        <div>
                          <h4 className="font-bold text-sm">{tutor.name}</h4>
                          <span className="text-xs text-[#25D366] font-medium">{tutor.subject}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        grades.length > 0 
                          ? (isDarkMode ? "bg-[#25D366]/20 text-[#25D366]" : "bg-emerald-100 text-[#118B44]")
                          : (isDarkMode ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-500")
                      }`}>
                        {grades.length} voti registrati
                      </span>
                    </div>

                    {/* Voti */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Voti registrati
                      </span>
                      {grades.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun voto comunicato a questo tutor.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {grades.map((g: any, idx: number) => (
                            <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">
                              Voto: {g.grade} <span className="text-[10px] font-normal">({g.date || "recente"})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lacune */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Difficoltà o Lacune segnalate
                      </span>
                      {weaknesses.length === 0 ? (
                        <span className="text-xs text-green-500 font-medium">✓ Nessuna difficoltà particolare segnalata</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {weaknesses.map((w: string, idx: number) => (
                            <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              ⚠️ {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. CRONOLOGIA CONVERSAZIONI IN DIRETTA                    */}
        {/* ========================================================= */}
        {activeSubTab === "chats" && (
          <div className="space-y-4">
            <div className={`p-4 rounded-[24px] border ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>💬</span>
                <span>Cosa chiede all&apos;IA tua figlia</span>
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Leggi le domande recenti per verificare l&apos;autonomia nello studio e capire dove ha bisogno di aiuto.
              </p>
            </div>

            <div className={`p-4 rounded-[24px] border max-h-[60vh] overflow-y-auto space-y-3 ${
              isDarkMode ? "bg-[#0B141A] border-[#2A3942]" : "bg-slate-100 border-slate-200"
            }`}>
              {childChat.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  Nessuna conversazione recente registrata.
                </div>
              ) : (
                childChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 mb-0.5 px-1">
                      {msg.role === "user" ? "👧 Tua Figlia" : "🤖 Tutor AI"}
                    </span>
                    <div className={`max-w-[85%] p-3 rounded-[24px] text-sm shadow-xs ${
                      msg.role === "user"
                        ? (isDarkMode ? "bg-[#005C4B] text-white rounded-tr-xs" : "bg-[#DCF8C6] text-slate-900 rounded-tr-xs")
                        : (isDarkMode ? "bg-[#182229] text-gray-200 rounded-tl-xs" : "bg-white text-slate-900 rounded-tl-xs border border-slate-200")
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. GESTIONE TUTOR AI                                      */}
        {/* ========================================================= */}
        {activeSubTab === "tutors" && (
          <div className="space-y-4">
            <TutorManager isDarkMode={isDarkMode} />
          </div>
        )}


      {/* Modale Inserimento Manuale */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? "bg-[#0B141A] border border-[#2A3942]" : "bg-white"}`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2A3942]" : "border-slate-100"}`}>
              <h3 className="font-bold text-lg">Inserimento Manuale</h3>
              <button onClick={() => setShowManualModal(false)} className={`w-8 h-8 rounded-full ${isDarkMode ? "bg-[#182229] text-gray-400" : "bg-slate-100 text-slate-500"}`}>✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex bg-slate-100 dark:bg-[#182229] p-1 rounded-[20px]">
                <button onClick={() => setManualType("task")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${manualType === 'task' ? 'bg-white dark:bg-[#0B141A] shadow-sm text-[#25D366]' : 'text-gray-500'}`}>📝 Compito/Verifica</button>
                <button onClick={() => setManualType("grade")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${manualType === 'grade' ? 'bg-white dark:bg-[#0B141A] shadow-sm text-blue-500' : 'text-gray-500'}`}>📊 Voto Preso</button>
              </div>
              {manualType === "task" ? (
                <>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Tipo</label><select value={manualFormData.type} onChange={(e) => setManualFormData({...manualFormData, type: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`}><option>Compito</option><option>Verifica</option></select></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Materia</label><input type="text" value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Descrizione</label><textarea value={manualFormData.description} onChange={(e) => setManualFormData({...manualFormData, description: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Data (es. Giovedì 10 Ottobre)</label><input type="date" value={manualFormData.dueDate} onChange={(e) => setManualFormData({...manualFormData, dueDate: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`} /></div>
                </>
              ) : (
                <>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Tutor/Materia</label><select value={manualFormData.subject} onChange={(e) => setManualFormData({...manualFormData, subject: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`}><option value="">Seleziona...</option>{tutors.map(t => <option key={t.id} value={t.id}>{t.subject}</option>)}</select></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Voto</label><input type="text" value={manualFormData.grade} onChange={(e) => setManualFormData({...manualFormData, grade: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`} /></div>
                  <div><label className="block text-xs font-bold mb-1 opacity-70">Argomento</label><input type="text" value={manualFormData.topic} onChange={(e) => setManualFormData({...manualFormData, topic: e.target.value})} className={`w-full p-2.5 rounded-[20px] border ${isDarkMode ? 'bg-[#182229] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`} /></div>
                </>
              )}
              <button onClick={handleManualSubmit} className="w-full py-3 mt-2 rounded-[20px] bg-[#25D366] text-white font-bold text-sm">Salva</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
