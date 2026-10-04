"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getLevelInfo } from "@/lib/levels";
import { TUTORS, SubjectMemory } from "@/lib/tutors";

import TutorManager from "@/components/TutorManager";
import { useTutors } from "@/hooks/useTutors";

export default function AdminDashboard() {
  const { role, logout, devices, removeDevice } = useAuth();
  const [childStats, setChildStats] = useState({ xp: 0, streak: 0 });
  const [childChat, setChildChat] = useState<{role: string, text: string}[]>([]);
  const [subjectsMemory, setSubjectsMemory] = useState<Record<string, SubjectMemory>>({});
  
  const { tutors } = useTutors();

  // Ascolta in tempo reale le statistiche della figlia dal database!
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "petralab_users", "studente_demo"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setChildStats({ xp: data.xp || 0, streak: data.streak || 1 });
        setChildChat(data.chatHistory || []);
        if (data.subjectsMemory) {
          setSubjectsMemory(data.subjectsMemory);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">Pannello Amministratore</h1>
              <p className="text-xs text-gray-500">Gestione Genitore • PetraLAB</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
            >
              Apri Chat Tutor 🦉
            </Link>
            <button
              onClick={logout}
              className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        {/* Sezione Dispositivi Collegati */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📱 Dispositivi Autorizzati
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  {devices.length} Attivi
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Monitora tutti gli smartphone e computer che hanno accesso all'app. Riconosci subito gli accessi non autorizzati.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {devices.map((device) => (
              <div key={device.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                    {device.type === "mobile" ? "📱" : "💻"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-base">{device.name}</h3>
                      {device.isCurrent && (
                        <span className="text-[11px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                          Dispositivo Attuale
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ultima attività: <span className="font-medium text-gray-700">{device.lastActive}</span>
                    </p>
                  </div>
                </div>

                {!device.isCurrent && (
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Revoca Accesso 🚫
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Sezione Statistiche Studio Figlia */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
            <span className="text-3xl">⭐</span>
            <h3 className="text-gray-500 text-xs font-bold uppercase mt-2">Punti XP Guadagnati</h3>
            <p className="text-4xl font-black text-gray-900 mt-1">{childStats.xp} <span className="text-xl text-gray-400">XP</span></p>
            <div className="mt-2 mb-1 bg-gray-100 rounded-lg p-2 border border-gray-200">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1">
                <span>{getLevelInfo(childStats.xp).title}</span>
                {getLevelInfo(childStats.xp).nextLevelXP && (
                  <span className="text-gray-400 font-medium">Next: {getLevelInfo(childStats.xp).nextLevelXP}</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${getLevelInfo(childStats.xp).progress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              In diretta dal server
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-3xl">🔥</span>
            <h3 className="text-gray-500 text-xs font-bold uppercase mt-2">Costanza di Studio</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">{childStats.streak} Giorni</p>
            <p className="text-xs text-blue-600 font-semibold mt-2">Streak attiva consecutiva</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-3xl">📚</span>
            <h3 className="text-gray-500 text-xs font-bold uppercase mt-2">Materia Principale</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">Matematica</p>
            <p className="text-xs text-gray-400 font-medium mt-2">Addizioni in colonna ed equazioni</p>
          </div>
        </section>
        
        {/* Gestione Tutor AI (CRUD) */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mt-8">
          <TutorManager />
        </div>

        {/* Sezione Registro Voti & Lacune per Materia */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📊 Registro Voti & Lacune per Materia
                <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  Memoria Tutor AI
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                I tutor registrano proattivamente i voti comunicati dall&apos;alunna e individuano le lacune su cui lavorare.
              </p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tutors.map((tutor) => {
              const mem = subjectsMemory[tutor.id];
              const grades = mem?.grades || [];
              const weaknesses = mem?.weaknesses || [];

              return (
                <div key={tutor.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl bg-white p-2 rounded-xl shadow-xs">{tutor.avatar}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">{tutor.name}</h3>
                        <p className="text-xs text-blue-600 font-medium">{tutor.subject}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Voti Raccolti</span>
                        {grades.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Nessun voto registrato</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {grades.map((g, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded shadow-xs" title={`${g.topic || 'Verifica'} - ${g.date}`}>
                                {g.grade} <span className="text-[10px] font-normal text-blue-600">({g.date})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Punti Deboli / Lacune</span>
                        {weaknesses.length === 0 ? (
                          <span className="text-xs text-green-600 font-medium">Nessuna difficoltà segnalata</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {weaknesses.map((w, idx) => (
                              <span key={idx} className="bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                                ⚠️ {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sezione Cronologia Chat in Diretta */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                💬 Cronologia Conversazioni
                <span className="relative flex h-3 w-3 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Leggi in tempo reale le domande che sta facendo all'IA per capire le sue difficoltà.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 max-h-96 overflow-y-auto flex flex-col gap-4">
            {childChat.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessuna conversazione recente.</p>
            ) : (
              childChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase tracking-wider">
                    {msg.role === 'user' ? 'Tua Figlia' : 'Athena (Tutor)'}
                  </span>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
