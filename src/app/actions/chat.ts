"use server";

import { genAI, SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";
import { buildTutorPrompt, SubjectMemory, Tutor } from "@/lib/tutors";

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
    
    // Regola per forzare il rendering matematico
    dynamicInstruction += `\n\nREGOLE DI FORMATTAZIONE MATEMATICA: 
- Usa SEMPRE la formattazione LaTeX per numeri, formule ed espressioni. 
- Usa il doppio dollaro $$ per le formule centrate su nuova riga (es. $$x = {-b \pm \sqrt{b^2-4ac} \over 2a}$$).
- Usa il dollaro singolo $ per formule e numeri all'interno del testo (es. $x = 5$).
- Non usare mai testo normale per espressioni come x^2, usa $x^2$.`;

    // Costruisci il payload: testo ed eventuale immagine
    const parts: Part[] = [];
    
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

    if (parts.length === 1 && image) {
      parts.unshift({ text: "Spiegami cosa vedi in questa immagine e aiutami a risolverlo passo passo." });
    }

    let result = null;
    let lastError = null;

    // Prova i modelli a cascata
    for (const modelName of FALLBACK_MODELS) {
      try {
        const currentModel = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dynamicInstruction
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
      trackData 
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
    const prompt = `
Sei un assistente per un registro elettronico scolastico (Nuvola Madisoft).
Analizza questa immagine (uno screenshot del registro) ed estrai i compiti assegnati e le verifiche in programma.
Data di default (se non si vede nell'immagine): ${fallbackDate || "Prossima lezione"}
Se l'immagine taglia l'intestazione, usa la data di default come dueDate per tutti i compiti.
Attenzione ai duplicati: ignora cose non pertinenti.
Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura. Non includere blocchi \`\`\`json, ma solo il JSON nudo e crudo:
{
  "agendaItems": [
    {
      "id": "generato_randomicamente_dal_modello_come_stringa_unica_es_id123",
      "type": "compito" | "verifica",
      "subject": "Es. Matematica",
      "description": "Breve descrizione del compito o argomento verifica",
      "dueDate": "YYYY-MM-DD" // se non specificata, usa una stringa leggibile tipo "Prossima lezione"
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
      return { success: true, items: data.agendaItems || [] };
    } catch (parseErr) {
      console.error("Failed to parse JSON from Gemini", text);
      return { success: false, error: "L'IA non è riuscita a estrarre i dati. Risposta grezza: " + text.substring(0, 100) };
    }

  } catch (error: any) {
    console.error("Error parsing screenshot", error);
    return { success: false, error: error?.message || "Errore di connessione." };
  }
}