const fs = require('fs');
let content = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

const oldFuncStart = `export async function parseNuvolaScreenshot(base64Image: string, mimeType: string) {`;

const newFunc = `export async function parseNuvolaScreenshot(base64Image: string, mimeType: string) {
  try {
    const prompt = \`
Sei un assistente per un registro elettronico scolastico (Nuvola Madisoft).
Analizza questa immagine (uno screenshot del registro) ed estrai i compiti assegnati e le verifiche in programma.
Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura. Non includere blocchi \\\`\\\`\\\`json, ma solo il JSON nudo e crudo:
{
  "agendaItems": [
    {
      "id": "generato_randomicamente_dal_modello_come_stringa_unica_es_id123",
      "type": "compito" | "verifica",
      "subject": "Es. Matematica",
      "description": "Breve descrizione del compito o argomento verifica",
      "dueDate": "YYYY-MM-DD" // se non specificata, usa una stringa leggibile tipo "Prossima lezione"
    }
  ]
}\`;

    let result = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            }
          }
        ]);
        break;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(\`Fallback in parseNuvola (\${modelName}):\`, msg);
        
        if (msg.includes("429") || msg.includes("exceeded") || msg.includes("403") || msg.includes("404") || msg.includes("503")) {
          continue; 
        }
        break;
      }
    }

    if (!result) {
      throw lastError || new Error("Tutti i modelli di fallback sono falliti.");
    }

    let text = result.response.text();
    text = text.replace(/\\s*\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();

    try {
      const data = JSON.parse(text);
      return { success: true, items: data.agendaItems || [] };
    } catch (parseErr) {
      console.error("Failed to parse JSON from Gemini", text);
      return { success: false, error: "L'IA non è riuscita a estrarre i dati. Risposta grezza: " + text.substring(0, 100) };
    }

  } catch (error: any) {
    console.error("Error parsing screenshot", error);
    return { success: false, error: error?.message || "Errore di connessione." };
  }
}`;

const startIndex = content.indexOf(oldFuncStart);
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + newFunc;
  fs.writeFileSync('src/app/actions/chat.ts', content);
  console.log("Done patching parseNuvolaScreenshot");
} else {
  console.log("Failed to find function start");
}
