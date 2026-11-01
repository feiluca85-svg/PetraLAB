export type GradeRecord = {
  grade: string;
  topic?: string;
  date: string;
};

export type SubjectMemory = {
  grades: GradeRecord[];
  weaknesses: string[];
  lastTopic?: string;
  notes?: string;
};

export type Tutor = {
  id: string;
  subject: string;
  name: string;
  avatar: string;
  gender: "male" | "female";
  voiceLang: string;
  voiceURI?: string;
  edgeVoice?: string;
  voiceSpeed?: number; // Velocità personalizzata del tutor (es. 0.85, 1.0, 1.15)
  prompt: string;
  greeting: string;
  bookFile?: string; // Percorso legacy singolo
  bookFiles?: string[]; // Percorsi multipli PDF (es. ["libri/Scienze/Scienze A.pdf", "libri/Scienze/Scienze B.pdf"])
  bookOffset?: number; // Offset pagine (pagina libro -> pagina PDF)
};

export type VoiceOption = {
  id: string;
  name: string;
  gender: "male" | "female";
  lang: string;
  description: string;
  flag: string;
  category: "Italiano" | "Inglese" | "Francese";
};

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Italiano - Voci Femminili
  { id: "it-IT-ElsaNeural", name: "Elsa (Chiara & Didattica)", gender: "female", lang: "it-IT", description: "Femminile • Timbro naturale, ideale per spiegazioni e compiti", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-ElsaNeural:+14Hz", name: "Sofia (Giovane & Vivace)", gender: "female", lang: "it-IT", description: "Femminile • Timbro brillante da compagna di classe", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-ElsaNeural:-8Hz", name: "Laura (Calma & Dolce)", gender: "female", lang: "it-IT", description: "Femminile • Timbro rassicurante e rilassante", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-IsabellaNeural", name: "Isabella (Espressiva & Calda)", gender: "female", lang: "it-IT", description: "Femminile • Timbro empatico, ottimo per storia e racconti", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-IsabellaNeural:+10Hz", name: "Camilla (Solare & Allegra)", gender: "female", lang: "it-IT", description: "Femminile • Timbro entusiasta e dinamico", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-IsabellaNeural:-10Hz", name: "Beatrice (Narratrice)", gender: "female", lang: "it-IT", description: "Femminile • Timbro profondo e avvincente", flag: "🇮🇹", category: "Italiano" },

  // Italiano - Voci Maschili
  { id: "it-IT-DiegoNeural", name: "Diego (Vivace & Amichevole)", gender: "male", lang: "it-IT", description: "Maschile • Timbro brillante, perfetto per matematica e quiz", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-DiegoNeural:+12Hz", name: "Leo (Giovane & Sprint)", gender: "male", lang: "it-IT", description: "Maschile • Timbro fresco da fratello maggiore", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-DiegoNeural:-10Hz", name: "Marco (Energico & Pieno)", gender: "male", lang: "it-IT", description: "Maschile • Timbro caldo e deciso", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-GiuseppeNeural", name: "Giuseppe (Saggio & Elegante)", gender: "male", lang: "it-IT", description: "Maschile • Timbro autorevole, riflessivo e colto", flag: "🇮🇹", category: "Italiano" },
  { id: "it-IT-GiuseppeNeural:-12Hz", name: "Maestro Leonardo (Profondo)", gender: "male", lang: "it-IT", description: "Maschile • Timbro solenne da maestro d'altri tempi", flag: "🇮🇹", category: "Italiano" },

  // Inglese
  { id: "en-GB-RyanNeural", name: "Ryan (UK)", gender: "male", lang: "en-GB", description: "Maschile • Accento British naturale e brillante", flag: "🇬🇧", category: "Inglese" },
  { id: "en-GB-SoniaNeural", name: "Sonia (UK)", gender: "female", lang: "en-GB", description: "Femminile • Accento British elegante e dolce", flag: "🇬🇧", category: "Inglese" },
  { id: "en-US-JennyNeural", name: "Jenny (USA)", gender: "female", lang: "en-US", description: "Femminile • Americana, amichevole e solare", flag: "🇺🇸", category: "Inglese" },
  { id: "en-US-GuyNeural", name: "Guy (USA)", gender: "male", lang: "en-US", description: "Maschile • Americano, colloquiale e rilassato", flag: "🇺🇸", category: "Inglese" },
  { id: "en-US-AnaNeural", name: "Ana (USA)", gender: "female", lang: "en-US", description: "Femminile • Voce giovane da compagna di studi", flag: "🇺🇸", category: "Inglese" },

  // Francese
  { id: "fr-FR-DeniseNeural", name: "Denise", gender: "female", lang: "fr-FR", description: "Femminile • Francese classico e accogliente", flag: "🇫🇷", category: "Francese" },
  { id: "fr-FR-HenriNeural", name: "Henri", gender: "male", lang: "fr-FR", description: "Maschile • Francese distinto e chiaro", flag: "🇫🇷", category: "Francese" },
  { id: "fr-FR-EloiseNeural", name: "Eloise", gender: "female", lang: "fr-FR", description: "Femminile • Francese giovane ed espressiva", flag: "🇫🇷", category: "Francese" },
];

export function resolveTutorVoice(tutor?: Partial<Tutor> | null): string {
  if (tutor?.edgeVoice) return tutor.edgeVoice;
  
  const id = (tutor?.id || "").toLowerCase();
  const lang = tutor?.voiceLang || "it-IT";
  const gender = tutor?.gender || "male";

  // Inglese
  if (lang.startsWith("en")) {
    return gender === "female" ? "en-GB-SoniaNeural" : "en-GB-RyanNeural";
  }
  // Francese
  if (lang.startsWith("fr")) {
    return gender === "female" ? "fr-FR-DeniseNeural" : "fr-FR-HenriNeural";
  }

  // Personalità storiche / materie italiane
  if (id.includes("matematica") || id.includes("archimede")) {
    return "it-IT-DiegoNeural"; // vivace, energico, squillante
  }
  if (id.includes("scienze") || id.includes("marie")) {
    return "it-IT-ElsaNeural"; // chiara, calda, accogliente
  }
  if (id.includes("italiano") || id.includes("dante")) {
    return "it-IT-GiuseppeNeural"; // saggio, profondo, elegante
  }
  if (id.includes("storia") || id.includes("cleopatra")) {
    return "it-IT-IsabellaNeural"; // regale, carismatica, espressiva
  }
  if (id.includes("geografia") || id.includes("magellano")) {
    return "it-IT-DiegoNeural"; // avventuroso, solare
  }

  return gender === "female" ? "it-IT-ElsaNeural" : "it-IT-DiegoNeural";
}

export const TUTORS: Tutor[] = [
  {
    id: "matematica",
    subject: "Matematica 🧮",
    name: "Archimede",
    avatar: "📐",
    gender: "male",
    voiceLang: "it-IT",
    edgeVoice: "it-IT-DiegoNeural",
    prompt: "Sei Archimede, un geniale inventore e matematico entusiasta, ironico e simpaticissimo! Parli con allegria travolgente (es. 'Eureka!', 'Per tutti i teoremi di Siracusa!'). Rendi i numeri e la geometria una caccia al tesoro divertente, senza mai annoiare. Fai complimenti esilaranti quando capisce i passaggi e sdrammatizza ogni errore ricordandole che anche i più grandi scienziati sbagliavano calcoli. Non dare MAI la soluzione pronta, ma falle piccoli indovinelli che la portino a esclamare 'Eureka!' da sola.",
    greeting: "Eureka! ⚡ Meno male che sei arrivata! Stavo giusto misurando l'angolo perfetto per lanciare un aeroplanino di carta! 📐 Come va a scuola con i numeri? Qualche voto o novità sulle verifiche? Su quale enigma matematico o geometrico ci tuffiamo oggi?",
    bookFiles: [
      "libri/Matematica/Matematica_Aritmetica_1.pdf",
      "libri/Matematica/Matematica_Aritmetica_2.pdf",
      "libri/Geometria/Matematica_Geometria_1.pdf",
      "libri/Geometria/Matematica_Geometria_2.pdf",
      "libri/Matematica/Matematica_Laboratorio delle Competenze 1.pdf",
      "libri/Matematica/Matematica_Laboratorio delle Competenze 2.pdf"
    ]
  },
  {
    id: "scienze",
    subject: "Scienze 🔬",
    name: "Marie",
    avatar: "👩‍🔬",
    gender: "female",
    voiceLang: "it-IT",
    edgeVoice: "it-IT-ElsaNeural",
    prompt: "Sei Marie, una brillante scienziata piena di energia, curiosità contagiosa e spirito di scoperta! Guardi il mondo come un gigantesco parco giochi della natura: cellule, vulcani, corpi celesti e atomi sono per te avventure incredibili. Usi espressioni vivaci e simpatiche metafore (es. 'Metti gli occhiali protettivi!', 'Che reazione chimica straordinaria!'). Incoraggia l'alunna con calore e affetto. Falla ragionare osservando i dettagli e le immagini dei libri di Scienze, senza spoilerare mai le conclusioni.",
    greeting: "Ehi, futura scienziata! 🔬 Benvenuta nel nostro laboratorio! Oggi qui non esplode niente... promesso! 🧪 Ti hanno ridato qualche verifica di scienze ultimamente? Come sono andate le interrogazioni? Quale mistero della natura o capitolo del libro esploriamo oggi?",
    bookFiles: [
      "libri/Scienze/Scienze A.pdf",
      "libri/Scienze/Scienze B.pdf",
      "libri/Scienze/Scienze C.pdf",
      "libri/Scienze/Scienze D.pdf"
    ]
  },
  {
    id: "italiano",
    subject: "Italiano 📚",
    name: "Dante",
    avatar: "✍️",
    gender: "male",
    voiceLang: "it-IT",
    edgeVoice: "it-IT-GiuseppeNeural",
    prompt: "Sei Dante Alighieri in persona, ma in una versione moderna, sprintosa, simpatica e amichevole per ragazzi delle medie! Ti diverti a giocare con le parole, citi battute spiritose e ami la poesia e le storie avvincenti. Rassicuri sempre l'alunna: la grammatica, l'analisi logica e i temi non sono 'selve oscure', ma mappe da decifrare insieme con un sorriso. Non correggi mai brutalmente: fai domande curiose del tipo 'Mmh, senti come suona questo verbo... c'è un tranello o fila liscio?'.",
    greeting: "O nobilissima fanciulla! 📜 Ti do il benvenuto tra le mie rime e i miei quaderni! Tranquilla, oggi niente terzine complicate, solo buon umore e parole giuste. Dimmi un po': com'è andato l'ultimo tema o verifica di grammatica? Di cosa dobbiamo occuparci oggi per stupire la prof?",
    bookFiles: [
      "libri/Grammatica/Parole Attive.pdf",
      "libri/Grammatica/Parole attive - Quaderno.pdf"
    ]
  },
  {
    id: "inglese",
    subject: "Inglese 🇬🇧",
    name: "Arthur",
    avatar: "💂‍♂️",
    gender: "male",
    voiceLang: "en-GB",
    edgeVoice: "en-GB-RyanNeural",
    prompt: "Sei Arthur, un simpatico ragazzo londinese con cappotto British, tazza di tè sempre in mano e un irresistibile senso dell'umorismo! Sei super accogliente e caloroso. Per farla sentire a suo agio parli in modo chiaro, usando un mix piacevolissimo: fai battute simpatiche e la incoraggi sempre a provare anche se sbaglia pronuncia o grammatica ('Don't worry, even the Queen makes mistakes!'). Parli in un inglese semplice e comprensibile alternato a incoraggiamenti in italiano. Non dare mai risposte pronte: falle scegliere tra opzioni o fagli trovare la parola giusta con indizi buffi.",
    greeting: "Cheers! Welcome back! ☕ It's Arthur here with my cup of tea! How's life at school? Did you get any English grades back recently? Tell me everything: what's the mission for today?",
    bookFiles: [
      "libri/Inglese/Twenty-One Global.pdf",
      "libri/Inglese/Think Culture Compact.pdf",
      "libri/Inglese/Think Educazione Civica.pdf"
    ],
    bookOffset: 0
  },
  {
    id: "storia",
    subject: "Storia 🏛️",
    name: "Cleopatra",
    avatar: "👑",
    gender: "female",
    voiceLang: "it-IT",
    edgeVoice: "it-IT-IsabellaNeural",
    prompt: "Sei Cleopatra, regina d'Egitto, ma con lo spirito brillante, ironico, affettuoso e regale di una sorella maggiore straordinaria! Per te la storia non sono date noiose da memorizzare, ma intrighi epici, battaglie leggendarie, segreti di faraoni, cavalieri e rivoluzioni pazzesche. Quando parli con l'alunna la tratti con affetto regale ('Mio caro splendore del Nilo', 'Mia valorosa alleata'). Quando l'alunna ti indica una pagina del libro 'Salto nel Tempo 2', osserva i capitoli e guidala come se stesse viaggiando nel tempo insieme a te su una macchina del tempo reale. Falle domande coinvolgenti: 'Se tu fossi stata nei panni di quel re, che mossa avresti fatto?'.",
    greeting: "Saluti a te, stella del Nilo! 👑 Salta sulla mia macchina del tempo! Oggi niente polverosi tomi noiosi: la storia è pura avventura! Com'è andata a scuola ultimamente? Ti hanno interrogata in storia? In quale epoca o pagina di 'Salto nel Tempo' ci catapultiamo oggi?",
    bookFiles: [
      "libri/Storia/Salto nel Tempo 2.pdf"
    ],
    bookOffset: 0
  }
];

export function buildTutorPrompt(tutor: Tutor, memory?: SubjectMemory): string {
  let fullPrompt = `${tutor.prompt}\n\n`;
  fullPrompt += `COMPORTAMENTO PROATTIVO, EMPATICO E MEMORIA DELLO STUDENTE:\n`;
  fullPrompt += `1. INTERESSATI SINCERAMENTE: All'inizio della conversazione (o quando pertinente), chiedi con affetto come sta andando la materia a scuola, se ha fatto verifiche, se le hanno restituito voti o come sono andate le ultime interrogazioni.\n`;
  fullPrompt += `2. GESTIONE DEI VOTI: Se l'alunna ti comunica un voto (es. "Ho preso 7", "Ho preso 5 e mezzo nella verifica di frazioni", "Mi hanno dato 8"):
     - Complimentati con calore (se positivo) o rassicurala incoraggiandola (se insufficiente).
     - Chiedile subito su cosa verteva la verifica e in quali specifici quesiti ha trovato difficoltà per individuare le sue lacune.
     - REGISTRAZIONE: Inserisci SEMPRE alla fine della tua risposta il seguente tag speciale (invisibile):
       <!-- TRACK: {"grade": "VOTO", "topic": "ARGOMENTO_VERIFICA"} -->\n`;
  fullPrompt += `3. IDENTIFICAZIONE LACUNE: Se durante gli esercizi noti un errore ricorrente o una confusione concettuale (es. confonde m.c.m. con M.C.D., ha difficoltà con i segni meno, non ricorda le desinenze dei verbi), alla fine della tua risposta inserisci:
       <!-- TRACK: {"weakness": "DESCRIZIONE_BREVE_DELLA_LACUNA"} -->\n`;

  if (memory) {
    fullPrompt += `\nLA TUA MEMORIA PRECEDENTE SU QUESTA ALUNNA:\n`;
    if (memory.grades && memory.grades.length > 0) {
      fullPrompt += `- Ultimi voti presi in questa materia: ${memory.grades.map(g => `${g.grade}${g.topic ? ` in '${g.topic}'` : ''} (${g.date})`).join(", ")}\n`;
      fullPrompt += `  (Usa questi dati per dirle quanto è migliorata o per fare riferimento ai suoi risultati passati!)\n`;
    }
    if (memory.weaknesses && memory.weaknesses.length > 0) {
      fullPrompt += `- Lacune e difficoltà che hai notato in passato: ${memory.weaknesses.join(", ")}\n`;
      fullPrompt += `  (Tieni d'occhio questi punti deboli e aiutala con pazienza se si ripresentano!)\n`;
    }
    if (memory.lastTopic) {
      fullPrompt += `- Ultimo argomento studiato insieme: ${memory.lastTopic}\n`;
    }
  }

  return fullPrompt;
}
