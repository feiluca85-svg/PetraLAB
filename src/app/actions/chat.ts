"use server";

import { genAI, SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";
import { TUTORS, buildTutorPrompt, SubjectMemory } from "@/lib/tutors";

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
  tutorId?: string,
  subjectMemory?: SubjectMemory
) {
  try {
    // Calcola l'istruzione di sistema specifica per il tutor e la sua memoria
    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (tutorId) {
      const tutor = TUTORS.find(t => t.id === tutorId);
      if (tutor) {
        dynamicInstruction = buildTutorPrompt(tutor, subjectMemory);
      }
    }

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
    
    return { success: false, error: "Scusa, ho avuto un momento di confusione. Riprova!" };
  }
}
