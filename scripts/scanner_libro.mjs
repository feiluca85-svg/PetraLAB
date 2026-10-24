#!/usr/bin/env node

/**
 * PetraLAB - Scanner Automatico Libri Digitali (HUB Young / Mondadori / PSPDFKit)
 * 
 * Istruzioni:
 * 1. Apri il libro digitale in Google Chrome su https://young.hubscuola.it
 * 2. Esegui: npm run scan-book (oppure: node scripts/scanner_libro.mjs)
 * 3. Segui le istruzioni a schermo. Il tool sfoglierà il libro ed estrarrà SOLO
 *    le pagine del testo con ritaglio millimetrico perfetto, salvandole in un unico PDF!
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { execFileSync, spawnSync } from "child_process";

const BOOKS_DIR = path.join(process.cwd(), "libri");
const TMP_DIR = path.join("/tmp", "petralab_book_scanner_" + Date.now());

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
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t contains "young.hubscuola.it" or title of t contains "HUB Young" then
                set jsContent to read POSIX file "${tmpJs}" as «class utf8»
                return execute t javascript jsContent
            end if
        end repeat
    end repeat
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

  if (!flagYes && process.stdin.isTTY) console.clear();
  console.log(`\n${C.bold}${C.teal}╔════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.teal}║     📚  PETRALAB - SCANNER AUTOMATICO LIBRI DIGITALI     ║${C.reset}`);
  console.log(`${C.bold}${C.teal}╚════════════════════════════════════════════════════════════╝${C.reset}\n`);

  console.log(`${C.dim}Verifico la presenza del libro aperto in Google Chrome...${C.reset}`);

  // 1. Verifica Tab Chrome
  const tabCheckJs = `(function() {
    const title = document.title || "";
    const url = window.location.href || "";
    const curPage = document.querySelector(".g-page-jump-value")?.innerText.trim() || "";
    return JSON.stringify({ title, url, curPage });
  })()`;

  const tabInfoRaw = runJsInChrome(tabCheckJs);
  if (!tabInfoRaw || tabInfoRaw.startsWith("ERR:")) {
    console.log(`\n${C.red}❌ Nessuna scheda di HUB Young trovata in Google Chrome!${C.reset}`);
    console.log(`\nAssicurati che:`);
    console.log(`1. Google Chrome sia aperto.`);
    console.log(`2. Il libro sia aperto su ${C.bold}https://young.hubscuola.it${C.reset}`);
    console.log(`3. Chrome abbia i permessi di AppleScript (Preferenze di Sistema -> Privacy e Sicurezza -> Automazione -> Chrome).`);
    process.exit(1);
  }

  const tabInfo = JSON.parse(tabInfoRaw);
  console.log(`\n${C.green}✅ Libro rilevato con successo!${C.reset}`);
  console.log(`   ${C.bold}Titolo Scheda:${C.reset} ${tabInfo.title}`);
  console.log(`   ${C.bold}Pagina Attuale:${C.reset} ${tabInfo.curPage || "N/D"}`);

  // 2. Nome del File di Output
  console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
  let defaultName = "Libro_Storia 2.pdf";
  if (tabInfo.title.toLowerCase().includes("geografia")) defaultName = "Libro_Geografia.pdf";
  if (tabInfo.title.toLowerCase().includes("scienze")) defaultName = "Libro_Scienze.pdf";
  if (tabInfo.title.toLowerCase().includes("antologia") || tabInfo.title.toLowerCase().includes("italiano")) defaultName = "Libro_Italiano.pdf";

  let finalPdfName = flagName;
  if (!finalPdfName) {
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

  // 3. Risoluzione e Colori
  console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
  let isGrayscale = false;
  let scaleFactor = 1.3;
  let jpegQuality = 0.82;

  if (flagBw) {
    isGrayscale = true;
    scaleFactor = 1.3;
    jpegQuality = 0.78;
    console.log(`Modalità scelta via parametro: ${C.teal}Bianco e Nero / Scala di grigi${C.reset}`);
  } else if (flagHd) {
    scaleFactor = 1.6;
    jpegQuality = 0.85;
    console.log(`Modalità scelta via parametro: ${C.purple}Alta Risoluzione Colori${C.reset}`);
  } else if (flagColor || flagYes) {
    scaleFactor = 1.3;
    jpegQuality = 0.82;
    console.log(`Modalità scelta: ${C.green}Colori Standard${C.reset}`);
  } else {
    console.log(`${C.bold}Scegli la modalità di colore e qualità:${C.reset}`);
    console.log(`  ${C.bold}1)${C.reset} ${C.green}Colori Standard${C.reset} (Consigliato: nitido, cartine a colori, ~200 KB/pagina)`);
    console.log(`  ${C.bold}2)${C.reset} ${C.teal}Bianco e Nero / Scala di grigi${C.reset} (Ultraleggero: testo chiarissimo, ~80 KB/pagina)`);
    console.log(`  ${C.bold}3)${C.reset} ${C.purple}Alta Risoluzione Colori${C.reset} (Massima qualità cartine, ~350 KB/pagina)`);

    const modeChoice = await askQuestion(`Scelta [1/2/3, default 1]: `, "1");
    isGrayscale = modeChoice === "2";
    scaleFactor = modeChoice === "3" ? 1.6 : 1.3;
    jpegQuality = isGrayscale ? 0.78 : 0.82;
  }

  // 4. Limite pagine
  let maxPages = 9999;
  if (flagMax) {
    maxPages = parseInt(flagMax, 10) || 9999;
    console.log(`Limite pagine impostato a: ${maxPages}`);
  } else if (!flagYes) {
    console.log(`\n${C.yellow}────────────────────────────────────────────────────────────${C.reset}`);
    const maxPagesStr = await askQuestion(
      `${C.bold}Quante pagine scansionare al massimo?${C.reset} (premi Invio per tutto il libro): `,
      "9999"
    );
    maxPages = parseInt(maxPagesStr, 10) || 9999;
  }

  // 5. Partire dall'inizio?
  let startFromBeginning = true;
  if (!flagYes) {
    const startAns = await askQuestion(
      `Vuoi iniziare dalla prima pagina (Copertina)? [S/n]: `,
      "s"
    );
    startFromBeginning = startAns.toLowerCase().startsWith("s");
  }

  console.log(`\n${C.green}🚀 Inizializzazione scansione in corso...${C.reset}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(BOOKS_DIR, { recursive: true });

  // Riporta alla prima pagina se richiesto
  if (startFromBeginning) {
    process.stdout.write("Ritorno alla copertina... ");
    for (let attempt = 0; attempt < 40; attempt++) {
      const prevRes = runJsInChrome(`(function() {
        const prev = document.querySelector("#pspdfkit-prev-page, a.pdf-nav-btn--prev");
        if (prev && !prev.classList.contains("disabled") && !prev.hasAttribute("disabled") && prev.style.display !== "none") {
          prev.click();
          return "clicked";
        }
        return "start";
      })()`);
      if (prevRes === "start") break;
      await sleep(300);
    }
    console.log("Fatto!");
    await sleep(800);
  }

  // Funzione JS:
  // - Aspetta che tutte le tessere/immagini siano scaricate (complete == true && naturalWidth > 50)
  // - Cattura con precisione ogni pagina visibile
  // - Riporta gli indici effettivi per prevenire duplicati o premature interruzioni
  const captureJsCode = `
(function() {
  const container = document.querySelector(".PSPDFKit-Container");
  if (!container || !container.shadowRoot) return JSON.stringify({ status: "WAITING_CONTAINER" });
  const sr = container.shadowRoot;
  const pages = Array.from(sr.querySelectorAll(".PSPDFKit-Page"));
  if (pages.length === 0) return JSON.stringify({ status: "WAITING_PAGES" });

  const pageLabel = document.querySelector(".g-page-jump-value")?.innerText.trim() || "";
  const nextBtn = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next");
  const hasNext = nextBtn && !nextBtn.classList.contains("disabled") && !nextBtn.hasAttribute("disabled") && nextBtn.style.display !== "none";

  // Verifica lo stato di tutte le tessere grafiche (immagini ad alta definizione)
  let totalImgs = 0;
  let loadedImgs = 0;
  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];
    const imgs = Array.from(pageEl.querySelectorAll("img"));
    if (imgs.length === 0) {
      return JSON.stringify({ status: "WAITING_TILES", reason: "no_imgs_yet", pageIdx: i });
    }
    totalImgs += imgs.length;
    const ready = imgs.filter(img => img.complete && img.naturalWidth > 50).length;
    loadedImgs += ready;
    if (ready < imgs.length) {
      return JSON.stringify({ status: "WAITING_TILES", loaded: loadedImgs, total: totalImgs, pageIdx: i });
    }
  }

  // Tutte le immagini sono caricate al 100%! Procediamo al rendering
  const captured = [];
  const pageIndices = [];

  pages.forEach((pageEl) => {
    const pIdxAttr = pageEl.getAttribute("data-page-index") || "";
    pageIndices.push(pIdxAttr);

    const pageRect = pageEl.getBoundingClientRect();
    const tiles = Array.from(pageEl.querySelectorAll(".PSPDFKit-PageTile, img")).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20;
    });

    const scale = ${scaleFactor};
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pageRect.width * scale);
    canvas.height = Math.round(pageRect.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ${isGrayscale ? `ctx.filter = "grayscale(100%) contrast(108%)";` : ""}

    tiles.forEach(tile => {
      const r = tile.getBoundingClientRect();
      const img = tile.tagName === "IMG" ? tile : tile.querySelector("img");
      if (img && img.naturalWidth > 0) {
        const dx = (r.left - pageRect.left) * scale;
        const dy = (r.top - pageRect.top) * scale;
        const dw = r.width * scale;
        const dh = r.height * scale;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    });

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

  const nextJsCode = `(function() {
    const nextBtn = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next");
    if (nextBtn && !nextBtn.classList.contains("disabled") && !nextBtn.hasAttribute("disabled") && nextBtn.style.display !== "none") {
      nextBtn.click();
      return "clicked";
    }
    // Fallback: evento da tastiera se il bottone non è accessibile
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, bubbles: true }));
    return "keyboard_fallback";
  })()`;

  let totalPagesCaptured = 0;
  let screenIndex = 1;
  const imageFiles = [];
  let lastCapturedIndicesKey = "";
  let consecutiveNoAdvancement = 0;

  console.log(`\n${C.bold}Inizio acquisizione intelligente pagine...${C.reset}`);
  console.log(`${C.dim}(Attesa attiva caricamento tessere in alta risoluzione abilitata)${C.reset}\n`);

  while (totalPagesCaptured < maxPages) {
    // 1. Polling dinamico: attendiamo che le immagini ad alta risoluzione siano al 100% caricate
    let parsed = null;
    let attempts = 0;
    const maxWaitAttempts = 25; // Fino a ~10-12 secondi se il network è lento

    while (attempts < maxWaitAttempts) {
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

      if (parsed && parsed.status === "WAITING_TILES") {
        process.stdout.write(`\r${C.yellow}⏳ Caricamento tessere alta risoluzione (${parsed.loaded || 0}/${parsed.total || "?"})...${C.reset}   `);
      } else {
        process.stdout.write(`\r${C.yellow}⏳ Preparazione pagina... (${attempts}/${maxWaitAttempts})${C.reset}   `);
      }

      await sleep(350);
    }

    if (!parsed || parsed.status !== "READY" || !parsed.pages || parsed.pages.length === 0) {
      consecutiveNoAdvancement++;
      if (consecutiveNoAdvancement >= 3) {
        console.log(`\n${C.teal}Nessun ulteriore avanzamento rilevato: fine del libro raggiunta.${C.reset}`);
        break;
      }
      runJsInChrome(nextJsCode);
      await sleep(1000);
      continue;
    }

    // Controlla che le pagine catturate non siano un duplicato identico dello schermo precedente
    const currentIndicesKey = parsed.pageIndices.join(",");
    if (currentIndicesKey && currentIndicesKey === lastCapturedIndicesKey) {
      consecutiveNoAdvancement++;
      if (consecutiveNoAdvancement >= 3) {
        console.log(`\n\n${C.teal}Fine del libro raggiunta (le pagine non avanzano più).${C.reset}`);
        break;
      }
      runJsInChrome(nextJsCode);
      await sleep(1000);
      continue;
    }

    consecutiveNoAdvancement = 0;
    lastCapturedIndicesKey = currentIndicesKey;

    // Salva le pagine catturate
    for (let pIdx = 0; pIdx < parsed.pages.length; pIdx++) {
      totalPagesCaptured++;
      const item = parsed.pages[pIdx];
      const b64 = item.dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      const fileName = `page_${String(totalPagesCaptured).padStart(4, "0")}.jpg`;
      const filePath = path.join(TMP_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
      imageFiles.push(filePath);

      const fSizeKb = Math.round(fs.statSync(filePath).size / 1024);
      process.stdout.write(
        `\r${C.green}📖 Acquisita Pagina ${totalPagesCaptured}${C.reset} ${C.dim}(Pag. Libro: ${parsed.pageLabel || item.pageIndex || screenIndex}, ${fSizeKb} KB, nitida)${C.reset}   `
      );

      if (totalPagesCaptured >= maxPages) break;
    }

    // Se non ci sono più pagine successive o abbiamo superato il limite
    if (!parsed.hasNext || totalPagesCaptured >= maxPages) {
      // Breve doppio controllo di sicurezza sul tasto next
      await sleep(500);
      const recheck = runJsInChrome(`(function() {
        const nextBtn = document.querySelector("#pspdfkit-next-page, a.pdf-nav-btn--next");
        return !!(nextBtn && !nextBtn.classList.contains("disabled") && !nextBtn.hasAttribute("disabled") && nextBtn.style.display !== "none");
      })()`);

      if (recheck !== "true" || totalPagesCaptured >= maxPages) {
        console.log(`\n\n${C.teal}Raggiunta la fine del libro o il limite impostato!${C.reset}`);
        break;
      }
    }

    // Avanza alla pagina successiva
    runJsInChrome(nextJsCode);
    screenIndex++;
    await sleep(400);
  }

  console.log(`\n${C.bold}Acquisizione completata! Totale pagine: ${imageFiles.length}${C.reset}`);
  console.log(`${C.dim}Compilazione file PDF in corso con Python PIL...${C.reset}`);

  // Assembla il PDF finale
  const finalPdfPath = path.join(BOOKS_DIR, finalPdfName);
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

  const pyTmpPath = path.join(TMP_DIR, "build_pdf.py");
  fs.writeFileSync(pyTmpPath, pyScript, "utf8");

  const buildRes = spawnSync("python3", [pyTmpPath, finalPdfPath, ...imageFiles], { encoding: "utf8" });

  if (buildRes.stdout && buildRes.stdout.includes("SUCCESS") && fs.existsSync(finalPdfPath)) {
    const finalSizeMb = (fs.statSync(finalPdfPath).size / (1024 * 1024)).toFixed(1);
    console.log(`\n${C.bold}${C.green}════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.green}🎉 LIBRO SCANSIONATO E SALVATO CON SUCCESSO!${C.reset}`);
    console.log(`   📁 Percorso: ${C.bold}${finalPdfPath}${C.reset}`);
    console.log(`   📄 Pagine Totali: ${C.bold}${imageFiles.length}${C.reset}`);
    console.log(`   ⚖️  Dimensione Finale: ${C.bold}${finalSizeMb} MB${C.reset}`);
    console.log(`${C.bold}${C.green}════════════════════════════════════════════════════════════${C.reset}\n`);

    // Pulizia file temporanei
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch (_) {}
  } else {
    console.log(`${C.red}Errore nella creazione del PDF. Le immagini sono salvate in: ${TMP_DIR}${C.reset}`);
    console.error(buildRes.stderr);
  }
}

main().catch((err) => {
  console.error("\nErrore:", err);
  process.exit(1);
});
