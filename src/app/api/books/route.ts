import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface BookInfo {
  fileName: string;
  relativePath: string;
  subjectFolder: string;
}

export async function GET() {
  try {
    const booksDir = path.join(process.cwd(), "libri");
    if (!fs.existsSync(booksDir)) {
      return NextResponse.json({ books: [] });
    }

    const books: BookInfo[] = [];

    const subjects = ["Geografia", "Storia", "Inglese", "Francese", "Scienze", "Italiano", "Matematica"];
    
    // Scansiona sia la root di libri/ sia le sottocartelle
    for (const item of fs.readdirSync(booksDir)) {
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
      } else if (stat.isFile() && item.toLowerCase().endsWith(".pdf")) {
        books.push({
          fileName: item,
          relativePath: path.join("libri", item),
          subjectFolder: "Generale"
        });
      }
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error listing books:", error);
    return NextResponse.json({ error: "Failed to list books" }, { status: 500 });
  }
}
