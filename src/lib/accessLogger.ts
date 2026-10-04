import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export type AccessLog = {
  id: string;
  who: string;
  role: "student" | "admin";
  device: string;
  deviceType: "mobile" | "desktop";
  timestamp: string;
  rawTime: number;
  isCurrent?: boolean;
};

// Determina nome descrittivo del dispositivo da UserAgent
export function parseDeviceInfo(): { device: string; deviceType: "mobile" | "desktop" } {
  if (typeof window === "undefined") {
    return { device: "Dispositivo Sconosciuto", deviceType: "desktop" };
  }

  const ua = navigator.userAgent;
  let device = "Computer Desktop";
  let deviceType: "mobile" | "desktop" = "desktop";

  if (/iPhone/i.test(ua)) {
    device = "Apple iPhone (Safari)";
    deviceType = "mobile";
  } else if (/iPad/i.test(ua)) {
    device = "Apple iPad";
    deviceType = "mobile";
  } else if (/Android/i.test(ua)) {
    device = "Smartphone Android (Chrome)";
    deviceType = "mobile";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = "MacBook / iMac (macOS)";
    deviceType = "desktop";
  } else if (/Windows/i.test(ua)) {
    device = "PC Windows";
    deviceType = "desktop";
  }

  return { device, deviceType };
}

// Registra un nuovo accesso su Firestore
export async function recordAccess(who: string, role: "student" | "admin") {
  if (typeof window === "undefined") return;

  try {
    const { device, deviceType } = parseDeviceInfo();
    const now = new Date();
    const formatted = now.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const logEntry: Omit<AccessLog, "id"> = {
      who,
      role,
      device,
      deviceType,
      timestamp: formatted,
      rawTime: Date.now(),
    };

    // Salva nel cloud su Firestore per sincronizzazione in tempo reale tra tutti i dispositivi
    const logsRef = collection(db, "petralab_access_logs");
    await addDoc(logsRef, logEntry);

    // Salva anche una copia locale
    localStorage.setItem("petralab_last_access", JSON.stringify(logEntry));
  } catch (error) {
    console.error("Errore salvataggio log di accesso:", error);
  }
}
