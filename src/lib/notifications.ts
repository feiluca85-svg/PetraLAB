// Gestione Notifiche Push, Notifiche Locali Tutor e App Badge (Pallino / Numerino Rosso)

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Errore richiesta permessi notifiche:", err);
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Aggiorna il numerino o pallino rosso sull'icona dell'app nella Home di smartphone (iOS 16.4+ e Android) o Desktop.
 */
export async function updateAppBadge(count: number): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (err) {
    // Alcuni browser o contesti limitano l'accesso al badge prima di un'interazione utente
    console.debug("Badge API non disponibile o bloccata:", err);
  }

  // Notifica anche il Service Worker per sincronizzare
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_BADGE",
        count,
      });
    }
  } catch {}
}

/**
 * Invia una notifica di sistema da parte di uno specifico tutor (es. Archimede, Marie, Cleopatra).
 */
export async function sendTutorNotification({
  title,
  body,
  tutorName,
  url = "/",
}: {
  title: string;
  body: string;
  tutorName?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const fullTitle = tutorName ? `${tutorName} • ${title}` : title;

  try {
    // 1. Prova prima tramite Service Worker (indispensabile su mobile/PWA per apparire nel centro notifiche)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        const swOptions: any = {
          body,
          icon: "/icon.png",
          badge: "/icon.png",
          vibrate: [200, 100, 200],
          data: { url },
        };
        await reg.showNotification(fullTitle, swOptions);
        return true;
      }
    }

    // 2. Fallback su Notification standard
    new Notification(fullTitle, {
      body,
      icon: "/icon.png",
    });
    return true;
  } catch (err) {
    console.error("Errore invio notifica:", err);
    return false;
  }
}
