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
  tutor?: any;
}) {
  try {
    const { subject, pagesQuery, count = 5, tutor } = params;
    
    // Estrae le pagine esatte del libro associato al tutor usando i numeri stampati
    let bookPagesData = getBookPagesForRange(pagesQuery, tutor, 4);

    const parts: Part[] = [];

    let prompt = `Sei un esperto professore e creatore didattico per le scuole medie (12-13 anni).
Crea un mazzo di ${count} Flashcard di studio focalizzate RIGOROSAMENTE sull'argomento delle pagine indicate: "${pagesQuery}" (Materia: ${subject}).

${bookPagesData?.topicName ? `ARGOMENTO CHIAVE DI QUESTE PAGINE: "${bookPagesData.topicName}" (Capitolo/Unità: ${bookPagesData.unitTitle || ''}).` : ''}
${bookPagesData?.pages?.length ? `PAGINE DEL LIBRO DI TESTO DA CUI GENERARE LE DOMANDE: Pagine stampate ${bookPagesData.pages.join(", ")}.` : ''}

IMPORTANTE: 
1. Le flashcard DEVONO vertere ESCLUSIVAMENTE sui concetti trattati in queste specifiche pagine (es. se le pagine 14-19 di Geografia parlano di Cittadinanza Europea, Diritti, Trattato di Schengen, Erasmus e Agenda 2030, NON fare domande sulla Spagna o su altri Stati!).
2. Basati su nozioni, definizioni, date e concetti chiave essenziali.

REQUISITI DI FORMATTAZIONE:
Rispondi ESCLUSIVAMENTE con un array JSON valido senza markdown circostante o con blocco \`\`\`json.
Ogni elemento deve avere:
- "id": stringa univoca (es: "fc_1")
- "question": la domanda o concetto da ricordare (max 15 parole, stimolante e chiara)
- "answer": la spiegazione o risposta sintetica ed efficace (2-3 frasi, comprensibile e corretta)
- "hint": un piccolo indizio per aiutarla a ricordare se è in difficoltà (1 frase)
- "bookReference": riferimento alla pagina stampata sul libro (es. "Pag. ${bookPagesData?.pages?.[0] || '16'}")`;

    if (bookPagesData && bookPagesData.images.length > 0) {
      prompt += `\n\nATTENZIONE: Ho allegato ${bookPagesData.images.length} pagine scansionate del libro di testo adottato per questa materia (Pagine stampate del libro: ${bookPagesData.pages.join(", ")}).
Estrai le flashcard ESATTAMENTE dai contenuti, definizioni, cartine e tabelle presenti in queste pagine allegate!`;
      
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
  tutor?: any;
}) {
  try {
    const { subject, pagesQuery, count = 5, tutor } = params;

    // Estrae le pagine esatte del libro associato al tutor usando i numeri stampati
    let bookPagesData = getBookPagesForRange(pagesQuery, tutor, 4);

    const parts: Part[] = [];

    let prompt = `Sei un esperto professore e creatore didattico per ragazzi delle scuole medie (12-13 anni).
Crea un quiz interattivo di ${count} domande a risposta multipla focalizzato RIGOROSAMENTE sulle pagine indicate: "${pagesQuery}" (Materia: ${subject}).

${bookPagesData?.topicName ? `ARGOMENTO CHIAVE DI QUESTE PAGINE: "${bookPagesData.topicName}" (Capitolo/Unità: ${bookPagesData.unitTitle || ''}).` : ''}
${bookPagesData?.pages?.length ? `PAGINE DEL LIBRO DI TESTO DA CUI GENERARE LE DOMANDE: Pagine stampate ${bookPagesData.pages.join(", ")}.` : ''}

IMPORTANTE: 
1. Le domande DEVONO vertere ESCLUSIVAMENTE sui concetti trattati in queste specifiche pagine (es. se le pagine 14-19 di Geografia parlano di Cittadinanza Europea, Diritti, Trattato di Schengen, Erasmus e Agenda 2030, NON fare domande sulla Spagna o su altri Stati!).
2. Calibrate sul programma di 2ª media e focalizzate sui fatti e nozioni più importanti.

REQUISITI DI FORMATTAZIONE:
Rispondi ESCLUSIVAMENTE con un array JSON valido senza markdown circostante o con blocco \`\`\`json.
Ogni elemento deve avere:
- "id": stringa univoca (es: "q_1")
- "question": il testo chiaro della domanda
- "options": un array di esattamente 4 opzioni plausibili in lingua italiana
- "correctIndex": il numero indice dell'opzione corretta (0, 1, 2, o 3)
- "explanation": una spiegazione chiara, incoraggiante e istruttiva del perché questa risposta è corretta (1-2 frasi)
- "bookReference": riferimento alla pagina stampata sul libro (es. "Pag. ${bookPagesData?.pages?.[0] || '16'}")`;

    if (bookPagesData && bookPagesData.images.length > 0) {
      prompt += `\n\nATTENZIONE: Ho allegato ${bookPagesData.images.length} pagine del libro di testo adottato per questa materia (Pagine stampate del libro: ${bookPagesData.pages.join(", ")}).
Formula le domande e le opzioni basandoti DIRETTAMENTE su ciò che è scritto e illustrato in queste pagine!`;
      
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
