import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import booksPageIndexRaw from "@/data/books_page_index.json";

interface BookPageIndexEntry {
  fileName: string;
  relativePath: string;
  subjectFolder: string;
  totalPages: number;
  defaultOffset: number;
  sections?: Record<string, number>;
  ranges: [number, number][];
}

const booksPageIndex = booksPageIndexRaw as unknown as Record<string, BookPageIndexEntry>;
const CACHE_DIR = path.join("/tmp", "petralab_book_cache");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driveFileId = searchParams.get("driveFileId");
    const pageParam = searchParams.get("page");

    if (!driveFileId || !pageParam) {
      return NextResponse.json(
        { error: "Parametri driveFileId e page obbligatori" },
        { status: 400 }
      );
    }

    const entry = booksPageIndex[driveFileId];
    if (!entry) {
      return NextResponse.json(
        { error: "Libro non trovato nell'indice" },
        { status: 404 }
      );
    }

    const pdfPage = Math.max(1, Math.min(entry.totalPages, parseInt(pageParam, 10) || 1));
    const range = entry.ranges[pdfPage - 1];
    if (!range || range[1] <= 0) {
      return NextResponse.json(
        { error: "Range pagina non valido" },
        { status: 404 }
      );
    }

    const [startByte, byteLength] = range;

    // 1. Controlla cache su /tmp
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      const cachedPath = path.join(CACHE_DIR, `${driveFileId}_p${pdfPage}.jpg`);
      if (fs.existsSync(cachedPath)) {
        const cachedBuf = fs.readFileSync(cachedPath);
        if (cachedBuf.length > 1000 && cachedBuf[0] === 0xff && cachedBuf[1] === 0xd8) {
          return new NextResponse(cachedBuf, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Length": String(cachedBuf.length),
              "Cache-Control": "public, max-age=31536000, immutable",
              "X-Page-Source": "tmp-cache",
            },
          });
        }
      }
    } catch {
      // Ignora errori su cache /tmp
    }

    // 2. Se il PDF esiste in locale (sviluppo Mac), leggi direttamente i byte istantaneamente (~0.5ms)
    const localPdfPath = path.join(process.cwd(), entry.relativePath);
    if (fs.existsSync(localPdfPath)) {
      const fd = fs.openSync(localPdfPath, "r");
      try {
        const buf = Buffer.alloc(byteLength);
        fs.readSync(fd, buf, 0, byteLength, startByte);
        if (buf[0] === 0xff && buf[1] === 0xd8) {
          try {
            const cachedPath = path.join(CACHE_DIR, `${driveFileId}_p${pdfPage}.jpg`);
            fs.writeFileSync(cachedPath, buf);
          } catch {}
          return new NextResponse(buf, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Length": String(buf.length),
              "Cache-Control": "public, max-age=31536000, immutable",
              "X-Page-Source": "local-byte-range",
            },
          });
        }
      } finally {
        fs.closeSync(fd);
      }
    }

    // 3. Cloud / Vercel: Scarica SOLO i ~150 KB della singola pagina da Google Drive tramite HTTP Range!
    const endByte = startByte + byteLength - 1;
    const driveDownloadUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      driveFileId
    )}&export=download&confirm=t`;

    const driveRes = await fetch(driveDownloadUrl, {
      headers: {
        Range: `bytes=${startByte}-${endByte}`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      return NextResponse.json(
        { error: `Errore Google Drive Range HTTP ${driveRes.status}` },
        { status: 502 }
      );
    }

    const arrayBuf = await driveRes.arrayBuffer();
    const imgBuf = Buffer.from(arrayBuf);

    if (imgBuf.length < 500 || imgBuf[0] !== 0xff || imgBuf[1] !== 0xd8) {
      return NextResponse.json(
        { error: "Risposta non valida da Google Drive" },
        { status: 502 }
      );
    }

    try {
      const cachedPath = path.join(CACHE_DIR, `${driveFileId}_p${pdfPage}.jpg`);
      fs.writeFileSync(cachedPath, imgBuf);
    } catch {}

    return new NextResponse(imgBuf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(imgBuf.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Page-Source": "drive-byte-range",
      },
    });
  } catch (error) {
    console.error("[API /api/book-page] Errore:", error);
    return NextResponse.json(
      { error: "Errore interno nel caricamento della pagina" },
      { status: 500 }
    );
  }
}
