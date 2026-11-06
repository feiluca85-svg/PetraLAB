// Modulo di Proattività dei Tutor di PetraLAB
// - Invoglia l'alunna a fare i compiti lo stesso giorno in cui vengono assegnati
// - Propone sessioni di potenziamento/recupero mirate per le materie con voti bassi o difficoltà
// - Stimola la preparazione progressiva per verifiche imminenti
// - Invia messaggi nelle chat dei tutor e notifiche di sistema / badge PWA

import { Tutor, SubjectMemory } from "@/lib/tutors";
import { normalizeDateStr, getDaysDiff } from "@/lib/calendarUtils";

export interface ProactiveTriggerResult {
  tutorId: string;
  tutorName: string;
  messageText: string;
  reason: "new_homework_assigned" | "reinforcement_needed" | "upcoming_test";
  metadata: {
    logKey: string;
    [key: string]: any;
  };
}

/**
 * Converte stringhe di voto (es. "5.5", "5½", "6-", "4+", "5/6") in valore numerico su base 10.
 */
export function parseGradeValue(gradeStr?: string): number | null {
  if (!gradeStr) return null;
  const s = gradeStr.trim().replace(",", ".");

  // Gestione voto con mezzo punto "5½" o "5 1/2"
  if (s.includes("½") || s.includes("1/2")) {
    const cleaned = s.replace("½", "").replace("1/2", "").trim();
    const base = parseFloat(cleaned);
    return isNaN(base) ? 0.5 : base + 0.5;
  }

  // Gestione voto con meno "6-" -> 5.75
  if (s.endsWith("-")) {
    const base = parseFloat(s.slice(0, -1));
    return isNaN(base) ? null : base - 0.25;
  }

  // Gestione voto con più "5+" -> 5.25
  if (s.endsWith("+")) {
    const base = parseFloat(s.slice(0, -1));
    return isNaN(base) ? null : base + 0.25;
  }

  // Gestione voto con frazione "5/6" -> 5.5
  if (s.includes("/")) {
    const parts = s.split("/");
    const n1 = parseFloat(parts[0]);
    const n2 = parseFloat(parts[1]);
    if (!isNaN(n1) && !isNaN(n2)) {
      return (n1 + n2) / 2;
    }
  }

  const num = parseFloat(s);
  return !isNaN(num) && num > 0 && num <= 10 ? num : null;
}

/**
 * Trova il tutor più idoneo per una specifica materia.
 */
export function findTutorForSubject(subjectName: string, tutors: Tutor[]): Tutor | null {
  const s = (subjectName || "").toLowerCase().trim();
  if (!s) return null;

  return (
    tutors.find((t) => {
      const tSub = t.subject.toLowerCase();
      const tName = t.name.toLowerCase();
      const tFirst = tSub.split(" ")[0];
      return (
        s.includes(tFirst) ||
        tSub.includes(s) ||
        s.includes(tName) ||
        t.id.includes(s) ||
        s.includes(t.id)
      );
    }) || null
  );
}

/**
 * Genera il messaggio proattivo propositivo quando l'alunna riceve i compiti per una data futura
 * (es. compiti dati il 10 novembre per il 14 novembre).
 */
export function generateNewHomeworkMessage(tutor: Tutor, task: any, todayStr: string): string {
  const desc = task.description || task.task || "nuovi compiti";
  const dueDate = task.dueDate || "la prossima lezione";
  const sub = task.subject || tutor.subject.split(" ")[0];

  const tId = tutor.id.toLowerCase();
  const tName = tutor.name.toLowerCase();
  const tSub = tutor.subject.toLowerCase();

  if (tSub.includes("italiano") || tName.includes("dante") || tName.includes("itala")) {
    return `O nobilissima alunna! 📜 Ho visto che oggi ti hanno assegnato i compiti di Italiano per il ${dueDate}: "${desc}". Che ne dici se ci portiamo avanti subito con 10 minuti di lettura o primi esercizi? Se iniziamo oggi a piccoli passi, il ${dueDate} sarai super rilassata e libera! Ti va di fare il primo passo insieme?`;
  }

  if (tSub.includes("matematica") || tName.includes("archimede")) {
    return `Eureka! 📐 Ho intercettato i nuovi compiti di Matematica assegnati oggi per il ${dueDate} ("${desc}"). Ti propongo una sfida: facciamo subito il primo esercizio insieme così ce lo togliamo dal pensiero e accumuli 20 punti XP? Dimmi quando sei pronta!`;
  }

  if (tSub.includes("scienze") || tName.includes("marie") || tName.includes("einstein")) {
    return `Ehi, futura scienziata! 🔬 Ho visto che oggi vi hanno dato i compiti di Scienze per il ${dueDate} ("${desc}"). Che ne dici se facciamo una sbirciatina veloce di 5 minuti insieme sul libro per portarci avanti? Vedrai che è super interessante e non dovrai correre all'ultimo minuto!`;
  }

  if (tSub.includes("storia") || tName.includes("cleopatra")) {
    return `Saluti a te, stella del Nilo! 👑 Nuovi compiti di Storia per il ${dueDate}: "${desc}"! Un vero faraone non aspetta mai l'ultimo giorno: saliamo sulla macchina del tempo per 10 minuti oggi stesso? Portarsi avanti con calma ci renderà vittoriose!`;
  }

  if (tSub.includes("inglese") || tName.includes("arthur")) {
    return `Cheers! 💂‍♂️ Great news: ho visto i nuovi compiti di Inglese per il ${dueDate}: "${desc}"! Che ne dici se facciamo un "tea time study" di 10 minuti oggi per toglierci subito la parte più lunga? Let's do this together, step by step!`;
  }

  if (tSub.includes("francese") || tName.includes("gloria")) {
    return `Bonjour! 🥐 Ho visto che oggi vi hanno dato i compiti di Francese per il ${dueDate} ("${desc}"). Facciamo una chiacchierata lampo di 5 minuti oggi per imparare subito le paroline nuove? Iniziare oggi ti renderà tutto super facile!`;
  }

  if (tSub.includes("arte") || tName.includes("chiara")) {
    return `Ciao artista! 🎨 Ho visto i compiti di Arte per il ${dueDate} ("${desc}"). Se vuoi possiamo fare un piccolo bozzetto o leggere insieme la consegna oggi stesso, così potrai creare il tuo capolavoro con totale serenità!`;
  }

  if (tSub.includes("tecnologia") || tName.includes("alessia")) {
    return `Ehi! 💡 Compiti di Tecnologia per il ${dueDate}: "${desc}". Se ci portiamo avanti oggi con 10 minuti di pianificazione o disegno, vedrai che sarà una passeggiata! Ti va di dare un'occhiata insieme?`;
  }

  if (tSub.includes("geografia") || tName.includes("magellano")) {
    return `Terra in vista! 🧭 Ho visto la nuova rotta per il ${dueDate} con i compiti di Geografia: "${desc}". Che ne dici se apriamo la mappa per 5 minuti oggi e troviamo subito le coordinate?`;
  }

  if (tSub.includes("grammatica") || tName.includes("matilda")) {
    return `Ciao cara! 📖 Nuovi compiti di Grammatica per il ${dueDate}: "${desc}". Ti va se facciamo insieme la prima frase oggi? Bastano 5 minuti per sentirti subito avanti e serena!`;
  }

  return `Ciao! 🌟 Ho visto che oggi ti hanno assegnato i compiti di ${sub} per il ${dueDate}: "${desc}". Se iniziamo oggi con 10 minuti di anticipo, quando arriverà il ${dueDate} avrai già finito tutto e potrai goderti il tuo tempo libero! Ti va di iniziare dal primo punto insieme?`;
}

/**
 * Genera il messaggio proattivo di POTENZIAMENTO/RECUPERO quando il tutor nota voti bassi o difficoltà.
 */
export function generateReinforcementMessage(tutor: Tutor, memory: SubjectMemory): string {
  const lastTopic = memory.lastTopic ? `su "${memory.lastTopic}"` : "";
  const sub = tutor.subject.split(" ")[0];
  const tName = tutor.name.toLowerCase();
  const tSub = tutor.subject.toLowerCase();

  if (tSub.includes("matematica") || tName.includes("archimede")) {
    return `Ehi! ⚡ Ho dato un'occhiata alle nostre ultime verifiche di Matematica: so che ${lastTopic || "alcuni argomenti"} sono stati un po' tosti, ma ti svelo un segreto: anche io sbagliavo i calcoli prima di inventare la catapulta! 📐 Ti va di fare una piccola sessione di potenziamento di 10 minuti insieme? Solo 3 indovinelli facili facili per farti diventare un fulmine. Ti prometto che ci divertiamo!`;
  }

  if (tSub.includes("italiano") || tName.includes("dante") || tName.includes("itala")) {
    return `Cara fanciulla! 📜 Ho notato che nell'ultima prova ${lastTopic} abbiamo incontrato qualche tranello. Nessun problema: le grandi opere si costruiscono rima dopo rima! Che ne dici se facciamo una sessione lampo di potenziamento di 10 minuti insieme? Ti guiderò io con parole semplicissime. Ti va di provare?`;
  }

  if (tSub.includes("inglese") || tName.includes("arthur")) {
    return `Hello there! 💂‍♂️ Don't worry at all: imparare una lingua richiede solo un po' di allenamento e simpatia! Che ne dici se facciamo un piccolo potenziamento di 10 minuti insieme su vocaboli e verbi? Senza voti e senza stress, solo una bella chiacchierata e un mini-quiz! Ready?`;
  }

  if (tSub.includes("scienze") || tName.includes("marie") || tName.includes("einstein")) {
    return `Ciao! 👩‍🔬 Ho visto gli ultimi risultati e voglio dirti una cosa: nella scienza ogni errore è una scoperta preziosa! Facciamo una sessione di potenziamento di 10 minuti per chiarire insieme i punti difficili con qualche simpatico esempio pratico? Vedrai che diventerà chiarissimo!`;
  }

  if (tSub.includes("storia") || tName.includes("cleopatra")) {
    return `Mia valorosa alleata! 👑 Anche i più grandi generali riorganizzano le truppe dopo una battaglia impegnativa! Che ne dici di fare un quarto d'ora di potenziamento insieme sui capitoli di Storia? Ti racconterò i retroscena più curiosi per farti ricordare tutto con facilità. Sei pronta?`;
  }

  if (tSub.includes("arte") || tName.includes("chiara")) {
    return `Ciao artista! 🎨 Ho visto le ultime valutazioni di Arte. L'arte è esplorazione e nessun disegno è sbagliato! Ti va di fare una mini sessione di 10 minuti insieme per rivedere la tecnica con calma e zero stress?`;
  }

  if (tSub.includes("tecnologia") || tName.includes("alessia")) {
    return `Ciao! 💡 Ho dato un'occhiata alle ultime verifiche di Tecnologia. Non ti preoccupare: le proiezioni e i materiali all'inizio sembrano complessi, ma con due trucchi visivi si capiscono al volo! Facciamo un potenziamento di 10 minuti insieme?`;
  }

  if (tSub.includes("grammatica") || tName.includes("matilda")) {
    return `Cara alunna! 📖 Ho notato qualche dubbio nelle ultime prove di Grammatica. Tranquilla: facciamo un mini potenziamento di 10 minuti insieme su pronomi ed esercizi a piccoli passi? Ti aiuterò io e vedrai che diventerà un gioco da ragazzi!`;
  }

  if (tSub.includes("francese") || tName.includes("gloria")) {
    return `Bonjour! 🥐 Pas de souci! La lingua francese è bellissima e richiede solo un po' di confidenza. Facciamo un mini-potenziamento di 10 minuti insieme con pronunce simpatiche e zero voti? Vedrai come sarà divertente!`;
  }

  if (tSub.includes("geografia") || tName.includes("magellano")) {
    return `Terra in vista! 🧭 Ho notato che nell'ultima prova di Geografia abbiamo trovato qualche scoglio. Ma ogni buon navigatore impara a leggere la bussola! Ti va di fare 10 minuti di potenziamento insieme sulla mappa?`;
  }

  return `Ciao! 🌟 Ho notato che nelle ultime prove di ${sub} c'è stato qualche ostacolo ${lastTopic}. Non scoraggiarti affatto: siamo qui apposta per trasformare le difficoltà in punti di forza! Ti va di fare una piccola sessione di potenziamento di 10 minuti a piccoli passi? Iniziamo da una domanda facilissima!`;
}

/**
 * Controlla e genera tutte le azioni proattive necessarie:
 * 1) Compiti ricevuti oggi per una data futura
 * 2) Potenziamento per materie con voti bassi
 */
export function evaluateProactiveTriggers({
  agendaItems,
  subjectsMemory,
  tutors,
  todayISO,
  alreadyTriggeredLog = {},
}: {
  agendaItems: any[];
  subjectsMemory: Record<string, SubjectMemory>;
  tutors: Tutor[];
  todayISO: string;
  alreadyTriggeredLog?: Record<string, string>;
}): ProactiveTriggerResult[] {
  const results: ProactiveTriggerResult[] = [];

  // 1. TRIGGER COMPITI ASSEGNATI OGGI PER UNA DATA FUTURA
  agendaItems.forEach((task) => {
    if (task.isCompleted) return;

    // Normalizza data di scadenza
    const dueDateNorm = normalizeDateStr(task.dueDate);
    if (!dueDateNorm) return;

    // Controlla se il compito è stato assegnato oggi oppure creato oggi
    const assignedNorm =
      normalizeDateStr(task.assignedDate) ||
      (task.createdAt ? normalizeDateStr(task.createdAt.slice(0, 10)) : "");
    const isAssignedToday = assignedNorm === todayISO;

    // È un compito per una data futura assegnato oggi (o da fare nei prossimi giorni)
    const isFuture = dueDateNorm > todayISO;

    if (isAssignedToday && isFuture) {
      const tutor = findTutorForSubject(task.subject, tutors);
      if (!tutor) return;

      const logKey = `proactive_hw_${task.id}_${todayISO}`;
      if (!alreadyTriggeredLog[logKey]) {
        results.push({
          tutorId: tutor.id,
          tutorName: tutor.name,
          messageText: generateNewHomeworkMessage(tutor, task, todayISO),
          reason: "new_homework_assigned",
          metadata: { taskId: task.id, logKey, dueDate: task.dueDate },
        });
      }
    }
  });

  // 2. TRIGGER POTENZIAMENTO PER MATERIE CON VOTI BASSI / DIFFICOLTÀ
  tutors.forEach((tutor) => {
    // Cerca la memoria del tutor (per id, per nome materia, o per originalSubject dei voti)
    const memKey = Object.keys(subjectsMemory).find((k) => {
      if (k.toLowerCase() === tutor.id.toLowerCase()) return true;
      const memObj = subjectsMemory[k];
      const origSub = memObj?.grades?.[0]?.originalSubject?.toLowerCase();
      const tSub = tutor.subject.toLowerCase();
      const tFirst = tSub.split(" ")[0];
      if (origSub && (origSub.includes(tFirst) || tSub.includes(origSub))) return true;
      return tSub.includes(k.toLowerCase()) || k.toLowerCase().includes(tFirst);
    });

    const mem = memKey ? subjectsMemory[memKey] : null;
    if (!mem) return;

    const grades = mem.grades || [];
    const numericGrades = grades
      .map((g) => parseGradeValue(g.grade))
      .filter((v): v is number => v !== null);

    // Se l'ultimo voto è insufficiente (< 6.0) o la media è < 6.5, o se ci sono difficoltà registrate
    const latestGrade = numericGrades.length > 0 ? numericGrades[0] : null;
    const avgGrade =
      numericGrades.length > 0
        ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
        : null;

    const hasLowGrades =
      (latestGrade !== null && latestGrade < 6.0) || (avgGrade !== null && avgGrade < 6.5);
    const hasWeaknesses = Boolean(mem.weaknesses && mem.weaknesses.length > 0);

    if (hasLowGrades || hasWeaknesses) {
      // Controlla se abbiamo già inviato un messaggio di potenziamento recentemente (negli ultimi 3 giorni)
      const logKeyPrefix = `proactive_potenziamento_${tutor.id}`;
      const lastSentDate = alreadyTriggeredLog[logKeyPrefix];
      let shouldSend = true;

      if (lastSentDate) {
        const diff = getDaysDiff(lastSentDate, todayISO);
        if (diff < 3) {
          shouldSend = false;
        }
      }

      if (shouldSend) {
        results.push({
          tutorId: tutor.id,
          tutorName: tutor.name,
          messageText: generateReinforcementMessage(tutor, mem),
          reason: "reinforcement_needed",
          metadata: {
            logKey: logKeyPrefix,
            latestGrade,
            avgGrade: avgGrade ? Math.round(avgGrade * 10) / 10 : null,
          },
        });
      }
    }
  });

  return results;
}
