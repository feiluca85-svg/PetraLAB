import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import staticManifest from "@/data/books_manifest.json";

export interface BookInfo {
  fileName: string;
  relativePath: string;
  subjectFolder: string;
}

export async function GET() {
  try {
    const booksDir = path.join(process.cwd(), "libri");
    
    // Se la cartella locale esiste (in sviluppo su Mac), leggi direttamente da disco
    if (fs.existsSync(booksDir)) {
      const books: BookInfo[] = [];
      const items = fs.readdirSync(booksDir);
      for (const item of items) {
        const fullPath = path.join(booksDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith(".")) {
          const subFiles = fs.readdirSync(fullPath);
          for (const sub of subFiles) {
            if (sub.toLowerCase().endsWith(".pdf")) {
              books.push({
                fileName: sub,
                relativePath: path.join("libri", item, sub),
                subjectFolder: item
              });
            }
          }
        }
      }

      if (books.length > 0) {
        return NextResponse.json({ books });
      }
    }

    // Fallback statico per ambienti serverless / Vercel cloud
    return NextResponse.json({ books: staticManifest });
  } catch (error) {
    console.error("Error listing books:", error);
    return NextResponse.json({ books: staticManifest });
  }
}
