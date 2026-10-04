"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { loginAsStudent, loginWithBiometrics, loginAsAdmin, isBiometricsAvailable } = useAuth();
  
  // Tab attiva: 'student' (PIN/Biometria) o 'admin' (Credenziali)
  const [mode, setMode] = useState<"student" | "admin">("student");

  // Stato PIN studente
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Stato credenziali genitore/admin
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState(false);

  // Gestione tastierino numerico PIN
  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setPinError(false);
      if (nextPin.length === 4) {
        setTimeout(() => {
          const success = loginAsStudent(nextPin);
          if (!success) {
            setPinError(true);
            setPin("");
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAsAdmin(adminUser, adminPass);
    if (!success) {
      setAdminError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20">
        
        {/* Titolo e Icona */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner mb-3">
            🦉
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">PetraLAB</h1>
          <p className="text-sm text-gray-500 font-medium">Tutor Socratico & Studio Intelligente</p>
        </div>

        {/* Scelta Ruolo */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-6">
          <button
            onClick={() => setMode("student")}
            className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === "student"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            👧 Studente
          </button>
          <button
            onClick={() => setMode("admin")}
            className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === "admin"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            🛡️ Genitore / Admin
          </button>
        </div>

        {/* Modalità Studente: PIN & Biometria */}
        {mode === "student" && (
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Inserisci il tuo <span className="font-semibold text-blue-600">PIN a 4 cifre</span> o usa l'impronta:
            </p>

            {/* Indicatori PIN (pallini) */}
            <div className="flex gap-4 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    pinError
                      ? "border-red-500 bg-red-400 animate-shake"
                      : pin.length > index
                      ? "border-blue-600 bg-blue-600 scale-110"
                      : "border-gray-300 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-red-600 font-semibold mb-3">
                PIN errato! Riprova (PIN demo: 1234)
              </p>
            )}

            {/* Tastierino Numerico */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num)}
                  className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-xl text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition-all shadow-sm mx-auto"
                >
                  {num}
                </button>
              ))}
              
              {/* Bottone Biometria / Impronta Digitale */}
              <button
                onClick={() => loginWithBiometrics()}
                className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all shadow-sm flex items-center justify-center mx-auto"
                title="Accedi con Impronta / Face ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a1.5 1.5 0 0 1 1.5 1.5v3.75m-3 0V12a1.5 1.5 0 0 1 1.5-1.5m0 7.5h.008v.008H12v-.008Z" />
                </svg>
              </button>

              <button
                onClick={() => handlePinInput("0")}
                className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-xl text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition-all shadow-sm mx-auto"
              >
                0
              </button>

              {/* Tasto Cancella */}
              <button
                onClick={handleBackspace}
                className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 active:scale-95 transition-all shadow-sm flex items-center justify-center mx-auto"
                title="Cancella"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33Z" />
                </svg>
              </button>
            </div>
            
            <p className="text-xs text-gray-400 text-center">
              Tocca l'impronta per sbloccare con Touch ID o Face ID
            </p>
          </div>
        )}

        {/* Modalità Genitore / Admin */}
        {mode === "admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Nome Utente / Email
              </label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800"
                required
              />
            </div>

            {adminError && (
              <p className="text-xs text-red-600 font-semibold">
                Credenziali non valide! (Demo: user <b>admin</b>, password <b>admin123</b>)
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Accedi al Pannello di Controllo
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
