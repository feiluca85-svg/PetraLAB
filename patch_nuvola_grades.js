const fs = require('fs');
let content = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

const targetPrompt = `Sei un assistente per un registro elettronico scolastico (Nuvola Madisoft).
Analizza questa immagine (uno screenshot del registro) ed estrai i compiti assegnati e le verifiche in programma.
Data di default (se non si vede nell'immagine): \${fallbackDate || "Prossima lezione"}
Se l'immagine taglia l'intestazione, usa la data di default come dueDate per tutti i compiti.
Attenzione ai duplicati: ignora cose non pertinenti.
Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura. Non includere blocchi \`\`\`json, ma solo il JSON nudo e crudo:
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
}`;

const newPrompt = `Sei un assistente per un registro elettronico scolastico (Nuvola Madisoft).
Analizza questa immagine (uno screenshot del registro) ed estrai SIA i compiti/verifiche SIA i voti/valutazioni.
Data di default (se non si vede nell'immagine): \${fallbackDate || "Prossima lezione"}
Rispondi ESATTAMENTE E SOLO con un JSON valido con questa struttura. Non usare markdown \`\`\`json, restituisci solo il testo JSON crudo:
{
  "agendaItems": [
    {
      "id": "id_random",
      "type": "compito" | "verifica",
      "subject": "Es. Matematica",
      "description": "Breve descrizione",
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "gradesItems": [
    {
      "subject": "Es. Storia",
      "grade": "8",
      "topic": "Interrogazione sui Romani",
      "date": "DD/MM"
    }
  ]
}`;

content = content.replace(targetPrompt, newPrompt);
fs.writeFileSync('src/app/actions/chat.ts', content);
console.log("OCR Prompt updated to include grades.");
