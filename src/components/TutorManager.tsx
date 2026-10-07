"use client";

import { useState, useEffect } from "react";
import { Tutor } from "@/lib/tutors";
import { useTutors } from "@/hooks/useTutors";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const EMOJI_CATEGORIES = [
  {
    label: "Persone e Tutor",
    emojis: ["👨‍🏫", "👩‍🏫", "👨‍🔬", "👩‍🔬", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "👨‍💼", "👩‍💼", "🧙‍♂️", "🧙‍♀️", "🤓", "🧐", "😎", "🧠"]
  },
  {
    label: "Lingue e Bandiere",
    emojis: ["🇮🇹", "🇬🇧", "🇺🇸", "🇫🇷", "🇪🇸", "🇩🇪", "🇨🇳", "🇯🇵", "🇷🇺", "🇧🇷", "🌐", "💬", "🗣️"]
  },
  {
    label: "Studio e Materie",
    emojis: ["📚", "📖", "✏️", "📐", "📏", "🔬", "🔭", "⚗️", "🧬", "🌍", "🗺️", "💻", "⌨️", "🎨", "🎭", "🎵", "⚽", "🏀", "🏆", "🧩"]
  },
  {
    label: "Animali Simpatici",
    emojis: ["🦉", "🦊", "🦁", "🐶", "🐱", "🐼", "🐨", "🐸", "🐒", "🦄", "🐙", "🦖", "🐢", "🐝", "🦋"]
  },
  {
    label: "Fantasia e Natura",
    emojis: ["🤖", "👾", "👽", "👻", "🌟", "🔥", "💧", "⚡", "❄️", "🍀", "🌈", "☀️", "🌙"]
  }
];

export default function TutorManager({ 
  isDarkMode = false, 
  onClose 
}: { 
  isDarkMode?: boolean; 
  onClose?: () => void;
}) {
  const { tutors, loading } = useTutors();
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<Partial<Tutor>>({});
  

  const handleEdit = (tutor: Tutor) => {
    setEditingTutor(tutor);
    setFormData(tutor);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingTutor(null);
    setFormData({
      id: `tutor_${Date.now()}`,
      name: "",
      subject: "",
      avatar: "🦉",
      gender: "male",
      voiceLang: "it-IT",
      prompt: "Sei un tutor socratico amichevole per ragazzi delle scuole medie. Non dare mai la soluzione diretta, ma fai domande mirate per sbloccare il ragionamento.",
      greeting: "Ciao! Come posso aiutarti oggi?"
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name?.trim() || !formData.subject?.trim()) {
      alert("Compila i campi obbligatori (Nome e Materia)");
      return;
    }

    try {
      await setDoc(doc(db, "petralab_tutors", formData.id), {
        ...formData,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        avatar: formData.avatar || "🦉",
        gender: formData.gender || "male",
        voiceLang: formData.voiceLang || "it-IT",
        voiceURI: formData.voiceURI,
        greeting: formData.greeting || "Ciao! Come posso aiutarti oggi?",
        prompt: formData.prompt || "Sei un tutor socratico amichevole per ragazzi delle scuole medie."
      });
      setEditingTutor(null);
      setIsCreating(false);
      alert("Tutor salvato con successo! 🎉");
    } catch (e: any) {
      console.error(e);
      alert(`Errore durante il salvataggio: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo tutor? L'operazione non può essere annullata.")) {
      try {
        await deleteDoc(doc(db, "petralab_tutors", id));
        alert("Tutor eliminato!");
      } catch (e: any) {
        console.error(e);
        alert(`Errore durante l'eliminazione: ${e.message}`);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0B141A] text-[#E9EDEF]' : 'bg-[#F0F2F5] text-slate-800'}`}>
      {/* Header Stile WhatsApp */}
      <div className={`${isDarkMode ? 'bg-[#182229] border-[#202C33]' : 'bg-[#25D366]'} text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 -ml-1 rounded-full hover:bg-black/15 transition-colors text-white"
              title="Chiudi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
              <span>👨‍🏫</span>
              <span>Tutor & Materie</span>
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-emerald-100'}`}>
              Personalizza i docenti IA di PetraLAB
            </p>
          </div>
        </div>

        {!isCreating && !editingTutor && (
          <button 
            onClick={handleCreate}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 ${
              isDarkMode 
                ? 'bg-[#25D366] text-[#111B21] hover:bg-[#02be96]' 
                : 'bg-white text-[#25D366] hover:bg-emerald-50'
            }`}
          >
            <span>+</span>
            <span>Nuovo Tutor</span>
          </button>
        )}
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${
              isDarkMode ? 'border-[#25D366]' : 'border-[#25D366]'
            }`} />
            <p className={`text-sm ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>
              Caricamento tutor in corso...
            </p>
          </div>
        ) : (editingTutor || isCreating) ? (
          /* ======================================================= */
          /* FORM DI CREAZIONE / MODIFICA TUTOR (Moderno WhatsApp)   */
          /* ======================================================= */
          <div className={`rounded-3xl p-5 shadow-sm border transition-all ${
            isDarkMode 
              ? 'bg-[#182229] border-[#2A3942]' 
              : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-500/20 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{formData.avatar || "🦉"}</span>
                <h3 className="font-bold text-base">
                  {isCreating ? "Crea Nuovo Tutor" : `Modifica ${editingTutor?.name}`}
                </h3>
              </div>
              <button 
                onClick={() => { setEditingTutor(null); setIsCreating(false); }}
                className={`p-1.5 rounded-full text-sm font-semibold ${
                  isDarkMode ? 'hover:bg-[#0B141A] text-gray-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Selettore Avatar Emoji */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                }`}>
                  Scegli Avatar (Emoji)
                </label>
                <div className={`border rounded-[20px] p-2 h-48 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A] border-[#2A3942]' : 'bg-slate-50 border-slate-200'}`}>
                  {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.label} className="mb-3">
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 sticky top-0 py-1 z-10 ${isDarkMode ? 'bg-[#0B141A] text-gray-400' : 'bg-slate-50 text-slate-500'}`}>
                        {cat.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cat.emojis.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormData({ ...formData, avatar: emoji })}
                            className={`w-9 h-9 flex items-center justify-center text-xl rounded-[16px] transition-transform ${
                              formData.avatar === emoji 
                                ? (isDarkMode ? 'bg-[#25D366]/40 ring-2 ring-[#25D366] scale-110 z-10' : 'bg-emerald-200 ring-2 ring-[#25D366] scale-110 z-10')
                                : (isDarkMode ? 'hover:bg-[#2A3942]' : 'hover:bg-slate-200')
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Oppure incollane una tu:</span>
                  <input 
                    type="text" 
                    value={formData.avatar || "🦉"}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className={`w-12 text-center rounded border px-1 py-0.5 outline-none ${isDarkMode ? 'bg-[#0B141A] border-[#2A3942] text-white' : 'bg-white border-slate-200'}`} 
                  />
                </div>
              </div>

              {/* Nome & Materia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                  }`}>
                    Nome del Tutor *
                  </label>
                  <input 
                    type="text" 
                    placeholder="es. Archimede, Arthur, Dante..."
                    value={formData.name || ""} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full rounded-[20px] px-3.5 py-2.5 text-sm border outline-none font-semibold transition-colors ${
                      isDarkMode 
                        ? 'bg-[#0B141A] border-[#2A3942] text-white focus:border-[#25D366]' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#25D366]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                  }`}>
                    Materia di insegnamento *
                  </label>
                  <input 
                    type="text" 
                    placeholder="es. Matematica 📐, Storia 🏛️..."
                    value={formData.subject || ""} 
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className={`w-full rounded-[20px] px-3.5 py-2.5 text-sm border outline-none font-semibold transition-colors ${
                      isDarkMode 
                        ? 'bg-[#0B141A] border-[#2A3942] text-white focus:border-[#25D366]' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#25D366]'
                    }`}
                  />
                </div>
              </div>

              {/* Voce & Genere */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                  }`}>
                    Timbro Voce
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, gender: "male"})}
                      className={`py-2 px-3 rounded-[20px] text-sm font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formData.gender === "male"
                          ? (isDarkMode ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-emerald-50 border-[#25D366] text-[#118B44]')
                          : (isDarkMode ? 'bg-[#0B141A] border-[#2A3942] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                      }`}
                    >
                      <span>👨</span>
                      <span>Maschile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, gender: "female"})}
                      className={`py-2 px-3 rounded-[20px] text-sm font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formData.gender === "female"
                          ? (isDarkMode ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-emerald-50 border-[#25D366] text-[#118B44]')
                          : (isDarkMode ? 'bg-[#0B141A] border-[#2A3942] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                      }`}
                    >
                      <span>👩</span>
                      <span>Femminile</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>
                    Lingua del Tutor (TTS)
                  </label>
                  <select 
                    value={formData.voiceLang || "it-IT"} 
                    onChange={(e) => setFormData({...formData, voiceLang: e.target.value, voiceURI: undefined})}
                    className={`w-full rounded-[20px] px-3 py-2 text-[13px] border outline-none font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-[#182229] border-[#2A3942] text-white focus:border-[#25D366]' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#25D366]'
                    }`}
                  >
                    <option value="it-IT">🇮🇹 Italiano</option>
                    <option value="en-US">🇬🇧 Inglese (Americano)</option>
                    <option value="en-GB">🇬🇧 Inglese (Britannico)</option>
                    <option value="fr-FR">🇫🇷 Francese</option>
                    <option value="es-ES">🇪🇸 Spagnolo</option>
                    <option value="de-DE">🇩🇪 Tedesco</option>
                  </select>
                  <p className={`mt-1 text-[10px] leading-tight ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                    Scegli la lingua per la pronuncia corretta.
                  </p>
                </div>
              </div>

              {/* Messaggio di Benvenuto */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                }`}>
                  Messaggio di Benvenuto (Primo messaggio in chat)
                </label>
                <textarea 
                  rows={2}
                  value={formData.greeting || ""} 
                  onChange={(e) => setFormData({...formData, greeting: e.target.value})}
                  placeholder="Cosa dirà il tutor appena l'alunna apre la chat..."
                  className={`w-full rounded-[20px] px-3.5 py-2.5 text-sm border outline-none transition-colors resize-none ${
                    isDarkMode 
                      ? 'bg-[#0B141A] border-[#2A3942] text-white focus:border-[#25D366]' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#25D366]'
                  }`}
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'
                }`}>
                  Istruzioni IA (Prompt Socratico Personalizzato)
                </label>
                <textarea 
                  rows={4}
                  value={formData.prompt || ""} 
                  onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                  placeholder="Definisci la personalità e il metodo di insegnamento..."
                  className={`w-full rounded-[20px] px-3.5 py-2.5 text-sm border outline-none transition-colors resize-none ${
                    isDarkMode 
                      ? 'bg-[#0B141A] border-[#2A3942] text-white focus:border-[#25D366]' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#25D366]'
                  }`}
                />
              </div>

              {/* Pulsanti Azione */}
              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => { setEditingTutor(null); setIsCreating(false); }}
                  className={`flex-1 py-3 px-4 rounded-[20px] font-bold text-sm transition-colors ${
                    isDarkMode ? 'bg-[#0B141A] hover:bg-[#2A3942] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Annulla
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  className={`flex-1 py-3 px-4 rounded-[20px] font-bold text-sm shadow-md transition-all active:scale-95 text-white ${
                    isDarkMode ? 'bg-[#25D366] hover:bg-[#02be96]' : 'bg-[#25D366] hover:bg-[#006e5a]'
                  }`}
                >
                  💾 Salva Tutor
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================= */
          /* LISTA TUTOR ESISTENTI (Card Moderne WhatsApp)            */
          /* ======================================================= */
          <div className="space-y-3">
            {tutors.map((tutor) => (
              <div 
                key={tutor.id} 
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isDarkMode 
                    ? 'bg-[#182229] border-[#2A3942] hover:border-[#25D366]/40' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-3xl shadow-xs shrink-0 ${
                    isDarkMode ? 'bg-gradient-to-br from-[#182229] to-[#202C33] shadow-inner' : 'bg-gradient-to-br from-emerald-50 to-teal-100/50 shadow-inner'
                  }`}>
                    <span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[16px] leading-tight truncate">
                        {tutor.name}
                      </h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isDarkMode ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-emerald-50 text-[#118B44] border border-emerald-200'
                      }`}>
                        {tutor.subject}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 truncate ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>
                      {tutor.gender === 'male' ? '👨 Voce Maschile' : '👩 Voce Femminile'} • {tutor.voiceLang || 'it-IT'}
                    </p>
                    <p className={`text-[11px] mt-0.5 italic truncate ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                      &ldquo;{tutor.greeting}&rdquo;
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => handleEdit(tutor)}
                    className={`p-2 rounded-[20px] text-xs font-bold transition-all ${
                      isDarkMode 
                        ? 'bg-[#0B141A] hover:bg-[#2A3942] text-[#25D366]' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-[#25D366]'
                    }`}
                    title="Modifica tutor"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(tutor.id)}
                    className={`p-2 rounded-[20px] text-xs font-bold transition-all ${
                      isDarkMode 
                        ? 'bg-[#0B141A] hover:bg-red-950/40 text-red-400' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                    title="Elimina tutor"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
