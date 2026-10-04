# 🧠 Progetto: AI Tutor Socratico (Nome in codice: "Athena")
**Obiettivo:** Creare una Web App responsive (PC/Smartphone) dedicata a ragazzi delle scuole medie (12-13 anni) per supportarli nei compiti. L'IA non deve fornire soluzioni immediate, ma stimolare il ragionamento, insegnare un metodo di studio e limitare la frustrazione, garantendo al contempo un ambiente sicuro e non invasivo controllato dal genitore.

---

## 1. Piattaforma e Interfaccia (Frontend)
- **Tecnologia:** Web App Responsive (ad es. *Next.js/React* o *Flutter Web*), fruibile da browser su PC/Mac (ideale per la scrivania) e ottimizzata per schermi Smartphone.
- **Multimodalità Totale:** 
  - **Testo:** Chat classica per domande veloci.
  - **Fotocamera:** Acquisizione foto del libro, quaderno, problemi di geometria o mappe concettuali.
  - **Voce:** Input vocale (Speech-to-Text) e Output vocale (Text-to-Speech), essenziale per simulare un vero dialogo orale e aiutare nell'esposizione.

## 2. Gamification e Coinvolgimento
- **Avatar Tematici:** L'interfaccia cambia a seconda della materia (es. un gufo saggio per grammatica, uno scienziato in laboratorio per scienze, un esploratore per storia).
- **Sistema di Progressione:** L'utente guadagna "Punti Esperienza" (XP) non per le risposte esatte in sé, ma per lo sforzo, i tentativi e i ragionamenti corretti.
- **Strisce di Studio (Streaks):** Un contatore visivo per i giorni di studio consecutivi per creare l'abitudine.

## 3. Comportamento dell'IA (Core Logic & Guardrails)
- **Modello ibrido (Empatia + Socratico):** L'IA adotta un "Metodo Socratico Dinamico".
  - *Fase 1 (Incoraggiamento):* Se l'utente chiede una soluzione, l'IA rifiuta amichevolmente e fa una domanda mirata per farla partire ("Qual è la prima regola che ti viene in mente?").
  - *Fase 2 (Sblocco):* Se l'utente fallisce ripetutamente o mostra frustrazione, l'IA percepisce il blocco e "cede" un suggerimento forte, completando a metà l'esercizio per poi chiedere all'utente di finirlo. Questo garantisce stimolo senza causare l'abbandono dell'app.
- **Prompt Engineering:** Verranno iniettate regole rigorose affinché l'IA utilizzi un linguaggio adeguato (Seconda Media), semplice, positivo e mai sminuente.

## 4. La Regia del Genitore (Dashboard Admin)
- **Privacy e Fiducia:** Il genitore non vedrà i trascritti esatti delle chat (rispetto della privacy dello studio).
- **Insight Aggregati:** La dashboard mostrerà grafici sul tempo speso per materia e un riepilogo generato dall'IA (es. "Questa settimana ha lavorato molto bene su Storia, ma sta ancora faticando con le divisioni a due cifre").
- **Proattività (Iniezione di Contesto):** Il genitore può inserire le date delle interrogazioni e delle verifiche ("Venerdì 15: Verifica su Rivoluzione Francese"). L'IA "saprà" questo dato e interrogherà proattivamente l'alunna nei giorni precedenti.

---

## 🏗️ Stack Tecnologico Proposto per lo Sviluppo
- **Frontend & Backend:** Next.js (React) ospitato su Vercel o Firebase Hosting.
- **Motore AI (LLM & Vision):** API di Google Gemini (Gemini 1.5 Flash/Pro) - perfetto per analizzare le foto dei compiti a basso costo e altissima velocità.
- **Database (Auth & Dati):** Firebase Authentication (gestito dal genitore) e Cloud Firestore per salvare XP, Streaks e report crittografati.
- **Voce:** Web Speech API integrata nel browser (nativa e gratuita).
