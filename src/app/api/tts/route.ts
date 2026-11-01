import { NextRequest, NextResponse } from "next/server";
import { EdgeTTS } from "node-edge-tts";
import { resolveTutorVoice } from "@/lib/tutors";

// Cache in memoria per audio già generati (chiave: hash/stringa voce+testo)
const audioCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const MAX_CACHE_SIZE = 60;

function cleanTextForSpeech(text: string, isEnglish: boolean = false): string {
  let clean = text;
  
  // Rimuovi commenti nascosti come <!-- TRACK: ... -->
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  
  // Rimuovi blocchi di codice
  clean = clean.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/`([^`]+)`/g, "$1");

  if (!isEnglish) {
    // Formule matematiche in italiano
    clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 fratto $2");
    clean = clean.replace(/\\text\{([^}]+)\}/g, "$1");
    clean = clean.replace(/\\sqrt\{([^}]+)\}/g, "radice quadrata di $1");
    clean = clean.replace(/\^2\b/g, " alla seconda");
    clean = clean.replace(/\^3\b/g, " alla terza");
    clean = clean.replace(/\^([0-9]+)/g, " alla $1");
    clean = clean.replace(/\\times|\\cdot|\s\*\s/g, " per ");
    clean = clean.replace(/\\div|\s\/\s/g, " diviso ");
    clean = clean.replace(/\s\+\s/g, " più ");
    clean = clean.replace(/\s\-\s/g, " meno ");
    clean = clean.replace(/\s=\s/g, " uguale a ");
    clean = clean.replace(/\s\+-\s|\\pm/g, " più o meno ");
    clean = clean.replace(/\\pi/g, "pi greco");
  } else {
    // Basic math in English
    clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2");
    clean = clean.replace(/\\text\{([^}]+)\}/g, "$1");
    clean = clean.replace(/\\sqrt\{([^}]+)\}/g, "square root of $1");
    clean = clean.replace(/\^2\b/g, " squared");
    clean = clean.replace(/\^3\b/g, " cubed");
  }

  // Rimuovi altri comandi LaTeX residui
  clean = clean.replace(/\\([a-zA-Z]+)/g, "");

  // Rimuovi caratteri speciali markdown e simboli
  clean = clean.replace(/[\$\*\#\_`\{\}\[\]\\]/g, " ");

  // Normalizza punteggiatura ed emoji
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice, tutorId, gender, lang, rate } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Testo mancante" }, { status: 400 });
    }

    const isEnglish = (lang || "").startsWith("en");
    const clean = cleanTextForSpeech(text, isEnglish);

    if (!clean) {
      return NextResponse.json({ error: "Testo non pronunciabile" }, { status: 400 });
    }

    // Risolvi la voce neurale Edge adeguata
    const targetVoice = voice || resolveTutorVoice({
      id: tutorId,
      gender: gender,
      voiceLang: lang,
    });

    const cacheKey = `${targetVoice}:${rate || "default"}:${clean}`;

    // Controllo cache
    const cached = audioCache.get(cacheKey);
    if (cached) {
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // Sintesi con Microsoft Edge TTS
    const tts = new EdgeTTS({
      voice: targetVoice,
      rate: rate || "default",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    });

    const chunks: Buffer[] = [];
    for await (const chunk of tts.streamAudio(clean)) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      throw new Error("Nessun frammento audio generato");
    }

    const audioBuffer = Buffer.concat(chunks);

    // Salva in cache con gestione dimensione massima
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, { buffer: audioBuffer, timestamp: Date.now() });

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("Errore sintesi TTS neurale:", error);
    return NextResponse.json(
      { error: error?.message || "Errore durante la sintesi vocale" },
      { status: 500 }
    );
  }
}
