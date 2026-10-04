"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export function useGamification() {
  const [stats, setStats] = useState({ xp: 0, streak: 1 });
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Prova prima a recuperare i dati locali
    const localStats = localStorage.getItem('petralab_stats');
    if (localStats) {
      setStats(JSON.parse(localStats));
    }

    // 2. Prova in background ad allineare Firebase (se fallisce non blocca l'app)
    const initDB = async () => {
      try {
        const userRef = doc(db, 'petralab_users', 'studente_demo');
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setStats({ xp: data.xp || 0, streak: data.streak || 1 });
          localStorage.setItem('petralab_stats', JSON.stringify({ xp: data.xp || 0, streak: data.streak || 1 }));
        } else {
          await setDoc(userRef, { xp: stats.xp, streak: stats.streak, lastActive: new Date().toISOString() });
        }
      } catch (err) {
        console.error("Errore Firestore, uso localStorage:", err);
        setDbError("Nessuna connessione con Firebase (forse mancano i permessi). Ho attivato il salvataggio locale: non perderai nessun XP! 💾");
      }
    };
    
    initDB();
  }, []);

  const awardXP = async (points: number) => {
    const newStats = { xp: stats.xp + points, streak: stats.streak };
    setStats(newStats);
    
    // Salva sempre in locale così non si perdono
    localStorage.setItem('petralab_stats', JSON.stringify(newStats));
    
    // Prova a salvare anche in cloud
    try {
      const userRef = doc(db, 'petralab_users', 'studente_demo');
      await updateDoc(userRef, { xp: increment(points) });
    } catch (err) {
      // Silenzioso, abbiamo già il fallback locale e l'avviso
    }
  };

  return { stats, awardXP, dbError };
}
