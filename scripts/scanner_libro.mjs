#!/usr/bin/env node

/**
 * PetraLAB - Scanner Automatico Libri Digitali (HUB Young / Mondadori / bSmart / Sanoma LibroMedia 6.0)
 * 
 * Istruzioni:
 * 1. Apri il libro digitale in Google Chrome su:
 *    - HUB Young: https://young.hubscuola.it
 *    - bSmart: https://books.bsmart.it
 *    - Sanoma: https://ebook.sanoma.it oppure https://place.sanoma.it
 * 2. Esegui: npm run scan-book (oppure clicca su Scannerizza Libro.app)
 * 3. Funzionalità intelligenti:
 *    - Supporto multipiattaforma nativo (HUB Young, bSmart, Sanoma)
 *    - Ripresa automatica: se interrotto, riprende esattamente da dove era rimasto!
 *    - Conteggio esatto: legge il totale reale delle pagine dal catalogo del libro
 *    - Controllo manuale: puoi decidere tu quando terminare premendo Invio nel terminale
 *    - Rendering vettoriale e ad alta risoluzione: qualità nitida e zero pagine bianche
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { execFileSync, spawnSync } from "child_process";

const BOOKS_DIR = path.join(process.cwd(), "libri");
const SCAN_STATE_FILE = path.join(BOOKS_DIR, ".scanner_progress.json");

// Colori ANSI per terminale
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  teal: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  purple: "\x1b[35m"
};

function askQuestion(query, defaultVal = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim() || defaultVal);
    });
  });
}

function runJsInChrome(jsCode) {
  const tmpJs = path.join("/tmp", "hub_scanner_exec.js");
  fs.writeFileSync(tmpJs, jsCode, "utf8");

  const applescript = `
tell application "Google Chrome"
    -- 1. Se c'è una scheda attiva del visualizzatore Sanoma (npmitaly), chiudila se ebook.sanoma.it ha cambiato libro o assicuriamoci di sincronizzare con l'ultimo libro aperto su ebook.sanoma.it
    set ebookTab to missing value
    set sanomaDirectTab to missing value
    set pspdfTab to missing value

    repeat with w in windows
        repeat with t in tabs of w
            set u to URL of t
            if u contains "ebook.sanoma.it" then
                set ebookTab to t
            else if u contains "npmitaly-pro-apidistribucion.sanoma.it" then
                set sanomaDirectTab to t
            else if u contains "books.bsmart.it" or u contains "young.hubscuola.it" then
                set pspdfTab to t
            end if
        end repeat
    end repeat

    -- Se è aperto Sanoma (ebook.sanoma.it):
    if ebookTab is not missing value then
        -- Se c'era una vecchia scheda diretta npmitaly aperta, chiudila per evitare di scansionare il libro precedente
        if sanomaDirectTab is not missing value then
            close sanomaDirectTab
            delay 0.5
        end if
        -- Apri la nuova scheda diretta per il libro attualmente attivo in ebook.sanoma.it
        tell (first window)
            set foundTab to make new tab at end of tabs with properties {URL:"https://npmitaly-pro-apidistribucion.sanoma.it/viewers/lm60/online/index.html"}
            delay 1.8
        end tell
        set jsContent to read POSIX file "${tmpJs}" as «class utf8»
        return execute foundTab javascript jsContent
    end if

    -- Se c'è solo sanomaDirectTab senza ebook.sanoma.it
    if sanomaDirectTab is not missing value then
        set jsContent to read POSIX file "${tmpJs}" as «class utf8»
        return execute sanomaDirectTab javascript jsContent
    end if

    -- Altrimenti controlla PSPDFKit (HUB Young o bSmart)
    if pspdfTab is not missing value then
        set jsContent to read POSIX file "${tmpJs}" as «class utf8»
        return execute pspdfTab javascript jsContent
    end if

    return "ERR:NO_TAB"
end tell`;

  try {
    return execFileSync("osascript", ["-e", applescript], { encoding: "utf8" }).trim();
  } catch (err) {
    return "ERR:" + err.message;
  }
}

function runJsInChromeAsync(jsCode) {
  const tmpJs = path.join("/tmp", "hub_scanner_exec.js");
  fs.writeFileSync(tmpJs, jsCode, "utf8");

  const applescript = `
tell application "Google Chrome"
    set foundTab to missing value
    repeat with w in windows
        repeat with t in tabs of w
            set u to URL of t
            if u contains "npmitaly-pro-apidistribucion.sanoma.it" or u contains "books.bsmart.it" or u contains "young.hubscuola.it" then
                set foundTab to t
                exit repeat
            end if
        end repeat
        if foundTab is not missing value then exit repeat
    end repeat

    if foundTab is missing value then
        repeat with w in windows
            repeat with t in tabs of w
                set u to URL of t
                if u contains "ebook.sanoma.it" then
                    tell w to set foundTab to make new tab at end of tabs with properties {URL:"https://npmitaly-pro-apidistribucion.sanoma.it/viewers/lm60/online/index.html"}
                    delay 1.8
                    exit repeat
                end if
            end repeat
            if foundTab is not missing value then exit repeat
        end repeat
    end if

    if foundTab is not missing value then
        set jsContent to read POSIX file "${tmpJs}" as «class utf8»
        execute foundTab javascript "window._scanAsyncRes = null; (" & jsContent & ")();"
        repeat with i from 1 to 100
            set res to execute foundTab javascript "window._scanAsyncRes"
            if res is not "null" and res is not missing value and res is not "" then
                return res
            end if
            delay 0.1
        end repeat
        return "ERR:TIMEOUT"
    end if
    return "ERR:NO_TAB"
end tell`;

  try {
    return execFileSync("osascript", ["-e", applescript], { encoding: "utf8" }).trim();
  } catch (err) {
    return "ERR:" + err.message;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const flagMax = args.find(a => a.startsWith("--max="))?.split("=")[1] || (args.includes("--max") ? args[args.indexOf("--max") + 1] : null);
  const flagBw = args.includes("--bw") || args.includes("--grayscale");
  const flagColor = args.includes("--color");
  const flagHd = args.includes("--hd");
  const flagName = args.find(a => a.startsWith("--name="))?.split("=")[1] || (args.includes("--name") ? args[args.indexOf("--name") + 1] : null);
  const flagYes = args.includes("-y") || args.includes("--yes");
  const flagFresh = args.includes("--fresh");

  if (!flagYes && process.stdin.isTTY) console.clear();
  console.log(`\n${C.bold}${C.teal}╔════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.teal}║     📚  PETRALAB - SCANNER AUTOMATICO LIBRI DIGITALI     ║${C.reset}`);
  console.log(`${C.bold}${C.teal}╚════════════════════════════════════════════════════════════╝${C.reset}\n`);

  console.log(`${C.dim}Connessione a Google Chrome in corso...${C.reset}`);

  // 1. Verifica Tab Chrome e metadati reali del libro
  const tabCheckJs = `(function() {
    const title = document.title || "";
    const url = window.location.href || "";

    // 1. Riconoscimento Sanoma (LibroMedia 6.0)
    if (url.includes("sanoma.it")) {
      let productId = null;
      const m = document.cookie.match(/CloudFront-Policy=([^;]+)/);
      if (m) {
        try {
          const b64 = m[1].replace(/_/g, "/").replace(/-/g, "+");
          const match = atob(b64).match(/product\\/(\\d+)\\/ONLINE/);
          if (match) productId = match[1];
        } catch (_) {}
      }

      let bookTitle = "Libro Sanoma";
      let totalBookPages = null;
      if (productId) {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "/product/" + productId + "/ONLINE/assets/book/data/master.json", false);
          xhr.send();
          if (xhr.status === 200) {
            const d = JSON.parse(xhr.responseText);
            bookTitle = d.name || bookTitle;
            totalBookPages = d.pages ? d.pages.length : null;
          }
        } catch (_) {}
      }

      return JSON.stringify({
        provider: "sanoma",
        productId,
        title: bookTitle,
        url,
        curPage: "1",
        totalBookPages
      });
    }

    // 2. Riconoscimento HUB Young / bSmart (PSPDFKit)
    const curPage = document.querySelector(".g-page-jump-value")?.innerText.trim() 
      || (url.includes("page=") ? url.split("page=")[1].split("&")[0] : "");
    
    const bsmartTitle = document.querySelector(".book-title, [class*='title']")?.innerText.trim() || "";
    const effectiveTitle = bsmartTitle || title;

    let totalBookPages = null;
    try {
      const entries = performance.getEntriesByType("resource");
      const docJsonUrl = entries.map(e => e.name).find(n => n.includes("document.json"));
      if (docJsonUrl) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", docJsonUrl, false);
        xhr.send();
        if (xhr.status === 200) {
          const d = JSON.parse(xhr.responseText).data;
          totalBookPages = d.pageCount || d.pages?.length || null;
        }
      }
    } catch (_) {}

    return JSON.stringify({
      provider: "pspdfkit",
      title: effectiveTitle,
      url,
      curPage,
      totalBookPages
    });
  })()`;

  const tabInfoRaw = runJsInChrome(tabCheckJs);
  if (!tabInfoRaw || tabInfoRaw.startsWith("ERR:")) {
    console.log(`\n${C.red}❌ Nessuna scheda di HUB Young, bSmart o Sanoma trovata in Google Chrome!${C.reset}`);
    console.log(`\nAssicurati che:`);
    console.log(`1. Google Chrome sia aperto.`);
    console.log(`2. Il libro sia aperto su:`);
    console.log(`   - ${C.bold}https://young.hubscuola.it${C.reset}`);
    console.log(`   - ${C.bold}https://books.bsmart.it${C.reset}`);
    console.log(`   - ${C.bold}https://ebook.sanoma.it${C.reset}`);
    process.exit(1);
  }

  const tabInfo = JSON.parse(tabInfoRaw);
  const platformLabel = tabInfo.provider === "sanoma" ? "Sanoma LibroMedia 6.0" : (tabInfo.url.includes("bsmart") ? "bSmart Books" : "HUB Young");
  console.log(`\n${C.green}✅ Libro rilevato con successo (${platformLabel})!${C.reset}`);
  console.log(`   ${C.bold}Titolo:${C.reset} ${tabInfo.title}`);
  console.log(`   ${C.bold}Pagine totali reali nel libro:${C.reset} ${C.teal}${tabInfo.totalBookPages || "Rilevamento in corso..."}${C.reset}`);
  console.log(`   ${C.bold}Posizione attuale nel visualizzatore:${C.reset} Pagina ${tabInfo.curPage || "N/D"}`);

  // 2. Controllo Stato di Ripresa (Resume)
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  let savedState = null;
  if (!flagFresh && fs.existsSync(SCAN_STATE_FILE)) {
    try {
      savedState = JSON.parse(fs.readFileSync(SCAN_STATE_FILE, "utf8"));
    } catch (_) {}
  }

  // 3. Nome del File di Output e cartella di destinazione
  console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
  let defaultName = "Libro_Scansionato.pdf";
  const titLower = tabInfo.title.toLowerCase();
  if (titLower.includes("geometria")) defaultName = "Libro_Matematica_Geometria_1.pdf";
  else if (titLower.includes("aritmetica")) defaultName = "Libro_Matematica_Aritmetica_1.pdf";
  else if (titLower.includes("matematica") || titLower.includes("etabeta")) defaultName = "Libro_Matematica.pdf";
  else if (titLower.includes("geografia")) defaultName = "Libro_Geografia.pdf";
  else if (titLower.includes("storia")) defaultName = "Libro_Storia 2.pdf";
  else if (titLower.includes("scienze")) defaultName = "Libro_Scienze.pdf";
  else if (titLower.includes("tecnologia") || titLower.includes("tecnologico") || titLower.includes("disegno")) defaultName = "Tecnologia_Disegno.pdf";
  else if (titLower.includes("antologia") || titLower.includes("italiano") || titLower.includes("grammatica")) defaultName = "Libro_Italiano.pdf";
  else if (titLower.includes("francese") || titLower.includes("allez")) defaultName = "Libro_Francese.pdf";
  else if (titLower.includes("inglese") || titLower.includes("twenty")) defaultName = "Libro_Inglese.pdf";
  else if (titLower.includes("arte") || titLower.includes("immagine")) defaultName = "Libro_Arte.pdf";
  else if (tabInfo.title && tabInfo.title.length > 3) {
    defaultName = tabInfo.title.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ _-]/g, "").trim() + ".pdf";
  }

  let finalPdfName = flagName;
  if (!finalPdfName) {
    // Usa lo stato salvato precedente solo se corrisponde allo stesso libro
    if (savedState && savedState.pdfName && savedState.title === tabInfo.title) {
      defaultName = savedState.pdfName;
    }
    if (flagYes) {
      finalPdfName = defaultName;
    } else {
      const bookNameInput = await askQuestion(
        `${C.bold}Nome del file PDF da salvare${C.reset} [default: ${C.teal}${defaultName}${C.reset}]: `,
        defaultName
      );
      finalPdfName = bookNameInput.endsWith(".pdf") ? bookNameInput : bookNameInput + ".pdf";
    }
  } else if (!finalPdfName.endsWith(".pdf")) {
    finalPdfName += ".pdf";
  }

  // Sessione temporanea persistente per consentire la ripresa
  const safeSessionName = finalPdfName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const SESSION_DIR = path.join(BOOKS_DIR, ".session_" + safeSessionName);
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  // 4. Modalità Ripresa o Da Capo
  let existingImages = fs.readdirSync(SESSION_DIR)
    .filter(f => f.startsWith("page_") && f.endsWith(".jpg"))
    .sort();

  let isResuming = false;
  if (existingImages.length > 0 && !flagFresh) {
    console.log(`\n${C.purple}⚡ Trovata sessione precedente con ${existingImages.length} pagine già acquisite!${C.reset}`);
    let resumeChoice = "1";
    if (!flagYes) {
      console.log(`  ${C.bold}1)${C.reset} ${C.green}Riprendi da pagina ${existingImages.length + 1}${C.reset} (consigliato: continua senza ricominciare!)`);
      console.log(`  ${C.bold}2)${C.reset} Ricomincia da capo (cancella le pagine già scansionate)`);
      resumeChoice = await askQuestion(`Scelta [1/2, default 1]: `, "1");
    }
    if (resumeChoice === "1") {
      isResuming = true;
    } else {
      existingImages.forEach(f => fs.unlinkSync(path.join(SESSION_DIR, f)));
      existingImages = [];
    }
  }

  // 5. Risoluzione e Colori
  let isGrayscale = false;
  let scaleFactor = 1.3;
  let jpegQuality = 0.82;

  if (flagBw) {
    isGrayscale = true;
    scaleFactor = 1.3;
    jpegQuality = 0.78;
    console.log(`Modalità colore: ${C.teal}Bianco e Nero / Scala di grigi${C.reset}`);
  } else if (flagHd) {
    scaleFactor = 1.6;
    jpegQuality = 0.85;
    console.log(`Modalità colore: ${C.purple}Alta Risoluzione Colori${C.reset}`);
  } else if (flagColor || flagYes) {
    scaleFactor = 1.3;
    jpegQuality = 0.82;
    console.log(`Modalità colore: ${C.green}Colori Standard${C.reset}`);
  } else {
    console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
    console.log(`${C.bold}Scegli la modalità di colore e qualità:${C.reset}`);
    console.log(`  ${C.bold}1)${C.reset} ${C.green}Colori Standard${C.reset} (Consigliato: nitido, cartine e figure a colori)`);
    console.log(`  ${C.bold}2)${C.reset} ${C.teal}Bianco e Nero / Scala di grigi${C.reset} (Ultraleggero: testo chiarissimo)`);
    console.log(`  ${C.bold}3)${C.reset} ${C.purple}Alta Risoluzione Colori${C.reset} (Massima qualità cartine e illustrazioni)`);

    const modeChoice = await askQuestion(`Scelta [1/2/3, default 1]: `, "1");
    isGrayscale = modeChoice === "2";
    scaleFactor = modeChoice === "3" ? 1.6 : 1.3;
    jpegQuality = isGrayscale ? 0.78 : 0.82;
  }

  // 6. Modalità di fine scansione
  let manualStopMode = false;
  let maxPages = 9999;
  if (flagMax) {
    maxPages = parseInt(flagMax, 10) || 9999;
  } else if (!flagYes) {
    console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
    console.log(`${C.bold}Come preferisci completare la scansione?${C.reset}`);
    console.log(`  ${C.bold}1)${C.reset} ${C.green}Automatica fino alla fine del libro${C.reset} (rileva tutte le pagine, puoi comunque premere Invio o Ctrl+C in qualsiasi momento per salvare)`);
    console.log(`  ${C.bold}2)${C.reset} ${C.teal}Controllo Manuale${C.reset} (continua a sfogliare finché non premi Invio quando decidi tu)`);
    console.log(`  ${C.bold}3)${C.reset} Imposta un numero massimo di pagine`);
    const stopChoice = await askQuestion(`Scelta [1/2/3, default 1]: `, "1");
    if (stopChoice === "2") {
      manualStopMode = true;
    } else if (stopChoice === "3") {
      const maxPagesStr = await askQuestion(`Quante pagine scansionare al massimo?: `, "9999");
      maxPages = parseInt(maxPagesStr, 10) || 9999;
    }
  }

  let totalPagesCaptured = existingImages.length;
  const imageFiles = existingImages.map(f => path.join(SESSION_DIR, f));
  let userWantsStop = false;

  // Ascolto tasti da stdin per consentire interruzione e compilazione PDF in qualunque momento
  if (process.stdin.isTTY) {
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.resume();
      process.stdin.on("data", (chunk) => {
        const str = chunk.toString();
        if (str.includes("\n") || str.includes("\r") || str.toLowerCase().includes("q") || str.includes("\u0003")) {
          userWantsStop = true;
          console.log(`\n${C.yellow}Comando di stop ricevuto, completamento e compilazione in corso...${C.reset}`);
        }
      });
    } catch (_) {}
  }

  console.log(`\n${C.bold}Inizio acquisizione pagine...${C.reset}`);
  console.log(`${C.dim}💡 Suggerimento: premi INVIO in qualunque momento nel terminale per terminare e compilare il PDF!${C.reset}\n`);

  // ==========================================================
  // RAMO 1: SANOMA LIBROMEDIA 6.0 (Vettoriale ad Alta Velocità)
  // ==========================================================
  if (tabInfo.provider === "sanoma") {
    const totalTarget = Math.min(tabInfo.totalBookPages || 9999, maxPages);
    const startPage = isResuming ? (existingImages.length + 1) : 1;

    for (let pNum = startPage; pNum <= totalTarget && !userWantsStop; pNum++) {
      let captureRes = null;
      let retries = 0;

      while (retries < 3 && !userWantsStop) {
        retries++;
        const sanomaPageJs = `async () => {
          try {
            const pageNum = ${pNum};
            const basePath = "/product/${tabInfo.productId}/ONLINE/assets/book/pages/" + pageNum + "/";
            const svgRes = await fetch(basePath + pageNum + ".svg");
            if (svgRes.status !== 200) {
              window._scanAsyncRes = JSON.stringify({ status: "ERROR", error: "HTTP " + svgRes.status });
              return;
            }
            let svgText = await svgRes.text();

            const imgMatches = Array.from(svgText.matchAll(/href="(img\\/[^"]+)"/g));
            const uniqueHrefs = [...new Set(imgMatches.map(m => m[1]))];
            for (const href of uniqueHrefs) {
              try {
                const imgRes = await fetch(basePath + href);
                const buf = await imgRes.arrayBuffer();
                let bin = "";
                const bytes = new Uint8Array(buf);
                for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
                const b64 = btoa(bin);
                const mime = href.endsWith(".png") ? "image/png" : "image/jpeg";
                svgText = svgText.replaceAll(\`href="\${href}"\`, \`href="data:\${mime};base64,\${b64}"\`);
              } catch (_) {}
            }

            const vbMatch = svgText.match(/viewBox="([0-9.]+) ([0-9.]+) ([0-9.]+) ([0-9.]+)"/);
            let w = 909, h = 1242;
            if (vbMatch) {
              w = parseFloat(vbMatch[3]) || 909;
              h = parseFloat(vbMatch[4]) || 1242;
            }

            const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error("img load fail"));
              img.src = url;
            });

            const scale = ${scaleFactor};
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ${isGrayscale ? `ctx.filter = "grayscale(100%) contrast(108%)";` : ""}
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            window._scanAsyncRes = JSON.stringify({
              status: "READY",
              pageIndex: pageNum,
              width: canvas.width,
              height: canvas.height,
              dataUrl: canvas.toDataURL("image/jpeg", ${jpegQuality})
            });
          } catch (err) {
            window._scanAsyncRes = JSON.stringify({ status: "ERROR", error: err.message });
          }
        }`;

        const raw = runJsInChromeAsync(sanomaPageJs);
        try {
          captureRes = JSON.parse(raw);
          if (captureRes.status === "READY" && captureRes.dataUrl) break;
        } catch (_) {}

        await sleep(300);
      }

      if (userWantsStop) break;

      if (!captureRes || captureRes.status !== "READY" || !captureRes.dataUrl) {
        console.log(`\n${C.yellow}Avviso: Pagina ${pNum} non disponibile o fine libro.${C.reset}`);
        break;
      }

      totalPagesCaptured++;
      const b64 = captureRes.dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      const fileName = `page_${String(pNum).padStart(4, "0")}.jpg`;
      const filePath = path.join(SESSION_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
      imageFiles.push(filePath);

      const fSizeKb = Math.round(fs.statSync(filePath).size / 1024);
      const totalStr = tabInfo.totalBookPages ? `/${tabInfo.totalBookPages}` : "";
      process.stdout.write(
        `\r${C.green}📖 Acquisita Pagina ${pNum}${totalStr}${C.reset} ${C.dim}(Libro: ${pNum}, ${fSizeKb} KB, nitida)${C.reset}   `
      );

      fs.writeFileSync(SCAN_STATE_FILE, JSON.stringify({
        title: tabInfo.title,
        pdfName: finalPdfName,
        pagesCaptured: totalPagesCaptured,
        updatedAt: new Date().toISOString()
      }, null, 2));

      await sleep(80);
    }
  }

  // ==========================================================
  // RAMO 2: HUB YOUNG / BSMART (PSPDFKit & Tile Navigation)
  // ==========================================================
  else {
    const nextJsCode = `(function() {
      // 1. Bottone avanti HUB Young
      const hubNext = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next");
      if (hubNext && !hubNext.classList.contains("disabled") && !hubNext.hasAttribute("disabled") && hubNext.style.display !== "none") {
        hubNext.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return "clicked_hub";
      }

      // 2. Bottone avanti bSmart
      const bsmartNext = document.querySelector("[aria-label*='successiva'], [aria-label*='next'], [aria-label*='avanti']");
      if (bsmartNext && !bsmartNext.classList.contains("disabled") && !bsmartNext.hasAttribute("disabled") && bsmartNext.style.display !== "none") {
        bsmartNext.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return "clicked_bsmart";
      }

      // 3. Fallback freccia destra da tastiera
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, bubbles: true }));
      return "keyboard_fallback";
    })()`;

    if (!isResuming) {
      let startFromBeginning = true;
      if (!flagYes) {
        const startAns = await askQuestion(
          `Vuoi iniziare dalla prima pagina (Copertina)? [S/n]: `,
          "s"
        );
        startFromBeginning = startAns.toLowerCase().startsWith("s");
      }

      if (startFromBeginning) {
        process.stdout.write("\nRitorno alla copertina... ");
        for (let attempt = 0; attempt < 50; attempt++) {
          const prevRes = runJsInChrome(`(function() {
            const prev = document.querySelector("#pspdfkit-prev-page, a.pdf-nav-btn--prev");
            if (prev && !prev.classList.contains("disabled") && !prev.hasAttribute("disabled") && prev.style.display !== "none") {
              prev.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
              return "clicked";
            }
            return "start";
          })()`);
          if (prevRes === "start") break;
          await sleep(250);
        }
        console.log("Fatto!");
        await sleep(600);
      }
    } else {
      console.log(`\n${C.green}▶️  Ripresa attiva: avanzo alla pagina successiva per non duplicare quella appena salvata...${C.reset}`);
      runJsInChrome(nextJsCode);
      await sleep(800);
    }

    const captureJsCode = `
    (function() {
      const container = document.querySelector(".PSPDFKit-Container");
      if (!container || !container.shadowRoot) return JSON.stringify({ status: "WAITING", reason: "no_container" });
      const sr = container.shadowRoot;
      const pages = Array.from(sr.querySelectorAll(".PSPDFKit-Page"));
      if (pages.length === 0) return JSON.stringify({ status: "WAITING", reason: "no_pages" });

      const pageLabel = document.querySelector(".g-page-jump-value")?.innerText.trim() 
        || (window.location.href.includes("page=") ? window.location.href.split("page=")[1].split("&")[0] : "");
      const hubNext = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next");
      const bsmartNext = document.querySelector("[aria-label*='successiva'], [aria-label*='next'], [aria-label*='avanti']");
      const nextBtn = hubNext || bsmartNext;
      const hasNext = nextBtn && !nextBtn.classList.contains("disabled") && !nextBtn.hasAttribute("disabled") && nextBtn.style.display !== "none";

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const tiles = Array.from(pageEl.querySelectorAll(".PSPDFKit-PageTile"));
        const imgs = Array.from(pageEl.querySelectorAll("img"));

        if (tiles.length === 0 && imgs.length === 0) {
          return JSON.stringify({ status: "WAITING", reason: "empty_page", pageIdx: i });
        }

        if (tiles.length > 0) {
          for (let t = 0; t < tiles.length; t++) {
            const tImg = tiles[t].querySelector("img") || (tiles[t].tagName === "IMG" ? tiles[t] : null);
            if (!tImg || !tImg.complete || tImg.naturalWidth < 10) {
              return JSON.stringify({ status: "WAITING", reason: "tiles_loading", tileIdx: t, pageIdx: i });
            }
          }
        } else {
          if (imgs.length === 0) {
            return JSON.stringify({ status: "WAITING", reason: "no_imgs", pageIdx: i });
          }
          const readyImgs = imgs.filter(img => img.complete && img.naturalWidth > 50);
          if (readyImgs.length < imgs.length) {
            return JSON.stringify({ status: "WAITING", reason: "imgs_loading", ready: readyImgs.length, total: imgs.length, pageIdx: i });
          }
        }
      }

      const captured = [];
      const pageIndices = [];

      pages.forEach((pageEl) => {
        const pIdxAttr = pageEl.getAttribute("data-page-index") || "";
        pageIndices.push(pIdxAttr);

        const pageRect = pageEl.getBoundingClientRect();
        const imgs = Array.from(pageEl.querySelectorAll("img")).filter(i => i.complete && i.naturalWidth > 10);
        const tiles = Array.from(pageEl.querySelectorAll(".PSPDFKit-PageTile"));

        const scale = ${scaleFactor};
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(pageRect.width * scale);
        canvas.height = Math.round(pageRect.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ${isGrayscale ? `ctx.filter = "grayscale(100%) contrast(108%)";` : ""}

        if (tiles.length === 0 && imgs.length >= 1) {
          ctx.drawImage(imgs[0], 0, 0, canvas.width, canvas.height);
        } else {
          tiles.forEach(tile => {
            const r = tile.getBoundingClientRect();
            const img = tile.querySelector("img") || tile;
            if (img && img.naturalWidth > 0) {
              const dx = (r.left - pageRect.left) * scale;
              const dy = (r.top - pageRect.top) * scale;
              const dw = r.width * scale;
              const dh = r.height * scale;
              ctx.drawImage(img, dx, dy, dw, dh);
            }
          });
        }

        captured.push({
          pageIndex: pIdxAttr,
          width: canvas.width,
          height: canvas.height,
          dataUrl: canvas.toDataURL("image/jpeg", ${jpegQuality})
        });
      });

      return JSON.stringify({
        status: "READY",
        url: window.location.href,
        pageIndices,
        pageLabel,
        hasNext: !!hasNext,
        pages: captured
      });
    })()`;

    let screenIndex = 1;
    let lastCapturedIndicesKey = "";
    let consecutiveNoAdvancement = 0;

    while (totalPagesCaptured < maxPages && !userWantsStop) {
      let parsed = null;
      let attempts = 0;
      const maxWaitAttempts = 30;

      while (attempts < maxWaitAttempts && !userWantsStop) {
        attempts++;
        const rawRes = runJsInChrome(captureJsCode);

        try {
          parsed = JSON.parse(rawRes);
        } catch (e) {
          parsed = null;
        }

        if (parsed && parsed.status === "READY" && parsed.pages && parsed.pages.length > 0) {
          break;
        }

        process.stdout.write(`\r${C.yellow}⏳ Preparazione e rendering pagina (${attempts}/${maxWaitAttempts})...${C.reset}   `);
        await sleep(120);
      }

      if (userWantsStop) break;

      if (!parsed || parsed.status !== "READY" || !parsed.pages || parsed.pages.length === 0) {
        consecutiveNoAdvancement++;
        if (consecutiveNoAdvancement >= 4) {
          if (!manualStopMode) {
            console.log(`\n${C.teal}Nessun ulteriore avanzamento: completamento acquisizione.${C.reset}`);
            break;
          }
        }
        runJsInChrome(nextJsCode);
        await sleep(1000);
        continue;
      }

      const currentIndicesKey = parsed.pageIndices.join(",");
      if (currentIndicesKey && currentIndicesKey === lastCapturedIndicesKey) {
        consecutiveNoAdvancement++;
        if (consecutiveNoAdvancement >= 4) {
          if (!manualStopMode) {
            console.log(`\n\n${C.teal}Fine del libro raggiunta (le pagine non avanzano più).${C.reset}`);
            break;
          }
        }
        runJsInChrome(nextJsCode);
        await sleep(1000);
        continue;
      }

      consecutiveNoAdvancement = 0;
      lastCapturedIndicesKey = currentIndicesKey;

      for (let pIdx = 0; pIdx < parsed.pages.length; pIdx++) {
        totalPagesCaptured++;
        const item = parsed.pages[pIdx];
        const b64 = item.dataUrl.replace(/^data:image\/jpeg;base64,/, "");
        const fileName = `page_${String(totalPagesCaptured).padStart(4, "0")}.jpg`;
        const filePath = path.join(SESSION_DIR, fileName);
        fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
        imageFiles.push(filePath);

        const fSizeKb = Math.round(fs.statSync(filePath).size / 1024);
        const totalStr = tabInfo.totalBookPages ? `/${tabInfo.totalBookPages}` : "";
        process.stdout.write(
          `\r${C.green}📖 Acquisita Pagina ${totalPagesCaptured}${totalStr}${C.reset} ${C.dim}(Libro: ${parsed.pageLabel || item.pageIndex || screenIndex}, ${fSizeKb} KB, nitida)${C.reset}   `
        );

        fs.writeFileSync(SCAN_STATE_FILE, JSON.stringify({
          title: tabInfo.title,
          pdfName: finalPdfName,
          pagesCaptured: totalPagesCaptured,
          updatedAt: new Date().toISOString()
        }, null, 2));

        if (totalPagesCaptured >= maxPages) break;
      }

      if (userWantsStop) break;

      if (!manualStopMode && (!parsed.hasNext || totalPagesCaptured >= maxPages)) {
        await sleep(500);
        const recheck = runJsInChrome(`(function() {
          const nextBtn = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next, [aria-label*='successiva']");
          return !!(nextBtn && !nextBtn.classList.contains("disabled") && !nextBtn.hasAttribute("disabled") && nextBtn.style.display !== "none");
        })()`);

        if (recheck !== "true" || totalPagesCaptured >= maxPages) {
          console.log(`\n\n${C.teal}Raggiunta la fine del libro o il limite impostato!${C.reset}`);
          break;
        }
      }

      runJsInChrome(nextJsCode);
      screenIndex++;
      await sleep(250);
    }
  }

  if (userWantsStop) {
    console.log(`\n\n${C.teal}Scansione interrotta su richiesta dell'utente!${C.reset}`);
  }

  console.log(`\n${C.bold}Acquisizione completata! Totale pagine: ${imageFiles.length}${C.reset}`);
  console.log(`${C.dim}Compilazione file PDF in corso con Python PIL...${C.reset}`);

  // Salva il file nella sottocartella appropriata
  let targetDir = BOOKS_DIR;
  const titLowerFinal = finalPdfName.toLowerCase();
  if (titLowerFinal.includes("geografia")) {
    targetDir = path.join(BOOKS_DIR, "Geografia");
  } else if (titLowerFinal.includes("storia")) {
    targetDir = path.join(BOOKS_DIR, "Storia");
  } else if (titLowerFinal.includes("scienze")) {
    targetDir = path.join(BOOKS_DIR, "Scienze");
  } else if (titLowerFinal.includes("tecnolog") || titLowerFinal.includes("disegno")) {
    targetDir = path.join(BOOKS_DIR, "Tecnologia");
  } else if (titLowerFinal.includes("italiano") || titLowerFinal.includes("antologia")) {
    targetDir = path.join(BOOKS_DIR, "Italiano");
  } else if (titLowerFinal.includes("francese") || titLowerFinal.includes("allez")) {
    targetDir = path.join(BOOKS_DIR, "Francese");
  } else if (titLowerFinal.includes("inglese") || titLowerFinal.includes("twenty")) {
    targetDir = path.join(BOOKS_DIR, "Inglese");
  } else if (titLowerFinal.includes("matematica") || titLowerFinal.includes("aritmetica") || titLowerFinal.includes("etabeta") || titLowerFinal.includes("geometria")) {
    targetDir = path.join(BOOKS_DIR, "Matematica");
  } else if (titLowerFinal.includes("arte") || titLowerFinal.includes("immagine")) {
    targetDir = path.join(BOOKS_DIR, "Arte e Immagine");
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const finalPdfPath = path.join(targetDir, finalPdfName);
  const pyScript = `
import sys, os
from PIL import Image

output_pdf = sys.argv[1]
image_files = sys.argv[2:]

if not image_files:
    sys.exit(1)

first_image = Image.open(image_files[0]).convert("RGB")
other_images = [Image.open(f).convert("RGB") for f in image_files[1:]]

first_image.save(output_pdf, "PDF", resolution=150.0, save_all=True, append_images=other_images)
print("SUCCESS")
`;

  const pyTmpPath = path.join("/tmp", "build_pdf_" + Date.now() + ".py");
  fs.writeFileSync(pyTmpPath, pyScript, "utf8");

  const buildRes = spawnSync("python3", [pyTmpPath, finalPdfPath, ...imageFiles], { encoding: "utf8" });
  try { fs.unlinkSync(pyTmpPath); } catch (_) {}

  if (buildRes.stdout && buildRes.stdout.includes("SUCCESS") && fs.existsSync(finalPdfPath)) {
    const finalSizeMb = (fs.statSync(finalPdfPath).size / (1024 * 1024)).toFixed(1);
    console.log(`\n${C.bold}${C.green}════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.green}🎉 LIBRO SCANSIONATO E SALVATO CON SUCCESSO!${C.reset}`);
    console.log(`   📁 Percorso: ${C.bold}${finalPdfPath}${C.reset}`);
    console.log(`   📄 Pagine Totali: ${C.bold}${imageFiles.length}${C.reset}`);
    console.log(`   ⚖️  Dimensione Finale: ${C.bold}${finalSizeMb} MB${C.reset}`);
    console.log(`${C.bold}${C.green}════════════════════════════════════════════════════════════${C.reset}\n`);

    if (tabInfo.totalBookPages && imageFiles.length >= tabInfo.totalBookPages) {
      try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        if (fs.existsSync(SCAN_STATE_FILE)) fs.unlinkSync(SCAN_STATE_FILE);
      } catch (_) {}
    }
  } else {
    console.log(`${C.red}Errore nella creazione del PDF. Le immagini sono al sicuro in: ${SESSION_DIR}${C.reset}`);
    console.error(buildRes.stderr);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("\nErrore:", err);
  process.exit(1);
});
