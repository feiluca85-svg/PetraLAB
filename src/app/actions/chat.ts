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
  } catch (error: any) {
    console.error("Gemini Error:", error);
    try {
      // Interroghiamo Google per sapere quali modelli sono realmente abilitati per questa chiave
      const key = process.env.GEMINI_API_KEY || "";
      const keyPreview = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "VUOTA";
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      
      if (data.models) {
        const modelNames = data.models.map((m: any) => m.name.replace('models/', '')).slice(0, 5).join(', ');
        return { success: false, error: `[DEBUG API] Chiave: ${keyPreview}. Modelli disponibili: ${modelNames}` };
      } else {
        return { success: false, error: `[DEBUG API] Chiave: ${keyPreview}. Risposta Google: ${JSON.stringify(data)}` };
      }
    } catch (e: any) {
      const msg = error?.message || "Errore sconosciuto";
      return { success: false, error: `[DEBUG API] ${msg}` };
    }
  }
}
