const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const targetHook = `  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);`;
const replacementHook = `  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  // Gestione tasto indietro (Back button / Gestures Android)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Se c'è un tutor selezionato (siamo in una chat), chiudila invece di uscire dall'app
      if (selectedTutor) {
        setSelectedTutor(null);
        // Ripristiniamo uno stato fittizio per intercettare il prossimo back
        window.history.pushState({ page: "home" }, "");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedTutor]);

  // Quando selezioniamo un tutor, aggiungiamo uno stato alla history
  const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    window.history.pushState({ page: "chat" }, "");
  };
`;

content = content.replace(targetHook, replacementHook);

// Now replace all `setSelectedTutor(tutor)` with `handleSelectTutor(tutor)` EXCEPT inside the handlePopState
content = content.replace(/setSelectedTutor\(matchingTutor\)/g, 'handleSelectTutor(matchingTutor)');
content = content.replace(/setSelectedTutor\(tutor\)/g, 'handleSelectTutor(tutor)');
content = content.replace(/setSelectedTutor\(t\)/g, 'handleSelectTutor(t)');

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("History API patched!");
