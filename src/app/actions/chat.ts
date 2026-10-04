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

    // Invia il nuovo messaggio
    const result = await chat.sendMessage(parts);
    
    return { success: true, text: result.response.text() };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { success: false, error: "Scusa, ho avuto un momento di confusione. Riprova!" };
  }
}
