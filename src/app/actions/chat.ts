"use server";

import { genAI, SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";
import path from "path";
import { buildTutorPrompt, SubjectMemory, Tutor } from "@/lib/tutors";
import { getRelevantBookPage } from "@/lib/bookReader";

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite", // 500 RPD
  "gemini-3.1-flash-lite", // 500 RPD
  "gemini-3.8-flash",      // 20 RPD
  "gemini-3.7-flash",      // 20 RPD
  "gemini-3.6-flash",      // 20 RPD
  "gemini-3.5-flash"       // 20 RPD
];

export async function sendMessage(
  message: string, 
  history: Content[],
  image?: { base64: string; mimeType: string },
  tutor?: Tutor,
  subjectMemory?: SubjectMemory,
  agendaItems?: any[]
) {
  try {
    // Calcola l'istruzione di sistema specifica per il tutor e la sua memoria
    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (tutor) {
      dynamicInstruction = buildTutorPrompt(tutor, subjectMemory);
      
      // Inject relevant agenda items for this tutor
      if (agendaItems && agendaItems.length > 0) {
        // Try to match the tutor's subject to the agenda items loosely
        const relevantTasks = agendaItems.filter(item => 
          !item.isCompleted && 
          item.subject.toLowerCase().includes(tutor.subject.split(' ')[0].toLowerCase())
        );
        
        if (relevantTasks.length > 0) {
          dynamicInstruction += `\n\nATTENZIONE TUTOR: L'alunna ha i seguenti compiti/verifiche in sospeso per la tua materia:\n`;
          relevantTasks.forEach(task => {
            dynamicInstruction += `- [${task.type.toUpperCase()}] Scadenza: ${task.dueDate} - ${task.description}\n`;
          });
          dynamicInstruction += `\nOBIETTIVO PROATTIVO: Se la chat è appena iniziata o l'alunna ti saluta, chiedile esplicitamente se vuole iniziare a fare questi compiti/prepararsi per queste verifiche. Rendilo coinvolgente e non stressante, proponendo ad esempio di ripassare tramite quiz o sfide!`;
        }
      }
    }
    
    // Regola per la lingua, il linguaggio matematico e formattazione
    dynamicInstruction += `\n\nREGOLE FONDAMENTALI DI LINGUA, MATEMATICA E LEGGIBILITÀ (TARGET: SCUOLA MEDIA):
- LINGUA PURA E NATURALE: Rispondi ESCLUSIVAMENTE in italiano perfetto e fluido (o nella lingua del tutor se è inglese/francese). Non inserire MAI caratteri non latini, alfabeti stranieri, caratteri corrotti o strani glifi (es. caratteri cirillici, asiatici o indiani).
- CHIAREZZA E LINGUAGGIO NATURALE: Parla come una bravissima insegnante in classe. Non riempire il testo di simboli incomprensibili o codici astrusi.
- SPIEGA SEMPRE A VOCE I PASSAGGI: Quando scrivi un'operazione, accompagnala sempre a parole semplici (es. "Moltiplichiamo la base per l'altezza, quindi 10 per 3").
- NON RACCHIUDERE PAROLE NORMALI O SIGLE IN CODICE LATEX: Non scrivere MAI $\\text{...}$, $M.C.D.$, o sigle tra dollari. Scrivi semplicemente "MCD", "cm²", "Area = base × altezza".
- FORMULE ED ESPRESSIONI: Quando scrivi espressioni complesse o frazioni per mostrarle a schermo, usa una formattazione pulita e ordinata. Usa il formato formula centrata ($$...$$) solo per l'espressione di riepilogo su riga separata. Nel corpo del testo scrivi in modo naturale e discorsivo.`;

    // Costruisci il payload: testo ed eventuale immagine
    const parts: Part[] = [];
    let loadedBookPageInfo: { bookPage: number; pdfPage: number; topicName?: string; unitTitle?: string } | null = null;
    
    // Integrazione automatica Libro di Testo per qualsiasi Tutor (Geografia, Storia, Inglese, Francese, ecc.)
    if (!image && tutor) {
      let bookPage = getRelevantBookPage(message, tutor);
      
      // Se non menzionato esplicitamente nel messaggio, controlla i compiti in agenda per questa materia
      if (!bookPage && agendaItems && agendaItems.length > 0) {
        const relevantTasks = agendaItems.filter(item => 
          !item.isCompleted && 
          (tutor.subject.toLowerCase().includes(item.subject.toLowerCase().split(' ')[0]) ||
           item.subject.toLowerCase().includes(tutor.subject.toLowerCase().split(' ')[0]))
        );
        for (const task of relevantTasks) {
          bookPage = getRelevantBookPage(task.description, tutor);
          if (bookPage) break;
        }
      }

      if (bookPage) {
        parts.push({
          inlineData: {
            data: bookPage.base64,
            mimeType: bookPage.mimeType,
          }
        });
        loadedBookPageInfo = {
          bookPage: bookPage.bookPage,
          pdfPage: bookPage.pdfPage,
          topicName: bookPage.topicName,
          unitTitle: bookPage.unitTitle
        };

        const bookTitle = path.basename(bookPage.pdfPath, ".pdf");
        dynamicInstruction += `\n\n[LIBRO DI TESTO "${bookTitle}" APERTO SUL BANCO]:
Hai aperto automaticamente davanti a te la pagina ${bookPage.bookPage} (PDF p. ${bookPage.pdfPage}) del libro di testo "${bookTitle}" ${bookPage.topicName ? `(Argomento: ${bookPage.topicName})` : ""} ${bookPage.unitTitle ? `(${bookPage.unitTitle})` : ""}.
L'immagine ad alta definizione di questa pagina è allegata a questo messaggio come input visivo.
Fai riferimento esplicito a questa pagina (es. "Ho qui davanti a me il tuo libro ${bookTitle} aperto a pagina ${bookPage.bookPage}!").
Osserva con grandissima attenzione il testo, i paragrafi, le cartine, i grafici o gli esercizi stampati sulla pagina per guidare l'alunna con metodo socratico, stimolando la sua osservazione e comprensione senza fare il lavoro al suo posto.`;
      }
    }

    if (message.trim()) {
      parts.push({ text: message });
    }

    if (image) {
      parts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }

    if (parts.length === 1 && (image || loadedBookPageInfo)) {
      parts.unshift({ text: "Spiegami cosa vedi in questa pagina e aiutami a studiarla o fare gli esercizi passo passo." });
    }

    let result = null;
    let lastError = null;

    // Prova i modelli a cascata
    for (const modelName of FALLBACK_MODELS) {
      try {
        const currentModel = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dynamicInstruction,
          generationConfig: {
            temperature: 0.7,
          }
        });
        
        const chat = currentModel.startChat({ history: history });
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await chat.sendMessage(parts);
            break;
          } catch (err: any) {
            const msg = err?.message || String(err);
            if ((msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1200));
              continue;
            }
            throw err;
          }
        }
        
        if (result) break;

      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.error(`Gemini Error on ${modelName}:`, msg);
        
        if (msg.includes("429") || msg.includes("exceeded your current quota") || msg.includes("403") || msg.includes("404")) {
          continue; 
        }
        break;
      }
    }

    if (!result && lastError) {
      throw lastError;
    }
    
    let rawText = result!.response.text();
    let trackData: { grade?: string; topic?: string; weakness?: string } | null = null;

    // Cerca eventuali tag di tracciamento inseriti dal tutor (<!-- TRACK: {...} -->)
    const trackMatch = rawText.match(/<!--\s*TRACK:\s*({[\s\S]*?})\s*-->/);
    if (trackMatch) {
      try {
        trackData = JSON.parse(trackMatch[1]);
      } catch (e) {
        console.error("Errore parsing track data:", e);
      }
      // Rimuovi il tag invisibile dal testo finale mostrato all'alunna
      rawText = rawText.replace(/<!--\s*TRACK:\s*({[\s\S]*?})\s*-->/g, "").trim();
    }
    
    return { 
      success: true, 
      text: rawText,
      trackData,
      bookPageInfo: loadedBookPageInfo
    };
  } catch (error: any) {
    console.error("All Gemini Fallbacks Failed:", error);
    const msg = error?.message || String(error);
    
    if (msg.includes("503") || msg.includes("high demand")) {
      return { success: false, error: "I server di Google sono momentaneamente sovraccarichi per le troppe richieste. Riprova tra qualche secondo! ⏳" };
    }
    
    if (msg.includes("429") || msg.includes("exceeded your current quota")) {
      return { success: false, error: "Ops! Abbiamo esaurito i messaggi magici disponibili su tutti i modelli per oggi. Torna a trovarmi domani per continuare a studiare insieme! 🌙" };
    }
    
    return { success: false, error: `[DEBUG] Errore di connessione: ${msg}` };
  }
}

export async function parseNuvolaScreenshot(base64Image: string, mimeType: string, fallbackDate?: string) {
  try {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const tomorrowISO = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;

    const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const todayName = DAY_NAMES[now.getDay()];
    const tomorrowName = DAY_NAMES[tom.getDay()];

    const prompt = `Sei un assistente per un registro elettronico scolastico (es. Nuvola, ClasseViva, Spaggiari).
Analizza questa immagine (uno screenshot del registro elettronico) ed estrai TUTTI i compiti, verifiche o voti presenti, SENZA TRASCURARE O SALTARE ALCUNA MATERIA.

DATA DI RIFERIMENTO ATTUALE:
- Oggi è: ${todayName} ${todayISO}
- Domani è: ${tomorrowName} ${tomorrowISO}

REGOLE CRUCIALI PER LE MATERIE E I COMPITI:
1. NON SALTARE NESSUNA MATERIA! Esamina meticolosamente ogni singola riga, riquadro, card o blocco presente nello screenshot.
   Se vedi Inglese, Scienze, Arte e Immagine, Matematica, Italiano, Tecnologia, Francese, Musica, Storia, Geografia, ecc., estraile TUTTE! Ognuna deve diventare un elemento separato in "agendaItems".
2. SE UNA SEZIONE, SCHEDA O COLONNA RIGUARDA UN GIORNO SPECIFICO (es. "Domani", "${tomorrowName}", "${tomorrowISO}", o una data in testata come "13 Ottobre"):
   -> TUTTI i compiti elencati dentro o sotto quel giorno (es. Arte e Immagine, Scienze, Inglese) DEVONO RICEVERE ESATTAMENTE QUELLA DATA (es. "${tomorrowISO}")!
   -> NON contrassegnare MAI i compiti di quel giorno con "Prossima lezione" solo perché la data non è ripetuta riga per riga! La data dell'intestazione del giorno si applica a TUTTI i compiti di quel gruppo!
3. Se nello screenshot leggi "Domani", la dueDate è "${tomorrowISO}". Se leggi "Oggi", la dueDate è "${todayISO}".
4. Se c'è una data (es. "13/10", "13 ott", "14 ottobre"), convertila in formato "YYYY-MM-DD" con anno ${now.getFullYear()} (es. "${now.getFullYear()}-10-13").
5. Il formato del campo "dueDate" (e "date" per i voti) DEVE ESSERE ESATTAMENTE "YYYY-MM-DD" (es. "${tomorrowISO}").
6. Usa "Prossima lezione" SOLO E SOLTANTO se nello screenshot è esplicitamente scritto "Prossima lezione" o se non c'è assolutamente alcun giorno/data specificato in tutta la schermata.

REGOLE PER I VOTI:
- Se vedi voti o valutazioni (es. "7½" diventa "7.5", "8-", "6+"), inseriscili in "gradesItems".

Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura (nessun blocco markdown):
{
  "agendaItems": [
    {
      "id": "id_1",
      "type": "compito" | "verifica",
      "subject": "Es. Inglese",
      "description": "Descrizione del compito o argomento",
      "dueDate": "${tomorrowISO}"
    }
  ],
  "gradesItems": [
    {
      "subject": "Tecnologia",
      "grade": "7.5",
      "topic": "Argomento verifica",
      "date": "YYYY-MM-DD"
    }
  ]
}`;

    let result = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            }
          }
        ]);
        break;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`Fallback in parseNuvola (${modelName}):`, msg);
        
        if (msg.includes("429") || msg.includes("exceeded") || msg.includes("403") || msg.includes("404") || msg.includes("503")) {
          continue; 
        }
        break;
      }
    }

    if (!result) {
      throw lastError || new Error("Tutti i modelli di fallback sono falliti.");
    }

    let text = result.response.text();
    text = text.replace(/\s*```json/gi, "").replace(/```/g, "").trim();

    try {
      const data = JSON.parse(text);
      const rawItems = data.agendaItems || [];
      
      // Controlla se c'è una data comune prevalente per i compiti nello screenshot
      const explicitDates = rawItems
        .map((it: any) => it.dueDate)
        .filter((d: any) => d && /^\d{4}-\d{2}-\d{2}$/.test(d));
      const dominantDate = explicitDates.length > 0 ? explicitDates[0] : tomorrowISO;

      const items = rawItems.map((it: any, idx: number) => {
        let dueDate = (it.dueDate || "").trim();
        
        if (!dueDate || dueDate.toLowerCase() === 'domani') {
          dueDate = tomorrowISO;
        } else if (dueDate.toLowerCase() === 'oggi') {
          dueDate = todayISO;
        } else {
          // Se la data è "DD/MM/YYYY"
          const partsFull = dueDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (partsFull) {
            dueDate = `${partsFull[3]}-${partsFull[2].padStart(2, '0')}-${partsFull[1].padStart(2, '0')}`;
          } else {
            // Se la data è "DD/MM" o "DD-MM"
            const partsShort = dueDate.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
            if (partsShort) {
              dueDate = `${now.getFullYear()}-${partsShort[2].padStart(2, '0')}-${partsShort[1].padStart(2, '0')}`;
            } else if (dueDate === "Prossima lezione" && explicitDates.length > 0) {
              // Se l'IA ha messo "Prossima lezione" ma gli altri compiti dello screenshot hanno una data esplicita di domani
              dueDate = dominantDate;
            } else if (!dueDate) {
              dueDate = fallbackDate || tomorrowISO;
            }
          }
        }

        return {
          ...it,
          id: `nuvola_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
          dueDate,
          isCompleted: false
        };
      });
      return { success: true, items, gradesItems: data.gradesItems || [] };
    } catch (parseErr) {
      console.error("Failed to parse JSON from Gemini", text);
      return { success: false, error: "L'IA non è riuscita a estrarre i dati. Risposta grezza: " + text.substring(0, 100) };
    }
  } catch (error: any) {
    console.error("Error parsing screenshot", error);
    return { success: false, error: error?.message || "Errore di connessione." };
  }
}

export async function generateStudyPlan(
  tasks: Array<{ id: string; subject: string; description: string; type?: string; dueDate?: string }>,
  historyHabits?: Record<string, { avgMinutes: number; count: number }>,
  customPrompt?: string
) {
  try {
    const prompt = `Sei un tutor esperto di pedagogia e organizzazione dello studio per studenti delle scuole medie (11-14 anni).
Il tuo obiettivo è costruire un piano di studio pomeridiano ("Tabella di marcia") RILASSANTE, SENZA ANSIA, REALISTICO e CHIARO.

REGOLE PEDAGOGICHE:
1. "TECNICA CHUNKING": Spezza i compiti pesanti in blocchi digeribili. Ad esempio:
   - Matematica o Grammatica: se c'è teoria + esercizi, crea 2 step distinti: uno di studio teoria/regole (10-15 min) e uno per gli esercizi (15-25 min).
   - Lettura o Riassunto: lettura/comprensione (15-20 min) e scrittura (15 min).
2. TECNICA SANDWICH (ORDINE STRATEGICO):
   - Step 1: Materia a difficoltà media (per riscaldarsi e prendere fiducia).
   - Step 2: Materia più tosta/impegnativa (quando l'energia mentale è alta).
   - In mezzo: inserisci sempre una breve pausa (5 min) dopo 30-40 minuti di lavoro continuativo.
   - Fine: materia più leggera o piacevole (disegno, lettura breve, ricopiatura).
3. STIME DEI TEMPI:
   - Ogni step deve durare tra i 10 e i 25 minuti al massimo. Nessun blocco deve superare i 30 minuti senza pausa!
   - Tieni conto delle abitudini e tempi storici dello studente se forniti: ${JSON.stringify(historyHabits || {})}
4. TONO: Super incoraggiante, empatico e orientato al successo.

ECCO I COMPITI DA PIANIFICARE PER OGGI/DOMANI:
${JSON.stringify(tasks, null, 2)}
${customPrompt ? `Note speciali dell'alunna: "${customPrompt}"` : ''}

Rispondi ESCLUSIVAMENTE con un JSON valido con questa struttura (nessun blocco markdown):
{
  "totalEstimatedMinutes": 75,
  "motivationalMessage": "Oggi abbiamo un piano perfetto: con calma e un passo alla volta, prima delle 17:00 avrai finito tutto!",
  "steps": [
    {
      "id": "step_1",
      "taskId": "id del compito originale o null se è una pausa",
      "subject": "Matematica",
      "phase": "teoria" | "esercizi" | "lettura" | "pausa" | "generale",
      "title": "Ripasso veloce delle formule",
      "description": "Leggi pag. 2 e guarda i 2 esempi già svolti",
      "estimatedMinutes": 15,
      "tutorId": "matematica"
    },
    {
      "id": "step_2",
      "taskId": "id del compito",
      "subject": "Matematica",
      "phase": "esercizi",
      "title": "Esercizi dal n. 1 al 4",
      "description": "Fai i primi 4 esercizi con calma sul quaderno",
      "estimatedMinutes": 20,
      "tutorId": "matematica"
    },
    {
      "id": "step_pausa_1",
      "taskId": null,
      "subject": "Pausa Relax",
      "phase": "pausa",
      "title": "Stretching & Bicchiere d'Acqua",
      "description": "Stacca gli occhi, alzati dalla sedia e fai un respiro profondo!",
      "estimatedMinutes": 5,
      "tutorId": null
    }
  ]
}`;

    let result = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result && result.response && result.response.text()) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Fallback in generateStudyPlan (${modelName}):`, err.message);
      }
    }

    if (!result) {
      throw lastError || new Error("Nessun modello disponibile per generare la tabella di marcia.");
    }

    let text = result.response.text();
    text = text.replace(/\s*```json/gi, "").replace(/```/g, "").trim();
    const plan = JSON.parse(text);
    return { success: true, plan };
  } catch (error: any) {
    console.error("Error generating study plan:", error);
    return { success: false, error: error?.message || "Impossibile creare la tabella di marcia automatica." };
  }
}