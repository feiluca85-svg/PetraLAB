// Utility per il Calendario, Festività Italiane e Sistema di Allenamento Progressivo

/**
 * Calcola la data della Pasqua per un dato anno usando l'algoritmo di Meeus/Butcher.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Marzo, 4 = Aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Restituisce la mappa delle festività nazionali italiane per un determinato anno (YYYY-MM-DD -> Nome).
 */
export function getItalianHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Capodanno",
    [`${year}-01-06`]: "Epifania",
    [`${year}-04-25`]: "Liberazione",
    [`${year}-05-01`]: "Festa del Lavoro",
    [`${year}-06-02`]: "Festa della Repubblica",
    [`${year}-08-15`]: "Ferragosto",
    [`${year}-11-01`]: "Tutti i Santi",
    [`${year}-12-08`]: "Immacolata",
    [`${year}-12-25`]: "Natale",
    [`${year}-12-26`]: "S. Stefano",
  };

  // Pasqua e Pasquetta
  const easter = getEasterDate(year);
  const easterISO = `${easter.getFullYear()}-${pad(easter.getMonth() + 1)}-${pad(easter.getDate())}`;
  holidays[easterISO] = "Pasqua";

  const easterMonday = new Date(easter.getTime() + 24 * 60 * 60 * 1000);
  const easterMondayISO = `${easterMonday.getFullYear()}-${pad(easterMonday.getMonth() + 1)}-${pad(easterMonday.getDate())}`;
  holidays[easterMondayISO] = "Pasquetta";

  return holidays;
}

/**
 * Verifica se una data (YYYY-MM-DD) è una festività nazionale italiana.
 */
export function getHolidayInfo(isoDate: string): { isHoliday: boolean; name?: string } {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return { isHoliday: false };
  const year = parseInt(isoDate.slice(0, 4), 10);
  const holidays = getItalianHolidays(year);
  const name = holidays[isoDate];
  return {
    isHoliday: Boolean(name),
    name: name,
  };
}

/**
 * Normalizza qualsiasi stringa data in formato YYYY-MM-DD
 */
export function normalizeDateStr(d?: string): string {
  if (!d) return "";
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    return `${parts[3]}-${pad(parseInt(parts[2], 10))}-${pad(parseInt(parts[1], 10))}`;
  }
  return "";
}

/**
 * Calcola i giorni di differenza tra due date YYYY-MM-DD (d2 - d1 in giorni solari)
 */
export function getDaysDiff(d1Str: string, d2Str: string): number {
  const norm1 = normalizeDateStr(d1Str);
  const norm2 = normalizeDateStr(d2Str);
  if (!norm1 || !norm2) return 0;
  const t1 = new Date(norm1 + "T00:00:00").getTime();
  const t2 = new Date(norm2 + "T00:00:00").getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export interface TrainingStage {
  daysRemaining: number;
  phaseNumber: number; // 1, 2, 3, 4
  phaseTitle: string;
  badge: string;
  description: string;
  actionTitle: string;
  tutorPrompt: string;
  progressPercent: number; // 0 - 100
}

/**
 * Calcola l'allenamento progressivo per una verifica o interrogazione.
 */
export function getProgressiveTraining(task: any, todayISO?: string): TrainingStage | null {
  const isVerificaOrInterrogazione =
    task &&
    (task.type?.toLowerCase() === "verifica" ||
      task.type?.toLowerCase() === "interrogazione" ||
      (task.subject && task.subject.toLowerCase().includes("verifica")) ||
      (task.description && task.description.toLowerCase().includes("verifica")));

  if (!isVerificaOrInterrogazione) return null;

  const currentToday =
    todayISO ||
    (() => {
      const n = new Date();
      return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
    })();

  const taskDate = normalizeDateStr(task.dueDate);
  if (!taskDate) return null;

  const diff = getDaysDiff(currentToday, taskDate);

  // Se è già passata da oltre 1 giorno
  if (diff < 0) {
    return null;
  }

  // Giorno stesso (D-0)
  if (diff === 0) {
    return {
      daysRemaining: 0,
      phaseNumber: 4,
      phaseTitle: "D-Day: Il grande giorno!",
      badge: "🎯 OGGI",
      description: "Ripasso flash finale di 5 minuti e carica di autostima. Hai studiato e sei preparata!",
      actionTitle: "Ripasso lampo di incoraggiamento",
      tutorPrompt: `Oggi ho la verifica/interrogazione di ${task.subject}! Fai con me un ripasso lampo incoraggiante di 3 minuti per darmi sicurezza prima di entrare in classe.`,
      progressPercent: 100,
    };
  }

  // D-1 (Vigilia)
  if (diff === 1) {
    return {
      daysRemaining: 1,
      phaseNumber: 3,
      phaseTitle: "D-1: Simulazione della Prova",
      badge: "🚨 MANCA 1 GIORNO",
      description: "Simuliamo la verifica vera e propria! Il tutor ti farà 4-5 domande tipiche con tempo e punteggio.",
      actionTitle: "Inizia la Simulazione Esame",
      tutorPrompt: `Domani ho la verifica/interrogazione di ${task.subject} su: "${task.description || task.task || ""}". Facciamo una vera simulazione d'esame con 5 domande una alla volta per vedere se so tutto?`,
      progressPercent: 85,
    };
  }

  // D-2
  if (diff === 2) {
    return {
      daysRemaining: 2,
      phaseNumber: 3,
      phaseTitle: "D-2: Domande a Trabocchetto & Risoluzione Dubbi",
      badge: "⚡ MANCANO 2 GIORNI",
      description: "Mettiamo alla prova i punti più difficili e i dubbi rimasti per non avere sorprese.",
      actionTitle: "Affronta i punti difficili",
      tutorPrompt: `Mancano 2 giorni alla verifica di ${task.subject} su: "${task.description || task.task || ""}". Fammi delle domande mirate sui concetti più insidiosi per verificare che non abbia dubbi.`,
      progressPercent: 65,
    };
  }

  // D-3 o D-4
  if (diff === 3 || diff === 4) {
    return {
      daysRemaining: diff,
      phaseNumber: 2,
      phaseTitle: `D-${diff}: Flashcard & Quiz Rapido`,
      badge: `🎯 MANCANO ${diff} GIORNI`,
      description: "Ripasso attivo a ritmo veloce: date, formule, vocaboli e definizioni chiave con quiz a risposta rapida.",
      actionTitle: "Inizia il Quiz Flashcard",
      tutorPrompt: `Tra ${diff} giorni ho la verifica di ${task.subject} su: "${task.description || task.task || ""}". Facciamo una sessione di quiz veloci stile flashcard per consolidare la memoria?`,
      progressPercent: 45,
    };
  }

  // D-5 a D-7
  if (diff >= 5 && diff <= 7) {
    return {
      daysRemaining: diff,
      phaseNumber: 1,
      phaseTitle: `D-${diff}: Mappa Concettuale & Comprensione`,
      badge: `📖 MANCANO ${diff} GIORNI`,
      description: "Iniziamo con calma: costruiamo lo schema generale dei capitoli e fissiamo i concetti principali.",
      actionTitle: "Costruisci la Mappa con il Tutor",
      tutorPrompt: `Ho una verifica di ${task.subject} programmata tra ${diff} giorni (${taskDate}) su: "${task.description || task.task || ""}". Mi aiuti a fare una mappa concettuale dei temi da studiare?`,
      progressPercent: 20,
    };
  }

  // Più di 7 giorni
  return {
    daysRemaining: diff,
    phaseNumber: 1,
    phaseTitle: `D-${diff}: Pianificazione anticipata`,
    badge: `🗓️ MANCANO ${diff} GIORNI`,
    description: "Verifica programmata in agenda. Presto inizierà l'allenamento progressivo!",
    actionTitle: "Dai un'occhiata all'argomento",
    tutorPrompt: `Tra ${diff} giorni avrò una verifica di ${task.subject}. Quali sono i primi argomenti che mi consigli di iniziare a leggere con calma?`,
    progressPercent: 10,
  };
}
