const fs = require('fs');
let chatTs = fs.readFileSync('src/app/actions/chat.ts', 'utf-8');

chatTs = chatTs.replace(
  `tutor?: Tutor,\n  subjectMemory?: SubjectMemory`,
  `tutor?: Tutor,\n  subjectMemory?: SubjectMemory,\n  agendaItems?: any[]`
);

// Inject agenda into the prompt
const dynamicInstructionMatch = `    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (tutor) {
      dynamicInstruction = buildTutorPrompt(tutor, subjectMemory);
    }`;

const dynamicInstructionReplace = `    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (tutor) {
      dynamicInstruction = buildTutorPrompt(tutor, subjectMemory);
      
      // Inject relevant agenda items for this tutor
      if (agendaItems && agendaItems.length > 0) {
        // Try to match the tutor's subject to the agenda items loosely
        const relevantTasks = agendaItems.filter(item => 
          !item.isCompleted && 
          item.subject.toLowerCase().includes(tutor.subject.split(' ')[0].toLowerCase())
        );
        
        if (relevantTasks.length > 0) {
          dynamicInstruction += \`\\n\\nATTENZIONE TUTOR: L'alunna ha i seguenti compiti/verifiche in sospeso per la tua materia:\\n\`;
          relevantTasks.forEach(task => {
            dynamicInstruction += \`- [\${task.type.toUpperCase()}] Scadenza: \${task.dueDate} - \${task.description}\\n\`;
          });
          dynamicInstruction += \`\\nOBIETTIVO PROATTIVO: Se la chat è appena iniziata o l'alunna ti saluta, chiedile esplicitamente se vuole iniziare a fare questi compiti/prepararsi per queste verifiche. Rendilo coinvolgente e non stressante, proponendo ad esempio di ripassare tramite quiz o sfide!\`;
        }
      }
    }`;

chatTs = chatTs.replace(dynamicInstructionMatch, dynamicInstructionReplace);

fs.writeFileSync('src/app/actions/chat.ts', chatTs);

// Now patch Chat.tsx to pass agendaItems
let chatTsx = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
chatTsx = chatTsx.replace(
  `const res = await sendMessage(message, updatedHistory, imageData, selectedTutor, mem);`,
  `const res = await sendMessage(message, updatedHistory, imageData, selectedTutor, mem, agendaItems);`
);
fs.writeFileSync('src/components/Chat.tsx', chatTsx);

console.log("Patched sendMessage and Chat.tsx");
