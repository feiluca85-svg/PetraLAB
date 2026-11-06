"use client";

import { useState, useEffect } from "react";
import {
  requestNotificationPermission,
  getNotificationPermission,
  updateAppBadge,
  sendTutorNotification,
} from "@/lib/notifications";
import { Tutor } from "@/lib/tutors";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  tutors: Tutor[];
  pendingCount?: number;
}

export default function NotificationModal({
  isOpen,
  onClose,
  isDarkMode = false,
  tutors,
  pendingCount = 0,
}: NotificationModalProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isTesting, setIsTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequest = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      await updateAppBadge(pendingCount || 1);
      // Invia subito notifica di benvenuto
      const tutor = tutors[0] || { name: "Archimede" };
      await sendTutorNotification({
        tutorName: tutor.name,
        title: "Notifiche e Badge Attivati! ⚡",
        body: "Eureka! Da oggi ti ricorderò verifiche e compiti anche a schermo spento con il numerino rosso sull'icona!",
        url: "/",
      });
      setTestSent(true);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTesting(true);
    try {
      const tutor = tutors.find((t) => t.id === "matematica") || tutors[0] || { name: "Archimede" };
      await updateAppBadge(pendingCount > 0 ? pendingCount : 1);
      const sent = await sendTutorNotification({
        tutorName: tutor.name,
        title: "Promemoria Allenamento Verifica 🎯",
        body: "Ciao! Ricordati di fare 5 minuti di allenamento oggi per la verifica. Sei prontissima!",
        url: "/",
      });
      setTestSent(sent);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border flex flex-col gap-4 animate-in zoom-in-95 duration-150 ${
          isDarkMode ? "bg-[#111B21] border-[#222E35] text-white" : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🔔</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Notifiche Tutor & Pallino Rosso
              </h3>
              <p className={`text-xs ${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}`}>
                Avvisi a schermo spento e badge sull'icona
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Spiegazione delle funzionalità */}
        <div className="flex flex-col gap-3 text-xs leading-relaxed">
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}
          >
            <span className="text-2xl shrink-0">🔴</span>
            <div>
              <h4 className="font-bold text-sm mb-0.5">Numerino / Pallino rosso sull'icona</h4>
              <p className="opacity-90">
                Quando ci sono compiti da fare o verifiche imminenti, sull'icona dell'app nello smartphone compare il <strong>numerino rosso con il conteggio</strong> ({pendingCount} attualmente).
              </p>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDarkMode ? "bg-[#182229] border-[#2A3942]" : "bg-blue-50 border-blue-200 text-blue-950"
            }`}
          >
            <span className="text-2xl shrink-0">💬</span>
            <div>
              <h4 className="font-bold text-sm mb-0.5">Messaggi del Tutor a schermo spento</h4>
              <p className="opacity-90">
                Il tutor di riferimento invia notifiche di promemoria e incoraggiamento per l'allenamento progressivo prima della verifica, anche se tua figlia non ha ancora aperto l'app.
              </p>
            </div>
          </div>

          {/* Istruzione per iPhone / iPad */}
          <div
            className={`p-3 rounded-xl border text-[11px] ${
              isDarkMode ? "bg-[#0E161B] border-[#202C33] text-gray-300" : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <span className="font-bold">📱 Come attivarlo su iPhone / iPad (iOS 16.4+):</span>
            <p className="mt-1">
              Apri PetraLAB su <strong>Safari</strong>, tocca il tasto Condividi (icona quadrata con freccia in alto ⬆️) e seleziona <strong>"Aggiungi alla schermata Home"</strong>. Dalla schermata Home il numerino rosso e le notifiche funzionano nativamente!
            </p>
          </div>
        </div>

        {/* Stato e Azioni */}
        <div className="pt-2 border-t border-inherit flex flex-col gap-2">
          {permission === "granted" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span>✓ Notifiche e Badge Attivi</span>
                <span className="text-base">✨</span>
              </div>

              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isTesting}
                className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-[#111B21] font-bold text-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>🚀</span>
                <span>{isTesting ? "Invio notifica in corso..." : "Invia notifica di prova del tutor"}</span>
              </button>

              {testSent && (
                <p className="text-center text-[11px] text-emerald-400 font-bold animate-in fade-in">
                  Notifica inviata! Controlla il centro notifiche e l'icona dell'app.
                </p>
              )}
            </div>
          ) : permission === "denied" ? (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs text-center font-medium">
              Notifiche bloccate nelle impostazioni del browser. Per attivarle, tocca l'icona del lucchetto o impostazioni sito e consenti le notifiche.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequest}
              className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-[#111B21] font-bold text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <span>🔔</span>
              <span>Attiva Notifiche & Pallino Rosso</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isDarkMode ? "hover:bg-[#182229] text-gray-400" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
