const fs = require('fs');
let content = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

const targetRegex = /const prompt = \`[\s\S]*?\`;/;
const newPrompt = `const prompt = \`Sei un assistente per un registro elettronico scolastico.
Analizza questa immagine (uno screenshot del registro) ed estrai QUALSIASI compito, verifica o voto presente.
Presta attenzione anche ai dettagli del voto (es. "7½" diventa "7.5", argomenti, descrizioni).
Data di default: \${fallbackDate || "Prossima lezione"}

Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura (nessun blocco markdown):
{
  "agendaItems": [
    {
      "id": "id_random123",
      "type": "compito" | "verifica",
      "subject": "Es. Matematica",
      "description": "Breve descrizione",
      "dueDate": "Data o 'Prossima lezione'"
    }
  ],
  "gradesItems": [
    {
      "subject": "Tecnologia",
      "grade": "7.5",
      "topic": "Proiezione ortogonale...",
      "date": "30-09-2026"
    }
  ]
}\`;`;

content = content.replace(targetRegex, newPrompt);
fs.writeFileSync('src/app/actions/chat.ts', content);
console.log("Aggressive prompt applied!");
