import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import bookIndexData from "@/data/geografia_libro_index.json";

export interface BookMatchResult {
  bookPage: number;
  pdfPage: number;
  pdfPath: string;
  topicName?: string;
  unitTitle?: string;
  unitNumber?: number;
}

export interface BookPageImage {
  base64: string;
  mimeType: string;
  bookPage: number;
  pdfPage: number;
  pdfPath: string;
  topicName?: string;
  unitTitle?: string;
}

const CACHE_DIR = path.join("/tmp", "petralab_book_cache");
const PYTHON_EXTRACTOR = path.join(process.cwd(), "scripts", "extract_page.py");

/**
 * Risolve la lista o il singolo percorso del PDF per il tutor:
 * 1. Se il tutor ha `bookFiles` (multipli), seleziona quello più pertinente al testo o il primo principale.
 * 2. Se ha `bookFile` (singolo), usa quello.
 * 3. Altrimenti cerca i PDF disponibili nella cartella della sua materia.
 */
export function resolveTutorBookPath(
  tutor?: { subject?: string; name?: string; bookFile?: string; bookFiles?: string[] },
  queryText?: string
): { pdfPath: string; offset: number } | null {
  if (!tutor) return null;

  const candidateFiles: string[] = [];

  if (Array.isArray(tutor.bookFiles) && tutor.bookFiles.length > 0) {
    candidateFiles.push(...tutor.bookFiles);
  } else if (tutor.bookFile) {
    candidateFiles.push(tutor.bookFile);
  }

  // Se ha libri espliciti associati:
  if (candidateFiles.length > 0) {
    // Se c'è più di un libro, prova a vedere se il testo cita un libro specifico (es. "atlante", "civica", "scienze b")
    if (candidateFiles.length > 1 && queryText) {
      const q = queryText.toLowerCase();
      const matched = candidateFiles.find(f => {
        const base = path.basename(f, ".pdf").toLowerCase();
        // Esempi: "scienze a", "scienze b", "atlante", "civica", "culture"
        const words = base.split(/[^a-z0-9]/).filter(w => w.length > 2);
        return words.some(w => q.includes(w));
      });
      if (matched) {
        const full = path.isAbsolute(matched) ? matched : path.join(process.cwd(), matched);
        if (fs.existsSync(full)) {
          return { pdfPath: full, offset: 0 };
        }
      }
    }

    // Altrimenti usa il primo valido
    for (const f of candidateFiles) {
      const full = path.isAbsolute(f) ? f : path.join(process.cwd(), f);
      if (fs.existsSync(full)) {
        let offset = 0;
        if (f.toLowerCase().includes("greenway") && !f.toLowerCase().includes("atlante")) {
          offset = bookIndexData.defaultOffset || 13;
        }
        return { pdfPath: full, offset };
      }
    }
  }

  // Risoluzione automatica per materia se nessun file esplicito esiste su disco
  const s = (tutor.subject || "").toLowerCase();
  let folderName = "";
  if (s.includes("geograf") || (tutor.name || "").toLowerCase().includes("magellano")) folderName = "Geografia";
  else if (s.includes("stori") || (tutor.name || "").toLowerCase().includes("cleopatra")) folderName = "Storia";
  else if (s.includes("ingles") || (tutor.name || "").toLowerCase().includes("arthur")) folderName = "Inglese";
  else if (s.includes("frances")) folderName = "Francese";
  else if (s.includes("scienz")) folderName = "Scienze";
  else if (s.includes("arte")) folderName = "Arte e Immagine";

  if (folderName) {
    const folderPath = path.join(process.cwd(), "libri", folderName);
    if (fs.existsSync(folderPath)) {
      const pdfs = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".pdf"));
      if (pdfs.length > 0) {
        let chosen = pdfs[0];
        const main = pdfs.find(p => !p.toLowerCase().includes("atlante") && !p.toLowerCase().includes("civica") && !p.toLowerCase().includes("culture"));
        if (main) chosen = main;

        const defaultOffset = folderName === "Geografia" ? (bookIndexData.defaultOffset || 13) : 0;
        return {
          pdfPath: path.join(folderPath, chosen),
          offset: defaultOffset
        };
      }
    }
  }

  return null;
}

/**
 * Individua il numero di pagina del libro e del PDF a partire dal messaggio o dai compiti.
 */
export function findBookPage(
  text: string, 
  tutor?: { subject?: string; name?: string; bookFile?: string; bookFiles?: string[]; bookOffset?: number }
): BookMatchResult | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.toLowerCase().trim();

  const resolved = resolveTutorBookPath(tutor, text);
  if (!resolved) return null;

  const defaultOffset = tutor?.bookOffset !== undefined ? tutor.bookOffset : resolved.offset;

  // 1. Match esplicito "pag. 44", "pagina 52", "p. 112", "pag 8", "da pag 44 a 48"
  const pageMatch = clean.match(/(?:pag(?:ina)?\.?|p\.)\s*(\d{1,3})/i);
  if (pageMatch) {
    const bookPage = parseInt(pageMatch[1], 10);
    if (bookPage >= 1 && bookPage <= 500) {
      let offset = defaultOffset;
      let matchedUnit = undefined;

      if (resolved.pdfPath.toLowerCase().includes("greenway")) {
        matchedUnit = bookIndexData.units.find(
          (u) => bookPage >= u.bookPageStart && bookPage <= u.bookPageEnd
        );
        if (matchedUnit) {
          offset = matchedUnit.pdfOffset || offset;
        }
      }

      const calculatedPdfPage = Math.max(1, bookPage + offset);

      return {
        bookPage,
        pdfPage: calculatedPdfPage,
        pdfPath: resolved.pdfPath,
        unitTitle: matchedUnit?.title,
        unitNumber: matchedUnit?.number
      };
    }
  }

  // 2. Se è Geografia, cerchiamo anche i topic dall'indice tematico
  if (resolved.pdfPath.toLowerCase().includes("greenway")) {
    for (const unit of bookIndexData.units) {
      for (const topic of unit.topics) {
        for (const kw of topic.keywords) {
          if (clean.includes(kw.toLowerCase())) {
            const startPage = parseInt(topic.bookPages.split("-")[0], 10);
            const offset = unit.pdfOffset || defaultOffset || 13;
            return {
              bookPage: startPage,
              pdfPage: Math.max(1, startPage + offset),
              pdfPath: resolved.pdfPath,
              topicName: topic.name,
              unitTitle: unit.title,
              unitNumber: unit.number
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Estrae ultra-velocemente l'immagine della pagina dal PDF utilizzando Python pypdf (40ms).
 * Include cache locale in /tmp/petralab_book_cache.
 */
export function getBookPageScreenshot(pdfPath: string, pdfPage: number): { base64: string; mimeType: string } | null {
  try {
    if (!fs.existsSync(pdfPath)) {
      console.warn(`[BookReader] File PDF non trovato: ${pdfPath}`);
      return null;
    }

    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const safeName = path.basename(pdfPath).replace(/[^a-zA-Z0-9_-]/g, "_");
    const cachedFilePath = path.join(CACHE_DIR, `${safeName}_p${pdfPage}.jpg`);

    if (fs.existsSync(cachedFilePath)) {
      const imgBuffer = fs.readFileSync(cachedFilePath);
      if (imgBuffer.length > 1000) {
        return {
          base64: imgBuffer.toString("base64"),
          mimeType: "image/jpeg"
        };
      }
    }

    // Estrazione ad alte prestazioni con scripts/extract_page.py
    const output = execFileSync(
      "python3",
      [PYTHON_EXTRACTOR, pdfPath, String(pdfPage)],
      { timeout: 8000, encoding: "utf8" }
    );

    const parsed = JSON.parse(output);
    if (parsed.status === "ok" && parsed.base64) {
      fs.writeFileSync(cachedFilePath, Buffer.from(parsed.base64, "base64"));
      return {
        base64: parsed.base64,
        mimeType: parsed.mimeType || "image/jpeg"
      };
    }

    return null;
  } catch (err) {
    console.error(`[BookReader] Errore estrazione pagina ${pdfPage} da ${pdfPath}:`, err);
    return null;
  }
}

/**
 * Helper principale per la chat del tutor: rileva se l'alunna o i compiti fanno riferimento a una pagina.
 */
export function getRelevantBookPage(
  query: string,
  tutor?: { subject?: string; name?: string; bookFile?: string; bookOffset?: number }
): BookPageImage | null {
  const match = findBookPage(query, tutor);
  if (!match) return null;

  const screenshot = getBookPageScreenshot(match.pdfPath, match.pdfPage);
  if (!screenshot) return null;

  return {
    ...screenshot,
    bookPage: match.bookPage,
    pdfPage: match.pdfPage,
    pdfPath: match.pdfPath,
    topicName: match.topicName,
    unitTitle: match.unitTitle
  };
}

/**
 * Estrae una serie di pagine per flashcard, schemi o quiz di studio.
 */
export function getBookPagesForRange(
  query: string, 
  tutorOrMaxPages?: { subject?: string; name?: string; bookFile?: string; bookOffset?: number } | number,
  maxPagesParam = 3
) {
  if (!query) return null;
  const clean = query.toLowerCase().trim();

  let tutor: { subject?: string; name?: string; bookFile?: string; bookOffset?: number } | undefined = undefined;
  let maxPages = maxPagesParam;

  if (typeof tutorOrMaxPages === "number") {
    maxPages = tutorOrMaxPages;
  } else if (typeof tutorOrMaxPages === "object") {
    tutor = tutorOrMaxPages;
  }

  const resolved = resolveTutorBookPath(tutor);
  if (!resolved) return null;

  const defaultOffset = tutor?.bookOffset !== undefined ? tutor.bookOffset : resolved.offset;

  let startPage = 0;
  let endPage = 0;
  let topicName: string | undefined;
  let unitTitle: string | undefined;

  const rangeMatch = clean.match(/(?:da\s+)?(?:pag(?:ina)?\.?|p\.)?\s*(\d{1,3})\s*(?:a|-)\s*(?:pag(?:ina)?\.?|p\.)?\s*(\d{1,3})/i);
  if (rangeMatch) {
    startPage = parseInt(rangeMatch[1], 10);
    endPage = parseInt(rangeMatch[2], 10);
  } else {
    const singleMatch = findBookPage(query, tutor);
    if (singleMatch) {
      startPage = singleMatch.bookPage;
      endPage = singleMatch.bookPage + 1;
      topicName = singleMatch.topicName;
      unitTitle = singleMatch.unitTitle;
    }
  }

  if (startPage <= 0) return null;
  if (endPage < startPage) endPage = startPage;

  const total = Math.min(maxPages, endPage - startPage + 1);
  const images: { base64: string; mimeType: string; bookPage: number }[] = [];
  const pagesList: number[] = [];

  for (let i = 0; i < total; i++) {
    const curBookPage = startPage + i;
    const curPdfPage = Math.max(1, curBookPage + defaultOffset);
    pagesList.push(curBookPage);
    const ss = getBookPageScreenshot(resolved.pdfPath, curPdfPage);
    if (ss) {
      images.push({
        base64: ss.base64,
        mimeType: ss.mimeType,
        bookPage: curBookPage
      });
    }
  }

  return {
    startPage,
    endPage: startPage + total - 1,
    pages: pagesList,
    topicName,
    unitTitle,
    images
  };
}
