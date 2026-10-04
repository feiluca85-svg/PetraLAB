import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, setDoc, doc, getDocs } from "firebase/firestore";
import { Tutor, TUTORS as DEFAULT_TUTORS } from "@/lib/tutors";

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tutorsRef = collection(db, "petralab_tutors");
    
    // Assicura che i tutor di default esistano nel db alla prima apertura
    const initDefaultTutors = async () => {
      const snap = await getDocs(tutorsRef);
      if (snap.empty) {
        for (const t of DEFAULT_TUTORS) {
          await setDoc(doc(tutorsRef, t.id), t);
        }
      }
    };
    initDefaultTutors();

    const unsub = onSnapshot(tutorsRef, (snapshot) => {
      const loadedTutors = snapshot.docs.map(doc => doc.data() as Tutor);
      setTutors(loadedTutors);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { tutors, loading };
}
