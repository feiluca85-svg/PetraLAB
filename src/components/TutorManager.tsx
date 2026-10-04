"use client";

import { useState } from "react";
import { Tutor } from "@/lib/tutors";
import { useTutors } from "@/hooks/useTutors";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

export default function TutorManager() {
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
      avatar: "🎓",
      gender: "male",
      voiceLang: "it-IT",
      prompt: "",
      greeting: "Ciao! Come posso aiutarti oggi?"
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.subject) {
      alert("Compila i campi obbligatori (Nome, Materia)");
      return;
    }

    try {
      await setDoc(doc(db, "petralab_tutors", formData.id), formData);
      setEditingTutor(null);
      setIsCreating(false);
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo tutor?")) {
      try {
        await deleteDoc(doc(db, "petralab_tutors", id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Caricamento tutor...</div>;
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            👨‍🏫 Gestione Tutor (AI)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Crea nuovi tutor, personalizza le materie, il prompt socratico e le voci.
          </p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          + Nuovo Tutor
        </button>
      </div>

      {(editingTutor || isCreating) ? (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">{isCreating ? "Crea Nuovo Tutor" : `Modifica ${editingTutor?.name}`}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Tutor</label>
              <input 
                type="text" 
                value={formData.name || ""} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Materia (es. Storia 🏛️)</label>
              <input 
                type="text" 
                value={formData.subject || ""} 
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Avatar (Emoji)</label>
              <input 
                type="text" 
                value={formData.avatar || ""} 
                onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Genere Voce</label>
              <select 
                value={formData.gender || "male"} 
                onChange={(e) => setFormData({...formData, gender: e.target.value as "male"|"female"})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Maschile</option>
                <option value="female">Femminile</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Lingua Voce (es. it-IT, en-GB)</label>
              <input 
                type="text" 
                value={formData.voiceLang || ""} 
                onChange={(e) => setFormData({...formData, voiceLang: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Messaggio di Benvenuto (Greeting)</label>
            <textarea 
              value={formData.greeting || ""} 
              onChange={(e) => setFormData({...formData, greeting: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">System Prompt (Istruzioni AI per questo tutor)</label>
            <textarea 
              value={formData.prompt || ""} 
              onChange={(e) => setFormData({...formData, prompt: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => { setEditingTutor(null); setIsCreating(false); }}
              className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold text-sm transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Salva Tutor
            </button>
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-gray-100">
        {tutors.map((tutor) => (
          <div key={tutor.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                {tutor.avatar}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">{tutor.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tutor.subject} • {tutor.gender === 'male' ? '👨' : '👩'} {tutor.voiceLang}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleEdit(tutor)}
                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Modifica
              </button>
              <button 
                onClick={() => handleDelete(tutor.id)}
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
