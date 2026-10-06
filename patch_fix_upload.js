const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// The old handleNuvolaUpload:
const targetFnStart = content.indexOf('const handleNuvolaUpload = async');
const targetFnEnd = content.indexOf('};', content.indexOf('finally {', targetFnStart)) + 2;

const replacementFn = `const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingNuvola(true);
    try {
      const base64Str = await fileToBase64(file);
      const parts = base64Str.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      
      const res = await parseNuvolaScreenshot(base64Data, mimeType);
      
      if (res.success) {
        let tasksAdded = 0;
        let gradesAdded = 0;
        const updatePayload: any = {};
        
        // Process Agenda Items
        if (res.items && res.items.length > 0) {
          const itemsToAdd = res.items.filter((newItem: any) => {
            const normNew = (newItem.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const isDuplicate = agendaItems.some((ex: any) => {
              const normEx = (ex.description || "").toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normEx === normNew) return true;
              if (normEx.length > 20 && normNew.length > 20 && (normEx.includes(normNew.substring(0,20)) || normNew.includes(normEx.substring(0,20)))) return true;
              return false;
            });
            return !isDuplicate;
          });
          
          if (itemsToAdd.length > 0) {
            updatePayload.agendaItems = [...agendaItems, ...itemsToAdd];
            tasksAdded = itemsToAdd.length;
          }
        }
        
        // Process Grades Items
        let updatedMemMap = { ...subjectsMemory };
        if (res.gradesItems && res.gradesItems.length > 0) {
          res.gradesItems.forEach((gradeItem: any) => {
            const matchingTutor = tutors.find((t: any) => 
              t.id === gradeItem.subject?.toLowerCase() || 
              t.subject.toLowerCase().includes(gradeItem.subject?.toLowerCase())
            );
            const tutorId = matchingTutor ? matchingTutor.id : "generico";
            const mem = updatedMemMap[tutorId] || { grades: [], weaknesses: [] };
            
            const isDup = mem.grades?.some((g: any) => g.grade === gradeItem.grade && g.topic === gradeItem.topic);
            if (!isDup) {
              const newGrade = {
                grade: gradeItem.grade,
                topic: gradeItem.topic || "Voto da registro",
                date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
              };
              updatedMemMap[tutorId] = { ...mem, grades: [...(mem.grades || []), newGrade] };
              gradesAdded++;
            }
          });
          if (gradesAdded > 0) {
            updatePayload.subjectsMemory = updatedMemMap;
          }
        }
        
        if (tasksAdded > 0 || gradesAdded > 0) {
          await setDoc(doc(db, "petralab_users", "studente_demo"), updatePayload, { merge: true });
          if (tasksAdded > 0) setAgendaItems(updatePayload.agendaItems);
          if (gradesAdded > 0) setSubjectsMemory(updatedMemMap);
          
          let msg = "Completato!\\n";
          if (tasksAdded > 0) msg += \`- \${tasksAdded} compiti inseriti\\n\`;
          if (gradesAdded > 0) msg += \`- \${gradesAdded} voti estratti e salvati\`;
          alert(msg);
        } else {
          alert("Nessun compito o voto nuovo trovato (o erano già stati salvati).");
        }
        
      } else {
        alert("Errore durante la lettura: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Errore imprevisto. Riprova.");
    } finally {
      setIsUploadingNuvola(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };`;

content = content.substring(0, targetFnStart) + replacementFn + content.substring(targetFnEnd);
fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("handleNuvolaUpload patched!");
