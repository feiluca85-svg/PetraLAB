import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Tutor } from "@/lib/tutors";

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tutorsRef = collection(db, "petralab_tutors");

    // Ascolta in tempo reale i tutor salvati su Firestore (nessuna sovrascrittura automatica)
    const unsub = onSnapshot(tutorsRef, (snapshot) => {
      const loadedTutors = snapshot.docs.map(doc => doc.data() as Tutor);
      setTutors(loadedTutors);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { tutors, loading };
}
