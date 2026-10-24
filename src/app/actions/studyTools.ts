"use server";

import { genAI } from "@/lib/gemini";
import { Part } from "@google/generative-ai";
import { getBookPagesForRange } from "@/lib/bookReader";

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  bookReference?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  bookReference?: string;
}

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

/**
 * Generates interactive flashcards based on book pages or subject topic.
 */
export async function generateFlashcards(params: {
  subject: string;
  pagesQuery: string;
  count?: number;
}) {
  try {
    const { subject, pagesQuery, count = 5 } = params;
    const isGeografia = subject.toLowerCase().includes("geograf");
    let bookPagesData = null;

    if (isGeografia) {
      bookPagesData = getBookPagesForRange(pagesQuery, 3);
    }

    const parts: Part[] = [];

    let prompt = `Sei un esperto professore e creatore didattico per le scuole medie (12-13 anni).
Crea un mazzo di ${count} Flashcard di studio su: "${pagesQuery}" (Materia: ${subject}).
Le flashcard devono essere chiare, coinvolgenti, basate su concetti chiave essenziali (definizioni, città/capitali, rilievi, fiumi, clima, economia o eventi storici).

REQUISITI DI FORMATTAZIONE:
Rispondi ESCLUSIVAMENTE con un array JSON valido senza markdown circostante o con blocco \`\`\`json.
Ogni elemento deve avere:
- "id": stringa univoca (es: "fc_1")
- "question": la domanda o concetto da ricordare (max 15 parole, stimolante e chiara)
- "answer": la spiegazione o risposta sintetica ed efficace (2-3 frasi, comprensibile e corretta)
- "hint": un piccolo indizio per aiutarla a ricordare se è in difficoltà (1 frase)
- "bookReference": riferimento al libro o pagina (es. "Greenway 2 - Pag. 44")`;

    if (bookPagesData && bookPagesData.images.length > 0) {
      prompt += `\n\nATTENZIONE: Ho allegato ${bookPagesData.images.length} pagine scansionate del libro di testo "Greenway 2" (Pagine ${bookPagesData.pages.join(", ")}).
Estrai le flashcard ESATTAMENTE dai contenuti, definizioni, cartine e tabelle presenti in queste pagine!`;
      
      for (const img of bookPagesData.images) {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType
          }
        });
      }
    }

    parts.push({ text: prompt });

    let rawJson = "";
    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        const res = await model.generateContent(parts);
        rawJson = res.response.text();
        if (rawJson) break;
      } catch (e: any) {
        console.warn(`[StudyTools] Model ${modelName} failed for flashcards:`, e?.message);
        continue;
      }
    }

    if (!rawJson) {
      throw new Error("Impossibile generare le flashcard al momento. Riprova tra poco.");
    }

    const cleanedJson = rawJson.replace(/```json\s*|```\s*/g, "").trim();
    const flashcards: FlashcardItem[] = JSON.parse(cleanedJson);

    return {
      success: true,
      flashcards,
      bookPages: bookPagesData?.pages || [],
      topicName: bookPagesData?.topicName || pagesQuery
    };
  } catch (error: any) {
    console.error("[generateFlashcards] Error:", error);
    return {
      success: false,
      error: error?.message || "Si è verificato un errore nella creazione delle flashcard."
    };
  }
}

/**
 * Generates an interactive multiple-choice quiz based on book pages or subject topic.
 */
export async function generateQuiz(params: {
  subject: string;
  pagesQuery: string;
  count?: number;
}) {
  try {
    const { subject, pagesQuery, count = 5 } = params;
    const isGeografia = subject.toLowerCase().includes("geograf");
    let bookPagesData = null;

    if (isGeografia) {
      bookPagesData = getBookPagesForRange(pagesQuery, 3);
    }

    const parts: Part[] = [];

    let prompt = `Sei un esperto professore e creatore didattico per ragazzi delle scuole medie (12-13 anni).
Crea un quiz interattivo di ${count} domande a risposta multipla su: "${pagesQuery}" (Materia: ${subject}).
Le domande devono essere divertenti, stimolanti, calibrate sul programma di 2ª media e focalizzate sui fatti e nozioni più importanti.

REQUISITI DI FORMATTAZIONE:
Rispondi ESCLUSIVAMENTE con un array JSON valido senza markdown circostante o con blocco \`\`\`json.
Ogni elemento deve avere:
- "id": stringa univoca (es: "q_1")
- "question": il testo chiaro della domanda
- "options": un array di esattamente 4 opzioni plausibili in lingua italiana
- "correctIndex": il numero indice dell'opzione corretta (0, 1, 2, o 3)
- "explanation": una spiegazione chiara, incoraggiante e istruttiva del perché questa risposta è corretta (1-2 frasi)
- "bookReference": riferimento al libro o pagina (es. "Greenway 2 - Pag. 45")`;

    if (bookPagesData && bookPagesData.images.length > 0) {
      prompt += `\n\nATTENZIONE: Ho allegato ${bookPagesData.images.length} pagine del libro "Greenway 2" (Pagine ${bookPagesData.pages.join(", ")}).
Formula le domande e le opzioni basandoti DIRETTAMENTE su ciò che è scritto in queste pagine!`;
      
      for (const img of bookPagesData.images) {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType
          }
        });
      }
    }

    parts.push({ text: prompt });

    let rawJson = "";
    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        const res = await model.generateContent(parts);
        rawJson = res.response.text();
        if (rawJson) break;
      } catch (e: any) {
        console.warn(`[StudyTools] Model ${modelName} failed for quiz:`, e?.message);
        continue;
      }
    }

    if (!rawJson) {
      throw new Error("Impossibile generare il quiz al momento. Riprova tra poco.");
    }

    const cleanedJson = rawJson.replace(/```json\s*|```\s*/g, "").trim();
    const questions: QuizQuestion[] = JSON.parse(cleanedJson);

    return {
      success: true,
      questions,
      bookPages: bookPagesData?.pages || [],
      topicName: bookPagesData?.topicName || pagesQuery
    };
  } catch (error: any) {
    console.error("[generateQuiz] Error:", error);
    return {
      success: false,
      error: error?.message || "Si è verificato un errore nella creazione del quiz."
    };
  }
}
