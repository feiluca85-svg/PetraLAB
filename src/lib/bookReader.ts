import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import bookIndexData from "@/data/geografia_libro_index.json";

export interface BookMatchResult {
  bookPage: number;
  pdfPage: number;
  topicName?: string;
  unitTitle?: string;
  unitNumber?: number;
}

export interface BookPageImage {
  base64: string;
  mimeType: string;
  bookPage: number;
  pdfPage: number;
  topicName?: string;
  unitTitle?: string;
}

const PDF_FILE_PATH = path.join(process.cwd(), "libri", bookIndexData.pdfFileName || "Libro_Geografia 2.pdf");
const CACHE_DIR = path.join("/tmp", "petralab_book_cache");

/**
 * Finds the most relevant book page number and PDF page for a student query or homework text.
 */
export function findBookPage(text: string): BookMatchResult | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.toLowerCase().trim();

  // 1. Explicit page numbers in text: "pag. 44", "pagina 52", "p. 112", "pag 8", "da pag 44 a 48"
  const pageMatch = clean.match(/(?:pag(?:ina)?\.?|p\.)\s*(\d{1,3})/i);
  if (pageMatch) {
    const bookPage = parseInt(pageMatch[1], 10);
    if (bookPage >= 1 && bookPage <= 320) {
      // Find which unit it belongs to to get accurate offset
      let offset = bookIndexData.defaultOffset || 13;
      let matchedUnit = bookIndexData.units.find(
        (u) => bookPage >= u.bookPageStart && bookPage <= u.bookPageEnd
      );
      if (matchedUnit) {
        offset = matchedUnit.pdfOffset || offset;
      }
      return {
        bookPage,
        pdfPage: Math.min(326, Math.max(1, bookPage + offset)),
        unitTitle: matchedUnit?.title,
        unitNumber: matchedUnit?.number
      };
    }
  }

  // 2. Keyword / Topic matching
  for (const unit of bookIndexData.units) {
    for (const topic of unit.topics) {
      for (const kw of topic.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          // Extract start page from "bookPages" (e.g. "44-45" -> 44)
          const startPage = parseInt(topic.bookPages.split("-")[0], 10);
          const offset = unit.pdfOffset || bookIndexData.defaultOffset || 13;
          return {
            bookPage: startPage,
            pdfPage: Math.min(326, Math.max(1, startPage + offset)),
            topicName: topic.name,
            unitTitle: unit.title,
            unitNumber: unit.number
          };
        }
      }
    }
  }

  // 3. Search Unit titles (e.g. "regione iberica", "regione britannica", "unione europea")
  for (const unit of bookIndexData.units) {
    if (clean.includes(unit.title.toLowerCase()) || clean.includes(`unità ${unit.number}`)) {
      const offset = unit.pdfOffset || bookIndexData.defaultOffset || 13;
      return {
        bookPage: unit.bookPageStart,
        pdfPage: Math.min(326, Math.max(1, unit.bookPageStart + offset)),
        topicName: unit.topics[0]?.name,
        unitTitle: unit.title,
        unitNumber: unit.number
      };
    }
  }

  return null;
}

/**
 * Extracts on-demand screenshot of a given PDF page with local caching.
 */
export function getBookPageScreenshot(pdfPage: number): { base64: string; mimeType: string } | null {
  try {
    if (!fs.existsSync(PDF_FILE_PATH)) {
      console.warn(`[BookReader] PDF file not found at: ${PDF_FILE_PATH}`);
      return null;
    }

    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cachedFilePath = path.join(CACHE_DIR, `page_${pdfPage}_screenshot.png`);

    if (fs.existsSync(cachedFilePath)) {
      const imgBuffer = fs.readFileSync(cachedFilePath);
      if (imgBuffer.length > 1000) {
        return {
          base64: imgBuffer.toString("base64"),
          mimeType: "image/png"
        };
      }
    }

    // Generate screenshot on-demand using pdf-parse CLI
    const cliPath = path.join(process.cwd(), "node_modules", "pdf-parse", "bin", "cli.mjs");
    if (!fs.existsSync(cliPath)) {
      console.warn(`[BookReader] pdf-parse CLI not found at: ${cliPath}`);
      return null;
    }

    execFileSync(
      process.execPath,
      [cliPath, "screenshot", PDF_FILE_PATH, "--pages", String(pdfPage), "--output", CACHE_DIR, "--scale", "1.2"],
      { timeout: 10000, stdio: "ignore" }
    );

    if (fs.existsSync(cachedFilePath)) {
      const imgBuffer = fs.readFileSync(cachedFilePath);
      return {
        base64: imgBuffer.toString("base64"),
        mimeType: "image/png"
      };
    }

    return null;
  } catch (err) {
    console.error(`[BookReader] Error extracting screenshot for PDF page ${pdfPage}:`, err);
    return null;
  }
}

/**
 * High-level helper for tutor chat and homework sessions.
 */
export function getRelevantBookPage(query: string): BookPageImage | null {
  const match = findBookPage(query);
  if (!match) return null;

  const screenshot = getBookPageScreenshot(match.pdfPage);
  if (!screenshot) return null;

  return {
    ...screenshot,
    bookPage: match.bookPage,
    pdfPage: match.pdfPage,
    topicName: match.topicName,
    unitTitle: match.unitTitle
  };
}
