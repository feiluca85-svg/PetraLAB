"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function AdminDashboard() {
  const { role, logout, devices, removeDevice } = useAuth();
  const [childStats, setChildStats] = useState({ xp: 0, streak: 0 });

  // Ascolta in tempo reale le statistiche della figlia dal database!
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "petralab_users", "studente_demo"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setChildStats({ xp: data.xp || 0, streak: data.streak || 1 });
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

      </main>
    </div>
  );
}
