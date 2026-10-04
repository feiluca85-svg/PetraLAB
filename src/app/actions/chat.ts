"use server";

import { tutorModel } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";

export async function sendMessage(
  message: string, 
  history: Content[],
  image?: { base64: string; mimeType: string }
) {
  try {
    // Inizializza la chat passando la cronologia precedente
    const chat = tutorModel.startChat({
      history: history,
    });

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

    // Invia il nuovo messaggio con retry automatico in caso di temporaneo sovraccarico 503
    let result = null;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await chat.sendMessage(parts);
        break; // Successo!
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || "";
        if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) {
          // Attendi 1.2 secondi prima di riprovare
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        // Se è un altro errore, esci subito
        throw err;
      }
    }

    if (!result && lastError) {
      throw lastError;
    }
    
    return { success: true, text: result!.response.text() };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const msg = error?.message || "";
    
    if (msg.includes("503") || msg.includes("high demand")) {
      return { success: false, error: "I server di Google sono momentaneamente sovraccarichi per le troppe richieste. Riprova tra qualche secondo! ⏳" };
    }
    
    return { success: false, error: "Scusa, ho avuto un momento di confusione. Riprova!" };
  }
}
