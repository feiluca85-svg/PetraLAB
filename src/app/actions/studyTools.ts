"use server";

import { genAI } from "@/lib/gemini";
import { Part } from "@google/generative-ai";
import { getBookPagesForRange } from "@/lib/bookReader";

export type StudyDifficulty = "facile" | "medio" | "difficile";

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
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];

const VARIETY_ANGLES = [
  "Focalizzati su esempi pratici, curiosità storiche o scientifiche, date/dati ed effetti di causa-conseguenza presenti nel testo.",
  "Metti in luce definizioni precise, parole chiave evidenziate in grassetto e termini tecnici spiegati nelle pagine.",
  "Approfondisci i 'perché' dei fenomeni o dei passaggi logici, le relazioni tra concetti e le applicazioni nella vita quotidiana.",
  "Attingi anche dai box laterali, schemi riassuntivi, cartine o didascalie delle illustrazioni presenti nelle pagine."
];

function getDifficultyFlashcardInstruction(diff: StudyDifficulty = "medio"): string {
  switch (diff) {
    case "facile":
      return `LIVELLO DI DIFFICOLTÀ: FACILE (Principiante / Basi essenziali).
- Formula domande dirette, chiare e rassicuranti sui concetti fondamentali (definizioni chiave, chi/cosa/dove/quando).
- Risposte brevi, semplici e cristalline (1-2 frasi comprensibili a tutti).
- Indizio immediato e molto incoraggiante.`;
    case "difficile":
      return `LIVELLO DI DIFFICOLTÀ: DIFFICILE (Avanzato / Sfida da 10 e lode).
- Formula domande stimolanti e approfondite: richiedi ragionamenti, cause profonde, collegamenti logici, dettagli specifici presenti nei box/figure/tabelle o differenze sottili tra concetti simili.
- Risposte ricche, articolate e precise (2-3 frasi dettagliate).
- Indizio sagace che stimola il pensiero senza svelare subito la risposta.`;
    case "medio":
    default:
      return `LIVELLO DI DIFFICOLTÀ: MEDIO (Standard 2ª media).
- Formula domande equilibrate di comprensione: perché avvengono certi fatti/fenomeni, come funzionano le regole o concetti cardine.
- Risposte esaustive e ben spiegate (2-3 frasi).
- Indizio chiaro e utile.`;
  }
}

function getDifficultyQuizInstruction(diff: StudyDifficulty = "medio"): string {
  switch (diff) {
    case "facile":
      return `LIVELLO DI DIFFICOLTÀ: FACILE (Principiante / Basi essenziali).
- Domande lineari e intuitive sulle nozioni principali.
- I 3 distrattori (opzioni errate) devono essere chiaramente distinguibili ma pertinenti alla materia.
- Spiegazione amichevole e immediata.`;
    case "difficile":
      return `LIVELLO DI DIFFICOLTÀ: DIFFICILE (Avanzato / Sfida da 10 e lode).
- Domande sfidanti che testano la padronanza profonda: dettagli precisi del testo, trabocchetti tipici delle verifiche, deduzioni logiche o collegamenti tra paragrafi.
- I 3 distrattori devono essere molto verosimili e ingannevoli per chi ha studiato superficialmente.
- Spiegazione dettagliata, istruttiva e ricca di valore didattico.`;
    case "medio":
    default:
      return `LIVELLO DI DIFFICOLTÀ: MEDIO (Standard 2ª media).
- Domande bilanciate sui concetti cardine, cause ed effetti e definizioni importanti.
- I 3 distrattori devono essere plausibili e sensati.
- Spiegazione chiara che rinforza l'apprendimento.`;
  }
}

/**
 * Generates interactive flashcards based on book pages or subject topic.
 */
export async function generateFlashcards(params: {
  subject: string;
  pagesQuery: string;
  count?: number;
  difficulty?: StudyDifficulty;
  selectedBookFile?: string;
  tutor?: any;
}) {
  try {
    const { subject, pagesQuery, count = 5, difficulty = "medio", selectedBookFile, tutor } = params;
    
    // Estrae fino a 8 pagine esatte del libro associato al tutor usando i numeri stampati
    let bookPagesData = getBookPagesForRange(pagesQuery, tutor, 8, selectedBookFile);

    const parts: Part[] = [];
    const sessionSalt = Math.random().toString(36).substring(2, 8);
    const randomAngle = VARIETY_ANGLES[Math.floor(Math.random() * VARIETY_ANGLES.length)];

    let prompt = `Sei un esperto professore e creatore didattico per le scuole medie (12-13 anni).
Crea un mazzo di ${count} Flashcard di studio focalizzate RIGOROSAMENTE sull'argomento delle pagine indicate: "${pagesQuery}" (Materia: ${subject}).

${bookPagesData?.topicName ? `ARGOMENTO CHIAVE DI QUESTE PAGINE: "${bookPagesData.topicName}" (Capitolo/Unità: ${bookPagesData.unitTitle || ''}).` : ''}
${bookPagesData?.pages?.length ? `PAGINE DEL LIBRO DI TESTO DA CUI GENERARE LE DOMANDE: Pagine stampate ${bookPagesData.pages.join(", ")}.` : ''}

${getDifficultyFlashcardInstruction(difficulty)}

VARIETÀ E ORIGINALITÀ (Sessione ID #${sessionSalt}):
- Angolatura speciale di questa generazione: ${randomAngle}
- Evita di ripetere sempre e solo le stesse ovvie 2 definizioni generiche o la primissima riga del capitolo.
- Esplora il testo in modo fresco, dinamico e vario ad ogni generazione.

DELIMITAZIONE RIGOROSA DEI CONTENUTI:
1. Le flashcard DEVONO basarsi ESCLUSIVAMENTE sulle nozioni, definizioni e concetti trattati in queste specifiche pagine fornite.
2. NON introdurre argomenti da altre unità, capitoli precedenti o successivi, né nozioni non presenti in queste pagine.
3. Se sono allegate immagini delle pagine del libro, leggi attentamente il testo stampato nelle immagini e formula le flashcard basandoti DIRETTAMENTE su ciò che è scritto!

REQUISITI DI FORMATTAZIONE:
Rispondi ESCLUSIVAMENTE con un array JSON valido senza markdown circostante o con blocco \`\`\`json.
Ogni elemento deve avere:
- "id": stringa univoca (es: "fc_1")
- "question": la domanda o concetto da ricordare (max 18 parole, stimolante e chiara)
- "answer": la spiegazione o risposta sintetica ed efficace (2-3 frasi, comprensibile e corretta)
- "hint": un piccolo indizio per aiutarla a ricordare se è in difficoltà (1 frase)
- "bookReference": riferimento alla pagina stampata sul libro (es. "Pag. ${bookPagesData?.pages?.[0] || '16'}")`;

    if (bookPagesData && bookPagesData.images.length > 0) {
      prompt += `\n\nATTENZIONE: Ho allegato ${bookPagesData.images.length} pagine scansionate del libro di testo adottato per questa materia (Pagine stampate del libro: ${bookPagesData.pages.join(", ")}).
Estrai le flashcard ESATTAMENTE dai contenuti, definizioni, cartine, box ed esempi visibili in queste pagine allegate!`;
      
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
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.9
          }
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
  difficulty?: StudyDifficulty;
  selectedBookFile?: string;
  tutor?: any;
}) {
  try {
    const { subject, pagesQuery, count = 5, difficulty = "medio", selectedBookFile, tutor } = params;

    // Estrae fino a 8 pagine esatte del libro associato al tutor usando i numeri stampati
    let bookPagesData = getBookPagesForRange(pagesQuery, tutor, 8, selectedBookFile);

    const parts: Part[] = [];
    const sessionSalt = Math.random().toString(36).substring(2, 8);
    const randomAngle = VARIETY_ANGLES[Math.floor(Math.random() * VARIETY_ANGLES.length)];

    let prompt = `Sei un esperto professore e creatore didattico per ragazzi delle scuole medie (12-13 anni).
Crea un quiz interattivo di ${count} domande a risposta multipla focalizzato RIGOROSAMENTE sulle pagine indicate: "${pagesQuery}" (Materia: ${subject}).

${bookPagesData?.topicName ? `ARGOMENTO CHIAVE DI QUESTE PAGINE: "${bookPagesData.topicName}" (Capitolo/Unità: ${bookPagesData.unitTitle || ''}).` : ''}
${bookPagesData?.pages?.length ? `PAGINE DEL LIBRO DI TESTO DA CUI GENERARE LE DOMANDE: Pagine stampate ${bookPagesData.pages.join(", ")}.` : ''}

${getDifficultyQuizInstruction(difficulty)}

VARIETÀ E ORIGINALITÀ (Sessione ID #${sessionSalt}):
- Angolatura speciale di questa generazione: ${randomAngle}
- Varia le domande e le opzioni: esplora diversi paragrafi, curiosità, esempi e dettagli per evitare di fare sempre le stesse domande ovvie.

DELIMITAZIONE RIGOROSA DEI CONTENUTI:
1. Le domande DEVONO vertere ESCLUSIVAMENTE sui concetti trattati in queste specifiche pagine fornite.
2. NON introdurre argomenti da altre unità, capitoli successivi o precedenti, né nozioni non presenti in queste pagine.
3. Se sono allegate immagini delle pagine del libro, leggi attentamente il testo e i dettagli visibili e formula le domande basandoti DIRETTAMENTE su ciò che è scritto e illustrato!

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
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.9
          }
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
