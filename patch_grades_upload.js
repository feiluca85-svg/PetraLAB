const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

// 1. Add states and refs
const stateTarget = `const fileInputRef = useRef<HTMLInputElement>(null);`;
const stateReplacement = `const fileInputRef = useRef<HTMLInputElement>(null);
  const gradesFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingGrades, setIsUploadingGrades] = useState(false);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Add handleGradesUpload function
const handleTarget = `const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`;
const handleReplacement = `const handleGradesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingGrades(true);
    try {
      const base64Str = await fileToBase64(file);
      const parts = base64Str.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      
      const res = await parseNuvolaScreenshot(base64Data, mimeType); // usa lo stesso parser
      
      let gradesAdded = 0;
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
              topic: gradeItem.topic || "Voto importato da Nuvola",
              date: gradeItem.date || new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
            };
            updatedMemMap[tutorId] = { ...mem, grades: [...(mem.grades || []), newGrade] };
            gradesAdded++;
          }
        });
        
        if (gradesAdded > 0) {
          const userRef = doc(db, "petralab_users", "studente_demo");
          await setDoc(userRef, { subjectsMemory: updatedMemMap }, { merge: true });
          setSubjectsMemory(updatedMemMap);
          alert(\`\${gradesAdded} voti estratti e salvati con successo!\`);
        } else {
          alert("Nessun voto nuovo trovato nello screenshot.");
        }
      } else {
        alert("L'IA non ha trovato voti in questa immagine.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante la lettura dei voti.");
    } finally {
      setIsUploadingGrades(false);
      if (gradesFileInputRef.current) gradesFileInputRef.current.value = "";
    }
  };

  const handleNuvolaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`;
content = content.replace(handleTarget, handleReplacement);

// 3. Add UI in Grades Tab
const uiTarget = `<h3 className="font-bold text-base mb-1">
                📊 Registro Memoria Tutor
              </h3>
              <p className={\`text-xs \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                I voti comunicati dall&apos;alunna e le lacune individuate spontaneamente dai tutor durante lo svolgimento dei compiti.
              </p>
            </div>`;
            
const uiReplacement = `<h3 className="font-bold text-base mb-1">
                📊 Registro Memoria Tutor
              </h3>
              <p className={\`text-xs \${isDarkMode ? "text-[#8696A0]" : "text-slate-500"}\`}>
                I voti comunicati dall'alunna e le lacune individuate dai tutor. Puoi anche importare i voti caricando uno screenshot del registro!
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#2A3942]">
                <input type="file" accept="image/*" className="hidden" ref={gradesFileInputRef} onChange={handleGradesUpload} />
                <button 
                  onClick={() => gradesFileInputRef.current?.click()}
                  disabled={isUploadingGrades}
                  className={\`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm \${
                    isDarkMode 
                      ? 'bg-[#111B21] border border-[#2A3942] text-blue-400 hover:bg-blue-950/30' 
                      : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100'
                  }\`}
                >
                  <span className="text-xl">{isUploadingGrades ? '⏳' : '📸'}</span> 
                  {isUploadingGrades ? 'Analisi dei voti in corso...' : 'Importa Voti da Screenshot'}
                </button>
              </div>
            </div>`;
content = content.replace(uiTarget, uiReplacement);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Grades screenshot upload UI patched!");
