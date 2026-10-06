const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const target = `const newItems = [...agendaItems, ...itemsToAdd];
        await setDoc(doc(db, "petralab_users", "studente_demo"), { agendaItems: newItems }, { merge: true });
        
        if (addedCount === 0) {
           alert("Nessun compito nuovo trovato. Erano già tutti nel Diario!");
        } else {
           alert(\`\${addedCount} compiti estratti e aggiunti al Diario di Petra!\`);
        }`;

const replacement = `const newItems = [...agendaItems, ...itemsToAdd];
        const updatePayload: any = { agendaItems: newItems };
        
        let gradesAdded = 0;
        let updatedMemMap = { ...subjectsMemory };
        if (res.gradesItems && res.gradesItems.length > 0) {
          res.gradesItems.forEach((gradeItem: any) => {
            // Find a tutor for this grade's subject
            const matchingTutor = tutors.find(t => 
              t.id === gradeItem.subject?.toLowerCase() || 
              t.subject.toLowerCase().includes(gradeItem.subject?.toLowerCase())
            );
            const tutorId = matchingTutor ? matchingTutor.id : "generico";
            const mem = updatedMemMap[tutorId] || { grades: [], weaknesses: [] };
            
            // Check for duplicates
            const isDup = mem.grades?.some((g: any) => g.grade === gradeItem.grade && g.topic === gradeItem.topic);
            if (!isDup) {
              const newGrade = {
                grade: gradeItem.grade,
                topic: gradeItem.topic || "Voto importato da Nuvola",
                date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
              };
              updatedMemMap[tutorId] = { ...mem, grades: [...(mem.grades || []), newGrade] };
              gradesAdded++;
            }
          });
          if (gradesAdded > 0) updatePayload.subjectsMemory = updatedMemMap;
        }

        await setDoc(doc(db, "petralab_users", "studente_demo"), updatePayload, { merge: true });
        
        if (gradesAdded > 0) setSubjectsMemory(updatedMemMap);
        
        if (addedCount === 0 && gradesAdded === 0) {
           alert("Nessun compito o voto nuovo trovato. Erano già tutti nel Diario!");
        } else {
           let msg = "";
           if (addedCount > 0) msg += \`\${addedCount} compiti estratti!\n\`;
           if (gradesAdded > 0) msg += \`\${gradesAdded} voti estratti e salvati!\n\`;
           alert(msg);
        }`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("handleNuvolaUpload patched!");
