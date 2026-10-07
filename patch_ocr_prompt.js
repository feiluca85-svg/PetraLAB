const fs = require('fs');
let content = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

const oldPromptRegex = /const prompt = `Sei un assistente per un registro elettronico scolastico\.[\s\S]*?Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura \(nessun blocco markdown\):/;

const newPrompt = `const prompt = \`Sei un assistente per un registro elettronico scolastico.
Analizza questa immagine (uno screenshot del registro) ed estrai QUALSIASI compito, verifica o voto presente.
Presta attenzione ai dettagli del voto (es. "7½" diventa "7.5").

REGOLE TASSATIVE PER LE DATE:
1. L'anno scolastico corrente è il 2026.
2. NON inserire mai anni passati come 1918 o 1920 nelle date di scadenza. Se vedi anni storici, fanno parte della descrizione dell'argomento di studio (es. Storia), non sono la data del compito!
3. Se l'anno di consegna non è specificato, usa SEMPRE "2026".
4. Il formato del campo "dueDate" (e "date" per i voti) DEVE ESSERE ESATTAMENTE "YYYY-MM-DD" (es. "2026-10-15").
5. Se non c'è una data specifica o deducibile, usa "\${fallbackDate || "Prossima lezione"}".

Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura (nessun blocco markdown):`;

content = content.replace(oldPromptRegex, newPrompt);
fs.writeFileSync('src/app/actions/chat.ts', content);
console.log("OCR Prompt Patched!");
