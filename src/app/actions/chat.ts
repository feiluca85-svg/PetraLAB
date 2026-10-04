"use server";

import { genAI, SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";

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
  systemInstruction?: string
) {
  try {
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

    // Se l'utente invia solo l'immagine senza testo, aggiungiamo una descrizione base
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
          systemInstruction: systemInstruction || SYSTEM_INSTRUCTION
        });
        
        // Inizializza la chat per questo specifico modello passando la cronologia
        const chat = currentModel.startChat({ history: history });
        
        // Retry interno in caso di temporaneo sovraccarico 503 per questo modello
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await chat.sendMessage(parts);
            break; // Successo su questo tentativo!
          } catch (err: any) {
            const msg = err?.message || String(err);
            if ((msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1200));
              continue;
            }
            throw err; // Non è 503 oppure abbiamo esaurito i tentativi 503, quindi ribalta l'errore al ciclo dei modelli
          }
        }
        
        if (result) break; // Se ha risposto, usciamo dal ciclo dei modelli!

      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.error(`Gemini Error on ${modelName}:`, msg);
        
        // Se il modello ha esaurito la quota (429) o non è abilitato (403/404), passa al modello successivo!
        if (msg.includes("429") || msg.includes("exceeded your current quota") || msg.includes("403") || msg.includes("404")) {
          continue; 
        }
        
        // Altrimenti (es. bad request, immagini troppo grandi), rompiamo il ciclo
        break;
      }
    }

    if (!result && lastError) {
      throw lastError; // Tutti i modelli hanno fallito
    }
    
    return { success: true, text: result!.response.text() };
  } catch (error: any) {
    console.error("All Gemini Fallbacks Failed:", error);
    const msg = error?.message || String(error);
    
    if (msg.includes("503") || msg.includes("high demand")) {
      return { success: false, error: "I server di Google sono momentaneamente sovraccarichi per le troppe richieste. Riprova tra qualche secondo! ⏳" };
    }
    
    if (msg.includes("429") || msg.includes("exceeded your current quota")) {
      return { success: false, error: "Ops! Abbiamo esaurito i messaggi magici disponibili su tutti i modelli per oggi. Torna a trovarmi domani per continuare a studiare insieme! 🌙" };
    }
    
    return { success: false, error: "Scusa, ho avuto un momento di confusione. Riprova!" };
  }
}
